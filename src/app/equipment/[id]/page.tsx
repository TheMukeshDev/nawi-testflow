/**
 * NAWI Sahayak — Equipment Detail Page
 *
 * View equipment details, calibration information, and status.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { FieldSet } from '@/components/ui/FormControls';
import { getCalibrationStatus, getCalibrationStatusConfig } from '@/components/forms/EquipmentForm';
import { getEquipment, type EquipmentRecord } from '@/lib/equipment-catalog';
import { supabaseDb } from '@/lib/supabase-db';

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function DetailRow({ label, value, mono = false }: {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2 py-1.5">
      <span className="text-[12px] text-gray-500 w-[110px] sm:w-[180px] shrink-0">{label}</span>
      <span className={`text-[13px] text-gray-900 ${mono ? 'font-mono text-[12px]' : ''}`}>
        {value !== null && value !== undefined && value !== ''
          ? value
          : <span className="text-gray-400">—</span>
        }
      </span>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function EquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = React.use(params);
  const [equipment, setEquipment] = React.useState<EquipmentRecord | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      // Fast path: static catalog record
      const catalog = getEquipment(id);
      let found = catalog ?? null;
      if (!found) {
        // Fallback: live record from Supabase (test_equipment table)
        const live = await supabaseDb.getEquipmentById(id);
        if (!cancelled && live) {
          found = {
            id: live.id,
            equipmentId: live.serialNumber || live.id,
            name: live.name || '',
            type: live.type || '',
            manufacturer: live.manufacturer || '—',
            model: live.model || '—',
            serialNumber: live.serialNumber || '',
            calibrationDate: live.calibrationDate || '',
            calibrationValidUntil: live.calibrationValidUntil || '',
            calibrationCertificateRef: live.certificateNumber || '',
            laboratoryId: live.laboratoryId || '',
            laboratoryCode: live.laboratoryCode || '',
            laboratoryName: live.laboratoryName || '',
            condition: live.condition || 'good',
            notes: live.notes || '',
            createdAt: live.createdAt || '',
            updatedAt: live.updatedAt || '',
          };
        }
      }
      if (!cancelled) {
        setEquipment(found);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-[13px] text-gray-500">Loading equipment…</div>
        </div>
      </Shell>
    );
  }

  if (!equipment) {
    return (
      <Shell breadcrumbs={[{ label: 'Equipment', href: '/equipment' }, { label: 'Not Found', current: true }]}>
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

  const calibrationStatus = getCalibrationStatus(equipment.calibrationDate, equipment.calibrationValidUntil);
  const statusConfig = getCalibrationStatusConfig(calibrationStatus);

  const daysUntilExpiry = equipment.calibrationValidUntil
    ? Math.ceil((new Date(equipment.calibrationValidUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const conditionConfig = {
    good: { color: 'success' as const, label: 'Good' },
    'needs-repair': { color: 'warning' as const, label: 'Needs Repair' },
    'out-of-service': { color: 'danger' as const, label: 'Out of Service' },
  };

  return (
    <Shell breadcrumbs={[
      { label: 'Equipment', href: '/equipment' },
      { label: equipment.equipmentId, current: true },
    ]}>
      <PageHeader
        title={equipment.name}
        subtitle={`Equipment ID: ${equipment.equipmentId}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/equipment/${equipment.id}/edit`}>
              <Button variant="secondary" size="md">Edit</Button>
            </Link>
          </div>
        }
      >
        <div className="flex items-center gap-3">
          <Badge color={conditionConfig[equipment.condition].color} variant="subtle">
            {conditionConfig[equipment.condition].label}
          </Badge>
          <Badge color={statusConfig.color} variant={statusConfig.variant}>
            {statusConfig.label}
          </Badge>
        </div>
      </PageHeader>

      {/* ── Calibration Warnings ── */}
      {calibrationStatus === 'expired' && (
        <div className="mb-4">
          <Alert type="error" title="Calibration Expired">
            This equipment's calibration expired on {new Date(equipment.calibrationValidUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}.
            It should not be used for testing until recalibrated.
          </Alert>
        </div>
      )}
      {calibrationStatus === 'due-soon' && daysUntilExpiry !== null && (
        <div className="mb-4">
          <Alert type="warning" title={`Calibration Due in ${daysUntilExpiry} Days`}>
            This equipment's calibration will expire on {new Date(equipment.calibrationValidUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}.
            Please schedule recalibration.
          </Alert>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Left Column: Details ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* ── Equipment Identification ── */}
          <FieldSet legend="Equipment Identification">
            <DetailRow label="Equipment ID" value={equipment.equipmentId} mono />
            <DetailRow label="Name" value={equipment.name} />
            <DetailRow label="Type" value={equipment.type} />
            <DetailRow label="Manufacturer" value={equipment.manufacturer} />
            <DetailRow label="Model" value={equipment.model} />
            <DetailRow label="Serial Number" value={equipment.serialNumber} mono />
          </FieldSet>

          {/* ── Calibration Information ── */}
          <FieldSet legend="Calibration Information">
            <DetailRow
              label="Calibration Date"
              value={equipment.calibrationDate
                ? new Date(equipment.calibrationDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : null
              }
            />
            <DetailRow
              label="Valid Until"
              value={equipment.calibrationValidUntil
                ? new Date(equipment.calibrationValidUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : null
              }
            />
            <DetailRow label="Certificate Reference" value={equipment.calibrationCertificateRef} mono />
            
            {/* Days until expiry */}
            {daysUntilExpiry !== null && (
              <div className="mt-3 p-3 bg-gray-50 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-gray-600">Time Remaining</span>
                  <span className={cn(
                    'text-[14px] font-semibold',
                    daysUntilExpiry < 0 ? 'text-danger-600' :
                    daysUntilExpiry <= 30 ? 'text-warning-600' :
                    'text-success-600'
                  )}>
                    {daysUntilExpiry < 0
                      ? `Expired ${Math.abs(daysUntilExpiry)} days ago`
                      : `${daysUntilExpiry} days remaining`
                    }
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      daysUntilExpiry < 0 ? 'bg-danger-500' :
                      daysUntilExpiry <= 30 ? 'bg-warning-500' :
                      'bg-success-500'
                    )}
                    style={{ width: `${Math.min(100, Math.max(0, (daysUntilExpiry / 365) * 100))}%` }}
                  />
                </div>
              </div>
            )}
          </FieldSet>

          {/* ── Notes ── */}
          {equipment.notes && (
            <FieldSet legend="Notes">
              <p className="text-[13px] text-gray-700 leading-relaxed">{equipment.notes}</p>
            </FieldSet>
          )}
        </div>

        {/* ── Right Column: Meta ── */}
        <div className="space-y-4">
          {/* ── Laboratory ── */}
          <FieldSet legend="Laboratory">
            <DetailRow label="Laboratory" value={equipment.laboratoryName} />
            <DetailRow label="Code" value={equipment.laboratoryCode} mono />
          </FieldSet>

          {/* ── Record Info ── */}
          <FieldSet legend="Record Information">
            <DetailRow
              label="Created"
              value={new Date(equipment.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            />
            <DetailRow
              label="Last Updated"
              value={new Date(equipment.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            />
          </FieldSet>
        </div>
      </div>
    </Shell>
  );
}
