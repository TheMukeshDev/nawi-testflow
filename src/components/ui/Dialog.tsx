/**
 * NAWI TestFlow — Dialog Component v2
 *
 * Modal dialog for confirmations and important actions.
 *
 * Design:
 * - Simple centered modal
 * - Clear title, body, action buttons
 * - Destructive actions: red button
 * - Close: X, Escape, backdrop click
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'max-w-[360px]',
  md: 'max-w-[480px]',
  lg: 'max-w-[640px]',
};

export function Dialog({ open, onClose, title, children, size = 'md' }: DialogProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        'rounded-lg shadow-overlay backdrop:bg-gray-950/50',
        'border border-gray-200 p-0',
        sizeStyles[size],
      )}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="text-[16px] font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-[24px] h-[24px] rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
            aria-label="Close dialog"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M3 3l8 8M11 3l-8 8" />
            </svg>
          </button>
        </div>
        <div className="text-[13px] text-gray-600 leading-relaxed">
          {children}
        </div>
      </div>
    </dialog>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONFIRM DIALOG
// ═══════════════════════════════════════════════════════════════

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'primary' | 'danger';
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'primary',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title} size="sm">
      <p className="mb-5">{message}</p>
      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" size="md" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant={variant} size="md" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
