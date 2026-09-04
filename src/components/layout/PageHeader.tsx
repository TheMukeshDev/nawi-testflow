/**
 * NAWI TestFlow — PageHeader Component v2
 *
 * Consistent page header for all views.
 * Contains: Title, subtitle, action buttons, optional metadata row
 */

import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions, children }: PageHeaderProps) {
  return (
    <div className="mb-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-page-title">{title}</h1>
          <div className="h-[2px] w-[48px] bg-[#1e3a5f] mt-2 rounded" />
          {subtitle && (
            <p className="text-[13px] text-gray-500 mt-2 leading-normal">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
}
