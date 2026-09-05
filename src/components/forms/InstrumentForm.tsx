/**
 * NAWI Sahayak — Instrument Form
 *
 * Form for creating and editing instruments.
 * Includes:
 * - Manufacturer selection
 * - Model selection or creation
 * - Technical specifications
 * - Duplicate prevention
 * - Validation
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { todayISO, plusYearsISO } from '@/lib/dates';
import { Input, Select, Textarea, FieldSet } from '@/components/ui/FormControls';
import { Button } from '@/components/ui/Button';
import type { Manufacturer, InstrumentModel, MassUnit, InstrumentClass } from '@/types';

// ============================================================================
// FORM DATA TYPES
// ============================================================================

export interface InstrumentFormData {
  // Manufacturer
  manufacturerId: string;
  manufacturerName: string;
  
  // Model
  modelId: string;
  modelName: string;
  modelNumber: string;
  
  // Instrument identification
  serialNumber: string;
  assetTag?: string;
  
  // Technical specifications
  instrumentType: 'mechanical' | 'electronic' | 'electromechanical';
  instrumentClass?: InstrumentClass;
  accuracyClass?: string;
  
  // Capacity
  maxCapacity: number | '';
  maxCapacityUnit: MassUnit;
  minCapacity: number | '';
  minCapacityUnit: MassUnit;
  
  // Scale intervals
  scaleInterval: number | '';
  scaleIntervalUnit: MassUnit;
  verificationScaleInterval?: number | '';
  verificationScaleIntervalUnit?: MassUnit;
  numberOfVerificationIntervals?: number | '';
  
  // Additional info
  softwareVersion?: string;
  firmwareVersion?: string;
  powerSupply?: string;
  
  // Laboratory
  laboratoryId: string;
  
  // Dates
  dateReceived: string;
  lastCalibration?: string;
  nextCalibration?: string;
  
  // Condition
  condition: 'good' | 'needs-repair' | 'out-of-service';
  
  // Notes
  notes?: string;
}

export interface InstrumentFormErrors {
  [key: string]: string | undefined;
}

// ============================================================================
// VALIDATION
// ============================================================================

export function validateInstrumentForm(data: InstrumentFormData): InstrumentFormErrors {
  const errors: InstrumentFormErrors = {};
  
  // Manufacturer
  if (!data.manufacturerId && !data.manufacturerName) {
    errors.manufacturerId = 'Manufacturer is required';
  }
  
  // Model
  if (!data.modelName) {
    errors.modelName = 'Model name is required';
  }
  if (!data.modelNumber) {
    errors.modelNumber = 'Model number is required';
  }
  
  // Serial number
  if (!data.serialNumber) {
    errors.serialNumber = 'Serial number is required';
  } else if (data.serialNumber.length < 3) {
    errors.serialNumber = 'Serial number must be at least 3 characters';
  }
  
  // Instrument type
  if (!data.instrumentType) {
    errors.instrumentType = 'Instrument type is required';
  }
  
  // Capacity
  if (data.maxCapacity === '' || data.maxCapacity === 0) {
    errors.maxCapacity = 'Maximum capacity is required';
  } else if (data.maxCapacity < 0) {
    errors.maxCapacity = 'Maximum capacity must be positive';
  }
  
  if (data.minCapacity === '') {
    errors.minCapacity = 'Minimum capacity is required';
  } else if (Number(data.minCapacity) < 0) {
    errors.minCapacity = 'Minimum capacity must be positive';
  }
  
  if (data.maxCapacity !== '' && data.minCapacity !== '' && Number(data.minCapacity) >= Number(data.maxCapacity)) {
    errors.minCapacity = 'Minimum capacity must be less than maximum capacity';
  }
  
  // Scale interval
  if (data.scaleInterval === '' || data.scaleInterval === 0) {
    errors.scaleInterval = 'Scale interval is required';
  } else if (data.scaleInterval < 0) {
    errors.scaleInterval = 'Scale interval must be positive';
  }
  
  // Laboratory
  if (!data.laboratoryId) {
    errors.laboratoryId = 'Laboratory is required';
  }
  
  // Date received
  if (!data.dateReceived) {
    errors.dateReceived = 'Date received is required';
  }
  
  // Condition
  if (!data.condition) {
    errors.condition = 'Condition is required';
  }
  
  return errors;
}

export function isFormValid(errors: InstrumentFormErrors): boolean {
  return Object.keys(errors).length === 0;
}

// ============================================================================
// INITIAL DATA
// ============================================================================

export function getInitialInstrumentData(laboratoryId?: string): InstrumentFormData {
  return {
    manufacturerId: '',
    manufacturerName: '',
    modelId: '',
    modelName: '',
    modelNumber: '',
    serialNumber: '',
    assetTag: '',
    instrumentType: 'electronic',
    instrumentClass: undefined,
    accuracyClass: '',
    maxCapacity: '',
    maxCapacityUnit: 'kg',
    minCapacity: '',
    minCapacityUnit: 'kg',
    scaleInterval: '',
    scaleIntervalUnit: 'kg',
    verificationScaleInterval: '',
    verificationScaleIntervalUnit: 'kg',
    numberOfVerificationIntervals: '',
    softwareVersion: '',
    firmwareVersion: '',
    powerSupply: '',
    laboratoryId: laboratoryId || '',
    dateReceived: todayISO(),
    lastCalibration: todayISO(),
    nextCalibration: plusYearsISO(1),
    condition: 'good',
    notes: '',
  };
}

// ============================================================================
// FORM COMPONENT
// ============================================================================

interface InstrumentFormProps {
  data: InstrumentFormData;
  errors: InstrumentFormErrors;
  onChange: (data: InstrumentFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  manufacturers: { id: string; name: string; country: string }[];
  laboratories: { id: string; name: string; code: string }[];
  isLoading?: boolean;
  isEdit?: boolean;
  onManufacturerSelect?: (manufacturer: { id: string; name: string; country: string }) => void;
  onCheckDuplicate?: (serialNumber: string, laboratoryId: string) => Promise<boolean>;
}

export function InstrumentForm({
  data,
  errors,
  onChange,
  onSubmit,
  onCancel,
  manufacturers,
  laboratories,
  isLoading = false,
  isEdit = false,
  onManufacturerSelect,
  onCheckDuplicate,
}: InstrumentFormProps) {
  const [duplicateWarning, setDuplicateWarning] = React.useState<string | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = React.useState(false);

  const handleChange = (field: keyof InstrumentFormData, value: unknown) => {
    onChange({ ...data, [field]: value });
  };

  const handleSerialNumberBlur = async () => {
    if (onCheckDuplicate && data.serialNumber && data.laboratoryId) {
      setIsCheckingDuplicate(true);
      try {
        const isDuplicate = await onCheckDuplicate(data.serialNumber, data.laboratoryId);
        if (isDuplicate) {
          setDuplicateWarning('An instrument with this serial number already exists in this laboratory.');
        } else {
          setDuplicateWarning(null);
        }
      } catch {
        setDuplicateWarning(null);
      } finally {
        setIsCheckingDuplicate(false);
      }
    }
  };

  const handleManufacturerChange = (manufacturerId: string) => {
    const manufacturer = manufacturers.find(m => m.id === manufacturerId);
    if (manufacturer) {
      onChange({
        ...data,
        manufacturerId: manufacturer.id,
        manufacturerName: manufacturer.name,
      });
      onManufacturerSelect?.(manufacturer);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-6">
      {/* ── Manufacturer & Model ── */}
      <FieldSet legend="Manufacturer & Model">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Manufacturer"
            value={data.manufacturerId}
            onChange={(e) => handleManufacturerChange(e.target.value)}
            options={manufacturers.map(m => ({ label: m.name, value: m.id }))}
            placeholder="Select manufacturer…"
            error={errors.manufacturerId}
            required
          />
          <Input
            label="Model Name"
            value={data.modelName}
            onChange={(e) => handleChange('modelName', e.target.value)}
            placeholder="e.g., Acom 3000"
            error={errors.modelName}
            required
          />
          <Input
            label="Model Number"
            value={data.modelNumber}
            onChange={(e) => handleChange('modelNumber', e.target.value)}
            placeholder="e.g., AC-3000"
            error={errors.modelNumber}
            required
          />
          <Select
            label="Instrument Type"
            value={data.instrumentType}
            onChange={(e) => handleChange('instrumentType', e.target.value)}
            options={[
              { label: 'Electronic', value: 'electronic' },
              { label: 'Mechanical', value: 'mechanical' },
              { label: 'Electromechanical', value: 'electromechanical' },
            ]}
            error={errors.instrumentType}
            required
          />
        </div>
      </FieldSet>

      {/* ── Identification ── */}
      <FieldSet legend="Instrument Identification">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Serial Number"
            value={data.serialNumber}
            onChange={(e) => handleChange('serialNumber', e.target.value)}
            onBlur={handleSerialNumberBlur}
            placeholder="e.g., WGH-2024-0891"
            error={errors.serialNumber}
            monospace
            required
          />
          <Input
            label="Asset Tag"
            value={data.assetTag || ''}
            onChange={(e) => handleChange('assetTag', e.target.value)}
            placeholder="Optional internal asset tag"
          />
        </div>
        {duplicateWarning && (
          <div className="mt-2 p-2 bg-warning-50 border border-warning-300 rounded-md text-[12px] text-warning-800 flex items-start gap-1.5">
            <svg width="13" height="13" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
              <path d="M9 2l7 13H2z" />
              <path d="M9 7v3.5" />
              <circle cx="9" cy="13" r="0.5" fill="currentColor" />
            </svg>
            <span>{duplicateWarning}</span>
          </div>
        )}
        {isCheckingDuplicate && (
          <div className="mt-2 text-[12px] text-gray-500">Checking for duplicates…</div>
        )}
      </FieldSet>

      {/* ── Technical Specifications ── */}
      <FieldSet legend="Technical Specifications">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Select
            label="Instrument Class"
            value={data.instrumentClass || ''}
            onChange={(e) => handleChange('instrumentClass', e.target.value || undefined)}
            options={[
              { label: 'Class I — Precision', value: 'I' },
              { label: 'Class II — High Precision', value: 'II' },
              { label: 'Class III — General', value: 'III' },
              { label: 'Class IIII — Coarse', value: 'IIII' },
              { label: 'Class III L — Large Capacity', value: 'IIIIL' },
            ]}
            placeholder="Select class…"
          />
          <Input
            label="Accuracy Class"
            value={data.accuracyClass || ''}
            onChange={(e) => handleChange('accuracyClass', e.target.value)}
            placeholder="e.g., E2, M2"
          />
          <Select
            label="Power Supply"
            value={data.powerSupply || ''}
            onChange={(e) => handleChange('powerSupply', e.target.value)}
            options={[
              { label: 'AC Mains (230V)', value: '230V AC' },
              { label: 'AC Mains (110V)', value: '110V AC' },
              { label: 'Battery', value: 'Battery' },
              { label: 'Internal Rechargeable', value: 'Internal' },
            ]}
            placeholder="Select power supply…"
          />
        </div>
      </FieldSet>

      {/* ── Capacity & Scale ── */}
      <FieldSet legend="Capacity & Scale Intervals">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                label="Maximum Capacity"
                type="number"
                value={data.maxCapacity === '' ? '' : String(data.maxCapacity)}
                onChange={(e) => handleChange('maxCapacity', e.target.value ? Number(e.target.value) : '')}
                placeholder="0"
                error={errors.maxCapacity}
                monospace
                required
              />
            </div>
            <div className="w-[80px]">
              <Select
                label="Unit"
                value={data.maxCapacityUnit}
                onChange={(e) => handleChange('maxCapacityUnit', e.target.value)}
                options={[
                  { label: 'mg', value: 'mg' },
                  { label: 'g', value: 'g' },
                  { label: 'kg', value: 'kg' },
                  { label: 't', value: 't' },
                ]}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                label="Minimum Capacity"
                type="number"
                value={data.minCapacity === '' ? '' : String(data.minCapacity)}
                onChange={(e) => handleChange('minCapacity', e.target.value ? Number(e.target.value) : '')}
                placeholder="0"
                error={errors.minCapacity}
                monospace
                required
              />
            </div>
            <div className="w-[80px]">
              <Select
                label="Unit"
                value={data.minCapacityUnit}
                onChange={(e) => handleChange('minCapacityUnit', e.target.value)}
                options={[
                  { label: 'mg', value: 'mg' },
                  { label: 'g', value: 'g' },
                  { label: 'kg', value: 'kg' },
                  { label: 't', value: 't' },
                ]}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                label="Scale Interval (d)"
                type="number"
                value={data.scaleInterval === '' ? '' : String(data.scaleInterval)}
                onChange={(e) => handleChange('scaleInterval', e.target.value ? Number(e.target.value) : '')}
                placeholder="0"
                error={errors.scaleInterval}
                monospace
                required
              />
            </div>
            <div className="w-[80px]">
              <Select
                label="Unit"
                value={data.scaleIntervalUnit}
                onChange={(e) => handleChange('scaleIntervalUnit', e.target.value)}
                options={[
                  { label: 'mg', value: 'mg' },
                  { label: 'g', value: 'g' },
                  { label: 'kg', value: 'kg' },
                  { label: 't', value: 't' },
                ]}
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                label="Verification Scale Interval (e)"
                type="number"
                value={data.verificationScaleInterval === '' ? '' : String(data.verificationScaleInterval || '')}
                onChange={(e) => handleChange('verificationScaleInterval', e.target.value ? Number(e.target.value) : '')}
                placeholder="Optional"
                monospace
              />
            </div>
            <div className="w-[80px]">
              <Select
                label="Unit"
                value={data.verificationScaleIntervalUnit || 'kg'}
                onChange={(e) => handleChange('verificationScaleIntervalUnit', e.target.value)}
                options={[
                  { label: 'mg', value: 'mg' },
                  { label: 'g', value: 'g' },
                  { label: 'kg', value: 'kg' },
                  { label: 't', value: 't' },
                ]}
              />
            </div>
          </div>
          <Input
            label="No. of Verification Intervals (n)"
            type="number"
            value={data.numberOfVerificationIntervals === '' ? '' : String(data.numberOfVerificationIntervals || '')}
            onChange={(e) => handleChange('numberOfVerificationIntervals', e.target.value ? Number(e.target.value) : '')}
            placeholder="e.g., 3000"
            hint="n = Max Capacity ÷ e"
            monospace
          />
          <div /> {/* Spacer */}
        </div>
      </FieldSet>

      {/* ── Software & Firmware ── */}
      <FieldSet legend="Software & Firmware">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Software Version"
            value={data.softwareVersion || ''}
            onChange={(e) => handleChange('softwareVersion', e.target.value)}
            placeholder="e.g., v2.1.0"
          />
          <Input
            label="Firmware Version"
            value={data.firmwareVersion || ''}
            onChange={(e) => handleChange('firmwareVersion', e.target.value)}
            placeholder="e.g., v1.0.3"
          />
        </div>
      </FieldSet>

      {/* ── Laboratory & Condition ── */}
      <FieldSet legend="Laboratory & Condition">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Select
            label="Laboratory"
            value={data.laboratoryId}
            onChange={(e) => handleChange('laboratoryId', e.target.value)}
            options={laboratories.map(l => ({ label: `${l.code} — ${l.name}`, value: l.id }))}
            placeholder="Select laboratory…"
            error={errors.laboratoryId}
            required
          />
          <Select
            label="Condition"
            value={data.condition}
            onChange={(e) => handleChange('condition', e.target.value)}
            options={[
              { label: 'Good', value: 'good' },
              { label: 'Needs Repair', value: 'needs-repair' },
              { label: 'Out of Service', value: 'out-of-service' },
            ]}
            error={errors.condition}
            required
          />
          <Input
            label="Date Received"
            type="date"
            value={data.dateReceived}
            onChange={(e) => handleChange('dateReceived', e.target.value)}
            error={errors.dateReceived}
            required
          />
        </div>
      </FieldSet>

      {/* ── Calibration ── */}
      <FieldSet legend="Calibration" description="Optional calibration tracking">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Last Calibration Date"
            type="date"
            value={data.lastCalibration || ''}
            onChange={(e) => handleChange('lastCalibration', e.target.value)}
          />
          <Input
            label="Next Calibration Date"
            type="date"
            value={data.nextCalibration || ''}
            onChange={(e) => handleChange('nextCalibration', e.target.value)}
          />
        </div>
      </FieldSet>

      {/* ── Notes ── */}
      <FieldSet legend="Notes">
        <Textarea
          label="Technical Notes"
          value={data.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Additional technical notes about this instrument…"
          rows={3}
        />
      </FieldSet>

      {/* ── Actions ── */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={isLoading}>
          {isEdit ? 'Save Changes' : 'Register Instrument'}
        </Button>
      </div>
    </form>
  );
}
