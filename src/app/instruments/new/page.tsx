/**
 * NAWI TestFlow — New Instrument Page
 *
 * Form for registering a new instrument.
 * Includes manufacturer selection, model specification, and duplicate prevention.
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { PageHeader } from '@/components/layout/PageHeader';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { Alert } from '@/components/ui/Alert';
import {
  InstrumentForm,
  getInitialInstrumentData,
  validateInstrumentForm,
  isFormValid,
  type InstrumentFormData,
  type InstrumentFormErrors,
} from '@/components/forms/InstrumentForm';
import { getManufacturers, getLaboratoryOptions, isSerialNumberRegistered, type FormManufacturer, type FormLaboratory } from '@/lib/catalog-db';

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function NewInstrumentPage() {
  const router = useRouter();
  const [manufacturers, setManufacturers] = React.useState<FormManufacturer[]>([]);
  const [laboratories, setLaboratories] = React.useState<FormLaboratory[]>([]);
  const [formData, setFormData] = React.useState<InstrumentFormData>(
    getInitialInstrumentData('') // Default lab filled once laboratories load
  );
  const [errors, setErrors] = React.useState<InstrumentFormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);

  // Load manufacturers + laboratories
  React.useEffect(() => {
    let cancelled = false;
    Promise.all([getManufacturers(), getLaboratoryOptions()]).then(([mfs, labs]) => {
      if (cancelled) return;
      setManufacturers(mfs);
      setLaboratories(labs);
      if (labs.length > 0) {
        setFormData(current => ({ ...current, laboratoryId: labs[0].id }));
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Check for duplicate serial number
  const checkDuplicate = async (serialNumber: string, laboratoryId: string): Promise<boolean> => {
    return isSerialNumberRegistered(serialNumber, laboratoryId);
  };

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
      // Check for duplicate one more time
      const isDuplicate = await checkDuplicate(formData.serialNumber, formData.laboratoryId);
      if (isDuplicate) {
        setErrors({ serialNumber: 'An instrument with this serial number already exists in this laboratory.' });
        setSubmitError('Cannot register instrument. Duplicate serial number detected.');
        return;
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Success
      setSubmitSuccess(true);
      setTimeout(() => {
        router.push('/instruments');
      }, 1500);
    } catch (err) {
      setSubmitError('Failed to register instrument. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle manufacturer selection
  const handleManufacturerSelect = (_manufacturer: { id: string; name: string; country: string }) => {
    // Could auto-fill country, etc.
  };

  return (
    <RouteGuard requiredRoles={['admin', 'tester']}>
    <Shell breadcrumbs={[
      { label: 'Instruments', href: '/instruments' },
      { label: 'Register New', current: true },
    ]}>
      <PageHeader
        title="Register New Instrument"
        subtitle="Enter instrument details and technical specifications"
      />

      {/* ── Success Alert ── */}
      {submitSuccess && (
        <div className="mb-4">
          <Alert type="success" title="Instrument Registered">
            The instrument has been successfully registered. Redirecting to instruments list…
          </Alert>
        </div>
      )}

      {/* ── Error Alert ── */}
      {submitError && (
        <div className="mb-4">
          <Alert type="error" title="Registration Failed">
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
          onCancel={() => router.push('/instruments')}
          manufacturers={manufacturers}
          laboratories={laboratories}
          isLoading={isSubmitting}
          onManufacturerSelect={handleManufacturerSelect}
          onCheckDuplicate={checkDuplicate}
        />
      </div>
    </Shell>
    </RouteGuard>
  );
}
