/**
 * NAWI TestFlow — Edit Equipment Page
 *
 * Form for editing an existing equipment record.
 * Pre-fills form with current equipment data.
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert } from '@/components/ui/Alert';
import {
  EquipmentForm,
  validateEquipment,
  isEquipmentValid,
  type EquipmentFormData,
  type EquipmentFormErrors,
} from '@/components/forms/EquipmentForm';

const MOCK_LABORATORIES = [
  { id: '1', name: 'National Physical Laboratory — Delhi', code: 'NPL-DL-01' },
  { id: '2', name: 'National Physical Laboratory — Mumbai', code: 'NPL-MH-02' },
];

const MOCK_EQUIPMENT_DATA: EquipmentFormData = {
  equipmentId: 'WTS-E2-001',
  name: 'E2 Calibration Weight Set',
  type: 'standard-weight',
  manufacturer: 'Sartorius',
  model: 'PTA',
  serialNumber: 'WTS-E2-001',
  calibrationDate: '2026-03-15',
  calibrationValidUntil: '2027-03-15',
  calibrationCertificateRef: 'CAL-2026-00123',
  laboratoryId: '1',
  condition: 'good',
  notes: 'Primary E2 weight set for Class II and Class III verification testing.',
};

export default function EditEquipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = React.use(params);
  const [formData, setFormData] = React.useState<EquipmentFormData>(MOCK_EQUIPMENT_DATA);
  const [errors, setErrors] = React.useState<EquipmentFormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);

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
        router.push(`/equipment/${id}`);
      }, 1500);
    } catch {
      setSubmitError('Failed to update equipment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Shell breadcrumbs={[
      { label: 'Equipment', href: '/equipment' },
      { label: formData.equipmentId, href: `/equipment/${id}` },
      { label: 'Edit', current: true },
    ]}>
      <PageHeader
        title="Edit Equipment"
        subtitle={`Editing ${formData.name} (${formData.equipmentId})`}
      />

      {submitSuccess && (
        <div className="mb-4">
          <Alert type="success" title="Equipment Updated">
            The equipment has been successfully updated. Redirecting…
          </Alert>
        </div>
      )}

      {submitError && (
        <div className="mb-4">
          <Alert type="error" title="Update Failed">
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
          onCancel={() => router.push(`/equipment/${id}`)}
          laboratories={MOCK_LABORATORIES}
          isLoading={isSubmitting}
          isEdit
        />
      </div>
    </Shell>
  );
}
