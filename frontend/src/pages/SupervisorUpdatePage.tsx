import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { orderService } from '../services/order.service';
import { productionService } from '../services/production.service';
import { aiService } from '../services/ai.service';
import { offlineQueueService, OfflineUpdateItem } from '../services/offlineQueue.service';
import type { ProductionOrder, AIClassificationResult } from '../types';
import {
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Camera,
  Sparkles,
  Send,
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  Trash2,
} from 'lucide-react';

export const SupervisorUpdatePage: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Connectivity & Offline Queue States
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [queueItems, setQueueItems] = useState<OfflineUpdateItem[]>([]);
  const [isSyncingQueue, setIsSyncingQueue] = useState(false);

  // Form States
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live AI Preview
  const [aiPreview, setAiPreview] = useState<AIClassificationResult | null>(null);

  const refreshQueue = async () => {
    try {
      const items = await offlineQueueService.getAll();
      setQueueItems(items);
    } catch (err) {
      console.error('Failed to load offline queue:', err);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      refreshQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = offlineQueueService.subscribe(() => {
      refreshQueue();
    });

    refreshQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const orderList = await orderService.getOrders();
        const safeList = Array.isArray(orderList) ? orderList : [];
        setOrders(safeList);
        if (safeList.length > 0 && safeList[0]) {
          setSelectedOrderId(safeList[0].id);
          const firstStage = safeList[0].stages?.[0];
          if (firstStage) setSelectedStageId(firstStage.id);
        }
      } catch (err) {
        console.error('Failed to load orders for floor update:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const safeOrders = Array.isArray(orders) ? orders : [];
  const selectedOrder = safeOrders.find((o) => o.id === selectedOrderId);
  const selectedStage = selectedOrder?.stages?.find((s) => s.id === selectedStageId);

  const remainingQty = selectedStage
    ? Math.max(0, selectedStage.plannedQuantity - selectedStage.completedQuantity)
    : 0;

  const handleOrderChange = (orderId: string) => {
    setSelectedOrderId(orderId);
    const ord = safeOrders.find((o) => o.id === orderId);
    const activeStage =
      ord?.stages?.find((s) => s.status === 'IN_PROGRESS') || ord?.stages?.[0];
    if (activeStage) {
      setSelectedStageId(activeStage.id);
    }
    setQuantity('');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleAddQty = (amount: number) => {
    const current = Number(quantity) || 0;
    const next = current + amount;
    if (next <= remainingQty) {
      setQuantity(next);
      setErrorMessage(null);
    } else {
      setQuantity(remainingQty);
    }
  };

  const handleAddTamilPhrase = (phrase: string) => {
    setNote(phrase);
    triggerLiveAi(phrase);
  };

  const triggerLiveAi = async (text: string) => {
    if (!text.trim() || !isOnline) {
      setAiPreview(null);
      return;
    }
    try {
      const result = await aiService.classifyNote(text);
      setAiPreview(result);
    } catch {
      // AI preview is non-blocking
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('Photograph size must be under 5 MB.');
        return;
      }
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setErrorMessage(null);
    }
  };

  const handleManualSync = async () => {
    setIsSyncingQueue(true);
    setErrorMessage(null);
    try {
      const { successCount, failedCount } = await offlineQueueService.syncAll();
      await refreshQueue();
      if (successCount > 0) {
        setSuccessMessage(`Synchronized ${successCount} queued update(s) to server.`);
        // Refresh orders if online
        const updatedList = await orderService.getOrders();
        setOrders(Array.isArray(updatedList) ? updatedList : []);
      }
      if (failedCount > 0) {
        setErrorMessage(`${failedCount} update(s) could not be synchronized yet. Tap Sync Now to retry.`);
      }
    } catch (err: any) {
      setErrorMessage('Sync encountered an error. Please verify network and retry.');
    } finally {
      setIsSyncingQueue(false);
    }
  };

  const handleClearItem = async (clientRequestId: string) => {
    await offlineQueueService.removeItem(clientRequestId);
    await refreshQueue();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const qtyNum = Number(quantity);
    if (!selectedStageId) {
      setErrorMessage('Please select a production stage.');
      return;
    }
    if (!qtyNum || qtyNum <= 0) {
      setErrorMessage('Please enter a valid completed quantity greater than 0.');
      return;
    }
    if (qtyNum > remainingQty) {
      setErrorMessage(
        `Quantity (${qtyNum.toLocaleString()}) cannot exceed remaining stage quantity (${remainingQty.toLocaleString()}).`
      );
      return;
    }

    setIsSubmitting(true);

    // Prepare photo dataUrl if photo exists (needed for offline serialization)
    let photoDataUrl: string | undefined;
    if (photo) {
      try {
        photoDataUrl = await offlineQueueService.fileToDataUrl(photo);
      } catch (err) {
        console.warn('Could not encode photo for offline queue:', err);
      }
    }

    const todayDate: string = new Date().toISOString().slice(0, 10);

    // If device is explicitly offline, save to local IndexedDB queue immediately
    if (!isOnline || !navigator.onLine) {
      try {
        await offlineQueueService.enqueue({
          orderStageId: selectedStageId,
          orderId: selectedOrder?.id,
          poNumber: selectedOrder?.poNumber,
          stageName: selectedStage?.stageName,
          quantity: qtyNum,
          date: todayDate,
          note: note.trim() || undefined,
          photoDataUrl,
          photoName: photo?.name,
          photoType: photo?.type,
        });

        setSuccessMessage(
          `Saved locally on device (Offline Mode). +${qtyNum.toLocaleString()} pieces queued. It will sync automatically when network returns.`
        );
        setQuantity('');
        setNote('');
        setPhoto(null);
        setPhotoPreview(null);
        setAiPreview(null);
        await refreshQueue();
      } catch (err: any) {
        setErrorMessage('Failed to save update to local device storage. Please check browser permissions.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Device appears online: attempt direct submission
    try {
      await productionService.submitDailyUpdate({
        orderStageId: selectedStageId,
        quantity: qtyNum,
        date: todayDate,
        note: note.trim() || undefined,
        photo: photo || undefined,
      });

      setSuccessMessage(
        `Daily update recorded successfully! +${qtyNum.toLocaleString()} pieces logged to server.`
      );
      setQuantity('');
      setNote('');
      setPhoto(null);
      setPhotoPreview(null);
      setAiPreview(null);

      // Refresh order data
      const updatedList = await orderService.getOrders();
      setOrders(Array.isArray(updatedList) ? updatedList : []);
    } catch (err: any) {
      // If network error occurred mid-flight, safely queue locally rather than losing supervisor data
      const isNetworkError = !err.response || err.code === 'ERR_NETWORK';
      if (isNetworkError) {
        try {
          await offlineQueueService.enqueue({
            orderStageId: selectedStageId,
            orderId: selectedOrder?.id,
            poNumber: selectedOrder?.poNumber,
            stageName: selectedStage?.stageName,
            quantity: qtyNum,
            date: todayDate,
            note: note.trim() || undefined,
            photoDataUrl,
            photoName: photo?.name,
            photoType: photo?.type,
          });

          setSuccessMessage(
            `Connection interrupted during submission. Update safely saved locally to device queue (+${qtyNum.toLocaleString()} pcs) — will sync automatically.`
          );
          setQuantity('');
          setNote('');
          setPhoto(null);
          setPhotoPreview(null);
          setAiPreview(null);
          await refreshQueue();
        } catch {
          setErrorMessage('Network connection lost and could not queue locally. Please check device memory.');
        }
      } else {
        // Business logic or validation error returned by server (e.g. duplicate or stage closed)
        setErrorMessage(
          err.response?.data?.error || 'Failed to submit production update. Check input and retry.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingQueueCount = queueItems.filter(
    (i) => i.status === 'PENDING' || i.status === 'FAILED' || i.status === 'SYNCING'
  ).length;

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-16">
      {/* Mobile-Friendly Header with Real-Time Connectivity Banner */}
      <div className="bg-indigo-600 text-white p-5 rounded-2xl shadow-md space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            <h1 className="text-base font-black tracking-tight">Supervisor Floor Update</h1>
          </div>

          {/* Network State Badge */}
          <div
            className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
              isOnline
                ? 'bg-emerald-500/30 text-emerald-100 border border-emerald-400/40'
                : 'bg-amber-500/40 text-amber-100 border border-amber-400/50'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-300" />
                <span>Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-300" />
                <span>Offline (Local Queue Active)</span>
              </>
            )}
          </div>
        </div>

        <p className="text-xs text-indigo-100">
          Tiruppur Unit: {user?.productionUnit?.name || 'Assigned Factory Floor'}
        </p>
      </div>

      {/* Offline Queue Status Card (visible if pending updates exist) */}
      {queueItems.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-700" />
              <span className="text-xs font-bold text-amber-900">
                Local Device Queue ({pendingQueueCount} pending sync)
              </span>
            </div>

            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncingQueue || !isOnline}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingQueue ? 'animate-spin' : ''}`} />
              <span>{isSyncingQueue ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>

          <p className="text-[11px] text-amber-800 leading-relaxed">
            Updates saved locally on this phone. When internet connectivity is restored, items synchronize automatically to the central server.
          </p>

          {/* Item List */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {queueItems.map((item) => (
              <div
                key={item.clientRequestId}
                className="bg-white p-2.5 rounded-lg border border-amber-200 text-xs flex items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800">
                      {item.poNumber || 'Order'} • {item.stageName || 'Stage'}
                    </span>
                    <span className="font-semibold text-indigo-700">+{item.quantity} pcs</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Logged: {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Date: {item.date}
                  </span>
                  {item.lastError && (
                    <span className="text-[10px] text-rose-600 block mt-0.5 font-medium">
                      {item.lastError}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.status === 'SYNCED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.status === 'SYNCING'
                        ? 'bg-blue-100 text-blue-800'
                        : item.status === 'FAILED'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.status}
                  </span>

                  {item.status === 'SYNCED' && (
                    <button
                      onClick={() => handleClearItem(item.clientRequestId)}
                      className="p-1 text-slate-400 hover:text-slate-600"
                      title="Clear from local queue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success / Error Feedback */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: Select Active Production Order */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            1. Select Assigned Order
          </label>
          <select
            value={selectedOrderId}
            onChange={(e) => handleOrderChange(e.target.value)}
            className="w-full min-h-[48px] px-3 py-2 text-sm font-semibold border-2 border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-0 bg-white"
          >
            {safeOrders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.poNumber} — {o.styleName} ({o.totalQuantity.toLocaleString()} pcs)
              </option>
            ))}
          </select>
        </div>

        {/* Step 2: Select Stage */}
        {selectedOrder && (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                2. Select Production Stage
              </label>
              {selectedStage && (
                <span className="text-xs font-bold text-indigo-600">
                  Remaining: {remainingQty.toLocaleString()} pcs
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {selectedOrder.stages?.map((stage) => {
                const isSelected = stage.id === selectedStageId;
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => {
                      setSelectedStageId(stage.id);
                      setQuantity('');
                      setErrorMessage(null);
                    }}
                    className={`min-h-[52px] p-2 rounded-xl text-xs font-bold border-2 transition-all text-left flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span>{stage.stageName}</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      {stage.completedQuantity.toLocaleString()}/{stage.plannedQuantity.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Enter Quantity with Quick Buttons */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            3. Today's Completed Quantity (Pieces)
          </label>

          <input
            type="number"
            min="1"
            max={remainingQty}
            required
            placeholder="e.g. 500"
            value={quantity}
            onChange={(e) => {
              const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
              setQuantity(val);
              setErrorMessage(null);
            }}
            className="w-full min-h-[54px] px-4 py-2 text-2xl font-black text-slate-900 border-2 border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-0 text-center"
          />

          {/* Quick Increment Buttons for Factory Supervisors */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            {[100, 250, 500, 1000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => handleAddQty(amt)}
                className="min-h-[44px] text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors active:scale-95"
              >
                +{amt}
              </button>
            ))}
          </div>
        </div>

        {/* Step 4: Floor Note (Tamil / English) with Quick Chips */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              4. Floor Note (Tamil or English)
            </label>
            <span className="text-[10px] text-slate-400 font-medium">Bilingual NLP</span>
          </div>

          <textarea
            rows={3}
            placeholder="Enter production note in Tamil (e.g. மெஷின் பழுதாகிவிட்டது) or English..."
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              triggerLiveAi(e.target.value);
            }}
            className="w-full p-3 text-xs border-2 border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-0 font-sans"
          />

          {/* Quick Tamil Factory Reason Chips */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">
              Quick Tamil Floor Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                'மெஷின் பழுதாகிவிட்டது',
                'தொழிலாளர்கள் குறைவாக உள்ளனர்',
                'துணி இன்னும் வரவில்லை',
                'மின்சாரம் தடைப்பட்டது',
                'தையல் சரியில்லை',
              ].map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  onClick={() => handleAddTamilPhrase(phrase)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg border border-slate-200 transition-colors"
                >
                  {phrase}
                </button>
              ))}
            </div>
          </div>

          {/* Live AI Classification Preview */}
          {aiPreview && aiPreview.category && (
            <div className="p-3 rounded-lg bg-indigo-50/80 border border-indigo-200 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-indigo-900">
                  AI Suggestion: {aiPreview.category}
                </span>
              </div>
              <span className="text-[10px] font-bold text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-200">
                {Math.round((aiPreview.confidence || 0.85) * 100)}% Confidence
              </span>
            </div>
          )}
        </div>

        {/* Step 5: Floor Photograph Upload */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            5. Floor Photo / Proof of Work (Optional)
          </label>

          <label className="flex flex-col items-center justify-center min-h-[100px] border-2 border-dashed border-slate-300 rounded-xl hover:border-indigo-500 cursor-pointer p-4 transition-colors bg-slate-50/50">
            <Camera className="w-6 h-6 text-slate-400 mb-1" />
            <span className="text-xs font-semibold text-slate-600">
              {photo ? photo.name : 'Tap to take photo or choose file'}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">JPEG, PNG up to 5 MB</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </label>

          {photoPreview && (
            <div className="relative mt-2 rounded-lg overflow-hidden border border-slate-200 max-h-48">
              <img
                src={photoPreview}
                alt="Floor update preview"
                className="w-full h-40 object-cover"
              />
            </div>
          )}
        </div>

        {/* Big Touch-Friendly Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full min-h-[56px] flex items-center justify-center gap-2 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-2xl shadow-md disabled:opacity-50 transition-colors uppercase tracking-wider cursor-pointer"
        >
          <Send className="w-5 h-5" />
          {isSubmitting
            ? 'Recording Floor Update...'
            : isOnline
            ? 'Submit Daily Update'
            : 'Save to Offline Queue'}
        </button>
      </form>
    </div>
  );
};
