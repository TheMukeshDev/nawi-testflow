/**
 * NAWI TestFlow — Instruments List Page
 *
 * Main view for managing instruments.
 * Features:
 * - Search by serial number, model, manufacturer
 * - Filter by class, condition, laboratory
 * - Data table with sorting
 * - Link to instrument detail
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Shell } from '@/components/layout/Shell';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, TableFilters, FilterTabs, type ColumnDef } from '@/components/ui/DataTable';
import { deepSearch } from '@/lib/search';
import { useDashboardSearch, setDashboardSearch } from '@/components/layout/DashboardSearchContext';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormControls';
import { Badge } from '@/components/ui/Badge';
import { NoResults } from '@/components/ui/EmptyState';
import { useAuth } from '@/lib/auth-context';
import type { InstrumentClass } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

interface InstrumentRecord {
  id: string;
  serialNumber: string;
  modelName: string;
  modelNumber: string;
  manufacturerName: string;
  instrumentClass: InstrumentClass | null;
  maxCapacity: number;
  maxCapacityUnit: string;
  scaleInterval: number;
  scaleIntervalUnit: string;
  laboratoryCode: string;
  laboratoryName: string;
  condition: 'good' | 'needs-repair' | 'out-of-service';
  lastCalibration: string | null;
  testCount: number;
  dateReceived: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_INSTRUMENTS: InstrumentRecord[] = [
  {
    id: '1',
    serialNumber: 'ABC-2026-EL-00412',
    modelName: 'ABC-3000 Electronic Balance',
    modelNumber: 'ABC-3000',
    manufacturerName: 'ABC Instruments Pvt. Ltd.',
    instrumentClass: 'III',
    maxCapacity: 3000,
    maxCapacityUnit: 'g',
    scaleInterval: 0.01,
    scaleIntervalUnit: 'g',
    laboratoryCode: 'CMTL-PY-01',
    laboratoryName: 'Central Metrology Testing Lab',
    condition: 'good',
    lastCalibration: '2026-06-15',
    testCount: 24,
    dateReceived: '2024-01-15',
  },
  {
    id: '2',
    serialNumber: 'PWS-2025-PR-00089',
    modelName: 'PWS Precision Scale 220',
    modelNumber: 'PWS-220',
    manufacturerName: 'Precision Weigh Systems',
    instrumentClass: 'II',
    maxCapacity: 220,
    maxCapacityUnit: 'g',
    scaleInterval: 0.001,
    scaleIntervalUnit: 'g',
    laboratoryCode: 'CMTL-PY-01',
    laboratoryName: 'Central Metrology Testing Lab',
    condition: 'good',
    lastCalibration: '2026-07-20',
    testCount: 18,
    dateReceived: '2024-03-22',
  },
  {
    id: '3',
    serialNumber: 'MST-2024-EL-00247',
    modelName: 'MetroScale 2000 Industrial',
    modelNumber: 'MST-2000',
    manufacturerName: 'MetroScale Technologies',
    instrumentClass: 'III',
    maxCapacity: 2000,
    maxCapacityUnit: 'kg',
    scaleInterval: 0.5,
    scaleIntervalUnit: 'kg',
    laboratoryCode: 'PITL-PR-02',
    laboratoryName: 'Prayagraj Instrument Testing Lab',
    condition: 'needs-repair',
    lastCalibration: '2026-05-10',
    testCount: 8,
    dateReceived: '2023-11-05',
  },
  {
    id: '4',
    serialNumber: 'ABC-2025-EL-00589',
    modelName: 'ABC-220 Analytical Balance',
    modelNumber: 'ABC-220',
    manufacturerName: 'ABC Instruments Pvt. Ltd.',
    instrumentClass: 'II',
    maxCapacity: 220,
    maxCapacityUnit: 'g',
    scaleInterval: 0.0001,
    scaleIntervalUnit: 'g',
    laboratoryCode: 'CMTL-PY-01',
    laboratoryName: 'Central Metrology Testing Lab',
    condition: 'good',
    lastCalibration: '2026-08-01',
    testCount: 12,
    dateReceived: '2025-01-10',
  },
  {
    id: '5',
    serialNumber: 'PWS-2025-PL-00334',
    modelName: 'PWS Platform Scale 3000',
    modelNumber: 'PWS-3000P',
    manufacturerName: 'Precision Weigh Systems',
    instrumentClass: 'III',
    maxCapacity: 3000,
    maxCapacityUnit: 'kg',
    scaleInterval: 1,
    scaleIntervalUnit: 'kg',
    laboratoryCode: 'PITL-PR-02',
    laboratoryName: 'Prayagraj Instrument Testing Lab',
    condition: 'out-of-service',
    lastCalibration: '2026-02-15',
    testCount: 3,
    dateReceived: '2025-02-20',
  },
];

// ============================================================================
// FILTER CONFIGURATION
// ============================================================================

const CONDITION_FILTERS = [
  { label: 'All Conditions', value: 'all' },
  { label: 'Good', value: 'good' },
  { label: 'Needs Repair', value: 'needs-repair' },
  { label: 'Out of Service', value: 'out-of-service' },
];

const CLASS_FILTERS = [
  { label: 'All Classes', value: 'all' },
  { label: 'Class I', value: 'I' },
  { label: 'Class II', value: 'II' },
  { label: 'Class III', value: 'III' },
  { label: 'Class IIII', value: 'IIII' },
  { label: 'Class III L', value: 'IIIIL' },
];

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

const COLUMNS: ColumnDef<InstrumentRecord>[] = [
  {
    key: 'serialNumber',
    header: 'Serial No.',
    mono: true,
    width: 150,
    sortable: true,
  },
  {
    key: 'modelName',
    header: 'Model',
    width: 150,
    sortable: true,
    render: (_, row) => (
      <div>
        <div className="text-[13px] font-medium text-gray-900">{row.modelName}</div>
        <div className="text-[11px] text-gray-500">{row.modelNumber}</div>
      </div>
    ),
  },
  {
    key: 'manufacturerName',
    header: 'Manufacturer',
    width: 140,
    sortable: true,
  },
  {
    key: 'instrumentClass',
    header: 'Class',
    width: 70,
    align: 'center',
    render: (_, row) => row.instrumentClass || '—',
  },
  {
    key: 'maxCapacity',
    header: 'Capacity',
    width: 110,
    mono: true,
    align: 'right',
    render: (_, row) => `${row.maxCapacity.toLocaleString()} ${row.maxCapacityUnit}`,
  },
  {
    key: 'scaleInterval',
    header: 'Scale Interval',
    width: 100,
    mono: true,
    align: 'right',
    render: (_, row) => `${row.scaleInterval} ${row.scaleIntervalUnit}`,
  },
  {
    key: 'laboratoryCode',
    header: 'Laboratory',
    width: 100,
  },
  {
    key: 'condition',
    header: 'Condition',
    width: 120,
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
    sortable: true,
    render: (_, row) => row.lastCalibration
      ? new Date(row.lastCalibration).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—',
  },
  {
    key: 'testCount',
    header: 'Tests',
    width: 60,
    align: 'center',
  },
];

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function InstrumentsPage() {
  // Shared live search — bound to the TopBar header search
  const searchQuery = useDashboardSearch();
  // Only tester/admin roles register instruments
  const { hasPermission } = useAuth();
  const canRegisterInstrument = hasPermission('instruments:create');
  const [conditionFilter, setConditionFilter] = React.useState('all');
  const [classFilter, setClassFilter] = React.useState('all');
  const [sort, setSort] = React.useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'serialNumber', direction: 'asc' });
  const [page, setPage] = React.useState(1);
  const pageSize = 25;

  // Filter data
  const filteredData = React.useMemo(() => {
    let result = [...MOCK_INSTRUMENTS];

    // Deep search: any field, nested values, numbers — null-safe
    if (searchQuery) {
      result = deepSearch(result, searchQuery);
    }

    // Condition filter
    if (conditionFilter !== 'all') {
      result = result.filter(row => row.condition === conditionFilter);
    }

    // Class filter
    if (classFilter !== 'all') {
      result = result.filter(row => row.instrumentClass === classFilter);
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sort.key as keyof InstrumentRecord];
      const bVal = b[sort.key as keyof InstrumentRecord];
      const comparison = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sort.direction === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [searchQuery, conditionFilter, classFilter, sort]);

  // Paginate
  const paginatedData = filteredData.slice((page - 1) * pageSize, page * pageSize);

  return (
    <Shell breadcrumbs={[{ label: 'Instruments', current: true }]}>
      <PageHeader
        title="Instruments"
        subtitle="Registered weighing instruments and their specifications"
        actions={
          canRegisterInstrument ? (
            <Link href="/instruments/new">
              <Button variant="primary" size="md">Register Instrument</Button>
            </Link>
          ) : undefined
        }
      />

      {/* ── Filters ── */}
      <div className="panel p-3 mb-3">
        <TableFilters>
          <Input
            label=""
            placeholder="Search serial number, model, manufacturer…"
            value={searchQuery}
            onChange={(e) => { setDashboardSearch(e.target.value); setPage(1); }}
            className="flex-1 min-w-[250px]"
          />
          <Select
            label=""
            value={classFilter}
            onChange={(e) => { setClassFilter(e.target.value); setPage(1); }}
            options={CLASS_FILTERS}
            className="w-[140px]"
          />
          <Select
            label=""
            value={conditionFilter}
            onChange={(e) => { setConditionFilter(e.target.value); setPage(1); }}
            options={CONDITION_FILTERS}
            className="w-[140px]"
          />
        </TableFilters>
      </div>

      {/* ── Results Summary ── */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] text-gray-500">
          {filteredData.length} instrument{filteredData.length !== 1 ? 's' : ''} found
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
        onRowClick={(row) => window.location.href = `/instruments/${row.id}`}
        selectable
        emptyState={
          <NoResults
            onClearFilters={() => {
              setDashboardSearch('');
              setConditionFilter('all');
              setClassFilter('all');
            }}
          />
        }
        caption="Registered weighing instruments"
      />
    </Shell>
  );
}
