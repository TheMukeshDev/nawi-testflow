/**
 * NAWI Sahayak — Workflow Step Indicator
 *
 * Visual indicator showing progress through the test report workflow.
 * Displays current step, completed steps, and remaining steps.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface WorkflowStepConfig {
  id: string;
  label: string;
  description?: string;
}

interface WorkflowStepIndicatorProps {
  steps: WorkflowStepConfig[];
  currentStep: string;
  completedSteps: string[];
}

export function WorkflowStepIndicator({
  steps,
  currentStep,
  completedSteps,
}: WorkflowStepIndicatorProps) {
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <nav aria-label="Workflow progress" className="mb-6">
      <ol className="flex items-center gap-0">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const isPast = index < currentIndex;

          return (
            <React.Fragment key={step.id}>
              {/* Step */}
              <li className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex items-center justify-center w-[24px] h-[24px] rounded-full text-[11px] font-semibold shrink-0',
                    'border-2 transition-colors',
                    isCompleted || isPast
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : isCurrent
                        ? 'bg-white border-primary-600 text-primary-600'
                        : 'bg-white border-gray-300 text-gray-400',
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted || isPast ? '✓' : index + 1}
                </div>
                <div className="hidden sm:block">
                  <div className={cn(
                    'text-[12px] font-medium',
                    isCurrent ? 'text-gray-900' : 'text-gray-500',
                  )}>
                    {step.label}
                  </div>
                  {step.description && isCurrent && (
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {step.description}
                    </div>
                  )}
                </div>
              </li>

              {/* Connector */}
              {index < steps.length - 1 && (
                <div className={cn(
                  'flex-1 h-[2px] mx-2',
                  index < currentIndex ? 'bg-primary-600' : 'bg-gray-200',
                )} />
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

// ============================================================================
// WORKFLOW STEP CONTENT WRAPPER
// ============================================================================

interface WorkflowStepContentProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function WorkflowStepContent({
  title,
  description,
  children,
  actions,
}: WorkflowStepContentProps) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-section-title">{title}</h2>
        {description && (
          <p className="text-[13px] text-gray-500 mt-1">{description}</p>
        )}
      </div>

      <div className="mb-6">
        {children}
      </div>

      {actions && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          {actions}
        </div>
      )}
    </div>
  );
}
