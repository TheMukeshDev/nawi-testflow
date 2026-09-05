/**
 * NAWI Sahayak — Edit Laboratory Page
 *
 * Form for editing an existing laboratory.
 * Pre-fills form with current laboratory data.
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input, Textarea, FieldSet } from '@/components/ui/FormControls';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

interface LabFormData {
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  country: string;
  accreditationBody: string;
  accreditationNumber: string;
  accreditationValidUntil: string;
  contactPerson: string;
  phone: string;
  email: string;
  isActive: boolean;
}

interface LabFormErrors {
  [key: string]: string | undefined;
}

const MOCK_LAB: LabFormData = {
  name: 'Central Metrology Testing Lab',
  code: 'CMTL-PY-01',
  address: '123 Instrumentation Park, Hinjewadi Phase III',
  city: 'Prayagraj',
  state: 'Uttar Pradesh',
  country: 'India',
  accreditationBody: 'NABL',
  accreditationNumber: 'NABL-0123',
  accreditationValidUntil: '2027-03-31',
  contactPerson: 'Dr. K. Sharma',
  phone: '+91-532-240-2700',
  email: 'cmtl-py@laboratory.example.in',
  isActive: true,
};

function validateLabForm(data: LabFormData): LabFormErrors {
  const errors: LabFormErrors = {};
  if (!data.name) errors.name = 'Name is required';
  if (!data.code) errors.code = 'Code is required';
  if (!data.address) errors.address = 'Address is required';
  if (!data.city) errors.city = 'City is required';
  if (!data.state) errors.state = 'State is required';
  if (!data.country) errors.country = 'Country is required';
  if (!data.contactPerson) errors.contactPerson = 'Contact person is required';
  if (!data.phone) errors.phone = 'Phone is required';
  if (!data.email) errors.email = 'Email is required';
  else if (!/\S+@\S+\.\S+/.test(data.email)) errors.email = 'Invalid email address';
  return errors;
}

export default function EditLaboratoryPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = React.use(params);
  const [formData, setFormData] = useState<LabFormData>(MOCK_LAB);
  const [errors, setErrors] = useState<LabFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleChange = (field: keyof LabFormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async () => {
    const validationErrors = validateLabForm(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setSubmitError('Please correct the errors below.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSubmitSuccess(true);
      setTimeout(() => {
        router.push(`/laboratories/${id}`);
      }, 1500);
    } catch {
      setSubmitError('Failed to update laboratory. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Shell breadcrumbs={[
      { label: 'Laboratories', href: '/laboratories' },
      { label: formData.code, href: `/laboratories/${id}` },
      { label: 'Edit', current: true },
    ]}>
      <PageHeader
        title="Edit Laboratory"
        subtitle={`Editing ${formData.name} (${formData.code})`}
      />

      {submitSuccess && (
        <div className="mb-4">
          <Alert type="success" title="Laboratory Updated">
            The laboratory has been successfully updated. Redirecting…
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

      <form onSubmit={e => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
        <FieldSet legend="Basic Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Laboratory Name"
              value={formData.name}
              onChange={e => handleChange('name', e.target.value)}
              error={errors.name}
              required
            />
            <Input
              label="Laboratory Code"
              value={formData.code}
              onChange={e => handleChange('code', e.target.value)}
              error={errors.code}
              monospace
              required
            />
          </div>
        </FieldSet>

        <FieldSet legend="Address">
          <Textarea
            label="Street Address"
            value={formData.address}
            onChange={e => handleChange('address', e.target.value)}
            error={errors.address}
            rows={2}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="City"
              value={formData.city}
              onChange={e => handleChange('city', e.target.value)}
              error={errors.city}
              required
            />
            <Input
              label="State"
              value={formData.state}
              onChange={e => handleChange('state', e.target.value)}
              error={errors.state}
              required
            />
            <Input
              label="Country"
              value={formData.country}
              onChange={e => handleChange('country', e.target.value)}
              error={errors.country}
              required
            />
          </div>
        </FieldSet>

        <FieldSet legend="Accreditation">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Accreditation Body"
              value={formData.accreditationBody}
              onChange={e => handleChange('accreditationBody', e.target.value)}
            />
            <Input
              label="Accreditation Number"
              value={formData.accreditationNumber}
              onChange={e => handleChange('accreditationNumber', e.target.value)}
              monospace
            />
            <Input
              label="Valid Until"
              type="date"
              value={formData.accreditationValidUntil}
              onChange={e => handleChange('accreditationValidUntil', e.target.value)}
            />
          </div>
        </FieldSet>

        <FieldSet legend="Contact Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Person"
              value={formData.contactPerson}
              onChange={e => handleChange('contactPerson', e.target.value)}
              error={errors.contactPerson}
              required
            />
            <Input
              label="Phone"
              value={formData.phone}
              onChange={e => handleChange('phone', e.target.value)}
              error={errors.phone}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={e => handleChange('email', e.target.value)}
              error={errors.email}
              required
            />
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={e => handleChange('isActive', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 accent-primary-600"
              />
              <label htmlFor="isActive" className="text-[13px] text-gray-700">Active</label>
            </div>
          </div>
        </FieldSet>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={() => router.push(`/laboratories/${id}`)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            Save Changes
          </Button>
        </div>
      </form>
    </Shell>
  );
}
