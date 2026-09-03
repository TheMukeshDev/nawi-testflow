'use client';

import React from 'react';
import { Shell } from '@/components/layout/Shell';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, TableFilters, type ColumnDef } from '@/components/ui/DataTable';
import { Input, Select } from '@/components/ui/FormControls';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TestStatusBadge, ComplianceBadge } from '@/components/ui/StatusBadge';
import { NoResults } from '@/components/ui/EmptyState';
import type { TestStatus, ComplianceVerdict } from '@/types';

interface RepositoryRecord {
  id: string;
  entityType: 'test' | 'instrument' | 'report';
  referenceNumber: string;
  title: string;
  laboratory: string;
  status: string;
  createdAt: string;
  modifiedAt: string;
}

const MOCK_RECORDS: RepositoryRecord[] = [
  {
    id: '1',
    entityType: 'test',
    referenceNumber: 'TR-2026-001',
    title: 'Initial Verification — ABC-3000 (ABC-2026-EL-00412)',
    laboratory: 'CMTL-PY-01',
    status: 'Pending Review',
    createdAt: '2026-09-01',
    modifiedAt: '2026-09-02',
  },
  {
    id: '2',
    entityType: 'report',
    referenceNumber: 'TR-2026-003',
    title: 'Initial Verification — ABC-220 (ABC-2025-EL-00589)',
    laboratory: 'CMTL-PY-01',
    status: 'Approved',
    createdAt: '2026-09-01',
    modifiedAt: '2026-09-02',
  },
  {
    id: '3',
    entityType: 'instrument',
    referenceNumber: 'MST-2024-EL-00247',
    title: 'MetroScale 2000 Industrial — Class III (2000 kg)',
    laboratory: 'PITL-PR-02',
    status: 'Needs Repair',
    createdAt: '2026-03-15',
    modifiedAt: '2026-08-26',
  },
];

const COLUMNS: ColumnDef<RepositoryRecord>[] = [
  {
    key: 'entityType',
    header: 'Type',
    width: 80,
    render: (_, row) => {
      const map = { test: 'primary' as const, instrument: 'info' as const, report: 'success' as const };
      return <Badge color={map[row.entityType]} variant="subtle">{row.entityType.charAt(0).toUpperCase() + row.entityType.slice(1)}</Badge>;
    },
  },
  { key: 'referenceNumber', header: 'Reference', mono: true, width: 150, sortable: true },
  { key: 'title', header: 'Description', width: 350, sortable: true },
  { key: 'laboratory', header: 'Laboratory', width: 100 },
  { key: 'status', header: 'Status', width: 120 },
  { key: 'createdAt', header: 'Created', width: 100, sortable: true },
  { key: 'modifiedAt', header: 'Modified', width: 100, sortable: true },
];

export default function RepositoryPage() {
  return (
    <Shell breadcrumbs={[{ label: 'Repository', current: true }]}>
      <PageHeader
        title="Repository"
        subtitle="Search and retrieve all system records"
      />

      {/* ── Search & Filter Bar ── */}
      <div className="panel p-3 mb-3">
        <TableFilters>
          <Input
            label=""
            placeholder="Search by test number, serial number, report number…"
            className="flex-1"
            aria-label="Search repository"
          />
          <Select
            label=""
            options={[
              { label: 'All Types', value: 'all' },
              { label: 'Tests', value: 'test' },
              { label: 'Instruments', value: 'instrument' },
              { label: 'Reports', value: 'report' },
            ]}
            placeholder="All Types"
            className="w-[140px]"
          />
          <Select
            label=""
            options={[
              { label: 'All Laboratories', value: 'all' },
              { label: 'NPL-DL-01', value: 'NPL-DL-01' },
              { label: 'NPL-MH-02', value: 'NPL-MH-02' },
            ]}
            placeholder="All Labs"
            className="w-[140px]"
          />
          <Button variant="primary" size="md">Search</Button>
        </TableFilters>
      </div>

      <DataTable
        columns={COLUMNS}
        data={MOCK_RECORDS}
        rowKey={(row) => row.id}
        onRowClick={(row) => console.log('Navigate:', row.entityType, row.id)}
        emptyState={<NoResults onClearFilters={() => {}} />}
        caption="Repository search results"
      />
    </Shell>
  );
}
