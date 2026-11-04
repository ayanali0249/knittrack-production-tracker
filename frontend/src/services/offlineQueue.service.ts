import axios from 'axios';
import { api } from './api';

export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';

export interface OfflineUpdateItem {
  clientRequestId: string;
  orderStageId: string;
  orderId?: string;
  poNumber?: string;
  stageName?: string;
  quantity: number;
  date: string;
  note?: string;
  photoDataUrl?: string;
  photoName?: string;
  photoType?: string;
  createdAt: string;
  status: SyncStatus;
  retryCount: number;
  lastError?: string;
  syncedAt?: string;
}

const DB_NAME = 'knittrack_offline_db';
const STORE_NAME = 'offline_production_updates';
const DB_VERSION = 1;
const LOCAL_STORAGE_KEY = 'knittrack_pending_updates_fallback';

class OfflineQueueService {
  private listeners: Array<() => void> = [];
  private isSyncing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[OfflineQueue] Device returned online, triggering auto-sync...');
        this.syncAll();
      });
    }
  }

  // ---------------------------------------------------------------------------
  // IndexedDB / Fallback Storage Layer
  // ---------------------------------------------------------------------------
  private async openDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return null;
    }
    return new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e: any) => {
          const db = e.target.result as IDBDatabase;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'clientRequestId' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          console.warn('[OfflineQueue] IndexedDB open error, falling back to localStorage');
          resolve(null);
        };
      } catch {
        resolve(null);
      }
    });
  }

  private getFallbackItems(): OfflineUpdateItem[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveFallbackItems(items: OfflineUpdateItem[]): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.error('[OfflineQueue] localStorage save error:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Public Queue Operations
  // ---------------------------------------------------------------------------
  async enqueue(item: Omit<OfflineUpdateItem, 'clientRequestId' | 'createdAt' | 'status' | 'retryCount'>): Promise<OfflineUpdateItem> {
    const clientRequestId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const newItem: OfflineUpdateItem = {
      ...item,
      clientRequestId,
      createdAt: new Date().toISOString(),
      status: 'PENDING',
      retryCount: 0,
    };

    const db = await this.openDB();
    if (db) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(newItem);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      db.close();
    } else {
      const items = this.getFallbackItems();
      items.push(newItem);
      this.saveFallbackItems(items);
    }

    this.notify();
    return newItem;
  }

  async getAll(): Promise<OfflineUpdateItem[]> {
    const db = await this.openDB();
    if (db) {
      return new Promise<OfflineUpdateItem[]>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const list = (req.result as OfflineUpdateItem[]) || [];
          db.close();
          // Sort by creation date ascending (FIFO)
          resolve(list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
        };
        req.onerror = () => {
          db.close();
          resolve(this.getFallbackItems());
        };
      });
    } else {
      return this.getFallbackItems();
    }
  }

  async updateItem(updated: OfflineUpdateItem): Promise<void> {
    const db = await this.openDB();
    if (db) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(updated);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      db.close();
    } else {
      const items = this.getFallbackItems();
      const idx = items.findIndex((i) => i.clientRequestId === updated.clientRequestId);
      if (idx >= 0) items[idx] = updated;
      else items.push(updated);
      this.saveFallbackItems(items);
    }
    this.notify();
  }

  async removeItem(clientRequestId: string): Promise<void> {
    const db = await this.openDB();
    if (db) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(clientRequestId);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      db.close();
    } else {
      const items = this.getFallbackItems().filter((i) => i.clientRequestId !== clientRequestId);
      this.saveFallbackItems(items);
    }
    this.notify();
  }

  async getPendingCount(): Promise<number> {
    const all = await this.getAll();
    return all.filter((i) => i.status === 'PENDING' || i.status === 'FAILED' || i.status === 'SYNCING').length;
  }

  // ---------------------------------------------------------------------------
  // Synchronization Engine with Idempotency & Error Handling
  // ---------------------------------------------------------------------------
  async syncAll(): Promise<{ successCount: number; failedCount: number }> {
    if (this.isSyncing) {
      return { successCount: 0, failedCount: 0 };
    }
    this.isSyncing = true;

    let successCount = 0;
    let failedCount = 0;

    try {
      const items = await this.getAll();
      const pendingItems = items.filter((i) => i.status === 'PENDING' || i.status === 'FAILED');

      for (const item of pendingItems) {
        // Mark item as SYNCING
        await this.updateItem({ ...item, status: 'SYNCING' });

        try {
          // Construct payload with idempotency key
          const formData = new FormData();
          formData.append('orderStageId', item.orderStageId);
          formData.append('quantity', String(item.quantity));
          formData.append('date', item.date);
          formData.append('clientRequestId', item.clientRequestId);
          if (item.note) {
            formData.append('note', item.note);
          }

          // Restore photo blob if present
          if (item.photoDataUrl && item.photoName) {
            const blob = await this.dataUrlToBlob(item.photoDataUrl);
            formData.append('photo', blob, item.photoName);
          }

          // Submit update to backend API
          await api.post('/production/updates', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });

          // Successful synchronization: mark SYNCED
          await this.updateItem({
            ...item,
            status: 'SYNCED',
            syncedAt: new Date().toISOString(),
            lastError: undefined,
          });
          successCount++;
        } catch (err: any) {
          failedCount++;
          const statusCode = err?.response?.status;
          let errorMessage = err?.response?.data?.error || err.message || 'Sync failed';

          // If server reports already submitted with same stage & date, mark SYNCED (idempotent duplicate)
          if (statusCode === 409 && String(errorMessage).toLowerCase().includes('already submitted')) {
            await this.updateItem({
              ...item,
              status: 'SYNCED',
              syncedAt: new Date().toISOString(),
              lastError: 'Verified on server (previously recorded)',
            });
            successCount++;
            failedCount--;
            continue;
          }

          // If auth expired (401/403), DO NOT discard. Keep item for retry when re-authenticated.
          if (statusCode === 401 || statusCode === 403) {
            errorMessage = 'Authentication expired. Please log in again to sync.';
          }

          await this.updateItem({
            ...item,
            status: 'FAILED',
            retryCount: item.retryCount + 1,
            lastError: errorMessage,
          });
        }
      }
    } finally {
      this.isSyncing = false;
      this.notify();
    }

    return { successCount, failedCount };
  }

  // ---------------------------------------------------------------------------
  // Helper: File to DataURL & DataURL to Blob
  // ---------------------------------------------------------------------------
  async fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  private async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const res = await fetch(dataUrl);
    return res.blob();
  }

  // ---------------------------------------------------------------------------
  // Reactive Listener Subscriptions
  // ---------------------------------------------------------------------------
  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('[OfflineQueue] Listener error:', err);
      }
    }
  }
}

export const offlineQueueService = new OfflineQueueService();
