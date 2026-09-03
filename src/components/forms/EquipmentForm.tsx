/**
 * NAWI TestFlow — Equipment Form
 *
 * Form for registering and editing test equipment.
 * Includes:
 * - Equipment identification
 * - Calibration tracking
 * - Calibration status warnings
 * - Validation
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { todayISO, plusYearsISO } from '@/lib/dates';
import { Input, Select, Textarea, FieldSet } from '@/components/ui/FormControls';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import type { MassUnit } from '@/types';

// ============================================================================
// FORM DATA TYPES
// ============================================================================

export interface EquipmentFormData {
  equipmentId: string;
  name: string;
  type: 'standard-weight' | 'calibrated-weight' | 'accessory' | 'tool' | 'measurement-device';
  manufacturer: string;
  model: string;
  serialNumber: string;
  
  // Calibration
  calibrationDate: string;
  calibrationValidUntil: string;
  calibrationCertificateRef: string;
  
  // Laboratory
  laboratoryId: string;
  
  // Condition
  condition: 'good' | 'needs-repair' | 'out-of-service';
  
  // Notes
  notes: string;
}

export interface EquipmentFormErrors {
  [key: string]: string | undefined;
}

// ============================================================================
// CALIBRATION STATUS
// ============================================================================

export function getCalibrationStatus(
  calibrationDate: string,
  calibrationValidUntil: string
): 'valid' | 'expired' | 'due-soon' | 'not-calibrated' {
  if (!calibrationDate || !calibrationValidUntil) {
    return 'not-calibrated';
  }
  
  const now = new Date();
  const validUntil = new Date(calibrationValidUntil);
  const daysUntilExpiry = Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry < 0) {
    return 'expired';
  } else if (daysUntilExpiry <= 30) {
    return 'due-soon';
  } else {
    return 'valid';
  }
}

export function getCalibrationStatusConfig(status: string) {
  const configs = {
    valid: { color: 'success' as const, label: 'Calibration Valid', variant: 'subtle' as const },
    expired: { color: 'danger' as const, label: 'Calibration Expired', variant: 'solid' as const },
    'due-soon': { color: 'warning' as const, label: 'Calibration Due Soon', variant: 'solid' as const },
    'not-calibrated': { color: 'gray' as const, label: 'Not Calibrated', variant: 'outline' as const },
  };
  return configs[status as keyof typeof configs] || configs['not-calibrated'];
}

// ============================================================================
// VALIDATION
// ============================================================================

export function validateEquipment(data: EquipmentFormData): EquipmentFormErrors {
  const errors: EquipmentFormErrors = {};
  
  if (!data.equipmentId) {
    errors.equipmentId = 'Equipment ID is required';
  }
  
  if (!data.name) {
    errors.name = 'Equipment name is required';
  }
  
  if (!data.type) {
    errors.type = 'Equipment type is required';
  }
  
  if (!data.serialNumber) {
    errors.serialNumber = 'Serial number is required';
  }
  
  if (!data.laboratoryId) {
    errors.laboratoryId = 'Laboratory is required';
  }
  
  // Calibration date validation
  if (data.calibrationDate && data.calibrationValidUntil) {
    if (new Date(data.calibrationValidUntil) <= new Date(data.calibrationDate)) {
      errors.calibrationValidUntil = 'Valid until date must be after calibration date';
    }
  }
  
  return errors;
}

export function isEquipmentValid(errors: EquipmentFormErrors): boolean {
  return Object.keys(errors).length === 0;
}

// ============================================================================
// INITIAL DATA
// ============================================================================

export function getInitialEquipment(laboratoryId?: string): EquipmentFormData {
  return {
    equipmentId: '',
    name: '',
    type: 'standard-weight',
    manufacturer: '',
    model: '',
    serialNumber: '',
    calibrationDate: todayISO(),
    calibrationValidUntil: plusYearsISO(1),
    calibrationCertificateRef: '',
    laboratoryId: laboratoryId || '',
    condition: 'good',
    notes: '',
  };
}

// ============================================================================
// FORM COMPONENT
// ============================================================================

interface EquipmentFormProps {
  data: EquipmentFormData;
  errors: EquipmentFormErrors;
  onChange: (data: EquipmentFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  laboratories: { id: string; name: string; code: string }[];
  isLoading?: boolean;
  isEdit?: boolean;
}

export function EquipmentForm({
  data,
  errors,
  onChange,
  onSubmit,
  onCancel,
  laboratories,
  isLoading = false,
  isEdit = false,
}: EquipmentFormProps) {
  const handleChange = (field: keyof EquipmentFormData, value: unknown) => {
    onChange({ ...data, [field]: value });
  };

  const calibrationStatus = getCalibrationStatus(data.calibrationDate, data.calibrationValidUntil);
  const statusConfig = getCalibrationStatusConfig(calibrationStatus);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
      {/* ── Calibration Warning ── */}
      {calibrationStatus === 'expired' && (
        <Alert type="error" title="Calibration Expired">
          This equipment's calibration has expired. It should not be used for testing until recalibrated.
        </Alert>
      )}
      {calibrationStatus === 'due-soon' && (
        <Alert type="warning" title="Calibration Due Soon">
          This equipment's calibration will expire within 30 days. Please schedule recalibration.
        </Alert>
      )}

      {/* ── Equipment Identification ── */}
      <FieldSet legend="Equipment Identification">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Equipment ID"
            value={data.equipmentId}
            onChange={(e) => handleChange('equipmentId', e.target.value)}
            placeholder="e.g., WTS-E2-001"
            error={errors.equipmentId}
            monospace
            required
          />
          <Input
            label="Equipment Name"
            value={data.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g., E2 Calibration Weight Set"
            error={errors.name}
            required
          />
          <Select
            label="Equipment Type"
            value={data.type}
            onChange={(e) => handleChange('type', e.target.value)}
            options={[
              { label: 'Standard Weight', value: 'standard-weight' },
              { label: 'Calibrated Weight', value: 'calibrated-weight' },
              { label: 'Measurement Device', value: 'measurement-device' },
              { label: 'Accessory', value: 'accessory' },
              { label: 'Tool', value: 'tool' },
            ]}
            error={errors.type}
            required
          />
          <Input
            label="Manufacturer"
            value={data.manufacturer}
            onChange={(e) => handleChange('manufacturer', e.target.value)}
            placeholder="e.g., Sartorius"
          />
          <Input
            label="Model"
            value={data.model}
            onChange={(e) => handleChange('model', e.target.value)}
            placeholder="e.g., PTA"
          />
          <Input
            label="Serial Number"
            value={data.serialNumber}
            onChange={(e) => handleChange('serialNumber', e.target.value)}
            placeholder="e.g., WTS-E2-001"
            error={errors.serialNumber}
            monospace
            required
          />
        </div>
      </FieldSet>

      {/* ── Calibration Information ── */}
      <FieldSet legend="Calibration Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Input
            label="Calibration Date"
            type="date"
            value={data.calibrationDate}
            onChange={(e) => handleChange('calibrationDate', e.target.value)}
          />
          <Input
            label="Calibration Valid Until"
            type="date"
            value={data.calibrationValidUntil}
            onChange={(e) => handleChange('calibrationValidUntil', e.target.value)}
            error={errors.calibrationValidUntil}
          />
          <Input
            label="Certificate Reference"
            value={data.calibrationCertificateRef}
            onChange={(e) => handleChange('calibrationCertificateRef', e.target.value)}
            placeholder="e.g., CAL-2026-00123"
          />
        </div>
        
        {/* Calibration status display */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[12px] text-gray-500">Status:</span>
          <span className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-sm',
            statusConfig.color === 'success' && 'bg-success-50 text-success-700',
            statusConfig.color === 'danger' && 'bg-danger-50 text-danger-700',
            statusConfig.color === 'warning' && 'bg-warning-50 text-warning-700',
            statusConfig.color === 'gray' && 'bg-gray-100 text-gray-600',
          )}>
            {statusConfig.label}
          </span>
        </div>
      </FieldSet>

      {/* ── Laboratory & Condition ── */}
      <FieldSet legend="Laboratory & Condition">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          />
        </div>
      </FieldSet>

      {/* ── Notes ── */}
      <FieldSet legend="Notes">
        <Textarea
          label="Notes"
          value={data.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Additional notes about this equipment…"
          rows={2}
        />
      </FieldSet>

      {/* ── Actions ── */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={isLoading}>
          {isEdit ? 'Save Changes' : 'Register Equipment'}
        </Button>
      </div>
    </form>
  );
}
