/**
 * NAWI Sahayak — Form Controls v2
 *
 * Input, Select, Textarea for laboratory data entry.
 *
 * Design:
 * - 32px height for all controls
 * - Labels always above the field
 * - 13px font for dense data entry
 * - Clear focus: blue border + ring
 * - Error: red border + message
 * - Required: red asterisk
 * - Monospace for numerical values
 * - Read-only: gray background
 */

import React from 'react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════
// SHARED STYLES
// ═══════════════════════════════════════════════════════════════

const baseInputStyles = cn(
  'flex w-full h-[32px] px-2.5',
  'text-[13px] text-gray-900 leading-normal',
  'bg-white border border-gray-300 rounded-md',
  'transition-colors duration-100',
  'placeholder:text-gray-400',
  'hover:border-gray-400',
  'focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-200',
  'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
);

const readOnlyStyles = cn(
  'bg-gray-50 border-gray-200 text-gray-700 cursor-default',
  'hover:border-gray-200',
);

const errorStyles = cn(
  'border-danger-400 hover:border-danger-500',
  'focus:border-danger-500 focus:ring-danger-200',
);

const monoStyles = cn(
  'font-mono text-[12px] tracking-tight',
);

// ═══════════════════════════════════════════════════════════════
// INPUT
// ═══════════════════════════════════════════════════════════════

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  monospace?: boolean;
  readOnly?: boolean;
  suffix?: string;
}

export function Input({
  label,
  required = false,
  error,
  hint,
  monospace = false,
  readOnly = false,
  suffix,
  id,
  className,
  ...props
}: InputProps) {
  const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-field-label">
        {label}
        {required && <span className="text-danger-500 ml-0.5" aria-label="required">*</span>}
      </label>

      <div className="relative">
        <input
          id={inputId}
          className={cn(
            baseInputStyles,
            readOnly && readOnlyStyles,
            error && errorStyles,
            monospace && monoStyles,
            suffix && 'pr-10',
            className,
          )}
          readOnly={readOnly}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {suffix && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-gray-400 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>

      {error && (
        <p id={`${inputId}-error`} className="text-[12px] text-danger-600 leading-tight" role="alert">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="text-[11px] text-gray-500 leading-tight">
          {hint}
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SELECT
// ═══════════════════════════════════════════════════════════════

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  options: { label: string; value: string }[];
  placeholder?: string;
}

export function Select({
  label,
  required = false,
  error,
  hint,
  options,
  placeholder = 'Select…',
  id,
  className,
  ...props
}: SelectProps) {
  const selectId = id || `select-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={selectId} className="text-field-label">
        {label}
        {required && <span className="text-danger-500 ml-0.5" aria-label="required">*</span>}
      </label>

      <div className="relative">
        <select
          id={selectId}
          className={cn(
            baseInputStyles,
            'appearance-none pr-8',
            error && errorStyles,
            className,
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <svg
          className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"
          width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
        >
          <path d="M3 4.5l3 3 3-3" />
        </svg>
      </div>

      {error && (
        <p id={`${selectId}-error`} className="text-[12px] text-danger-600 leading-tight" role="alert">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${selectId}-hint`} className="text-[11px] text-gray-500 leading-tight">
          {hint}
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TEXTAREA
// ═══════════════════════════════════════════════════════════════

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  readOnly?: boolean;
  rows?: number;
}

export function Textarea({
  label,
  required = false,
  error,
  hint,
  readOnly = false,
  rows = 3,
  id,
  className,
  ...props
}: TextareaProps) {
  const textareaId = id || `textarea-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={textareaId} className="text-field-label">
        {label}
        {required && <span className="text-danger-500 ml-0.5" aria-label="required">*</span>}
      </label>

      <textarea
        id={textareaId}
        rows={rows}
        className={cn(
          'w-full px-2.5 py-2',
          'text-[13px] text-gray-900 leading-normal',
          'bg-white border border-gray-300 rounded-md',
          'transition-colors duration-100',
          'placeholder:text-gray-400',
          'hover:border-gray-400',
          'focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-200',
          'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
          readOnly && readOnlyStyles,
          error && errorStyles,
          className,
        )}
        readOnly={readOnly}
        aria-invalid={!!error}
        aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
        {...props}
      />

      {error && (
        <p id={`${textareaId}-error`} className="text-[12px] text-danger-600 leading-tight" role="alert">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${textareaId}-hint`} className="text-[11px] text-gray-500 leading-tight">
          {hint}
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FIELD GROUP — horizontal label + input
// ═══════════════════════════════════════════════════════════════

interface FieldGroupProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FieldGroup({ label, required, children, className }: FieldGroupProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <label className="text-[12px] font-medium text-gray-600 whitespace-nowrap shrink-0">
        {label}
        {required && <span className="text-danger-500 ml-0.5">*</span>}
      </label>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FIELDSET — groups related fields
// ═══════════════════════════════════════════════════════════════

interface FieldSetProps {
  legend: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FieldSet({ legend, description, children, className }: FieldSetProps) {
  return (
    <fieldset className={cn('border border-gray-200 rounded-md p-4', className)}>
      <legend className="text-section-title px-1">{legend}</legend>
      {description && (
        <p className="text-[12px] text-gray-500 mt-0 mb-3">{description}</p>
      )}
      <div className="flex flex-col gap-3">{children}</div>
    </fieldset>
  );
}
