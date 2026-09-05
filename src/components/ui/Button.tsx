/**
 * NAWI Sahayak — Button Component v2
 *
 * Variants:
 * - primary: Blue, for main actions (Save, Submit, Create)
 * - secondary: Gray outline, for secondary actions (Cancel, Back)
 * - danger: Red, for destructive actions (Delete, Reject)
 * - ghost: No background, for tertiary actions
 *
 * Sizes:
 * - sm: 28px height, 12px font
 * - md: 32px height, 13px font (default)
 * - lg: 36px height, 14px font
 *
 * Design:
 * - No rounded-full (max radius: 4px)
 * - No shadows on buttons
 * - Loading state: spinner replaces content
 * - Disabled: 50% opacity
 */

import React from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: cn(
    'bg-primary-600 text-white border border-primary-700',
    'hover:bg-primary-700',
    'active:bg-primary-800',
    'focus-visible:ring-primary-300',
  ),
  secondary: cn(
    'bg-white text-gray-700 border border-gray-300',
    'hover:bg-gray-50 hover:border-gray-400',
    'active:bg-gray-100',
    'focus-visible:ring-gray-200',
  ),
  danger: cn(
    'bg-danger-600 text-white border border-danger-700',
    'hover:bg-danger-700',
    'active:bg-danger-800',
    'focus-visible:ring-danger-200',
  ),
  ghost: cn(
    'bg-transparent text-gray-600 border border-transparent',
    'hover:bg-gray-100 hover:text-gray-800',
    'active:bg-gray-150',
    'focus-visible:ring-gray-200',
  ),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-[28px] px-2 text-[12px] font-medium gap-1',
  md: 'h-[32px] px-3 text-[13px] font-medium gap-1.5',
  lg: 'h-[36px] px-4 text-[14px] font-semibold gap-2',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md',
        'transition-colors duration-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        variantStyles[variant],
        sizeStyles[size],
        isDisabled && 'opacity-50 pointer-events-none',
        className,
      )}
      disabled={isDisabled}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
        >
          <circle
            cx="7"
            cy="7"
            r="5.5"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity="0.25"
          />
          <path
            d="M7 1.5a5.5 5.5 0 015.5 5.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <span className="shrink-0">{icon}</span>
          )}
          {children && <span>{children}</span>}
          {icon && iconPosition === 'right' && (
            <span className="shrink-0">{icon}</span>
          )}
        </>
      )}
    </button>
  );
}

/**
 * Icon-only button — for compact toolbar actions
 */
export function IconButton({
  variant = 'ghost',
  size = 'md',
  label,
  ...props
}: Omit<ButtonProps, 'children'> & { label: string }) {
  return (
    <Button
      variant={variant}
      size={size}
      aria-label={label}
      title={label}
      {...props}
    />
  );
}
