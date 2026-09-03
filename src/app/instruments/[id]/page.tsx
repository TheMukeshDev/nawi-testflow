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
import type { InstrumentClass, TestStatus, ComplianceVerdict } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

interface InstrumentDetail {
  id: string;
  serialNumber: string;
  assetTag?: string;
  
  // Model info
  modelName: string;
  modelNumber: string;
  manufacturerName: string;
  manufacturerCountry: string;
  
  // Technical specifications
  instrumentType: string;
  instrumentClass: InstrumentClass | null;
  accuracyClass: string;
  
  // Capacity
  maxCapacity: number;
  maxCapacityUnit: string;
  minCapacity: number;
  minCapacityUnit: string;
  
  // Scale
  scaleInterval: number;
  scaleIntervalUnit: string;
  verificationScaleInterval: number | null;
  verificationScaleIntervalUnit: string | null;
  numberOfVerificationIntervals: number | null;
  
  // Software
  softwareVersion: string;
  firmwareVersion: string;
  powerSupply: string;
  
  // Laboratory
  laboratoryId: string;
  laboratoryCode: string;
  laboratoryName: string;
  
  // Dates & condition
  dateReceived: string;
  lastCalibration: string | null;
  nextCalibration: string | null;
  condition: 'good' | 'needs-repair' | 'out-of-service';
  
  // Notes
  notes: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  testCount: number;
}

interface TestHistoryRecord {
  id: string;
  testNumber: string;
  verificationType: string;
  status: TestStatus;
  complianceResult: ComplianceVerdict;
  technician: string;
  submittedAt: string | null;
  completedAt: string | null;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_INSTRUMENT: InstrumentDetail = {
  id: '1',
  serialNumber: 'WGH-2024-0891',
  assetTag: 'NPL-DL-INST-001',
  modelName: 'Acom 3000',
  modelNumber: 'AC-3000',
  manufacturerName: 'Acom Instruments',
  manufacturerCountry: 'Germany',
  instrumentType: 'electronic',
  instrumentClass: 'III',
  accuracyClass: 'M2',
  maxCapacity: 3000,
  maxCapacityUnit: 'kg',
  minCapacity: 10,
  minCapacityUnit: 'kg',
  scaleInterval: 1,
  scaleIntervalUnit: 'kg',
  verificationScaleInterval: 1,
  verificationScaleIntervalUnit: 'kg',
  numberOfVerificationIntervals: 3000,
  softwareVersion: 'v2.1.0',
  firmwareVersion: 'v1.0.3',
  powerSupply: '230V AC',
  laboratoryId: '1',
  laboratoryCode: 'NPL-DL-01',
  laboratoryName: 'National Physical Laboratory — Delhi',
  dateReceived: '2024-01-15',
  lastCalibration: '2026-06-15',
  nextCalibration: '2027-06-15',
  condition: 'good',
  notes: 'Primary instrument for Class III verification testing. Located in Testing Lab A.',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2026-09-01T14:30:00Z',
  createdBy: 'J. Rajagopal',
  testCount: 24,
};

const MOCK_TEST_HISTORY: TestHistoryRecord[] = [
  {
    id: '1',
    testNumber: 'TST-2026-001234',
    verificationType: 'Initial',
    status: 'completed',
    complianceResult: 'compliant',
    technician: 'J. Rajagopal',
    submittedAt: '2026-09-02T14:30:00Z',
    completedAt: '2026-09-03T10:00:00Z',
  },
  {
    id: '2',
    testNumber: 'TST-2026-001220',
    verificationType: 'Subsequent',
    status: 'completed',
    complianceResult: 'compliant',
    technician: 'P. Mehta',
    submittedAt: '2026-08-15T11:00:00Z',
    completedAt: '2026-08-16T09:00:00Z',
  },
  {
    id: '3',
    testNumber: 'TST-2026-001205',
    verificationType: 'Initial',
    status: 'completed',
    complianceResult: 'non-compliant',
    technician: 'J. Rajagopal',
    submittedAt: '2026-07-20T16:00:00Z',
    completedAt: '2026-07-21T14:00:00Z',
  },
  {
    id: '4',
    testNumber: 'TST-2026-001190',
    verificationType: 'Subsequent',
    status: 'completed',
    complianceResult: 'compliant',
    technician: 'S. Iyer',
    submittedAt: '2026-06-10T09:00:00Z',
    completedAt: '2026-06-11T15:00:00Z',
  },
  {
    id: '5',
    testNumber: 'TST-2026-001180',
    verificationType: 'Initial',
    status: 'completed',
    complianceResult: 'compliant',
    technician: 'J. Rajagopal',
    submittedAt: '2026-05-05T10:00:00Z',
    completedAt: '2026-05-06T12:00:00Z',
  },
];

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

const TEST_HISTORY_COLUMNS: ColumnDef<TestHistoryRecord>[] = [
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
      <span className="text-[12px] text-gray-500 w-[180px] shrink-0">{label}</span>
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
  const instrument = MOCK_INSTRUMENT;
  const testHistory = MOCK_TEST_HISTORY;

  const conditionConfig = {
    good: { color: 'success' as const, label: 'Good' },
    'needs-repair': { color: 'warning' as const, label: 'Needs Repair' },
    'out-of-service': { color: 'danger' as const, label: 'Out of Service' },
  };

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
            {instrument.testCount} test{instrument.testCount !== 1 ? 's' : ''} recorded
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
              value={new Date(instrument.dateReceived).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
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
          onRowClick={(row) => router.push(`/tests/${row.id}`)}
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
