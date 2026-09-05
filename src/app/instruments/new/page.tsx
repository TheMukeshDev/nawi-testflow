/**
 * NAWI TestFlow — New Instrument Page
 *
 * Form for registering a new instrument.
 * Creates a real instrument_models + instruments record in Supabase through
 * the /api/db proxy (server-side, service-role key).
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
} from '@/components/forms/InstrumentForm';
import { supabaseDb } from '@/lib/supabase-db';
import type { Manufacturer } from '@/types';

interface LabOption {
  id: string;
  name: string;
  code: string;
}

export default function NewInstrumentPage() {
  const router = useRouter();
  const [formData, setFormData] = React.useState<InstrumentFormData>(getInitialInstrumentData(''));
  const [errors, setErrors] = React.useState({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);
  const [manufacturers, setManufacturers] = React.useState<Manufacturer[]>([]);
  const [laboratories, setLaboratories] = React.useState<LabOption[]>([]);
  const [listError, setListError] = React.useState<string | null>(null);

  // Load real manufacturers + laboratories so a valid instrument_models and
  // instruments row can actually be created (both are NOT NULL FKs).
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [mfgRes, labs] = await Promise.all([
          fetch('/api/db/manufacturers?select=*&order=name.asc').then(r => r.ok ? r.json() : []),
          supabaseDb.getLaboratories(),
        ]);
        if (!mounted) return;
        if (Array.isArray(mfgRes)) {
          setManufacturers(mfgRes.map((m: any) => ({
            id: m.id,
            name: m.name,
            country: m.country || '',
            createdAt: m.created_at || '',
            updatedAt: m.updated_at || '',
          })));
        }
        setLaboratories((labs && labs.length ? labs : []).map((l: any) => ({
          id: l.id,
          name: l.name,
          code: l.code,
        })));
        if (labs && labs.length > 0 && !formData.laboratoryId) {
          setFormData(prev => ({ ...prev, laboratoryId: labs[0].id }));
        }
      } catch {
        if (mounted) setListError('Could not load manufacturers/laboratories.');
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Real duplicate check against the instruments table.
  const checkDuplicate = async (serialNumber: string, laboratoryId: string): Promise<boolean> => {
    if (!serialNumber || !laboratoryId) return false;
    try {
      const q = `select=id&serial_number=eq.${encodeURIComponent(serialNumber.toUpperCase())}&laboratory_id=eq.${encodeURIComponent(laboratoryId)}&limit=1`;
      const res = await fetch(`/api/db/instruments?${q}`, { cache: 'no-store' });
      if (!res.ok) return false;
      const rows = await res.json();
      return Array.isArray(rows) && rows.length > 0;
    } catch {
      return false;
    }
  };

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
      // 1. Re-check for duplicates in the real database
      const isDuplicate = await checkDuplicate(formData.serialNumber, formData.laboratoryId);
      if (isDuplicate) {
        setErrors({ serialNumber: 'An instrument with this serial number already exists in this laboratory.' });
        setSubmitError('Cannot register instrument. Duplicate serial number detected.');
        return;
      }

      const classValue = formData.instrumentClass || 'III';
      const instrumentType = formData.instrumentType || 'electronic';
      const eValue = Number(formData.verificationScaleInterval || formData.scaleInterval);
      const verificationDivisions =
        formData.numberOfVerificationIntervals
          ? Math.round(Number(formData.numberOfVerificationIntervals))
          : eValue > 0
            ? Math.round(Number(formData.maxCapacity) / eValue)
            : 0;

      // 2. Find an existing model (same manufacturer + model number) or create one.
      let modelId: string | null = null;
      try {
        const modelQuery =
          `select=id&manufacturer_id=eq.${encodeURIComponent(formData.manufacturerId)}` +
          `&model_number=eq.${encodeURIComponent(formData.modelNumber)}&limit=1`;
        const modelRes = await fetch(`/api/db/instrument_models?${modelQuery}`, { cache: 'no-store' });
        if (modelRes.ok) {
          const existing = await modelRes.json();
          if (Array.isArray(existing) && existing.length > 0) {
            modelId = existing[0].id;
          }
        }
      } catch {}

      if (!modelId) {
        const modelPayload = {
          manufacturer_id: formData.manufacturerId,
          model_name: formData.modelName.trim(),
          model_number: formData.modelNumber.trim(),
          instrument_class: classValue,
          capacity: Number(formData.maxCapacity),
          capacity_unit: formData.maxCapacityUnit,
          min_capacity: Number(formData.minCapacity) || 0,
          min_capacity_unit: formData.minCapacityUnit,
          division: Number(formData.scaleInterval),
          division_unit: formData.scaleIntervalUnit,
          verification_scale_divisions: verificationDivisions,
          accuracy_class: formData.accuracyClass || null,
          power_supply: formData.powerSupply || null,
          device_type: instrumentType,
        };
        const modelRes = await fetch('/api/db/instrument_models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(modelPayload),
        });
        if (!modelRes.ok) {
          const err = await modelRes.text();
          throw new Error(`Failed to create instrument model: ${err}`);
        }
        const createdModel = await modelRes.json();
        modelId = (Array.isArray(createdModel) ? createdModel[0] : createdModel)?.id;
      }

      if (!modelId) {
        throw new Error('Could not determine instrument model.');
      }

      // 3. Create the instrument record.
      const instrumentPayload = {
        model_id: modelId,
        serial_number: formData.serialNumber.trim().toUpperCase(),
        laboratory_id: formData.laboratoryId,
        date_received: formData.dateReceived || new Date().toISOString().slice(0, 10),
        last_calibration: formData.lastCalibration || null,
        next_calibration: formData.nextCalibration || null,
        condition: formData.condition,
        notes: formData.notes || null,
      };
      const instRes = await fetch('/api/db/instruments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(instrumentPayload),
      });
      if (!instRes.ok) {
        const err = await instRes.text();
        throw new Error(`Failed to register instrument: ${err}`);
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        router.push('/instruments');
      }, 1500);
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to register instrument. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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

      {listError && (
        <div className="mb-4">
          <Alert type="error" title="Data Load Failed">
            {listError}
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
          onCheckDuplicate={checkDuplicate}
        />
      </div>
    </Shell>
  );
}