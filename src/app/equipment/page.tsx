/**
 * NAWI TestFlow — Equipment List Page
 *
 * Main view for managing test equipment.
 * Features:
 * - Search by name, serial number, equipment ID
 * - Filter by type, calibration status
 * - Calibration expiry warnings
 * - Data table with sorting
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Shell } from '@/components/layout/Shell';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, TableFilters, type ColumnDef } from '@/components/ui/DataTable';
import { deepSearch } from '@/lib/search';
import { useDashboardSearch, setDashboardSearch } from '@/components/layout/DashboardSearchContext';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormControls';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { NoResults } from '@/components/ui/EmptyState';
import { useAuth } from '@/lib/auth-context';
import { getCalibrationStatus, getCalibrationStatusConfig } from '@/components/forms/EquipmentForm';

// ============================================================================
// TYPES
// ============================================================================

interface EquipmentRecord {
  id: string;
  equipmentId: string;
  name: string;
  type: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  calibrationDate: string;
  calibrationValidUntil: string;
  calibrationCertificateRef: string;
  laboratoryCode: string;
  laboratoryName: string;
  condition: 'good' | 'needs-repair' | 'out-of-service';
  createdAt: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_EQUIPMENT: EquipmentRecord[] = [
  {
    id: '1',
    equipmentId: 'STD-E2-001',
    name: 'E2 Standard Weight Set',
    type: 'Standard Weight',
    manufacturer: 'Precision Weigh Systems',
    model: 'PWS-STD-E2',
    serialNumber: 'STD-E2-001',
    calibrationDate: '2026-03-15',
    calibrationValidUntil: '2027-03-15',
    calibrationCertificateRef: 'CAL-2026-00123',
    laboratoryCode: 'CMTL-PY-01',
    laboratoryName: 'Central Metrology Testing Lab',
    condition: 'good',
    createdAt: '2026-03-15',
  },
  {
    id: '2',
    equipmentId: 'STD-M2-003',
    name: 'M2 Calibration Weight Set',
    type: 'Standard Weight',
    manufacturer: 'ABC Instruments Pvt. Ltd.',
    model: 'ABC-STD-M2',
    serialNumber: 'STD-M2-003',
    calibrationDate: '2026-05-20',
    calibrationValidUntil: '2027-05-20',
    calibrationCertificateRef: 'CAL-2026-00456',
    laboratoryCode: 'CMTL-PY-01',
    laboratoryName: 'Central Metrology Testing Lab',
    condition: 'good',
    createdAt: '2026-05-20',
  },
  {
    id: '3',
    equipmentId: 'ENV-001',
    name: 'Environmental Monitor',
    type: 'Measurement Device',
    manufacturer: 'MetroScale Technologies',
    model: 'MST-ENV-120',
    serialNumber: 'ENV-001',
    calibrationDate: '2026-01-10',
    calibrationValidUntil: '2026-07-10',
    calibrationCertificateRef: 'CAL-2026-00789',
    laboratoryCode: 'PITL-PR-02',
    laboratoryName: 'Prayagraj Instrument Testing Lab',
    condition: 'good',
    createdAt: '2026-01-10',
  },
  {
    id: '4',
    equipmentId: 'STD-F1-002',
    name: 'F1 Standard Weight Set',
    type: 'Standard Weight',
    manufacturer: 'ABC Instruments Pvt. Ltd.',
    model: 'ABC-STD-F1',
    serialNumber: 'STD-F1-002',
    calibrationDate: '2025-12-01',
    calibrationValidUntil: '2026-12-01',
    calibrationCertificateRef: 'CAL-2025-01111',
    laboratoryCode: 'CMTL-PY-01',
    laboratoryName: 'Central Metrology Testing Lab',
    condition: 'good',
    createdAt: '2025-12-01',
  },
  {
    id: '5',
    equipmentId: 'TOOL-001',
    name: 'Forceps Set',
    type: 'Tool',
    manufacturer: '—',
    model: '—',
    serialNumber: 'TOOL-001',
    calibrationDate: '',
    calibrationValidUntil: '',
    calibrationCertificateRef: '',
    laboratoryCode: 'CMTL-PY-01',
    laboratoryName: 'Central Metrology Testing Lab',
    condition: 'good',
    createdAt: '2024-06-15',
  },
];

// ============================================================================
// FILTER CONFIGURATION
// ============================================================================

const TYPE_FILTERS = [
  { label: 'All Types', value: 'all' },
  { label: 'Standard Weight', value: 'Standard Weight' },
  { label: 'Calibrated Weight', value: 'Calibrated Weight' },
  { label: 'Measurement Device', value: 'Measurement Device' },
  { label: 'Accessory', value: 'Accessory' },
  { label: 'Tool', value: 'Tool' },
];

const CALIBRATION_FILTERS = [
  { label: 'All Calibration', value: 'all' },
  { label: 'Valid', value: 'valid' },
  { label: 'Expired', value: 'expired' },
  { label: 'Due Soon', value: 'due-soon' },
  { label: 'Not Calibrated', value: 'not-calibrated' },
];

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

const COLUMNS: ColumnDef<EquipmentRecord>[] = [
  {
    key: 'equipmentId',
    header: 'Equipment ID',
    mono: true,
    width: 112,
    minWidth: 96,
    sortable: true,
  },
  {
    key: 'name',
    header: 'Name',
    minWidth: 150,
    sortable: true,
  },
  {
    key: 'type',
    header: 'Type',
    width: 112,
  },
  {
    key: 'serialNumber',
    header: 'Serial No.',
    mono: true,
    width: 112,
    minWidth: 96,
  },
  {
    key: 'laboratoryCode',
    header: 'Laboratory',
    width: 96,
    minWidth: 88,
  },
  {
    key: 'calibrationStatus',
    header: 'Cal. Status',
    width: 122,
    render: (_, row) => {
      const status = getCalibrationStatus(row.calibrationDate, row.calibrationValidUntil);
      const config = getCalibrationStatusConfig(status);
      return (
        <Badge color={config.color} variant={config.variant}>
          {config.label}
        </Badge>
      );
    },
  },
  {
    key: 'calibrationValidUntil',
    header: 'Valid Until',
    width: 116,
    minWidth: 110,
    sortable: true,
    render: (_, row) => {
      if (!row.calibrationValidUntil) return '—';
      const date = new Date(row.calibrationValidUntil);
      const isExpired = date < new Date();
      const isExpiringSoon = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= 30;
      return (
        <span className={
          isExpired ? 'text-danger-600 font-medium' :
          isExpiringSoon ? 'text-warning-600 font-medium' :
          ''
        }>
          {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      );
    },
  },
  {
    key: 'condition',
    header: 'Condition',
    minWidth: 110,
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
];

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function EquipmentPage() {
  // Shared live search — bound to the TopBar header search
  const searchQuery = useDashboardSearch();
  // Only tester/admin roles register test equipment
  const { hasPermission } = useAuth();
  const canRegisterEquipment = hasPermission('instruments:create');
  const [typeFilter, setTypeFilter] = React.useState('all');
  const [calibrationFilter, setCalibrationFilter] = React.useState('all');
  const [sort, setSort] = React.useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'equipmentId', direction: 'asc' });
  const [page, setPage] = React.useState(1);
  const pageSize = 25;

  // Calculate calibration warnings
  const expiredCount = MOCK_EQUIPMENT.filter(e =>
    getCalibrationStatus(e.calibrationDate, e.calibrationValidUntil) === 'expired'
  ).length;
  const dueSoonCount = MOCK_EQUIPMENT.filter(e =>
    getCalibrationStatus(e.calibrationDate, e.calibrationValidUntil) === 'due-soon'
  ).length;

  // Filter data
  const filteredData = React.useMemo(() => {
    let result = [...MOCK_EQUIPMENT];

    // Deep search: any field, nested values, numbers — null-safe
    if (searchQuery) {
      result = deepSearch(result, searchQuery);
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(row => row.type === typeFilter);
    }

    // Calibration filter
    if (calibrationFilter !== 'all') {
      result = result.filter(row => {
        const status = getCalibrationStatus(row.calibrationDate, row.calibrationValidUntil);
        return status === calibrationFilter;
      });
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sort.key as keyof EquipmentRecord];
      const bVal = b[sort.key as keyof EquipmentRecord];
      const comparison = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sort.direction === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [searchQuery, typeFilter, calibrationFilter, sort]);

  // Paginate
  const paginatedData = filteredData.slice((page - 1) * pageSize, page * pageSize);

  return (
    <Shell breadcrumbs={[{ label: 'Equipment', current: true }]}>
      <PageHeader
        title="Equipment"
        subtitle="Calibration weights, standards, and test accessories"
        actions={
          canRegisterEquipment ? (
            <Link href="/equipment/new">
              <Button variant="primary" size="md">Register Equipment</Button>
            </Link>
          ) : undefined
        }
      />

      {/* ── Calibration Warnings ── */}
      {(expiredCount > 0 || dueSoonCount > 0) && (
        <div className="mb-4 space-y-2">
          {expiredCount > 0 && (
            <Alert type="error" title={`${expiredCount} equipment item${expiredCount > 1 ? 's' : ''} with expired calibration`}>
              These items should not be used for testing until recalibrated.
            </Alert>
          )}
          {dueSoonCount > 0 && (
            <Alert type="warning" title={`${dueSoonCount} equipment item${dueSoonCount > 1 ? 's' : ''} with calibration due within 30 days`}>
              Please schedule recalibration to maintain testing capability.
            </Alert>
          )}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="panel p-3 mb-3">
        <TableFilters>
          <Input
            label=""
            placeholder="Search name, ID, serial number…"
            value={searchQuery}
            onChange={(e) => { setDashboardSearch(e.target.value); setPage(1); }}
            className="flex-1 min-w-[200px]"
          />
          <Select
            label=""
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            options={TYPE_FILTERS}
            className="w-[150px]"
          />
          <Select
            label=""
            value={calibrationFilter}
            onChange={(e) => { setCalibrationFilter(e.target.value); setPage(1); }}
            options={CALIBRATION_FILTERS}
            className="w-[150px]"
          />
        </TableFilters>
      </div>

      {/* ── Results Summary ── */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] text-gray-500">
          {filteredData.length} equipment item{filteredData.length !== 1 ? 's' : ''} found
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
        onRowClick={(row) => window.location.href = `/equipment/${row.id}`}
        selectable
        emptyState={
          <NoResults
            onClearFilters={() => {
              setDashboardSearch('');
              setTypeFilter('all');
              setCalibrationFilter('all');
            }}
          />
        }
        caption="Test equipment and calibration standards"
      />
    </Shell>
  );
}
