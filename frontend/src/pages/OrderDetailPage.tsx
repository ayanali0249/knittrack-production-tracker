import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderService } from '../services/order.service';
import { productionService } from '../services/production.service';
import { aiService } from '../services/ai.service';
import { dashboardService } from '../services/dashboard.service';
import { useAuth } from '../context/AuthContext';
import type { ProductionOrder, OrderDelayAnalysis } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { DelayExplanationModal } from '../components/common/DelayExplanationModal';
import {
  ArrowLeft,
  Calendar,
  Building2,
  User,
  Clock,
  Sparkles,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Camera,
  Layers,
  Eye,
  EyeOff,
  ShieldAlert,
} from 'lucide-react';

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [delayAnalysis, setDelayAnalysis] = useState<OrderDelayAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Correction & Buyer Warning Approval states
  const [correctingUpdateId, setCorrectingUpdateId] = useState<string | null>(null);
  const [selectedCorrection, setSelectedCorrection] = useState<string>('Machine breakdown');
  const [isSavingCorrection, setIsSavingCorrection] = useState(false);
  const [isTogglingApproval, setIsTogglingApproval] = useState<string | null>(null);

  const fetchOrderDetail = async () => {
    if (!id) return;
    try {
      const [orderData, delayData] = await Promise.all([
        orderService.getOrderById(id),
        dashboardService.getOrderDelay(id),
      ]);
      setOrder(orderData);
      setDelayAnalysis(delayData);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch order details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

  const handleSaveCorrection = async (updateId: string) => {
    setIsSavingCorrection(true);
    try {
      await aiService.correctClassification(updateId, selectedCorrection);
      setCorrectingUpdateId(null);
      await fetchOrderDetail();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save correction.');
    } finally {
      setIsSavingCorrection(false);
    }
  };

  const handleToggleBuyerApproval = async (updateId: string, currentApproved: boolean) => {
    setIsTogglingApproval(updateId);
    try {
      await productionService.approveBuyerWarning(updateId, !currentApproved);
      await fetchOrderDetail();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update buyer warning visibility.');
    } finally {
      setIsTogglingApproval(null);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading order details..." className="min-h-[50vh]" />;
  }

  if (error || !order) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h2 className="text-base font-bold text-slate-900">Order Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">{error || 'Unable to retrieve order data.'}</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Return to Board
        </button>
      </div>
    );
  }

  const isMerchOrAdmin = user?.role === 'MERCHANDISER' || user?.role === 'ADMIN';

  // Extract all production updates across stages
  const allUpdates = (order.stages || []).flatMap((stage) =>
    (stage.productionUpdates || []).map((u) => ({
      ...u,
      stageName: stage.stageName,
    }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Production Board
        </button>
        <div className="flex items-center gap-2">
          <StatusBadge type="risk" value={order.riskLevel} />
          <StatusBadge type="order" value={order.status} />
        </div>
      </div>

      {/* Header Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black text-slate-900">{order.poNumber}</h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-slate-100 text-slate-700">
                {order.colour}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-600 mt-0.5">{order.styleName}</p>
            {order.description && (
              <p className="text-xs text-slate-400 mt-1">{order.description}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Buyer</span>
              <span className="font-bold text-slate-800">
                {order.buyer.name} ({order.buyer.country})
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                Ex-Factory Date
              </span>
              <span className="font-bold text-slate-800">
                {new Date(order.exFactoryDate).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                Total Order Qty
              </span>
              <span className="font-bold text-indigo-700 text-sm">
                {order.totalQuantity.toLocaleString()} pcs
              </span>
            </div>
          </div>
        </div>

        {/* Explainable Delay Prediction Summary Banner */}
        {delayAnalysis && (
          <div
            className={`mt-4 p-4 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              delayAnalysis.overallRiskLevel === 'ON_TRACK'
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : delayAnalysis.overallRiskLevel === 'AT_RISK'
                ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                : 'bg-rose-50/70 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold uppercase tracking-wider text-[10px] block">
                  Deterministic Delay Prediction
                </span>
                <p className="mt-0.5 leading-relaxed">{delayAnalysis.summary}</p>
              </div>
            </div>

            <button
              onClick={() => setModalOpen(true)}
              className="shrink-0 px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg shadow-2xs hover:bg-slate-50 text-slate-800 transition-colors"
            >
              View Calculation Details
            </button>
          </div>
        )}
      </div>

      {/* Size Matrix */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Size-Wise Breakdown
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
          {Object.entries(order.sizes || {}).map(([sz, qty]) => (
            <div key={sz} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
              <span className="font-bold text-slate-800 block text-sm">{sz}</span>
              <span className="text-slate-500 font-semibold mt-1 block">
                {(qty as number).toLocaleString()} pcs
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Production Stages & TNA Milestones */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Time-and-Action (TNA) Production Milestones
            </h3>
            <p className="text-xs text-slate-500">
              Planned vs actual execution timeline for each factory stage
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4">Planned Dates</th>
                <th className="py-3 px-4">Actual Dates</th>
                <th className="py-3 px-4">Quantity Progress</th>
                <th className="py-3 px-4">Stage Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.stages?.map((stage) => {
                const pct = Math.round(
                  (stage.completedQuantity / stage.plannedQuantity) * 100
                );
                return (
                  <tr key={stage.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center">
                        {stage.sequence}
                      </span>
                      {stage.stageName}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(stage.plannedStartDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                      })}{' '}
                      –{' '}
                      {new Date(stage.plannedEndDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {stage.actualStartDate ? (
                        <span>
                          {new Date(stage.actualStartDate).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                          })}
                          {stage.actualEndDate
                            ? ` – ${new Date(stage.actualEndDate).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                              })}`
                            : ' – Ongoing'}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Not started</span>
                      )}
                    </td>
                    <td className="py-3 px-4 min-w-[160px]">
                      <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                        <span>
                          {stage.completedQuantity.toLocaleString()} /{' '}
                          {stage.plannedQuantity.toLocaleString()} pcs
                        </span>
                        <span className="font-semibold text-slate-700">{pct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div
                          className="bg-indigo-600 h-1.5 rounded-full"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge type="stage" value={stage.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Production Floor Updates & AI Notes Log */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Supervisor Floor Updates & AI Classification
            </h3>
            <p className="text-xs text-slate-500">
              Daily floor logs with Tamil/English supervisor notes and AI issue classification
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded text-slate-600">
            {allUpdates.length} updates recorded
          </span>
        </div>

        {allUpdates.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 italic">
            No floor updates submitted yet for this order.
          </div>
        ) : (
          <div className="space-y-3">
            {allUpdates.map((update: any) => (
              <div
                key={update.id}
                className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2 text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{update.stageName}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600 font-medium">
                      Date:{' '}
                      {new Date(update.date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-indigo-700 font-bold">
                      +{update.quantity.toLocaleString()} pcs produced
                    </span>
                  </div>

                  <span className="text-slate-400 text-[11px]">
                    Supervisor: {update.supervisor?.name || 'Factory Floor'}
                  </span>
                </div>

                {/* Supervisor Note and AI Tag */}
                {(update.originalNote || update.note) && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div className="bg-white p-2.5 rounded border border-slate-200 flex-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        Supervisor Floor Note (Tamil / English)
                      </span>
                      <p className="text-slate-800 font-medium font-sans">
                        "{update.originalNote || update.note}"
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0">
                      {update.correctedCategory ? (
                        <div className="text-right">
                          <span className="text-[10px] text-amber-600 font-semibold block">
                            Manager Corrected:
                          </span>
                          <StatusBadge type="category" value={update.correctedCategory} />
                        </div>
                      ) : update.aiCategory ? (
                        <div className="text-right">
                          <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1 justify-end">
                            <Sparkles className="w-3 h-3" />
                            AI Suggestion ({Math.round((update.aiConfidence || 0.85) * 100)}%):
                          </span>
                          <StatusBadge type="category" value={update.aiCategory} />
                        </div>
                      ) : null}

                      {/* Buyer Warning Approval Status Badge */}
                      <div className="flex items-center gap-1.5">
                        {update.buyerWarningApproved ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <Eye className="w-3 h-3 text-emerald-600" />
                            Buyer Warning: Approved
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                            <EyeOff className="w-3 h-3 text-amber-600" />
                            Buyer Warning: Internal Only
                          </span>
                        )}

                        {/* Merchandiser Action Buttons */}
                        {isMerchOrAdmin && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleToggleBuyerApproval(update.id, update.buyerWarningApproved || false)}
                              disabled={isTogglingApproval === update.id}
                              className={`px-2 py-1 text-[11px] font-bold rounded border transition-colors ${
                                update.buyerWarningApproved
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              }`}
                              title={update.buyerWarningApproved ? 'Revoke buyer visibility' : 'Approve warning for buyer portal'}
                            >
                              {isTogglingApproval === update.id
                                ? 'Updating...'
                                : update.buyerWarningApproved
                                ? 'Revoke Buyer Warning'
                                : 'Approve for Buyer'}
                            </button>

                            <button
                              onClick={() => setCorrectingUpdateId(update.id)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded border border-slate-200 transition-colors"
                              title="Correct AI Category"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Inline Category Correction Form */}
                {correctingUpdateId === update.id && (
                  <div className="mt-2 p-3 bg-indigo-50/60 border border-indigo-200 rounded-lg flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-indigo-900">
                        Select Correct Category:
                      </span>
                      <select
                        value={selectedCorrection}
                        onChange={(e) => setSelectedCorrection(e.target.value)}
                        className="text-xs border border-indigo-300 rounded px-2 py-1 bg-white font-medium"
                      >
                        <option value="Machine breakdown">Machine breakdown</option>
                        <option value="Labour shortage">Labour shortage</option>
                        <option value="Material shortage">Material shortage</option>
                        <option value="Quality issue">Quality issue</option>
                        <option value="Power outage">Power outage</option>
                        <option value="Supplier delay">Supplier delay</option>
                        <option value="Weather disruption">Weather disruption</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCorrectingUpdateId(null)}
                        className="px-2.5 py-1 text-xs text-slate-600 bg-white border border-slate-200 rounded"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveCorrection(update.id)}
                        disabled={isSavingCorrection}
                        className="px-3 py-1 text-xs font-bold text-white bg-indigo-600 rounded hover:bg-indigo-700"
                      >
                        {isSavingCorrection ? 'Saving...' : 'Confirm Correction'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <DelayExplanationModal
        analysis={delayAnalysis}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
};
