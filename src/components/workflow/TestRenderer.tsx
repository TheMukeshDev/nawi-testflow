/**
 * NAWI Sahayak — Dynamic Test Renderer
 *
 * Renders test input fields, observation tables, and calculated values
 * based on test definitions. This component dynamically adapts to
 * any test defined in the test-definitions layer.
 *
 * Key Principle: No test-specific logic in React components.
 * All test structure comes from TestDefinition configuration.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Input, Select, Textarea, FieldSet } from '@/components/ui/FormControls';
import { Badge } from '@/components/ui/Badge';
import type { TestDefinition, TestInputField, TestObservationPoint, TestCalculatedValue } from '@/lib/test-definitions';

// ============================================================================
// TYPES
// ============================================================================

/** Observation data for a single point */
export interface ObservationData {
  values: number[];
  notes: string;
}

/** All observation data for a test */
export type TestObservationData = Record<string, ObservationData>;

/** Calculated results */
export interface TestCalculatedResults {
  [key: string]: number | string;
}

/** Test result data */
export interface TestResultData {
  inputs: Record<string, unknown>;
  observations: TestObservationData;
  calculatedResults: TestCalculatedResults;
  verdict?: 'pass' | 'fail' | 'pending';
  notes: string;
}

interface TestRendererProps {
  definition: TestDefinition;
  data: TestResultData;
  onChange: (data: TestResultData) => void;
  instrumentSpecs?: {
    maxCapacity?: number;
    maxCapacityUnit?: string;
    scaleInterval?: number;
    scaleIntervalUnit?: string;
    verificationScaleInterval?: number;
  };
  isReadOnly?: boolean;
}

// ============================================================================
// MAIN RENDERER
// ============================================================================

export function TestRenderer({
  definition,
  data,
  onChange,
  instrumentSpecs,
  isReadOnly = false,
}: TestRendererProps) {
  const handleInputChange = (key: string, value: unknown) => {
    onChange({
      ...data,
      inputs: { ...data.inputs, [key]: value },
    });
  };

  const handleObservationChange = (pointKey: string, index: number, value: string) => {
    const pointData = data.observations[pointKey] || { values: [], notes: '' };
    const newValues = [...pointData.values];
    newValues[index] = value === '' ? 0 : Number(value);

    onChange({
      ...data,
      observations: {
        ...data.observations,
        [pointKey]: { ...pointData, values: newValues },
      },
    });
  };

  const handleObservationNotesChange = (pointKey: string, notes: string) => {
    const pointData = data.observations[pointKey] || { values: [], notes: '' };
    onChange({
      ...data,
      observations: {
        ...data.observations,
        [pointKey]: { ...pointData, notes },
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* ── Test Header ── */}
      <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
        <div className="flex items-start gap-3">
          <Badge color="primary" variant="solid">{definition.code}</Badge>
          <div className="flex-1">
            <h3 className="text-[14px] font-semibold text-gray-900">{definition.name}</h3>
            <p className="text-[12px] text-gray-600 mt-0.5">{definition.purpose}</p>
            {definition.sectionReference && (
              <p className="text-[11px] text-gray-500 mt-1">{definition.sectionReference}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Input Fields ── */}
      {definition.inputFields.length > 0 && (
        <FieldSet legend="Test Parameters">
          <div className="grid grid-cols-2 gap-4">
            {definition.inputFields.map(field => (
              <InputFieldRenderer
                key={field.key}
                field={field}
                value={data.inputs[field.key]}
                onChange={(value) => handleInputChange(field.key, value)}
                instrumentSpecs={instrumentSpecs}
                isReadOnly={isReadOnly}
              />
            ))}
          </div>
        </FieldSet>
      )}

      {/* ── Observation Points ── */}
      <FieldSet legend="Observations" description="Enter measured values for each test point">
        <div className="space-y-4">
          {definition.observationPoints.map(point => (
            <ObservationPointRenderer
              key={point.key}
              point={point}
              data={data.observations[point.key]}
              onChange={(values, notes) => {
                handleObservationChange(point.key, 0, values[0]?.toString() || '');
                if (notes !== undefined) {
                  handleObservationNotesChange(point.key, notes);
                }
              }}
              onValueChange={(index, value) => handleObservationChange(point.key, index, value)}
              onNotesChange={(notes) => handleObservationNotesChange(point.key, notes)}
              isReadOnly={isReadOnly}
            />
          ))}
        </div>
      </FieldSet>

      {/* ── Calculated Values ── */}
      {definition.calculatedValues.length > 0 && (
        <FieldSet legend="Calculated Values">
          <div className="grid grid-cols-2 gap-4">
            {definition.calculatedValues.map(calc => (
              <CalculatedValueRenderer
                key={calc.key}
                definition={calc}
                value={data.calculatedResults[calc.key]}
              />
            ))}
          </div>
        </FieldSet>
      )}

      {/* ── Notes ── */}
      <FieldSet legend="Notes">
        <Textarea
          label="Test Notes"
          value={data.notes}
          onChange={(e) => onChange({ ...data, notes: e.target.value })}
          placeholder="Additional observations or notes for this test…"
          rows={2}
          readOnly={isReadOnly}
        />
      </FieldSet>
    </div>
  );
}

// ============================================================================
// INPUT FIELD RENDERER
// ============================================================================

function InputFieldRenderer({
  field,
  value,
  onChange,
  instrumentSpecs,
  isReadOnly,
}: {
  field: TestInputField;
  value: unknown;
  onChange: (value: unknown) => void;
  instrumentSpecs?: TestRendererProps['instrumentSpecs'];
  isReadOnly?: boolean;
}) {
  // Auto-fill from instrument specs if applicable
  const autoFilledValue = value ?? field.defaultValue;

  if (field.dataType === 'select' && field.options) {
    return (
      <Select
        label={field.label}
        value={String(autoFilledValue || '')}
        onChange={(e) => onChange(e.target.value)}
        options={field.options}
        placeholder={field.placeholder}
        required={field.required}
        disabled={isReadOnly}
      />
    );
  }

  return (
    <Input
      label={field.label}
      type={field.dataType === 'number' ? 'number' : 'text'}
      value={autoFilledValue === undefined || autoFilledValue === null ? '' : String(autoFilledValue)}
      onChange={(e) => {
        const val = field.dataType === 'number'
          ? (e.target.value === '' ? '' : Number(e.target.value))
          : e.target.value;
        onChange(val);
      }}
      placeholder={field.placeholder}
      required={field.required}
      monospace={field.dataType === 'number'}
      readOnly={isReadOnly}
    />
  );
}

// ============================================================================
// OBSERVATION POINT RENDERER
// ============================================================================

function ObservationPointRenderer({
  point,
  data,
  onValueChange,
  onNotesChange,
  isReadOnly,
}: {
  point: TestObservationPoint;
  data?: ObservationData;
  onChange?: (values: number[], notes?: string) => void;
  onValueChange: (index: number, value: string) => void;
  onNotesChange: (notes: string) => void;
  isReadOnly?: boolean;
}) {
  const values = data?.values || [];
  const notes = data?.notes || '';

  // Generate observation count from point definition
  const observationCount = point.observationCount || 1;

  return (
    <div className="p-3 bg-white border border-gray-200 rounded-md">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[13px] font-medium text-gray-900">{point.label}</span>
        <span className="text-[11px] text-gray-500">—</span>
        <span className="text-[12px] text-gray-600">{point.description}</span>
        {point.required && (
          <span className="text-[11px] text-danger-500">Required</span>
        )}
      </div>

      {/* Observation inputs */}
      <div className="grid grid-cols-5 gap-2 mb-2">
        {Array.from({ length: observationCount }).map((_, index) => (
          <div key={index} className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-500">Obs. {index + 1}</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.0001"
                value={values[index] || ''}
                onChange={(e) => onValueChange(index, e.target.value)}
                className="w-full h-[28px] px-2 text-[12px] font-mono text-gray-900 bg-white border border-gray-300 rounded-sm focus:outline-none focus:border-primary-500"
                readOnly={isReadOnly}
              />
              <span className="text-[10px] text-gray-400 shrink-0">{point.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-gray-500">Notes</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Optional observation notes…"
          className="w-full h-[24px] px-2 text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded-sm focus:outline-none focus:border-primary-500"
          readOnly={isReadOnly}
        />
      </div>
    </div>
  );
}

// ============================================================================
// CALCULATED VALUE RENDERER
// ============================================================================

function CalculatedValueRenderer({
  definition,
  value,
}: {
  definition: TestCalculatedValue;
  value?: number | string;
}) {
  return (
    <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
      <div className="text-[12px] text-gray-600 mb-1">{definition.label}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-[16px] font-semibold text-gray-900 font-mono">
          {value !== undefined && value !== null
            ? typeof value === 'number'
              ? value.toFixed(definition.decimals)
              : value
            : '—'
          }
        </span>
        {definition.unit && (
          <span className="text-[11px] text-gray-500">{definition.unit}</span>
        )}
      </div>
      <div className="text-[10px] text-gray-400 mt-1">
        {definition.formulaDescription}
      </div>
    </div>
  );
}
