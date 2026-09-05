/**
 * NAWI Sahayak — Edit Instrument Page
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
import type { InstrumentClass, MassUnit } from '@/types';
import {
  getInstrument,
  getManufacturers,
  getLaboratoryOptions,
  type FormManufacturer,
  type FormLaboratory,
} from '@/lib/catalog-db';

function toFormData(instrument: Awaited<ReturnType<typeof getInstrument>>): InstrumentFormData | null {
  if (!instrument) return null;
  return {
    manufacturerId: instrument.modelNumber ? '' : '',
    manufacturerName: instrument.manufacturerName,
    modelId: '',
    modelName: instrument.modelName,
    modelNumber: instrument.modelNumber,
    serialNumber: instrument.serialNumber,
    assetTag: instrument.assetTag,
    instrumentType: instrument.instrumentType as InstrumentFormData['instrumentType'],
    instrumentClass: instrument.instrumentClass || 'III',
    accuracyClass: instrument.accuracyClass || '',
    maxCapacity: instrument.maxCapacity,
    maxCapacityUnit: instrument.maxCapacityUnit as MassUnit,
    minCapacity: instrument.minCapacity,
    minCapacityUnit: instrument.minCapacityUnit as MassUnit,
    scaleInterval: instrument.scaleInterval,
    scaleIntervalUnit: instrument.scaleIntervalUnit as MassUnit,
    verificationScaleInterval: instrument.verificationScaleInterval ?? undefined,
    verificationScaleIntervalUnit: (instrument.verificationScaleIntervalUnit ?? undefined) as MassUnit | undefined,
    numberOfVerificationIntervals: instrument.numberOfVerificationIntervals ?? undefined,
    softwareVersion: instrument.softwareVersion || '',
    firmwareVersion: instrument.firmwareVersion || '',
    powerSupply: instrument.powerSupply || '',
    laboratoryId: instrument.laboratoryId,
    dateReceived: instrument.dateReceived || '',
    lastCalibration: instrument.lastCalibration ?? undefined,
    nextCalibration: instrument.nextCalibration ?? undefined,
    condition: instrument.condition as InstrumentFormData['condition'],
    notes: instrument.notes || '',
  };
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function EditInstrumentPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = React.use(params);
  const [formData, setFormData] = React.useState<InstrumentFormData | null>(null);
  const [manufacturers, setManufacturers] = React.useState<FormManufacturer[]>([]);
  const [laboratories, setLaboratories] = React.useState<FormLaboratory[]>([]);
  const [errors, setErrors] = React.useState<InstrumentFormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([getInstrument(id), getManufacturers(), getLaboratoryOptions()]).then(([inst, mfs, labs]) => {
      if (cancelled) return;
      setFormData(toFormData(inst));
      setManufacturers(mfs);
      setLaboratories(labs);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Handle form submission
  const handleSubmit = async () => {
    if (!formData) return;
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

  if (!formData) {
    return (
      <Shell breadcrumbs={[{ label: 'Instruments', href: '/instruments' }, { label: 'Edit', current: true }]}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-[13px] text-gray-500">Loading instrument…</div>
        </div>
      </Shell>
    );
  }

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
          manufacturers={manufacturers}
          laboratories={laboratories}
          isLoading={isSubmitting}
          isEdit
        />
      </div>
    </Shell>
  );
}
