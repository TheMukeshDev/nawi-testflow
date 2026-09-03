'use client';

import React, { useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/FormControls';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { NoResults } from '@/components/ui/EmptyState';
import { deepSearch } from '@/lib/search';
import { useDashboardSearch, setDashboardSearch } from '@/components/layout/DashboardSearchContext';

interface AuditRecord {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityLabel: string;
  details: string;
  ipAddress: string;
}

const MOCK_AUDIT: AuditRecord[] = [
  {
    id: '1',
    timestamp: '2026-09-02T14:30:12Z',
    userName: 'J. Rajagopal',
    userRole: 'Technician',
    action: 'Submit',
    entityType: 'Test',
    entityLabel: 'TST-2026-001234',
    details: 'Test submitted for review',
    ipAddress: '10.0.1.45',
  },
  {
    id: '2',
    timestamp: '2026-09-02T11:15:00Z',
    userName: 'Dr. K. Sharma',
    userRole: 'Reviewer',
    action: 'Reject',
    entityType: 'Test',
    entityLabel: 'TST-2026-001231',
    details: 'Repeatability observation values exceed tolerance. Revision requested.',
    ipAddress: '10.0.1.10',
  },
  {
    id: '3',
    timestamp: '2026-09-01T16:45:30Z',
    userName: 'S. Iyer',
    userRole: 'Technician',
    action: 'Update',
    entityType: 'Test',
    entityLabel: 'TST-2026-001228',
    details: 'Added eccentricity observation data (4 test points)',
    ipAddress: '10.0.2.22',
  },
  {
    id: '4',
    timestamp: '2026-09-01T10:00:00Z',
    userName: 'Dr. K. Sharma',
    userRole: 'Reviewer',
    action: 'Approve',
    entityType: 'Test',
    entityLabel: 'TST-2026-001230',
    details: 'Test approved. All observations and calculations verified.',
    ipAddress: '10.0.1.10',
  },
  {
    id: '5',
    timestamp: '2026-09-01T08:00:00Z',
    userName: 'J. Rajagopal',
    userRole: 'Technician',
    action: 'Create',
    entityType: 'Test',
    entityLabel: 'TST-2026-001234',
    details: 'New test created. Instrument: WGH-2024-0891. Type: Initial Verification.',
    ipAddress: '10.0.1.45',
  },
];

const COLUMNS: ColumnDef<AuditRecord>[] = [
  {
    key: 'timestamp',
    header: 'Timestamp',
    width: 150,
    sortable: true,
    render: (_, row) => {
      const d = new Date(row.timestamp);
      return (
        <span className="font-mono text-[12px]">
          {d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          {' '}
          {d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
        </span>
      );
    },
  },
  { key: 'userName', header: 'User', width: 130 },
  { key: 'userRole', header: 'Role', width: 100,
    render: (_, row) => <Badge color="gray" variant="subtle">{row.userRole}</Badge>,
  },
  {
    key: 'action',
    header: 'Action',
    width: 80,
    render: (_, row) => {
      const colorMap: Record<string, 'success' | 'danger' | 'warning' | 'primary' | 'info' | 'gray'> = {
        'Create': 'info',
        'Update': 'primary',
        'Submit': 'primary',
        'Approve': 'success',
        'Reject': 'danger',
        'Delete': 'danger',
      };
      return <Badge color={colorMap[row.action] || 'gray'} variant="subtle">{row.action}</Badge>;
    },
  },
  { key: 'entityType', header: 'Entity Type', width: 90 },
  { key: 'entityLabel', header: 'Reference', mono: true, width: 145 },
  { key: 'details', header: 'Details', width: 300 },
  { key: 'ipAddress', header: 'IP Address', mono: true, width: 110 },
];

export default function AuditLogPage() {
  // Shared live search — bound to the TopBar header search
  const searchQuery = useDashboardSearch();

  // Deep search across every audit field (user, role, action, reference, details, IP…)
  const filteredAudit = useMemo(() => deepSearch(MOCK_AUDIT, searchQuery), [searchQuery]);

  return (
    <Shell breadcrumbs={[{ label: 'Audit Log', current: true }]}>
      <PageHeader
        title="Audit Log"
        subtitle="System activity trail — all actions are recorded"
      />

      {/* ── Filter Bar ── */}
      <div className="panel p-3 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={searchQuery}
            onChange={setDashboardSearch}
            placeholder="Search by user, role, action, reference, details, IP…"
            ariaLabel="Search audit log"
            className="flex-1 min-w-[220px]"
          />
          <Select
            label=""
            options={[
              { label: 'All Actions', value: 'all' },
              { label: 'Create', value: 'create' },
              { label: 'Update', value: 'update' },
              { label: 'Approve', value: 'approve' },
              { label: 'Reject', value: 'reject' },
            ]}
            placeholder="All Actions"
            className="w-[130px]"
          />
          <Button variant="secondary" size="md">Export CSV</Button>
        </div>
      </div>

      <DataTable
        columns={COLUMNS}
        data={filteredAudit}
        rowKey={(row) => row.id}
        sort={{ key: 'timestamp', direction: 'desc' }}
        pagination={{ page: 1, pageSize: 25, total: filteredAudit.length }}
        emptyState={<NoResults />}
        caption="System audit trail"
      />
    </Shell>
  );
}
