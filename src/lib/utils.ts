/**
 * NAWI Sahayak — Utility Functions
 *
 * Pure utility functions used across the application.
 * No side effects, no React dependencies.
 */

import type { MassUnit, PaginationState, SortState, TestStatus } from '@/types';
import { TEST_STATUS_ORDER } from './constants';

// ═══════════════════════════════════════════════════════════════
// FORMATTING
// ═══════════════════════════════════════════════════════════════

/** Format a mass value with its unit */
export function formatMass(value: number, unit: MassUnit, decimals?: number): string {
  const d = decimals ?? getDecimalsForUnit(unit);
  return `${value.toFixed(d)} ${unit}`;
}

/** Get appropriate decimal places for a mass unit */
function getDecimalsForUnit(unit: MassUnit): number {
  switch (unit) {
    case 'mg': return 3;
    case 'g': return 3;
    case 'kg': return 4;
    case 't': return 4;
    default: return 3;
  }
}

/** Format a number with locale-appropriate separators */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Format a percentage */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/** Format temperature */
export function formatTemperature(value: number, unit: '°C' | '°F' = '°C'): string {
  return `${value.toFixed(1)}${unit}`;
}

/** Format humidity */
export function formatHumidity(value: number): string {
  return `${value.toFixed(1)}% RH`;
}

// ═══════════════════════════════════════════════════════════════
// DATE/TIME FORMATTING
// ═══════════════════════════════════════════════════════════════

/** Format ISO date to display format: "03 Sep 2026" */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Format ISO datetime to display format: "03 Sep 2026, 14:30" */
export function formatDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Format relative time: "2 hours ago", "3 days ago" */
export function formatRelativeTime(isoDate: string): string {
  const now = new Date();
  const date = new Date(isoDate);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(isoDate);
}

// ═══════════════════════════════════════════════════════════════
// ID GENERATION & DISPLAY
// ═══════════════════════════════════════════════════════════════

/** Generate a test number: TST-YYYY-NNNNNN */
export function generateTestNumber(sequence: number): string {
  const year = new Date().getFullYear();
  return `TST-${year}-${String(sequence).padStart(6, '0')}`;
}

/** Generate a report number: RPT-YYYY-NNNNNN */
export function generateReportNumber(sequence: number): string {
  const year = new Date().getFullYear();
  return `RPT-${year}-${String(sequence).padStart(6, '0')}`;
}

/** Truncate a long ID for display */
export function truncateId(id: string, length: number = 8): string {
  if (id.length <= length) return id;
  return `${id.slice(0, length)}…`;
}

// ═══════════════════════════════════════════════════════════════
// CALCULATIONS (for display/preview, not authoritative)
// ═══════════════════════════════════════════════════════════════

/** Calculate mean of an array of numbers */
export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Calculate standard deviation (sample) */
export function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = calculateMean(values);
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, v) => sum + v, 0) / (values.length - 1);
  return Math.sqrt(avgSquaredDiff);
}

/** Calculate maximum permissible error per OIML R-76
 *  Simplified: e = max(0.5e, 1e) for Class III instruments
 *  This is illustrative — actual MPE depends on verification scale divisions */
export function calculateMPE(classFactor: number, scaleDivisions: number): number {
  return classFactor / scaleDivisions;
}

// ═══════════════════════════════════════════════════════════════
// WORKFLOW HELPERS
// ═══════════════════════════════════════════════════════════════

/** Get the workflow step number (1-indexed) for a status */
export function getStatusStep(status: TestStatus): number {
  return TEST_STATUS_ORDER.indexOf(status) + 1;
}

/** Get total workflow steps */
export function getTotalWorkflowSteps(): number {
  return TEST_STATUS_ORDER.length;
}

/** Calculate percentage of workflow completed */
export function getWorkflowProgress(status: TestStatus): number {
  const step = getStatusStep(status);
  return Math.round((step / TEST_STATUS_ORDER.length) * 100);
}

// ═══════════════════════════════════════════════════════════════
// CLASSNAME HELPERS
// ═══════════════════════════════════════════════════════════════

/** Simple classname joiner — filters falsy values */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ═══════════════════════════════════════════════════════════════
// TABLE HELPERS
// ═══════════════════════════════════════════════════════════════

/** Get total pages from pagination state */
export function getTotalPages(pagination: PaginationState): number {
  return Math.ceil(pagination.total / pagination.pageSize);
}

/** Get page range display: "1–25 of 342" */
export function getPageRange(pagination: PaginationState): string {
  const start = (pagination.page - 1) * pagination.pageSize + 1;
  const end = Math.min(pagination.page * pagination.pageSize, pagination.total);
  return `${start}–${end} of ${pagination.total}`;
}
