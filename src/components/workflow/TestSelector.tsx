/**
 * NAWI TestFlow — Test Selector
 *
 * Displays available tests based on instrument configuration
 * and allows selection of which tests to perform.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import type { TestDefinition } from '@/lib/test-definitions';

interface TestSelectorProps {
  availableTests: TestDefinition[];
  selectedTests: string[];
  onChange: (selectedCodes: string[]) => void;
  instrumentClass?: string;
  verificationType?: string;
  isReadOnly?: boolean;
}

export function TestSelector({
  availableTests,
  selectedTests,
  onChange,
  instrumentClass,
  verificationType,
  isReadOnly = false,
}: TestSelectorProps) {
  const toggleTest = (code: string) => {
    if (isReadOnly) return;
    
    if (selectedTests.includes(code)) {
      onChange(selectedTests.filter(c => c !== code));
    } else {
      onChange([...selectedTests, code]);
    }
  };

  const selectAll = () => {
    if (isReadOnly) return;
    onChange(availableTests.map(t => t.code));
  };

  const clearAll = () => {
    if (isReadOnly) return;
    onChange([]);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[13px] font-medium text-gray-700">
            {selectedTests.length} of {availableTests.length} tests selected
          </span>
          {instrumentClass && (
            <span className="text-[11px] text-gray-500 ml-2">
              (Class {instrumentClass})
            </span>
          )}
        </div>
        {!isReadOnly && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-[11px] text-primary-600 hover:text-primary-700"
            >
              Select All
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={clearAll}
              className="text-[11px] text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Test list */}
      <div className="space-y-2">
        {availableTests.map(test => {
          const isSelected = selectedTests.includes(test.code);
          const isDefault = test.enabledByDefault;

          return (
            <button
              key={test.code}
              type="button"
              onClick={() => toggleTest(test.code)}
              className={cn(
                'w-full p-3 rounded-md border text-left transition-colors',
                isSelected
                  ? 'bg-primary-50 border-primary-300'
                  : 'bg-white border-gray-200 hover:border-gray-300',
                isReadOnly && 'cursor-default',
              )}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <div className={cn(
                  'flex items-center justify-center w-[18px] h-[18px] rounded border-2 mt-0.5 shrink-0',
                  isSelected
                    ? 'bg-primary-600 border-primary-600'
                    : 'bg-white border-gray-300',
                )}>
                  {isSelected && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge color="primary" variant="outline">{test.code}</Badge>
                    <span className="text-[13px] font-medium text-gray-900">{test.name}</span>
                    {isDefault && !isSelected && (
                      <Badge color="gray" variant="subtle">Default</Badge>
                    )}
                  </div>
                  <p className="text-[12px] text-gray-600 mt-1 line-clamp-2">
                    {test.purpose}
                  </p>
                  {test.sectionReference && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      {test.sectionReference}
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {availableTests.length === 0 && (
        <div className="py-8 text-center text-[13px] text-gray-500">
          No tests are applicable to the selected instrument configuration.
        </div>
      )}
    </div>
  );
}
