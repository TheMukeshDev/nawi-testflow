/**
 * NAWI TestFlow — Badge Component v2
 *
 * Used for:
 * - Test status indicators
 * - Compliance verdicts
 * - Category labels
 *
 * Variants:
 * - solid: Filled background, white text
 * - outline: Border only, colored text
 * - subtle: Light background, dark text
 *
 * Optional dot indicator for active/running states.
 * No animations. Static, scannable information.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { StatusConfig } from '@/types';

type BadgeVariant = 'solid' | 'outline' | 'subtle';
type BadgeColor = 'gray' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  config?: StatusConfig;
  color?: BadgeColor;
  variant?: BadgeVariant;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const colorStyles: Record<BadgeColor, { solid: string; outline: string; subtle: string }> = {
  gray: {
    solid: 'bg-gray-600 text-white border-gray-700',
    outline: 'bg-transparent text-gray-600 border-gray-300',
    subtle: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  primary: {
    solid: 'bg-primary-600 text-white border-primary-700',
    outline: 'bg-transparent text-primary-600 border-primary-300',
    subtle: 'bg-primary-50 text-primary-700 border-primary-200',
  },
  success: {
    solid: 'bg-success-600 text-white border-success-700',
    outline: 'bg-transparent text-success-600 border-success-300',
    subtle: 'bg-success-50 text-success-700 border-success-200',
  },
  warning: {
    solid: 'bg-warning-600 text-white border-warning-700',
    outline: 'bg-transparent text-warning-600 border-warning-300',
    subtle: 'bg-warning-50 text-warning-700 border-warning-200',
  },
  danger: {
    solid: 'bg-danger-600 text-white border-danger-700',
    outline: 'bg-transparent text-danger-600 border-danger-300',
    subtle: 'bg-danger-50 text-danger-700 border-danger-200',
  },
  info: {
    solid: 'bg-info-600 text-white border-info-700',
    outline: 'bg-transparent text-info-600 border-info-300',
    subtle: 'bg-info-50 text-info-700 border-info-200',
  },
};

const dotColors: Record<BadgeColor, string> = {
  gray: 'bg-gray-400',
  primary: 'bg-primary-400',
  success: 'bg-success-400',
  warning: 'bg-warning-400',
  danger: 'bg-danger-400',
  info: 'bg-info-400',
};

export function Badge({
  config,
  color: colorProp,
  variant: variantProp,
  dot: dotProp,
  children,
  className,
}: BadgeProps) {
  const color = config?.color ?? colorProp ?? 'gray';
  const variant = config?.variant ?? variantProp ?? 'subtle';
  const showDot = config?.dot ?? dotProp ?? false;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5',
        'text-[11px] font-semibold leading-none whitespace-nowrap',
        'border rounded-sm',
        colorStyles[color][variant],
        className,
      )}
    >
      {showDot && (
        <span className={cn('w-[5px] h-[5px] rounded-full shrink-0', dotColors[color])} />
      )}
      {children}
    </span>
  );
}

/**
 * Compliance indicator — larger badge with left border strip
 */
export function ComplianceIndicator({
  verdict,
  label,
  className,
}: {
  verdict: BadgeColor;
  label: string;
  className?: string;
}) {
  const borderColors: Record<BadgeColor, string> = {
    gray: 'border-l-gray-400',
    primary: 'border-l-primary-500',
    success: 'border-l-success-500',
    warning: 'border-l-warning-500',
    danger: 'border-l-danger-500',
    info: 'border-l-info-500',
  };

  const bgColors: Record<BadgeColor, string> = {
    gray: 'bg-gray-50',
    primary: 'bg-primary-50',
    success: 'bg-success-50',
    warning: 'bg-warning-50',
    danger: 'bg-danger-50',
    info: 'bg-info-50',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 border-l-[3px] rounded-r-sm',
        borderColors[verdict],
        bgColors[verdict],
        className,
      )}
    >
      <span className="text-[13px] font-semibold text-gray-800">
        {label}
      </span>
    </div>
  );
}
