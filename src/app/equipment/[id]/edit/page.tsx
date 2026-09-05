/**
 * NAWI TestFlow — Edit Equipment Page
 *
 * Form for editing an existing equipment record.
 * Pre-fills form with current equipment data.
 */

'use client';

import React from 'react';
import Link from 'next/link';
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
import { getEquipment } from '@/lib/equipment-catalog';
import { getLaboratoryOptions, type FormLaboratory } from '@/lib/catalog-db';

const TYPE_MAP: Record<string, EquipmentFormData['type']> = {
  'Standard Weight': 'standard-weight',
  'Calibrated Weight': 'calibrated-weight',
  'Measurement Device': 'measurement-device',
  Accessory: 'accessory',
  Tool: 'tool',
};

function toFormData(equipment: Awaited<ReturnType<typeof getEquipment>>): EquipmentFormData | null {
  if (!equipment) return null;
  return {
    equipmentId: equipment.equipmentId,
    name: equipment.name,
    type: TYPE_MAP[equipment.type] ?? 'standard-weight',
    manufacturer: equipment.manufacturer === '—' ? '' : equipment.manufacturer,
    model: equipment.model === '—' ? '' : equipment.model,
    serialNumber: equipment.serialNumber,
    calibrationDate: equipment.calibrationDate,
    calibrationValidUntil: equipment.calibrationValidUntil,
    calibrationCertificateRef: equipment.calibrationCertificateRef,
    laboratoryId: equipment.laboratoryId,
    condition: equipment.condition,
    notes: equipment.notes,
  };
}

export default function EditEquipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = React.use(params);
  const [formData, setFormData] = React.useState<EquipmentFormData | null>(null);
  const [laboratories, setLaboratories] = React.useState<FormLaboratory[]>([]);
  const [errors, setErrors] = React.useState<EquipmentFormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([Promise.resolve(getEquipment(id)), getLaboratoryOptions()]).then(([equipment, labs]) => {
      if (cancelled) return;
      setFormData(toFormData(equipment));
      setLaboratories(labs);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSubmit = async () => {
    if (!formData) return;
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

  if (!formData) {
    return (
      <Shell breadcrumbs={[{ label: 'Equipment', href: '/equipment' }, { label: 'Edit', current: true }]}>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <h2 className="text-[16px] font-semibold text-gray-900 mb-2">Equipment Not Found</h2>
          <p className="text-[13px] text-gray-600 mb-4">
            No equipment matches the requested record.
          </p>
          <Link href="/equipment" className="px-4 py-2 bg-primary-600 text-white rounded-md text-[13px] font-medium hover:bg-primary-700">
            ← Back to Equipment
          </Link>
        </div>
      </Shell>
    );
  }

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
          laboratories={laboratories}
          isLoading={isSubmitting}
          isEdit
        />
      </div>
    </Shell>
  );
}
