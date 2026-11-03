import React from 'react';
import type { RiskLevel, StageStatus, OrderStatus } from '../../types';

interface StatusBadgeProps {
  type: 'risk' | 'stage' | 'order' | 'category';
  value: RiskLevel | StageStatus | OrderStatus | string;
  className?: string;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  type,
  value,
  className = '',
  showIcon = true,
}) => {
  // ── Risk Levels ──
  if (type === 'risk') {
    switch (value) {
      case 'ON_TRACK':
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}
          >
            {showIcon && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
            On Track
          </span>
        );
      case 'AT_RISK':
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 ${className}`}
          >
            {showIcon && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
            At Risk
          </span>
        );
      case 'DELAYED':
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 ${className}`}
          >
            {showIcon && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
            Delayed
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 ${className}`}>
            {value}
          </span>
        );
    }
  }

  // ── Stage Statuses ──
  if (type === 'stage') {
    switch (value) {
      case 'COMPLETED':
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}>
            Completed
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 ${className}`}>
            In Progress
          </span>
        );
      case 'DELAYED':
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 ${className}`}>
            Delayed
          </span>
        );
      case 'NOT_STARTED':
      default:
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 ${className}`}>
            Not Started
          </span>
        );
    }
  }

  // ── AI Reason Categories ──
  if (type === 'category') {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 ${className}`}>
        {value}
      </span>
    );
  }

  // Default Order Status
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 ${className}`}>
      {value}
    </span>
  );
};
