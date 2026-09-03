/**
 * NAWI TestFlow — Alert Component v2
 *
 * Inline alerts for system messages and warnings.
 * Not decorative — always conveys actionable information.
 *
 * Variants:
 * - info: Blue, neutral information
 * - success: Green, operation completed
 * - warning: Amber, attention needed
 * - error: Red, something failed
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { AlertType } from '@/types';

interface AlertProps {
  type: AlertType;
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const alertStyles: Record<AlertType, {
  container: string;
  icon: string;
  iconPath: React.ReactNode;
}> = {
  info: {
    container: 'bg-info-50 border-info-300 text-info-800',
    icon: 'text-info-500',
    iconPath: (
      <path d="M9 7a1 1 0 011-1h.01M9 7v4M9 13.01V13" strokeWidth="1.5" strokeLinecap="round" />
    ),
  },
  success: {
    container: 'bg-success-50 border-success-300 text-success-800',
    icon: 'text-success-500',
    iconPath: (
      <path d="M4 7.5l3 3 5-5.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  warning: {
    container: 'bg-warning-50 border-warning-300 text-warning-800',
    icon: 'text-warning-500',
    iconPath: (
      <path d="M9 4v5M9 12v.5" strokeWidth="1.5" strokeLinecap="round" />
    ),
  },
  error: {
    container: 'bg-danger-50 border-danger-300 text-danger-800',
    icon: 'text-danger-500',
    iconPath: (
      <path d="M5 5l6 6M11 5l-6 6" strokeWidth="1.5" strokeLinecap="round" />
    ),
  },
};

export function Alert({ type, title, children, onDismiss, className }: AlertProps) {
  const styles = alertStyles[type];

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2.5 p-3 border rounded-md text-[13px]',
        styles.container,
        className,
      )}
    >
      <svg
        width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
        className={cn('shrink-0 mt-0.5', styles.icon)}
      >
        <circle cx="8" cy="8" r="6.5" />
        {styles.iconPath}
      </svg>

      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold text-[13px] leading-tight mb-0.5">{title}</p>}
        <div className="text-[12px] leading-relaxed opacity-90">{children}</div>
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 p-0.5 rounded hover:bg-black/5 transition-colors"
          aria-label="Dismiss alert"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M3 3l6 6M9 3l-6 6" />
          </svg>
        </button>
      )}
    </div>
  );
}
