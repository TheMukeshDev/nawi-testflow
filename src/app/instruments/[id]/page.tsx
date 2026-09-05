/**
 * NAWI TestFlow — Instrument Detail Page
 *
 * View instrument details, specifications, and test history.
 * Features:
 * - Complete instrument information display
 * - Technical specifications with units
 * - Test history linked to this instrument
 * - Edit button for authorized users
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { TestStatusBadge, ComplianceBadge } from '@/components/ui/StatusBadge';
import { FieldSet } from '@/components/ui/FormControls';
import { getInstrument, getInstrumentTestHistory, type InstrumentDetailRecord, type InstrumentTestHistoryRecord } from '@/lib/catalog-db';
import type { TestStatus, ComplianceVerdict } from '@/types';

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

const TEST_HISTORY_COLUMNS: ColumnDef<InstrumentTestHistoryRecord>[] = [
  {
    key: 'testNumber',
    header: 'Test No.',
    mono: true,
    width: 150,
    sortable: true,
  },
  {
    key: 'verificationType',
    header: 'Type',
    width: 100,
  },
  {
    key: 'status',
    header: 'Status',
    width: 140,
    render: (_, row) => <TestStatusBadge status={row.status} />,
  },
  {
    key: 'complianceResult',
    header: 'Compliance',
    width: 120,
    render: (_, row) => <ComplianceBadge verdict={row.complianceResult} />,
  },
  {
    key: 'technician',
    header: 'Technician',
    width: 120,
  },
  {
    key: 'completedAt',
    header: 'Completed',
    width: 120,
    render: (_, row) => row.completedAt
      ? new Date(row.completedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—',
  },
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function DetailRow({ label, value, unit, mono = false }: {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2 py-1.5">
      <span className="text-[12px] text-gray-500 w-[110px] sm:w-[180px] shrink-0">{label}</span>
      <span className={`text-[13px] text-gray-900 ${mono ? 'font-mono text-[12px]' : ''}`}>
        {value !== null && value !== undefined && value !== ''
          ? <>
              {value}
              {unit && <span className="text-gray-500 ml-1">{unit}</span>}
            </>
          : <span className="text-gray-400">—</span>
        }
      </span>
    </div>
  );
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function InstrumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = React.use(params);
  const [instrument, setInstrument] = React.useState<InstrumentDetailRecord | null>(null);
  const [testHistory, setTestHistory] = React.useState<InstrumentTestHistoryRecord[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getInstrument(id).then(async (record) => {
      if (cancelled) return;
      setInstrument(record);
      if (record) {
        const history = await getInstrumentTestHistory(id);
        if (!cancelled) setTestHistory(history);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const conditionConfig = {
    good: { color: 'success' as const, label: 'Good' },
    'needs-repair': { color: 'warning' as const, label: 'Needs Repair' },
    'out-of-service': { color: 'danger' as const, label: 'Out of Service' },
  };

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-[13px] text-gray-500">Loading instrument…</div>
        </div>
      </Shell>
    );
  }

  if (!instrument) {
    return (
      <Shell breadcrumbs={[{ label: 'Instruments', href: '/instruments' }, { label: 'Not Found', current: true }]}>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <h2 className="text-[16px] font-semibold text-gray-900 mb-2">Instrument Not Found</h2>
          <p className="text-[13px] text-gray-600 mb-4">
            No instrument matches the requested record.
          </p>
          <Link href="/instruments" className="px-4 py-2 bg-primary-600 text-white rounded-md text-[13px] font-medium hover:bg-primary-700">
            ← Back to Instruments
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell breadcrumbs={[
      { label: 'Instruments', href: '/instruments' },
      { label: instrument.serialNumber, current: true },
    ]}>
      <PageHeader
        title={`${instrument.manufacturerName} ${instrument.modelName}`}
        subtitle={`Serial No. ${instrument.serialNumber}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/instruments/${instrument.id}/edit`}>
              <Button variant="secondary" size="md">Edit</Button>
            </Link>
            <Link href={`/tests/new?instrument=${instrument.id}`}>
              <Button variant="primary" size="md">+ New Test</Button>
            </Link>
          </div>
        }
      >
        <div className="flex items-center gap-3">
          <Badge color={conditionConfig[instrument.condition].color} variant="subtle">
            {conditionConfig[instrument.condition].label}
          </Badge>
          {instrument.instrumentClass && (
            <Badge color="primary" variant="outline">
              Class {instrument.instrumentClass}
            </Badge>
          )}
          <span className="text-[12px] text-gray-500">
            {testHistory.length} test{testHistory.length !== 1 ? 's' : ''} recorded
          </span>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Left Column: Specifications ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* ── Identification ── */}
          <FieldSet legend="Identification">
            <DetailRow label="Serial Number" value={instrument.serialNumber} mono />
            {instrument.assetTag && (
              <DetailRow label="Asset Tag" value={instrument.assetTag} mono />
            )}
            <DetailRow label="Manufacturer" value={instrument.manufacturerName} />
            <DetailRow label="Country of Origin" value={instrument.manufacturerCountry} />
            <DetailRow label="Model Name" value={instrument.modelName} />
            <DetailRow label="Model Number" value={instrument.modelNumber} mono />
            <DetailRow label="Instrument Type" value={instrument.instrumentType} />
          </FieldSet>

          {/* ── Technical Specifications ── */}
          <FieldSet legend="Technical Specifications">
            <DetailRow label="Instrument Class" value={instrument.instrumentClass ? `Class ${instrument.instrumentClass}` : null} />
            <DetailRow label="Accuracy Class" value={instrument.accuracyClass} />
            <DetailRow label="Power Supply" value={instrument.powerSupply} />
          </FieldSet>

          {/* ── Capacity & Scale ── */}
          <FieldSet legend="Capacity & Scale Intervals">
            <DetailRow label="Maximum Capacity" value={instrument.maxCapacity} unit={instrument.maxCapacityUnit} mono />
            <DetailRow label="Minimum Capacity" value={instrument.minCapacity} unit={instrument.minCapacityUnit} mono />
            <DetailRow label="Scale Interval (d)" value={instrument.scaleInterval} unit={instrument.scaleIntervalUnit} mono />
            <DetailRow label="Verification Scale Interval (e)" value={instrument.verificationScaleInterval} unit={instrument.verificationScaleIntervalUnit || undefined} mono />
            <DetailRow label="No. of Verification Intervals (n)" value={instrument.numberOfVerificationIntervals} mono />
          </FieldSet>

          {/* ── Software & Firmware ── */}
          {(instrument.softwareVersion || instrument.firmwareVersion) && (
            <FieldSet legend="Software & Firmware">
              <DetailRow label="Software Version" value={instrument.softwareVersion} mono />
              <DetailRow label="Firmware Version" value={instrument.firmwareVersion} mono />
            </FieldSet>
          )}

          {/* ── Notes ── */}
          {instrument.notes && (
            <FieldSet legend="Notes">
              <p className="text-[13px] text-gray-700 leading-relaxed">{instrument.notes}</p>
            </FieldSet>
          )}
        </div>

        {/* ── Right Column: Meta & History ── */}
        <div className="space-y-4">
          {/* ── Laboratory ── */}
          <FieldSet legend="Laboratory">
            <DetailRow label="Laboratory" value={instrument.laboratoryName} />
            <DetailRow label="Code" value={instrument.laboratoryCode} mono />
          </FieldSet>

          {/* ── Dates ── */}
          <FieldSet legend="Dates & Calibration">
            <DetailRow
              label="Date Received"
              value={instrument.dateReceived
                ? new Date(instrument.dateReceived).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : null
              }
            />
            <DetailRow
              label="Last Calibration"
              value={instrument.lastCalibration
                ? new Date(instrument.lastCalibration).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : null
              }
            />
            <DetailRow
              label="Next Calibration"
              value={instrument.nextCalibration
                ? new Date(instrument.nextCalibration).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : null
              }
            />
          </FieldSet>

          {/* ── Record Info ── */}
          <FieldSet legend="Record Information">
            <DetailRow label="Created" value={new Date(instrument.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} />
            <DetailRow label="Last Updated" value={new Date(instrument.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} />
            <DetailRow label="Created By" value={instrument.createdBy} />
          </FieldSet>
        </div>
      </div>

      {/* ── Test History ── */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-section-title">Test History</h2>
          <span className="text-[12px] text-gray-500">
            {testHistory.length} test{testHistory.length !== 1 ? 's' : ''}
          </span>
        </div>
        <DataTable
          columns={TEST_HISTORY_COLUMNS}
          data={testHistory}
          rowKey={(row) => row.id}
          onRowClick={(row) => router.push(`/tests?highlight=${row.id}`)}
          sort={{ key: 'completedAt', direction: 'desc' }}
          emptyState={
            <div className="py-8 text-center text-[13px] text-gray-500">
              No test history recorded for this instrument.
            </div>
          }
          caption={`Test history for instrument ${instrument.serialNumber}`}
        />
      </div>
    </Shell>
  );
}
