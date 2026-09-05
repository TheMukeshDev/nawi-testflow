/**
 * NAWI Sahayak — Empty, Error, and Loading States v2
 *
 * Shown when:
 * - Empty: No records in a list
 * - Error: Something failed
 * - Loading: Data is being fetched
 *
 * Design:
 * - Muted icons, not illustrations
 * - Clear titles explaining what's happening
 * - Action buttons for next steps
 * - No animations, no decorative elements
 */

import React from 'react';
import Link from 'next/link';
import { Button } from './Button';

// ═══════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      {icon && <div className="mb-3 text-gray-300">{icon}</div>}
      <h3 className="text-[14px] font-semibold text-gray-700 mb-1">{title}</h3>
      <p className="text-[13px] text-gray-500 max-w-[360px] mb-4 leading-relaxed">{description}</p>
      {action && (
        action.href ? (
          <Link href={action.href}>
            <Button variant="primary" size="md">{action.label}</Button>
          </Link>
        ) : (
          <Button variant="primary" size="md" onClick={action.onClick}>{action.label}</Button>
        )
      )}
    </div>
  );
}

/**
 * No results — for search/filter returning nothing
 */
export function NoResults({ onClearFilters }: { onClearFilters?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="17" cy="17" r="11" />
          <path d="M25 25l8 8" strokeLinecap="round" />
          <path d="M14 14h6M14 17h4" strokeLinecap="round" opacity="0.4" />
        </svg>
      }
      title="No Results Found"
      description="No records match your current search or filter criteria. Try adjusting your filters or search terms."
      action={onClearFilters ? { label: 'Clear Filters', onClick: onClearFilters } : undefined}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// ERROR STATE
// ═══════════════════════════════════════════════════════════════

interface ErrorStateProps {
  title?: string;
  message: string;
  error?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  error,
  onRetry,
  onGoBack,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="mb-3 text-danger-400">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="20" cy="20" r="16" />
          <path d="M20 12v10" strokeLinecap="round" />
          <circle cx="20" cy="27" r="1" fill="currentColor" />
        </svg>
      </div>
      <h3 className="text-[14px] font-semibold text-danger-700 mb-1">{title}</h3>
      <p className="text-[13px] text-gray-600 max-w-[360px] mb-2 leading-relaxed">{message}</p>
      {error && (
        <pre className="text-[11px] text-gray-500 bg-gray-100 rounded-md px-3 py-2 mb-4 max-w-[400px] overflow-x-auto text-left">
          {error}
        </pre>
      )}
      <div className="flex items-center gap-2">
        {onGoBack && (
          <Button variant="secondary" size="md" onClick={onGoBack}>Go Back</Button>
        )}
        {onRetry && (
          <Button variant="primary" size="md" onClick={onRetry}>Try Again</Button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LOADING STATE
// ═══════════════════════════════════════════════════════════════

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading…' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <svg
        className="animate-spin mb-3 text-gray-400"
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
      >
        <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
        <path d="M16 3a13 13 0 0113 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <p className="text-[13px] text-gray-500">{message}</p>
    </div>
  );
}
