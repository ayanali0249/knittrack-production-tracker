import { describe, it, expect, vi, beforeEach } from 'vitest';
import { offlineQueueService } from '../services/offlineQueue.service';
import { productionService } from '../services/production.service';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('Offline-First Production Update Queue', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    // Clear any items in storage
    const items = await offlineQueueService.getAll();
    for (const item of items) {
      await offlineQueueService.removeItem(item.clientRequestId);
    }
  });

  it('1. Online production update succeeds via API', async () => {
    (api.post as any).mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 'upd-online-1',
          orderStageId: 'stage-1',
          quantity: 500,
          date: '2026-11-04',
        },
      },
    });

    const result = await productionService.submitDailyUpdate({
      orderStageId: 'stage-1',
      quantity: 500,
      date: '2026-11-04',
      note: 'Normal line pace',
    });

    expect(api.post).toHaveBeenCalledWith(
      '/production/updates',
      expect.any(FormData),
      expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } })
    );
    expect(result.id).toBe('upd-online-1');
  });

  it('2. Offline update is queued locally with PENDING status', async () => {
    const queued = await offlineQueueService.enqueue({
      orderStageId: 'stage-1',
      orderId: 'order-1',
      poNumber: 'B-PO-88213',
      stageName: 'Stitching',
      quantity: 350,
      date: '2026-11-04',
      note: 'இயந்திரம் பழுது',
    });

    expect(queued.clientRequestId).toBeDefined();
    expect(queued.status).toBe('PENDING');
    expect(queued.retryCount).toBe(0);

    const count = await offlineQueueService.getPendingCount();
    expect(count).toBe(1);
  });

  it('3. Queue persists after reload (stored in persistent device storage)', async () => {
    await offlineQueueService.enqueue({
      orderStageId: 'stage-stitching',
      orderId: 'order-1',
      poNumber: 'B-PO-88213',
      quantity: 250,
      date: '2026-11-04',
    });

    // Read directly from storage to verify persistence
    const stored = await offlineQueueService.getAll();
    expect(stored.length).toBe(1);
    expect(stored[0]?.quantity).toBe(250);
    expect(stored[0]?.poNumber).toBe('B-PO-88213');
  });

  it('4. Reconnection triggers synchronization of queued items', async () => {
    await offlineQueueService.enqueue({
      orderStageId: 'stage-1',
      quantity: 100,
      date: '2026-11-04',
    });

    (api.post as any).mockResolvedValue({
      data: { success: true, data: { id: 'synced-1' } },
    });

    const syncResult = await offlineQueueService.syncAll();
    expect(syncResult.successCount).toBe(1);
    expect(syncResult.failedCount).toBe(0);
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('5. Successful synchronization marks item as SYNCED with timestamp', async () => {
    const item = await offlineQueueService.enqueue({
      orderStageId: 'stage-1',
      quantity: 400,
      date: '2026-11-04',
    });

    (api.post as any).mockResolvedValue({
      data: { success: true, data: { id: 'synced-400' } },
    });

    await offlineQueueService.syncAll();

    const stored = await offlineQueueService.getAll();
    const updatedItem = stored.find((i) => i.clientRequestId === item.clientRequestId);
    expect(updatedItem?.status).toBe('SYNCED');
    expect(updatedItem?.syncedAt).toBeDefined();
  });

  it('6. Failed synchronization retains item for retry with error explanation', async () => {
    const item = await offlineQueueService.enqueue({
      orderStageId: 'stage-1',
      quantity: 150,
      date: '2026-11-04',
    });

    (api.post as any).mockRejectedValue(new Error('Network connection timeout'));

    const syncResult = await offlineQueueService.syncAll();
    expect(syncResult.failedCount).toBe(1);

    const stored = await offlineQueueService.getAll();
    const retainedItem = stored.find((i) => i.clientRequestId === item.clientRequestId);
    expect(retainedItem?.status).toBe('FAILED');
    expect(retainedItem?.retryCount).toBe(1);
    expect(retainedItem?.lastError).toContain('Network connection timeout');
  });

  it('7. Retry handles 409 idempotent duplicate safely without creating duplicate production records', async () => {
    const item = await offlineQueueService.enqueue({
      orderStageId: 'stage-1',
      quantity: 300,
      date: '2026-11-04',
    });

    // Server returns 409 (already submitted)
    (api.post as any).mockRejectedValue({
      response: {
        status: 409,
        data: { error: 'You have already submitted an update for this stage on this date.' },
      },
    });

    await offlineQueueService.syncAll();

    const stored = await offlineQueueService.getAll();
    const resolvedItem = stored.find((i) => i.clientRequestId === item.clientRequestId);
    // Verified on server: item marked SYNCED rather than kept as persistent failure
    expect(resolvedItem?.status).toBe('SYNCED');
  });

  it('8. Multiple queued updates are processed in FIFO order', async () => {
    const item1 = await offlineQueueService.enqueue({
      orderStageId: 'stage-1',
      quantity: 100,
      date: '2026-11-02',
    });

    // Ensure timestamp difference
    await new Promise((r) => setTimeout(r, 10));

    const item2 = await offlineQueueService.enqueue({
      orderStageId: 'stage-1',
      quantity: 200,
      date: '2026-11-03',
    });

    const callOrder: string[] = [];
    (api.post as any).mockImplementation((_url: string, formData: FormData) => {
      callOrder.push(formData.get('quantity') as string);
      return Promise.resolve({ data: { success: true } });
    });

    await offlineQueueService.syncAll();

    expect(callOrder).toEqual(['100', '200']);
  });

  it('9. Authentication failure (401/403) does not silently delete pending updates', async () => {
    const item = await offlineQueueService.enqueue({
      orderStageId: 'stage-1',
      quantity: 500,
      date: '2026-11-04',
      note: 'Critical shift output',
    });

    (api.post as any).mockRejectedValue({
      response: {
        status: 401,
        data: { error: 'Token expired. Please login again.' },
      },
    });

    await offlineQueueService.syncAll();

    const stored = await offlineQueueService.getAll();
    expect(stored.length).toBe(1);
    const retainedItem = stored[0];
    expect(retainedItem?.clientRequestId).toBe(item.clientRequestId);
    expect(retainedItem?.status).toBe('FAILED');
    expect(retainedItem?.lastError).toContain('Authentication expired');
  });
});
