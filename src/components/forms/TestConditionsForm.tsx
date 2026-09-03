/**
 * NAWI TestFlow — Test Conditions Form
 *
 * Form for recording environmental conditions during testing.
 * Structured fields for:
 * - Temperature, humidity, air pressure
 * - Test location
 * - Test date/time
 * - Laboratory identification
 *
 * Stores observed conditions separately from calculated results.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { todayISO, nowTimeHM } from '@/lib/dates';
import { Input, Select, Textarea, FieldSet } from '@/components/ui/FormControls';
import { ConditionDot } from '@/components/ui/StatusBadge';
import type { ConditionStatus } from '@/types';

// ============================================================================
// FORM DATA TYPES
// ============================================================================

export interface TestConditionsFormData {
  // Environmental conditions
  temperature: number | '';
  temperatureUnit: '°C';
  humidity: number | '';
  humidityUnit: '%RH';
  airPressure: number | '';
  airPressureUnit: 'hPa';
  
  // Status indicators
  temperatureStatus: ConditionStatus;
  humidityStatus: ConditionStatus;
  airPressureStatus: ConditionStatus;
  
  // Test location
  testLocation: string;
  testLocationDetail: string;
  
  // Laboratory
  laboratoryId: string;
  
  // Test date/time
  testDate: string;
  testStartTime: string;
  testEndTime: string;
  
  // Notes
  notes: string;
}

export interface TestConditionsFormErrors {
  [key: string]: string | undefined;
}

// ============================================================================
// VALIDATION
// ============================================================================

export function validateTestConditions(data: TestConditionsFormData): TestConditionsFormErrors {
  const errors: TestConditionsFormErrors = {};
  
  // Temperature
  if (data.temperature === '' || data.temperature === null) {
    errors.temperature = 'Temperature is required';
  } else if (typeof data.temperature === 'number') {
    if (data.temperature < -50 || data.temperature > 80) {
      errors.temperature = 'Temperature must be between -50°C and 80°C';
    }
  }
  
  // Humidity
  if (data.humidity === '' || data.humidity === null) {
    errors.humidity = 'Humidity is required';
  } else if (typeof data.humidity === 'number') {
    if (data.humidity < 0 || data.humidity > 100) {
      errors.humidity = 'Humidity must be between 0% and 100%';
    }
  }
  
  // Air pressure (optional but validate if provided)
  if (data.airPressure !== '' && data.airPressure !== null && typeof data.airPressure === 'number') {
    if (data.airPressure < 800 || data.airPressure > 1100) {
      errors.airPressure = 'Air pressure must be between 800 hPa and 1100 hPa';
    }
  }
  
  // Test location
  if (!data.testLocation) {
    errors.testLocation = 'Test location is required';
  }
  
  // Laboratory
  if (!data.laboratoryId) {
    errors.laboratoryId = 'Laboratory is required';
  }
  
  // Test date
  if (!data.testDate) {
    errors.testDate = 'Test date is required';
  }
  
  // Test start time
  if (!data.testStartTime) {
    errors.testStartTime = 'Test start time is required';
  }
  
  return errors;
}

export function isTestConditionsValid(errors: TestConditionsFormErrors): boolean {
  return Object.keys(errors).length === 0;
}

// ============================================================================
// INITIAL DATA
// ============================================================================

export function getInitialTestConditions(laboratoryId?: string): TestConditionsFormData {
  const now = new Date();
  return {
    temperature: '',
    temperatureUnit: '°C',
    humidity: '',
    humidityUnit: '%RH',
    airPressure: '',
    airPressureUnit: 'hPa',
    temperatureStatus: 'not-recorded',
    humidityStatus: 'not-recorded',
    airPressureStatus: 'not-recorded',
    testLocation: '',
    testLocationDetail: '',
    laboratoryId: laboratoryId || '',
    testDate: todayISO(now),
    testStartTime: nowTimeHM(now),
    testEndTime: '',
    notes: '',
  };
}

// ============================================================================
// FORM COMPONENT
// ============================================================================

interface TestConditionsFormProps {
  data: TestConditionsFormData;
  errors: TestConditionsFormErrors;
  onChange: (data: TestConditionsFormData) => void;
  laboratories: { id: string; name: string; code: string }[];
  isReadOnly?: boolean;
}

export function TestConditionsForm({
  data,
  errors,
  onChange,
  laboratories,
  isReadOnly = false,
}: TestConditionsFormProps) {
  const handleChange = (field: keyof TestConditionsFormData, value: unknown) => {
    const newData = { ...data, [field]: value };
    
    // Auto-update status based on values
    if (field === 'temperature' && typeof value === 'number') {
      newData.temperatureStatus = (value >= 15 && value <= 30) ? 'normal' : 'out-of-range';
    }
    if (field === 'humidity' && typeof value === 'number') {
      newData.humidityStatus = (value >= 30 && value <= 70) ? 'normal' : 'out-of-range';
    }
    if (field === 'airPressure' && typeof value === 'number') {
      newData.airPressureStatus = (value >= 950 && value <= 1050) ? 'normal' : 'out-of-range';
    }
    
    onChange(newData);
  };

  return (
    <div className="space-y-4">
      {/* ── Environmental Conditions ── */}
      <FieldSet legend="Environmental Conditions" description="Record conditions at time of testing">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Temperature */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <label className="text-field-label">Temperature</label>
              <ConditionDot status={data.temperatureStatus} />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  label=""
                  type="number"
                  step="0.1"
                  value={data.temperature === '' ? '' : String(data.temperature)}
                  onChange={(e) => handleChange('temperature', e.target.value ? Number(e.target.value) : '')}
                  placeholder="0.0"
                  error={errors.temperature}
                  monospace
                 
                />
              </div>
              <div className="w-[60px] flex items-center">
                <span className="text-[12px] text-gray-500">°C</span>
              </div>
            </div>
          </div>
          
          {/* Humidity */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <label className="text-field-label">Humidity</label>
              <ConditionDot status={data.humidityStatus} />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  label=""
                  type="number"
                  step="0.1"
                  value={data.humidity === '' ? '' : String(data.humidity)}
                  onChange={(e) => handleChange('humidity', e.target.value ? Number(e.target.value) : '')}
                  placeholder="0.0"
                  error={errors.humidity}
                  monospace
                 
                />
              </div>
              <div className="w-[60px] flex items-center">
                <span className="text-[12px] text-gray-500">%RH</span>
              </div>
            </div>
          </div>
          
          {/* Air Pressure */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <label className="text-field-label">Air Pressure</label>
              <ConditionDot status={data.airPressureStatus} />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  label=""
                  type="number"
                  step="0.1"
                  value={data.airPressure === '' ? '' : String(data.airPressure)}
                  onChange={(e) => handleChange('airPressure', e.target.value ? Number(e.target.value) : '')}
                  placeholder="Optional"
                  error={errors.airPressure}
                  monospace
                 
                />
              </div>
              <div className="w-[60px] flex items-center">
                <span className="text-[12px] text-gray-500">hPa</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Status summary */}
        <div className="mt-3 flex items-center gap-4 text-[11px] text-gray-500">
          <span className="flex items-center gap-1">
            <ConditionDot status="normal" /> Within normal range
          </span>
          <span className="flex items-center gap-1">
            <ConditionDot status="out-of-range" /> Outside normal range
          </span>
          <span className="flex items-center gap-1">
            <ConditionDot status="not-recorded" /> Not recorded
          </span>
        </div>
      </FieldSet>

      {/* ── Test Location ── */}
      <FieldSet legend="Test Location">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Test Location"
            value={data.testLocation}
            onChange={(e) => handleChange('testLocation', e.target.value)}
            options={[
              { label: 'Testing Lab A', value: 'Testing Lab A' },
              { label: 'Testing Lab B', value: 'Testing Lab B' },
              { label: 'Testing Lab C', value: 'Testing Lab C' },
              { label: 'Main Hall', value: 'Main Hall' },
              { label: 'Field Location', value: 'Field Location' },
            ]}
            placeholder="Select location…"
            error={errors.testLocation}
            required
          />
          <Input
            label="Location Detail"
            value={data.testLocationDetail}
            onChange={(e) => handleChange('testLocationDetail', e.target.value)}
            placeholder="e.g., Bench 3, Section 2"
          />
        </div>
      </FieldSet>

      {/* ── Laboratory & Date/Time ── */}
      <FieldSet legend="Laboratory & Schedule">
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
          <Input
            label="Test Date"
            type="date"
            value={data.testDate}
            onChange={(e) => handleChange('testDate', e.target.value)}
            error={errors.testDate}
            required
           
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              label="Start Time"
              type="time"
              value={data.testStartTime}
              onChange={(e) => handleChange('testStartTime', e.target.value)}
              error={errors.testStartTime}
              required
             
            />
            <Input
              label="End Time"
              type="time"
              value={data.testEndTime}
              onChange={(e) => handleChange('testEndTime', e.target.value)}
             
            />
          </div>
        </div>
      </FieldSet>

      {/* ── Notes ── */}
      <FieldSet legend="Notes">
        <Textarea
          label="Observation Notes"
          value={data.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Any additional observations about test conditions…"
          rows={2}
         
        />
      </FieldSet>
    </div>
  );
}
