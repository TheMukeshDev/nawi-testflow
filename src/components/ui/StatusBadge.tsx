/**
 * NAWI TestFlow — Status Badge Component v2
 *
 * Maps domain types to visual configurations automatically.
 * Use these instead of raw Badge for consistent status display.
 */

import React from 'react';
import { Badge } from './Badge';
import { ComplianceIndicator } from './Badge';
import { cn } from '@/lib/utils';
import type { TestStatus, ComplianceVerdict, TestResult } from '@/types';
import { TEST_STATUS_CONFIG, COMPLIANCE_CONFIG, TEST_RESULT_CONFIG } from '@/lib/constants';

// ═══════════════════════════════════════════════════════════════
// TEST STATUS BADGE
// ═══════════════════════════════════════════════════════════════

export function TestStatusBadge({ status }: { status: TestStatus }) {
  const config = TEST_STATUS_CONFIG[status];
  return <Badge config={config}>{config.label}</Badge>;
}

// ═══════════════════════════════════════════════════════════════
// COMPLIANCE BADGE
// ═══════════════════════════════════════════════════════════════

export function ComplianceBadge({ verdict }: { verdict: ComplianceVerdict }) {
  const config = COMPLIANCE_CONFIG[verdict];
  return <Badge config={config}>{config.label}</Badge>;
}

/**
 * Prominent compliance indicator for test summary views
 */
export function ComplianceVerdictIndicator({ verdict }: { verdict: ComplianceVerdict }) {
  const colorMap: Record<ComplianceVerdict, 'success' | 'danger' | 'warning' | 'gray' | 'primary'> = {
    'compliant': 'success',
    'non-compliant': 'danger',
    'conditional': 'warning',
    'pending': 'gray',
    'not-applicable': 'gray',
  };
  return (
    <ComplianceIndicator
      verdict={colorMap[verdict]}
      label={COMPLIANCE_CONFIG[verdict].label}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// TEST RESULT BADGE
// ═══════════════════════════════════════════════════════════════

export function TestResultBadge({ result }: { result: TestResult }) {
  const config = TEST_RESULT_CONFIG[result];
  return <Badge config={config}>{config.label}</Badge>;
}

// ═══════════════════════════════════════════════════════════════
// WORKFLOW PROGRESS
// ═══════════════════════════════════════════════════════════════

/**
 * Horizontal step indicator showing test lifecycle progress.
 */
export function WorkflowProgress({ status }: { status: TestStatus }) {
  const steps = [
    { label: 'Draft', key: 'draft' },
    { label: 'Testing', key: 'in-testing' },
    { label: 'Observations', key: 'observations-complete' },
    { label: 'Calculations', key: 'calculations-complete' },
    { label: 'Review', key: 'pending-review' },
    { label: 'Completed', key: 'completed' },
  ];

  const statusToStep: Record<string, number> = {
    'draft': 0,
    'in-testing': 1,
    'observations-complete': 2,
    'calculations-pending': 2.5,
    'calculations-complete': 3,
    'pending-review': 4,
    'revision-requested': 4,
    'approved': 5,
    'rejected': 0,
    'completed': 5,
  };

  const currentStep = statusToStep[status] ?? 0;

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, index) => {
        const isActive = currentStep >= index;
        const isCurrent = Math.floor(currentStep) === index;

        return (
          <React.Fragment key={step.key}>
            <div className="flex items-center gap-1">
              <div
                className={cn(
                  'w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center text-[9px] font-bold shrink-0',
                  isActive
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : 'bg-white border-gray-300 text-gray-400',
                  isCurrent && 'ring-2 ring-primary-200',
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isActive ? '✓' : index + 1}
              </div>
              <span className={cn(
                'text-[10px] font-medium whitespace-nowrap',
                isActive ? 'text-gray-700' : 'text-gray-400',
              )}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                'w-[24px] h-[2px] mx-0.5',
                currentStep > index ? 'bg-primary-600' : 'bg-gray-200',
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONDITION DOT
// ═══════════════════════════════════════════════════════════════

/**
 * Inline dot for environmental readings status.
 */
export function ConditionDot({ status }: { status: 'normal' | 'out-of-range' | 'not-recorded' }) {
  const styles = {
    'normal': 'bg-success-500',
    'out-of-range': 'bg-danger-500',
    'not-recorded': 'bg-gray-300',
  };

  const labels = {
    'normal': 'Within range',
    'out-of-range': 'Out of range',
    'not-recorded': 'Not recorded',
  };

  return (
    <span
      className={cn('inline-block w-[8px] h-[8px] rounded-full', styles[status])}
      title={labels[status]}
      role="img"
      aria-label={labels[status]}
    />
  );
}
