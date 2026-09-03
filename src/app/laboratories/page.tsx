/**
 * NAWI TestFlow — Laboratories List Page
 *
 * Main view for managing laboratories.
 * Features:
 * - Search by name, code, city
 * - Filter by status
 * - Data table with sorting
 * - Link to laboratory detail
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Shell } from '@/components/layout/Shell';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, TableFilters, type ColumnDef } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormControls';
import { Badge } from '@/components/ui/Badge';
import { NoResults } from '@/components/ui/EmptyState';

// ============================================================================
// TYPES
// ============================================================================

interface LabRecord {
  id: string;
  name: string;
  code: string;
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
  instrumentCount: number;
  activeTests: number;
  createdAt: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_LABS: LabRecord[] = [
  {
    id: '1',
    name: 'Central Metrology Testing Lab',
    code: 'CMTL-PY-01',
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
    instrumentCount: 15,
    activeTests: 3,
    createdAt: '2020-01-15',
  },
  {
    id: '2',
    name: 'Prayagraj Instrument Testing Lab',
    code: 'PITL-PR-02',
    city: 'Prayagraj',
    state: 'Uttar Pradesh',
    country: 'India',
    accreditationBody: 'NABL',
    accreditationNumber: 'NABL-0456',
    accreditationValidUntil: '2027-06-15',
    contactPerson: 'Dr. A. Patel',
    phone: '+91-532-265-2700',
    email: 'pitl-pr@laboratory.example.in',
    isActive: true,
    instrumentCount: 12,
    activeTests: 1,
    createdAt: '2021-03-20',
  },
  {
    id: '3',
    name: 'North Zone Calibration Laboratory',
    code: 'NZCL-DL-03',
    city: 'New Delhi',
    state: 'Delhi',
    country: 'India',
    accreditationBody: 'NABL',
    accreditationNumber: 'NABL-0789',
    accreditationValidUntil: '2026-12-31',
    contactPerson: 'Dr. R. Krishnan',
    phone: '+91-11-2830-2700',
    email: 'nzcl-dl@laboratory.example.in',
    isActive: true,
    instrumentCount: 8,
    activeTests: 0,
    createdAt: '2022-06-10',
  },
];

// ============================================================================
// FILTER CONFIGURATION
// ============================================================================

const STATUS_FILTERS = [
  { label: 'All Status', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

const COLUMNS: ColumnDef<LabRecord>[] = [
  {
    key: 'code',
    header: 'Code',
    mono: true,
    width: 110,
    sortable: true,
  },
  {
    key: 'name',
    header: 'Laboratory Name',
    width: 250,
    sortable: true,
  },
  {
    key: 'city',
    header: 'City',
    width: 110,
  },
  {
    key: 'state',
    header: 'State',
    width: 110,
  },
  {
    key: 'accreditationNumber',
    header: 'Accreditation',
    mono: true,
    width: 110,
  },
  {
    key: 'accreditationValidUntil',
    header: 'Valid Until',
    width: 100,
    render: (_, row) => {
      const date = new Date(row.accreditationValidUntil);
      const isExpired = date < new Date();
      const isExpiringSoon = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= 90;
      return (
        <span className={cn(
          isExpired && 'text-danger-600 font-medium',
          isExpiringSoon && !isExpired && 'text-warning-600 font-medium',
        )}>
          {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      );
    },
  },
  {
    key: 'isActive',
    header: 'Status',
    width: 80,
    render: (_, row) => (
      <Badge color={row.isActive ? 'success' : 'gray'} variant="subtle">
        {row.isActive ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
  {
    key: 'instrumentCount',
    header: 'Instruments',
    width: 90,
    align: 'center',
  },
  {
    key: 'activeTests',
    header: 'Active Tests',
    width: 90,
    align: 'center',
  },
];

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function LaboratoriesPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [sort, setSort] = React.useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'code', direction: 'asc' });
  const [page, setPage] = React.useState(1);
  const pageSize = 25;

  // Filter data
  const filteredData = React.useMemo(() => {
    let result = [...MOCK_LABS];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(row =>
        row.name.toLowerCase().includes(query) ||
        row.code.toLowerCase().includes(query) ||
        row.city.toLowerCase().includes(query) ||
        row.accreditationNumber.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter === 'active') {
      result = result.filter(row => row.isActive);
    } else if (statusFilter === 'inactive') {
      result = result.filter(row => !row.isActive);
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sort.key as keyof LabRecord];
      const bVal = b[sort.key as keyof LabRecord];
      const comparison = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sort.direction === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [searchQuery, statusFilter, sort]);

  // Paginate
  const paginatedData = filteredData.slice((page - 1) * pageSize, page * pageSize);

  return (
    <Shell breadcrumbs={[{ label: 'Laboratories', current: true }]}>
      <PageHeader
        title="Laboratories"
        subtitle="Testing laboratory facilities and accreditation information"
        actions={
          <Link href="/laboratories/new">
            <Button variant="primary" size="md">Register Laboratory</Button>
          </Link>
        }
      />

      {/* ── Filters ── */}
      <div className="panel p-3 mb-3">
        <TableFilters>
          <Input
            label=""
            placeholder="Search name, code, city, accreditation…"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="flex-1 min-w-[250px]"
          />
          <Select
            label=""
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            options={STATUS_FILTERS}
            className="w-[140px]"
          />
        </TableFilters>
      </div>

      {/* ── Results Summary ── */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] text-gray-500">
          {filteredData.length} laboratory{filteredData.length !== 1 ? 'ies' : ''} found
        </span>
      </div>

      {/* ── Data Table ── */}
      <DataTable
        columns={COLUMNS}
        data={paginatedData}
        rowKey={(row) => row.id}
        sort={sort}
        onSortChange={setSort}
        pagination={{
          page,
          pageSize,
          total: filteredData.length,
        }}
        onPageChange={setPage}
        onRowClick={(row) => window.location.href = `/laboratories/${row.id}`}
        emptyState={
          <NoResults
            onClearFilters={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
          />
        }
        caption="Testing laboratories"
      />
    </Shell>
  );
}
