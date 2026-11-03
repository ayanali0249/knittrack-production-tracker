import React from 'react';
import type { OrderDelayAnalysis } from '../../types';
import { StatusBadge } from './StatusBadge';
import { X, Calendar, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface DelayExplanationModalProps {
  analysis: OrderDelayAnalysis | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DelayExplanationModal: React.FC<DelayExplanationModalProps> = ({
  analysis,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !analysis) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-slate-900">
                Delay Prediction & Risk Audit: {analysis.poNumber}
              </h3>
              <StatusBadge type="risk" value={analysis.overallRiskLevel} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Deterministic, formulaic risk assessment based on Tiruppur factory production rate
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Plain English Summary Callout */}
          <div
            className={`p-4 rounded-lg border text-sm ${
              analysis.overallRiskLevel === 'ON_TRACK'
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                : analysis.overallRiskLevel === 'AT_RISK'
                ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                : 'bg-rose-50/60 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-start gap-3">
              {analysis.overallRiskLevel === 'ON_TRACK' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold text-xs uppercase tracking-wider mb-1">
                  System Prediction Explanation
                </p>
                <p className="leading-relaxed">{analysis.summary}</p>
              </div>
            </div>
          </div>

          {/* Transparent Mathematical Formula Breakdown */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/40">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
              Transparent Calculation Formulas
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded border border-slate-200">
                <span className="font-semibold text-slate-700">Actual Daily Rate:</span>
                <p className="text-slate-500 font-mono mt-1">
                  Rate = Completed Qty / Elapsed Business Days
                </p>
              </div>
              <div className="p-3 bg-white rounded border border-slate-200">
                <span className="font-semibold text-slate-700">Required Daily Rate:</span>
                <p className="text-slate-500 font-mono mt-1">
                  Req = Remaining Qty / Remaining Business Days
                </p>
              </div>
              <div className="p-3 bg-white rounded border border-slate-200">
                <span className="font-semibold text-slate-700">Estimated Completion:</span>
                <p className="text-slate-500 font-mono mt-1">
                  Est Days = Remaining Qty / Actual Daily Rate
                </p>
              </div>
              <div className="p-3 bg-white rounded border border-slate-200">
                <span className="font-semibold text-slate-700">Projected Delay:</span>
                <p className="text-slate-500 font-mono mt-1">
                  Delay = Projected End Date - Planned End Date
                </p>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-3 italic">
              * Assumptions: 6-day production workweek (Monday–Saturday). Sunday excluded. Past deadlines with remaining work automatically flag as DELAYED.
            </p>
          </div>

          {/* Stage by Stage Analysis */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
              Stage Milestone Analysis
            </h4>
            <div className="space-y-3">
              {analysis.stages.map((stage) => (
                <div
                  key={stage.stageId}
                  className="p-4 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-800">{stage.stageName}</span>
                      <StatusBadge type="stage" value={stage.status} />
                    </div>
                    <StatusBadge type="risk" value={stage.riskLevel} />
                  </div>

                  {/* Quantity Progress */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>
                        Progress: {stage.completedQuantity.toLocaleString()} / {stage.plannedQuantity.toLocaleString()} pcs
                      </span>
                      <span className="font-semibold">
                        {Math.round((stage.completedQuantity / stage.plannedQuantity) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          stage.riskLevel === 'ON_TRACK'
                            ? 'bg-emerald-500'
                            : stage.riskLevel === 'AT_RISK'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            (stage.completedQuantity / stage.plannedQuantity) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Detailed Stage Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 block">Actual Rate:</span>
                      <span className="font-semibold text-slate-700">
                        {stage.actualDailyRate > 0 ? `${stage.actualDailyRate} pcs/day` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Required Rate:</span>
                      <span className="font-semibold text-slate-700">
                        {stage.requiredDailyRate > 0 ? `${stage.requiredDailyRate} pcs/day` : '0 pcs/day'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Days Remaining:</span>
                      <span className="font-semibold text-slate-700">
                        {stage.remainingBusinessDays} business days
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Projected Delay:</span>
                      <span
                        className={`font-semibold ${
                          stage.projectedDelayDays > 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {stage.projectedDelayDays > 0 ? `+${stage.projectedDelayDays} days` : '0 days'}
                      </span>
                    </div>
                  </div>

                  {/* Stage Explanation Text */}
                  <p className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                    {stage.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Close Breakdown
          </button>
        </div>
      </div>
    </div>
  );
};
