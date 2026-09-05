/**
 * NAWI TestFlow — Laboratory Detail Page
 *
 * View laboratory details, instruments, and active tests.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FieldSet } from '@/components/ui/FormControls';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { ConditionDot } from '@/components/ui/StatusBadge';
import {
  getLaboratory,
  getInstrumentsByLaboratory,
  getActiveTestsByLaboratory,
  type LabRecord,
  type LabInstrumentSummary,
} from '@/lib/catalog-db';

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

const INSTRUMENT_COLUMNS: ColumnDef<LabInstrumentSummary>[] = [
  { key: 'serialNumber', header: 'Serial No.', mono: true, width: 140 },
  {
    key: 'modelName',
    header: 'Model',
    width: 140,
    render: (_, row) => (
      <div>
        <div className="text-[13px] font-medium text-gray-900">{row.modelName}</div>
        <div className="text-[11px] text-gray-500">{row.modelNumber}</div>
      </div>
    ),
  },
  { key: 'manufacturer', header: 'Manufacturer', width: 140, className: 'hidden sm:table-cell' },
  {
    key: 'condition',
    header: 'Condition',
    width: 100,
    render: (_, row) => {
      const config = {
        good: { color: 'success' as const, label: 'Good' },
        'needs-repair': { color: 'warning' as const, label: 'Needs Repair' },
        'out-of-service': { color: 'danger' as const, label: 'Out of Service' },
      };
      const { color, label } = config[row.condition];
      return <Badge color={color} variant="subtle">{label}</Badge>;
    },
  },
  {
    key: 'lastCalibration',
    header: 'Last Cal.',
    width: 100,
    className: 'hidden md:table-cell',
    render: (_, row) => row.lastCalibration
      ? new Date(row.lastCalibration).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—',
  },
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function DetailRow({ label, value, mono = false }: {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1.5">
      <span className="text-[12px] text-gray-500 sm:w-[160px] shrink-0">{label}</span>
      <span className={`text-[13px] text-gray-900 ${mono ? 'font-mono text-[12px]' : ''}`}>
        {value !== null && value !== undefined && value !== ''
          ? value
          : <span className="text-gray-400">—</span>
        }
      </span>
    </div>
  );
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function LaboratoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = React.use(params);
  const [lab, setLab] = React.useState<LabRecord | null>(null);
  const [instruments, setInstruments] = React.useState<LabInstrumentSummary[]>([]);
  const [activeTests, setActiveTests] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getLaboratory(id),
      getInstrumentsByLaboratory(id),
      getActiveTestsByLaboratory(id),
    ]).then(([labRow, insts, active]) => {
      if (cancelled) return;
      setLab(labRow);
      setInstruments(insts);
      setActiveTests(active);
      setLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-[13px] text-gray-500">Loading laboratory…</div>
        </div>
      </Shell>
    );
  }

  if (!lab) {
    return (
      <Shell breadcrumbs={[{ label: 'Laboratories', href: '/laboratories' }, { label: 'Not Found', current: true }]}>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <h2 className="text-[16px] font-semibold text-gray-900 mb-2">Laboratory Not Found</h2>
          <p className="text-[13px] text-gray-600 mb-4">
            No laboratory matches the requested record.
          </p>
          <Link href="/laboratories" className="px-4 py-2 bg-primary-600 text-white rounded-md text-[13px] font-medium hover:bg-primary-700">
            ← Back to Laboratories
          </Link>
        </div>
      </Shell>
    );
  }

  const isAccreditationExpired =
    lab.accreditationValidUntil !== null && new Date(lab.accreditationValidUntil) < new Date();
  const isAccreditationExpiringSoon =
    lab.accreditationValidUntil !== null &&
    !isAccreditationExpired &&
    Math.ceil((new Date(lab.accreditationValidUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= 90;

  return (
    <Shell breadcrumbs={[
      { label: 'Laboratories', href: '/laboratories' },
      { label: lab.code, current: true },
    ]}>
      <PageHeader
        title={lab.name}
        subtitle={`Laboratory Code: ${lab.code}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/laboratories/${lab.id}/edit`}>
              <Button variant="secondary" size="md">Edit</Button>
            </Link>
          </div>
        }
      >
        <div className="flex items-center gap-3">
          <Badge color={lab.isActive ? 'success' : 'gray'} variant="subtle">
            {lab.isActive ? 'Active' : 'Inactive'}
          </Badge>
          <Badge
            color={isAccreditationExpired ? 'danger' : isAccreditationExpiringSoon ? 'warning' : 'info'}
            variant="subtle"
          >
            Accreditation: {lab.accreditationNumber || '—'}
          </Badge>
          <span className="text-[12px] text-gray-500">
            {instruments.length} instrument{instruments.length !== 1 ? 's' : ''}
          </span>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Left Column: Details ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* ── Contact Information ── */}
          <FieldSet legend="Contact Information">
            <DetailRow label="Contact Person" value={lab.contactPerson} />
            <DetailRow label="Phone" value={lab.phone} mono />
            <DetailRow label="Email" value={lab.email} />
            <DetailRow label="Address" value={lab.address} />
            <DetailRow label="City" value={lab.city} />
            <DetailRow label="State" value={lab.state} />
            <DetailRow label="Country" value={lab.country} />
          </FieldSet>

          {/* ── Accreditation ── */}
          <FieldSet legend="Accreditation">
            <DetailRow label="Accreditation Body" value={lab.accreditationBody} />
            <DetailRow label="Accreditation Number" value={lab.accreditationNumber} mono />
            <DetailRow
              label="Valid Until"
              value={lab.accreditationValidUntil
                ? new Date(lab.accreditationValidUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : null
              }
            />
            {isAccreditationExpired && (
              <div className="mt-2 p-2 bg-danger-50 border border-danger-300 rounded-md text-[12px] text-danger-700 flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M9 2l7 13H2z" />
                  <path d="M9 7v3.5" />
                  <circle cx="9" cy="13" r="0.5" fill="currentColor" />
                </svg>
                Accreditation has expired. Please renew before conducting tests.
              </div>
            )}
            {isAccreditationExpiringSoon && !isAccreditationExpired && (
              <div className="mt-2 p-2 bg-warning-50 border border-warning-300 rounded-md text-[12px] text-warning-700 flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M9 2l7 13H2z" />
                  <path d="M9 7v3.5" />
                  <circle cx="9" cy="13" r="0.5" fill="currentColor" />
                </svg>
                Accreditation will expire within 90 days.
              </div>
            )}
          </FieldSet>
        </div>

        {/* ── Right Column: Summary ── */}
        <div className="space-y-4">
          {/* ── Summary Stats ── */}
          <FieldSet legend="Summary">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-md">
                <div className="text-[20px] font-bold text-gray-900">{instruments.length}</div>
                <div className="text-[11px] text-gray-500">Instruments</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-md">
                <div className="text-[20px] font-bold text-gray-900">{activeTests}</div>
                <div className="text-[11px] text-gray-500">Active Tests</div>
              </div>
            </div>
          </FieldSet>

          {/* ── Record Info ── */}
          <FieldSet legend="Record Information">
            <DetailRow
              label="Created"
              value={new Date(lab.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            />
            <DetailRow
              label="Last Updated"
              value={new Date(lab.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            />
          </FieldSet>
        </div>
      </div>

      {/* ── Instruments ── */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-section-title">Instruments</h2>
          <Link href={`/instruments?laboratory=${lab.id}`}>
            <Button variant="ghost" size="sm">View All →</Button>
          </Link>
        </div>
        <DataTable
          columns={INSTRUMENT_COLUMNS}
          data={instruments}
          rowKey={(row) => row.id}
          onRowClick={(row) => router.push(`/instruments/${row.id}`)}
          emptyState={
            <div className="py-8 text-center text-[13px] text-gray-500">
              No instruments registered in this laboratory.
            </div>
          }
          caption={`Instruments in ${lab.code}`}
        />
      </div>
    </Shell>
  );
}
