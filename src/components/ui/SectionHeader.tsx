/**
 * NAWI Sahayak — SectionHeader
 *
 * Consistent section heading used inside dashboard panels: title with an
 * optional icon, an optional count pill, and an optional right-aligned action.
 */

import React from 'react';

interface SectionHeaderProps {
  title: string;
  count?: number;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, count, icon, action, className }: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between gap-3 mb-3 ${className ?? ''}`}>
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className="text-gray-400 shrink-0">{icon}</span>}
        <h2 className="text-[14px] font-semibold text-gray-900 truncate">{title}</h2>
        {count !== undefined && (
          <span className="px-1.5 py-0.5 text-[11px] font-semibold text-gray-600 bg-gray-100 border border-gray-200 rounded min-w-[20px] text-center">
            {count}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}