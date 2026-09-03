/**
 * NAWI TestFlow — Tests List Page
 *
 * Primary view for managing all tests.
 * Filter tabs at the top: All / Drafts / In Testing / Pending Review / Completed
 * Full DataTable with all relevant columns.
 */

'use client';

import React from 'react';
import { Shell } from '@/components/layout/Shell';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, FilterTabs, type ColumnDef } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { TestStatusBadge, ComplianceBadge } from '@/components/ui/StatusBadge';
import { NoResults } from '@/components/ui/EmptyState';
import type { TestStatus, ComplianceVerdict, PaginationState, SortState } from '@/types';
import { TEST_STATUS_FILTERS } from '@/lib/constants';

// ── Mock Data ──
interface TestRecord {
  id: string;
  testNumber: string;
  instrumentSerial: string;
  instrumentModel: string;
  instrumentClass: string;
  laboratory: string;
  verificationType: string;
  status: TestStatus;
  complianceResult: ComplianceVerdict;
  technician: string;
  createdAt: string;
  lastUpdated: string;
}

const MOCK_TESTS: TestRecord[] = [
  {
    id: '1',
    testNumber: 'TR-2026-001',
    instrumentSerial: 'ABC-2026-EL-00412',
    instrumentModel: 'ABC-3000 Electronic Balance',
    instrumentClass: 'III',
    laboratory: 'CMTL-PY-01',
    verificationType: 'Initial',
    status: 'pending-review',
    complianceResult: 'pending',
    technician: 'Priya Mehta',
    createdAt: '2026-09-01T08:00:00Z',
    lastUpdated: '2026-09-02T14:30:00Z',
  },
  {
    id: '2',
    testNumber: 'TR-2026-002',
    instrumentSerial: 'PWS-2025-PR-00089',
    instrumentModel: 'PWS Precision Scale 220',
    instrumentClass: 'II',
    laboratory: 'CMTL-PY-01',
    verificationType: 'Subsequent',
    status: 'in-testing',
    complianceResult: 'pending',
    technician: 'Priya Mehta',
    createdAt: '2026-09-01T10:15:00Z',
    lastUpdated: '2026-09-02T11:15:00Z',
  },
  {
    id: '3',
    testNumber: 'TR-2026-003',
    instrumentSerial: 'ABC-2025-EL-00589',
    instrumentModel: 'ABC-220 Analytical Balance',
    instrumentClass: 'II',
    laboratory: 'CMTL-PY-01',
    verificationType: 'Initial',
    status: 'completed',
    complianceResult: 'compliant',
    technician: 'Rajesh Nair',
    createdAt: '2026-08-28T09:00:00Z',
    lastUpdated: '2026-09-01T10:00:00Z',
  },
  {
    id: '4',
    testNumber: 'TR-2026-004',
    instrumentSerial: 'MST-2024-EL-00247',
    instrumentModel: 'MetroScale 2000 Industrial',
    instrumentClass: 'III',
    laboratory: 'PITL-PR-02',
    verificationType: 'Initial',
    status: 'completed',
    complianceResult: 'non-compliant',
    technician: 'Rajesh Nair',
    createdAt: '2026-08-27T14:00:00Z',
    lastUpdated: '2026-08-31T15:30:00Z',
  },
  {
    id: '5',
    testNumber: 'TR-2026-005',
    instrumentSerial: 'PWS-2025-PL-00334',
    instrumentModel: 'PWS Platform Scale 3000',
    instrumentClass: 'III',
    laboratory: 'PITL-PR-02',
    verificationType: 'Subsequent',
    status: 'draft',
    complianceResult: 'pending',
    technician: 'Suresh Iyer',
    createdAt: '2026-08-26T11:00:00Z',
    lastUpdated: '2026-08-26T11:00:00Z',
  },
];

const COLUMNS: ColumnDef<TestRecord>[] = [
  {
    key: 'testNumber',
    header: 'Test No.',
    mono: true,
    sortable: true,
    width: 145,
  },
  {
    key: 'instrumentSerial',
    header: 'Instrument',
    mono: true,
    width: 140,
  },
  {
    key: 'instrumentModel',
    header: 'Model',
    width: 150,
  },
  {
    key: 'instrumentClass',
    header: 'Class',
    width: 70,
    align: 'center',
  },
  {
    key: 'laboratory',
    header: 'Laboratory',
    width: 100,
  },
  {
    key: 'verificationType',
    header: 'Verification',
    width: 110,
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    width: 150,
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
    key: 'lastUpdated',
    header: 'Updated',
    sortable: true,
    width: 120,
    render: (_, row) => {
      const d = new Date(row.lastUpdated);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    },
  },
];

export default function TestsPage() {
  const [activeFilter, setActiveFilter] = React.useState('all');
  const [pagination] = React.useState<PaginationState>({
    page: 1,
    pageSize: 25,
    total: MOCK_TESTS.length,
  });
  const [sort] = React.useState<SortState>({ key: 'lastUpdated', direction: 'desc' });

  const filteredData = activeFilter === 'all'
    ? MOCK_TESTS
    : MOCK_TESTS.filter(t => t.status === activeFilter);

  return (
    <Shell breadcrumbs={[{ label: 'Tests', current: true }]}>
      <PageHeader
        title="Tests"
        subtitle="Manage NAWI test records per OIML R-76"
        actions={
          <Button variant="primary" size="md">
            New Test Report
          </Button>
        }
      />

      {/* ── Filter Tabs ── */}
      <div className="flex items-center justify-between mb-3">
        <FilterTabs
          tabs={TEST_STATUS_FILTERS.map(f => ({
            ...f,
            count: f.value === 'all' ? MOCK_TESTS.length : MOCK_TESTS.filter(t => t.status === f.value).length,
          }))}
          active={activeFilter}
          onChange={setActiveFilter}
        />
      </div>

      {/* ── Tests Table ── */}
      <DataTable
        columns={COLUMNS}
        data={filteredData}
        rowKey={(row) => row.id}
        sort={sort}
        pagination={pagination}
        onRowClick={(row) => console.log('Navigate to test:', row.id)}
        selectable
        onSelectionChange={(keys) => console.log('Selected:', keys)}
        emptyState={<NoResults />}
        caption="NAWI test records"
      />
    </Shell>
  );
}
