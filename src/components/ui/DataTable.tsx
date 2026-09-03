/**
 * NAWI TestFlow — DataTable Component v2
 *
 * The primary data display component.
 * Tables ARE the interface in laboratory software.
 *
 * Features:
 * - Column sorting
 * - Pagination
 * - Row selection
 * - Compliance indicators
 * - Skeleton loading
 * - Filter tabs
 *
 * Design:
 * - Fixed header, scrollable body
 * - Compact spacing (10px cell padding)
 * - Borders between rows, not around cells
 * - Monospace for technical values
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { PaginationState, SortState } from '@/types';

// ═══════════════════════════════════════════════════════════════
// COLUMN DEFINITION
// ═══════════════════════════════════════════════════════════════

export interface ColumnDef<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: number | string;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  accessor?: (row: T) => unknown;
  mono?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// TABLE PROPS
// ═══════════════════════════════════════════════════════════════

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  rowKey: (row: T) => string;
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  pagination?: PaginationState;
  onPageChange?: (page: number) => void;
  onRowClick?: (row: T) => void;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  selectable?: boolean;
  loading?: boolean;
  emptyState?: React.ReactNode;
  caption?: string;
  complianceIndicator?: {
    columnKey: string;
    colorMap: Record<string, 'pass' | 'fail' | 'conditional' | 'pending'>;
  };
}

// ═══════════════════════════════════════════════════════════════
// DATA TABLE
// ═══════════════════════════════════════════════════════════════

export function DataTable<T>({
  columns,
  data,
  rowKey,
  sort,
  onSortChange,
  pagination,
  onPageChange,
  onRowClick,
  selectedKeys = new Set(),
  onSelectionChange,
  selectable = false,
  loading = false,
  emptyState,
  caption,
  complianceIndicator,
}: DataTableProps<T>) {
  const allKeys = data.map(rowKey);
  const allSelected = allKeys.length > 0 && allKeys.every(k => selectedKeys.has(k));
  const someSelected = allKeys.some(k => selectedKeys.has(k)) && !allSelected;

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    onSelectionChange(allSelected ? new Set() : new Set(allKeys));
  };

  const handleSelectRow = (key: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedKeys);
    next.has(key) ? next.delete(key) : next.add(key);
    onSelectionChange(next);
  };

  const handleSort = (col: ColumnDef<T>) => {
    if (!col.sortable || !onSortChange) return;
    const newDirection = sort?.key === col.key && sort.direction === 'asc' ? 'desc' : 'asc';
    onSortChange({ key: col.key, direction: newDirection });
  };

  const getCellValue = (row: T, col: ColumnDef<T>): unknown => {
    if (col.accessor) return col.accessor(row);
    return (row as Record<string, unknown>)[col.key];
  };

  const getComplianceClass = (row: T): string => {
    if (!complianceIndicator) return '';
    const colDef = columns.find(c => c.key === complianceIndicator.columnKey);
    if (!colDef) return '';
    const value = String(getCellValue(row, colDef));
    const type = complianceIndicator.colorMap[value];
    if (!type) return '';
    const classMap = {
      pass: 'border-l-[3px] border-l-success-500',
      fail: 'border-l-[3px] border-l-danger-500',
      conditional: 'border-l-[3px] border-l-warning-500',
      pending: 'border-l-[3px] border-l-gray-400',
    };
    return classMap[type];
  };

  if (loading) {
    return <TableSkeleton columns={columns} selectable={selectable} />;
  }

  if (data.length === 0 && emptyState) {
    return <div className="panel">{emptyState}</div>;
  }

  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]" role="grid">
          {caption && <caption className="sr-only">{caption}</caption>}

          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {selectable && (
                <th className="w-[40px] px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={handleSelectAll}
                    className="w-3.5 h-3.5 rounded border-gray-300 accent-primary-600"
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  className={cn(
                    'px-2.5 py-2 text-left font-semibold text-gray-700',
                    'text-[12px] uppercase tracking-wide',
                    'border-b border-gray-200',
                    col.sortable && 'cursor-pointer hover:text-gray-900 select-none',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right',
                  )}
                  style={{ width: col.width, minWidth: col.minWidth }}
                  scope="col"
                  onClick={() => handleSort(col)}
                  aria-sort={
                    sort?.key === col.key
                      ? sort.direction === 'asc' ? 'ascending' : 'descending'
                      : col.sortable ? 'none' : undefined
                  }
                >
                  <span className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <span className="text-gray-400">
                        {sort?.key === col.key
                          ? sort.direction === 'asc' ? '↑' : '↓'
                          : <span className="text-gray-300">↕</span>
                        }
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {data.map((row, index) => {
              const key = rowKey(row);
              const isSelected = selectedKeys.has(key);

              return (
                <tr
                  key={key}
                  className={cn(
                    'border-b border-gray-100',
                    'hover:bg-gray-50 transition-colors duration-75',
                    onRowClick && 'cursor-pointer',
                    isSelected && 'bg-primary-50/50',
                    getComplianceClass(row),
                  )}
                  onClick={() => onRowClick?.(row)}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onRowClick?.(row);
                    }
                  }}
                  aria-selected={isSelected}
                >
                  {selectable && (
                    <td className="w-[40px] px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(key)}
                        className="w-3.5 h-3.5 rounded border-gray-300 accent-primary-600"
                        aria-label={`Select row ${index + 1}`}
                      />
                    </td>
                  )}
                  {columns.map(col => {
                    const value = getCellValue(row, col);
                    return (
                      <td
                        key={col.key}
                        className={cn(
                          'px-2.5 py-2 text-gray-800 align-middle',
                          col.align === 'center' && 'text-center',
                          col.align === 'right' && 'text-right',
                          col.mono && 'font-mono text-[12px]',
                        )}
                      >
                        {col.render ? col.render(value, row, index) : String(value ?? '—')}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 bg-gray-50 text-[12px] text-gray-500">
          <span>
            {pagination.total === 0
              ? 'No records'
              : `${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(pagination.page * pagination.pageSize, pagination.total)} of ${pagination.total}`
            }
          </span>
          <div className="flex items-center gap-1">
            <PaginationButton
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              label="Previous page"
            >
              ← Prev
            </PaginationButton>
            <span className="px-2 text-gray-600 font-medium">
              Page {pagination.page} of {Math.ceil(pagination.total / pagination.pageSize) || 1}
            </span>
            <PaginationButton
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
              label="Next page"
            >
              Next →
            </PaginationButton>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAGINATION BUTTON
// ═══════════════════════════════════════════════════════════════

function PaginationButton({
  onClick, disabled, label, children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'px-2 py-0.5 rounded text-[12px] font-medium',
        'border border-gray-200 bg-white',
        'hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none',
        'transition-colors duration-75',
      )}
      aria-label={label}
    >
      {children}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// SKELETON LOADING
// ═══════════════════════════════════════════════════════════════

function TableSkeleton<T>({
  columns, selectable,
}: {
  columns: ColumnDef<T>[];
  selectable: boolean;
}) {
  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {selectable && <th className="w-[40px] px-2 py-2" />}
              {columns.map(col => (
                <th key={col.key} className="px-2.5 py-2 text-left" style={{ width: col.width }}>
                  <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-gray-100">
                {selectable && <td className="px-2 py-2.5" />}
                {columns.map(col => (
                  <td key={col.key} className="px-2.5 py-2.5">
                    <div
                      className="h-3 bg-gray-100 rounded animate-pulse"
                      style={{
                        width: `${50 + Math.random() * 40}%`,
                        animationDelay: `${i * 50}ms`,
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TABLE FILTERS BAR
// ═══════════════════════════════════════════════════════════════

interface TableFiltersProps {
  children: React.ReactNode;
  className?: string;
}

export function TableFilters({ children, className }: TableFiltersProps) {
  return (
    <div className={cn('flex items-center gap-2 py-2 mb-2', className)}>
      {children}
    </div>
  );
}

/**
 * Filter tab group — segmented control
 */
interface FilterTabsProps {
  tabs: { label: string; value: string; count?: number }[];
  active: string;
  onChange: (value: string) => void;
}

export function FilterTabs({ tabs, active, onChange }: FilterTabsProps) {
  return (
    <div className="flex items-center gap-0 border border-gray-200 rounded-md bg-white overflow-x-auto">
      {tabs.map(tab => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium',
            'border-r border-gray-200 last:border-r-0',
            'transition-colors duration-75',
            active === tab.value
              ? 'bg-gray-100 text-gray-900'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
          )}
          aria-pressed={active === tab.value}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              'px-1 py-0 text-[10px] rounded-sm min-w-[18px] text-center',
              active === tab.value ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-500',
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
