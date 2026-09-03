/**
 * NAWI TestFlow — Edit Instrument Page
 *
 * Form for editing an existing instrument.
 * Pre-fills form with current instrument data.
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert } from '@/components/ui/Alert';
import {
  InstrumentForm,
  validateInstrumentForm,
  isFormValid,
  type InstrumentFormData,
  type InstrumentFormErrors,
} from '@/components/forms/InstrumentForm';
import type { Manufacturer, InstrumentClass, MassUnit } from '@/types';

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_MANUFACTURERS: Manufacturer[] = [
  { id: '1', name: 'Acom Instruments', country: 'Germany', createdAt: '', updatedAt: '' },
  { id: '2', name: 'Kern & Sohn', country: 'Germany', createdAt: '', updatedAt: '' },
  { id: '3', name: 'Mettler Toledo', country: 'Switzerland', createdAt: '', updatedAt: '' },
  { id: '4', name: 'Sartorius', country: 'Germany', createdAt: '', updatedAt: '' },
  { id: '5', name: 'Ohaus', country: 'USA', createdAt: '', updatedAt: '' },
];

const MOCK_LABORATORIES = [
  { id: '1', name: 'National Physical Laboratory — Delhi', code: 'NPL-DL-01' },
  { id: '2', name: 'National Physical Laboratory — Mumbai', code: 'NPL-MH-02' },
];

// Mock instrument data to pre-fill form
const MOCK_INSTRUMENT_DATA: InstrumentFormData = {
  manufacturerId: '1',
  manufacturerName: 'Acom Instruments',
  modelId: '1',
  modelName: 'Acom 3000',
  modelNumber: 'AC-3000',
  serialNumber: 'WGH-2024-0891',
  assetTag: 'NPL-DL-INST-001',
  instrumentType: 'electronic',
  instrumentClass: 'III',
  accuracyClass: 'M2',
  maxCapacity: 3000,
  maxCapacityUnit: 'kg',
  minCapacity: 10,
  minCapacityUnit: 'kg',
  scaleInterval: 1,
  scaleIntervalUnit: 'kg',
  verificationScaleInterval: 1,
  verificationScaleIntervalUnit: 'kg',
  numberOfVerificationIntervals: 3000,
  softwareVersion: 'v2.1.0',
  firmwareVersion: 'v1.0.3',
  powerSupply: '230V AC',
  laboratoryId: '1',
  dateReceived: '2024-01-15',
  lastCalibration: '2026-06-15',
  nextCalibration: '2027-06-15',
  condition: 'good',
  notes: 'Primary instrument for Class III verification testing. Located in Testing Lab A.',
};

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function EditInstrumentPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = React.use(params);
  const [formData, setFormData] = React.useState<InstrumentFormData>(MOCK_INSTRUMENT_DATA);
  const [errors, setErrors] = React.useState<InstrumentFormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);

  // Handle form submission
  const handleSubmit = async () => {
    const validationErrors = validateInstrumentForm(formData);
    setErrors(validationErrors);

    if (!isFormValid(validationErrors)) {
      setSubmitError('Please correct the errors below.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Success
      setSubmitSuccess(true);
      setTimeout(() => {
        router.push(`/instruments/${id}`);
      }, 1500);
    } catch (err) {
      setSubmitError('Failed to update instrument. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Shell breadcrumbs={[
      { label: 'Instruments', href: '/instruments' },
      { label: formData.serialNumber, href: `/instruments/${id}` },
      { label: 'Edit', current: true },
    ]}>
      <PageHeader
        title="Edit Instrument"
        subtitle={`Editing ${formData.manufacturerName} ${formData.modelName} (${formData.serialNumber})`}
      />

      {/* ── Success Alert ── */}
      {submitSuccess && (
        <div className="mb-4">
          <Alert type="success" title="Instrument Updated">
            The instrument has been successfully updated. Redirecting…
          </Alert>
        </div>
      )}

      {/* ── Error Alert ── */}
      {submitError && (
        <div className="mb-4">
          <Alert type="error" title="Update Failed">
            {submitError}
          </Alert>
        </div>
      )}

      {/* ── Form ── */}
      <div className="panel p-6">
        <InstrumentForm
          data={formData}
          errors={errors}
          onChange={setFormData}
          onSubmit={handleSubmit}
          onCancel={() => router.push(`/instruments/${id}`)}
          manufacturers={MOCK_MANUFACTURERS}
          laboratories={MOCK_LABORATORIES}
          isLoading={isSubmitting}
          isEdit
        />
      </div>
    </Shell>
  );
}
