/**
 * NAWI Sahayak — Instruments List Page
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
import { supabaseDb } from '@/lib/supabase-db';
import { LoadingState } from '@/components/ui/EmptyState';
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
    className: 'hidden md:table-cell',
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
    className: 'hidden lg:table-cell',
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
    className: 'hidden sm:table-cell',
    render: (_, row) => `${row.scaleInterval} ${row.scaleIntervalUnit}`,
  },
  {
    key: 'laboratoryCode',
    header: 'Laboratory',
    width: 100,
    className: 'hidden sm:table-cell',
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
    className: 'hidden xl:table-cell',
    render: (_, row) => row.lastCalibration
      ? new Date(row.lastCalibration).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—',
  },
  {
    key: 'testCount',
    header: 'Tests',
    width: 60,
    align: 'center',
    className: 'hidden sm:table-cell',
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
  const [instruments, setInstruments] = React.useState<InstrumentRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const pageSize = 25;

  // Load real instrument data from Supabase on mount
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const rows = await supabaseDb.getInstruments();
        if (!mounted) return;
        const mapped: InstrumentRecord[] = rows.map((r) => ({
          id: r.id,
          serialNumber: r.serialNumber,
          modelName: r.modelName,
          modelNumber: r.modelNumber,
          manufacturerName: r.manufacturerName,
          instrumentClass: (r.instrumentClass as InstrumentClass) || null,
          maxCapacity: r.maxCapacity,
          maxCapacityUnit: 'g',
          scaleInterval: r.scaleInterval,
          scaleIntervalUnit: 'g',
          laboratoryCode: r.laboratoryCode,
          laboratoryName: r.laboratoryName,
          condition: (r.condition as InstrumentRecord['condition']) || 'good',
          lastCalibration: r.lastCalibration,
          testCount: 0,
          dateReceived: r.dateReceived || '',
        }));
        setInstruments(mapped);
      } catch (err) {
        console.warn('Failed to load instruments:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Filter data
  const filteredData = React.useMemo(() => {
    let result = [...instruments];

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
  }, [searchQuery, conditionFilter, classFilter, sort, instruments]);

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
            className="w-full sm:min-w-[250px] sm:flex-1"
          />
          <Select
            label=""
            value={classFilter}
            onChange={(e) => { setClassFilter(e.target.value); setPage(1); }}
            options={CLASS_FILTERS}
            className="w-full sm:w-[140px]"
          />
          <Select
            label=""
            value={conditionFilter}
            onChange={(e) => { setConditionFilter(e.target.value); setPage(1); }}
            options={CONDITION_FILTERS}
            className="w-full sm:w-[140px]"
          />
        </TableFilters>
      </div>

      {/* ── Results Summary ── */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] text-gray-500">
          {filteredData.length} instrument{filteredData.length !== 1 ? 's' : ''} found
        </span>
      </div>

      {loading ? (
        <LoadingState message="Loading instruments…" />
      ) : (
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
      )}
    </Shell>
  );
}