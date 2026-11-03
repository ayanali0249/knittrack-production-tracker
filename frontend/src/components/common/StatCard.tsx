import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  accentColor?: 'emerald' | 'amber' | 'rose' | 'blue' | 'indigo';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  accentColor = 'blue',
  onClick,
}) => {
  const accentClasses = {
    emerald: 'border-l-4 border-l-emerald-500 bg-white hover:border-emerald-600',
    amber: 'border-l-4 border-l-amber-500 bg-white hover:border-amber-600',
    rose: 'border-l-4 border-l-rose-500 bg-white hover:border-rose-600',
    blue: 'border-l-4 border-l-blue-500 bg-white hover:border-blue-600',
    indigo: 'border-l-4 border-l-indigo-500 bg-white hover:border-indigo-600',
  }[accentColor];

  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-lg border border-slate-200 shadow-sm transition-all duration-150 ${accentClasses} ${
        onClick ? 'cursor-pointer hover:shadow-md' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider uppercase text-slate-500">
          {title}
        </span>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900">{value}</span>
        {trend && (
          <span
            className={`text-xs font-semibold ${
              trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
};
