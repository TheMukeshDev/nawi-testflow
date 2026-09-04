/**
 * NAWI TestFlow — MetricCard
 *
 * Shared KPI card used across all dashboards. Optional leading icon tile,
 * accent-tinted top border, and an optional hint line. Design-system
 * consistent: no gradients, flat accents, compact density.
 */

import React from 'react';

export type MetricTone = 'primary' | 'warning' | 'success' | 'danger' | 'info' | 'gray';

interface MetricCardProps {
  label: string;
  value: string | number;
  tone?: MetricTone;
  icon?: React.ReactNode;
  hint?: string;
  className?: string;
}

const toneStyles: Record<MetricTone, { accent: string; iconBg: string; iconText: string }> = {
  primary: { accent: 'border-t-primary-500', iconBg: 'bg-primary-50', iconText: 'text-primary-600' },
  warning: { accent: 'border-t-warning-500', iconBg: 'bg-warning-50', iconText: 'text-warning-700' },
  success: { accent: 'border-t-success-500', iconBg: 'bg-success-50', iconText: 'text-success-700' },
  danger: { accent: 'border-t-danger-500', iconBg: 'bg-danger-50', iconText: 'text-danger-600' },
  info: { accent: 'border-t-info-500', iconBg: 'bg-info-50', iconText: 'text-info-700' },
  gray: { accent: 'border-t-gray-400', iconBg: 'bg-gray-100', iconText: 'text-gray-600' },
};

export function MetricCard({ label, value, tone = 'gray', icon, hint, className }: MetricCardProps) {
  const s = toneStyles[tone];

  return (
    <div className={`bg-white border border-gray-200 rounded border-t-2 ${s.accent} shadow-xs ${className ?? ''}`}>
      <div className="flex items-center gap-3 px-3.5 py-3">
        {icon && (
          <div className={`flex items-center justify-center w-[36px] h-[36px] rounded ${s.iconBg} ${s.iconText} shrink-0`}>
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide truncate">{label}</div>
          <div className="text-[22px] font-bold text-gray-900 leading-tight">{value}</div>
          {hint && <div className="text-[10px] text-gray-400 truncate">{hint}</div>}
        </div>
      </div>
    </div>
  );
}