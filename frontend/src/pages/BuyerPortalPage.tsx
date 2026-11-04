import React, { useState, useEffect } from 'react';
import { buyerService } from '../services/buyer.service';
import { useAuth } from '../context/AuthContext';
import type { ProductionOrder } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
  ShieldCheck,
  Calendar,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Eye,
  Building2,
  Lock,
} from 'lucide-react';

export const BuyerPortalPage: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBuyerOrders = async () => {
      try {
        const myOrders = await buyerService.getMyOrders();
        const safeOrders = Array.isArray(myOrders) ? myOrders : [];
        setOrders(safeOrders);
        if (safeOrders.length > 0 && safeOrders[0]) {
          setSelectedOrder(safeOrders[0]);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load buyer orders.');
      } finally {
        setLoading(false);
      }
    };
    fetchBuyerOrders();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading buyer portal..." className="min-h-[50vh]" />;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner with Security Isolation Indicator */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-emerald-100 text-emerald-700">
              <Lock className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Buyer Tracking Portal
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Read-Only
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authenticated for: <strong className="text-slate-800">{user?.name}</strong> •{' '}
            {user?.buyer ? `${user.buyer.name} (${user.buyer.country})` : 'Export Partner'}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs text-slate-600">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Tenant Data Isolation Active: Orders outside your company are strictly hidden</span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
          No purchase orders currently assigned to your account.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Purchase Orders List */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
              Your Purchase Orders ({orders.length})
            </h2>
            <div className="space-y-2">
              {orders.map((o) => {
                const isSelected = selectedOrder?.id === o.id;
                const lastStage = o.stages?.[o.stages.length - 1];
                const pct = lastStage
                  ? Math.round((lastStage.completedQuantity / o.totalQuantity) * 100)
                  : 0;

                return (
                  <div
                    key={o.id}
                    onClick={() => setSelectedOrder(o)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white border-indigo-600 shadow-sm ring-1 ring-indigo-600'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">{o.poNumber}</span>
                      <StatusBadge type="risk" value={o.riskLevel} />
                    </div>
                    <p className="text-xs text-slate-600 font-medium mt-1 truncate">
                      {o.styleName}
                    </p>

                    <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100">
                      <span>{o.totalQuantity.toLocaleString()} pcs</span>
                      <span>
                        Ex-Factory:{' '}
                        {new Date(o.exFactoryDate).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-indigo-600 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Order Deep Dive Details */}
          {selectedOrder && (
            <div className="lg:col-span-2 space-y-5">
              {/* Card 1: Selected Order Overview */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{selectedOrder.poNumber}</h2>
                    <p className="text-xs text-slate-500">{selectedOrder.styleName}</p>
                  </div>
                  <StatusBadge type="risk" value={selectedOrder.riskLevel} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Colour
                    </span>
                    <span className="font-bold text-slate-800">{selectedOrder.colour}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Total Quantity
                    </span>
                    <span className="font-bold text-slate-800">
                      {selectedOrder.totalQuantity.toLocaleString()} pcs
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Ex-Factory Date
                    </span>
                    <span className="font-bold text-slate-800">
                      {new Date(selectedOrder.exFactoryDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Status
                    </span>
                    <span className="font-bold text-indigo-700">{selectedOrder.status}</span>
                  </div>
                </div>

                {/* Size breakdown */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Size Matrix
                  </h4>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {Object.entries(selectedOrder.sizes || {}).map(([s, q]) => (
                      <div
                        key={s}
                        className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-center"
                      >
                        <span className="font-bold text-slate-700">{s}: </span>
                        <span className="text-slate-500 font-medium">
                          {(q as number).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 2: Production Milestones & Time-and-Action */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                  Production Milestones & Progress
                </h3>

                <div className="space-y-3">
                  {selectedOrder.stages?.map((stage) => {
                    const pct = Math.round(
                      (stage.completedQuantity / stage.plannedQuantity) * 100
                    );
                    return (
                      <div
                        key={stage.id}
                        className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">
                            {stage.sequence}. {stage.stageName}
                          </span>
                          <StatusBadge type="stage" value={stage.status} />
                        </div>

                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>
                            {stage.completedQuantity.toLocaleString()} /{' '}
                            {stage.plannedQuantity.toLocaleString()} pcs
                          </span>
                          <span className="font-semibold text-slate-700">{pct}%</span>
                        </div>

                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                          <div
                            className="bg-indigo-600 h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Card 3: Approved Buyer Advisories & Verified Notices */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Merchandiser-Approved Floor Advisories
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Verified status notices
                  </span>
                </div>

                {(() => {
                  const approvedNotices = (selectedOrder.stages || []).flatMap((stg) =>
                    (stg.productionUpdates || [])
                      .filter((u) => u.buyerWarningApproved)
                      .map((u) => ({ ...u, stageName: stg.stageName }))
                  );

                  if (approvedNotices.length === 0) {
                    return (
                      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>All active stages executing under standard operating schedule with zero approved buyer exceptions.</span>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2.5">
                      {approvedNotices.map((notice) => (
                        <div
                          key={notice.id}
                          className="p-3 rounded-lg border border-amber-200 bg-amber-50/60 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">
                              Stage: {notice.stageName} • {new Date(notice.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            <StatusBadge
                              type="category"
                              value={notice.correctedCategory || notice.aiCategory || 'Operational Notice'}
                            />
                          </div>
                          {notice.note && (
                            <p className="text-slate-700 italic font-medium leading-relaxed">
                              "{notice.note}"
                            </p>
                          )}
                          <span className="text-[10px] text-emerald-700 font-semibold block">
                            ✓ Verified and approved by export merchandising team
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Card 3: Approved Factory Photographs */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Approved Production Photographs
                  </h3>
                  <span className="text-xs text-slate-400">Quality-audited images</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 text-center">
                    <div className="h-28 bg-slate-200 rounded flex items-center justify-center text-slate-400">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 mt-2 block">
                      Cutting Stack Inspection
                    </span>
                    <span className="text-[10px] text-slate-400 block">Unit 1 Factory Floor</span>
                  </div>

                  <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 text-center">
                    <div className="h-28 bg-slate-200 rounded flex items-center justify-center text-slate-400">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 mt-2 block">
                      Stitching Line Batch
                    </span>
                    <span className="text-[10px] text-slate-400 block">Sewing Assembly Proof</span>
                  </div>

                  <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 text-center">
                    <div className="h-28 bg-slate-200 rounded flex items-center justify-center text-slate-400">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 mt-2 block">
                      Final Carton Packing
                    </span>
                    <span className="text-[10px] text-slate-400 block">Shipment Preparation</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
