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
import { Alert } from '@/components/ui/Alert';
import {
  InstrumentForm,
  getInitialInstrumentData,
  validateInstrumentForm,
  isFormValid,
  type InstrumentFormData,
  type InstrumentFormErrors,
} from '@/components/forms/InstrumentForm';
import type { Manufacturer } from '@/types';

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_MANUFACTURERS: Manufacturer[] = [
  { id: '1', name: 'Acom Instruments', country: 'Germany', createdAt: '', updatedAt: '' },
  { id: '2', name: 'Kern & Sohn', country: 'Germany', createdAt: '', updatedAt: '' },
  { id: '3', name: 'Mettler Toledo', country: 'Switzerland', createdAt: '', updatedAt: '' },
  { id: '4', name: 'Sartorius', country: 'Germany', createdAt: '', updatedAt: '' },
  { id: '5', name: 'Ohaus', country: 'USA', createdAt: '', updatedAt: '' },
  { id: '6', name: 'Adam Equipment', country: 'UK', createdAt: '', updatedAt: '' },
  { id: '7', name: 'Shimadzu', country: 'Japan', createdAt: '', updatedAt: '' },
];

const MOCK_LABORATORIES = [
  { id: '1', name: 'National Physical Laboratory — Delhi', code: 'NPL-DL-01' },
  { id: '2', name: 'National Physical Laboratory — Mumbai', code: 'NPL-MH-02' },
];

const MOCK_EXISTING_SERIALS = [
  'WGH-2024-0891',
  'WGH-2024-0887',
  'WGH-2024-0884',
  'WGH-2025-0102',
  'WGH-2025-0115',
];

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function NewInstrumentPage() {
  const router = useRouter();
  const [formData, setFormData] = React.useState<InstrumentFormData>(
    getInitialInstrumentData('1') // Default to first lab
  );
  const [errors, setErrors] = React.useState<InstrumentFormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);

  // Check for duplicate serial number
  const checkDuplicate = async (serialNumber: string, laboratoryId: string): Promise<boolean> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_EXISTING_SERIALS.includes(serialNumber.toUpperCase());
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
  const handleManufacturerSelect = (manufacturer: Manufacturer) => {
    // Could auto-fill country, etc.
  };

  return (
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
          manufacturers={MOCK_MANUFACTURERS}
          laboratories={MOCK_LABORATORIES}
          isLoading={isSubmitting}
          onManufacturerSelect={handleManufacturerSelect}
          onCheckDuplicate={checkDuplicate}
        />
      </div>
    </Shell>
  );
}
