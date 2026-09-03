/**
 * NAWI TestFlow — New Equipment Page
 *
 * Form for registering new test equipment.
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  EquipmentForm,
  validateEquipment,
  isEquipmentValid,
  getInitialEquipment,
  type EquipmentFormData,
  type EquipmentFormErrors,
} from '@/components/forms/EquipmentForm';
import { Alert } from '@/components/ui/Alert';

const MOCK_LABORATORIES = [
  { id: '1', name: 'Central Metrology Testing Lab', code: 'CMTL-PY-01' },
  { id: '2', name: 'Prayagraj Instrument Testing Lab', code: 'PITL-PR-02' },
];

export default function NewEquipmentPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<EquipmentFormData>(getInitialEquipment());
  const [errors, setErrors] = useState<EquipmentFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSubmit = async () => {
    const validationErrors = validateEquipment(formData);
    setErrors(validationErrors);

    if (!isEquipmentValid(validationErrors)) {
      setSubmitError('Please correct the errors below.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSubmitSuccess(true);
      setTimeout(() => {
        router.push('/equipment');
      }, 1500);
    } catch {
      setSubmitError('Failed to register equipment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Shell breadcrumbs={[
      { label: 'Equipment', href: '/equipment' },
      { label: 'Register New', current: true },
    ]}>
      <PageHeader
        title="Register Equipment"
        subtitle="Add new test equipment (weights, measurement devices, etc.)"
      />

      {submitSuccess && (
        <div className="mb-4">
          <Alert type="success" title="Equipment Registered">
            The equipment has been successfully registered. Redirecting…
          </Alert>
        </div>
      )}

      {submitError && (
        <div className="mb-4">
          <Alert type="error" title="Registration Failed">
            {submitError}
          </Alert>
        </div>
      )}

      <div className="panel p-6">
        <EquipmentForm
          data={formData}
          errors={errors}
          onChange={setFormData}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/equipment')}
          laboratories={MOCK_LABORATORIES}
          isLoading={isSubmitting}
        />
      </div>
    </Shell>
  );
}
