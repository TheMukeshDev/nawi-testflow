/**
 * NAWI TestFlow — New Laboratory Page
 *
 * Form for registering a new laboratory.
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input, Textarea, FieldSet } from '@/components/ui/FormControls';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { plusYearsISO } from '@/lib/dates';

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
}

interface LabFormErrors {
  [key: string]: string | undefined;
}

const INITIAL_DATA: LabFormData = {
  name: '',
  code: '',
  address: '',
  city: '',
  state: '',
  country: 'India',
  accreditationBody: '',
  accreditationNumber: '',
  accreditationValidUntil: plusYearsISO(1),
  contactPerson: '',
  phone: '',
  email: '',
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

export default function NewLaboratoryPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<LabFormData>({ ...INITIAL_DATA });
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
        router.push('/laboratories');
      }, 1500);
    } catch {
      setSubmitError('Failed to create laboratory. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <RouteGuard requiredRoles={['admin']}>
    <Shell breadcrumbs={[
      { label: 'Laboratories', href: '/laboratories' },
      { label: 'Register New', current: true },
    ]}>
      <PageHeader
        title="Register Laboratory"
        subtitle="Add a new testing laboratory to the system"
      />

      {submitSuccess && (
        <div className="mb-4">
          <Alert type="success" title="Laboratory Registered">
            The laboratory has been successfully registered. Redirecting…
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

      <form onSubmit={e => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
        <FieldSet legend="Basic Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Laboratory Name"
              value={formData.name}
              onChange={e => handleChange('name', e.target.value)}
              placeholder="e.g. Central Metrology Testing Lab"
              error={errors.name}
              required
            />
            <Input
              label="Laboratory Code"
              value={formData.code}
              onChange={e => handleChange('code', e.target.value)}
              placeholder="e.g. CMTL-PY-01"
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
            placeholder="Full street address"
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
              placeholder="e.g. NABL"
            />
            <Input
              label="Accreditation Number"
              value={formData.accreditationNumber}
              onChange={e => handleChange('accreditationNumber', e.target.value)}
              placeholder="e.g. NABL-0123"
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
              placeholder="e.g. Dr. K. Sharma"
              error={errors.contactPerson}
              required
            />
            <Input
              label="Phone"
              value={formData.phone}
              onChange={e => handleChange('phone', e.target.value)}
              placeholder="e.g. +91-532-240-2700"
              error={errors.phone}
              required
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={e => handleChange('email', e.target.value)}
            placeholder="e.g. contact@lab.example.in"
            error={errors.email}
            required
          />
        </FieldSet>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={() => router.push('/laboratories')}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            Register Laboratory
          </Button>
        </div>
      </form>
    </Shell>
    </RouteGuard>
  );
}
