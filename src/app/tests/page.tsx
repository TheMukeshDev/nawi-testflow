/**
 * NAWI TestFlow — Tests List Page
 *
 * Primary view for managing all test records.
 * Connected to live workflow store for real-time status transitions,
 * viewing completed results, and downloading reports.
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/layout/Shell';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, FilterTabs, type ColumnDef } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { TestStatusBadge, ComplianceBadge } from '@/components/ui/StatusBadge';
import { NoResults } from '@/components/ui/EmptyState';
import type { PaginationState, SortState } from '@/types';
import { TEST_STATUS_FILTERS } from '@/lib/constants';
import { workflowStore, type StoredTest } from '@/lib/workflow-store';
import { downloadTestReportPDF } from '@/lib/report-generator';
import { TestResultModal } from '@/components/workflow/TestResultModal';
import { useAuth } from '@/lib/auth-context';

export default function TestsPage() {
  const { userRole } = useAuth();
  const [tests, setTests] = useState<StoredTest[]>([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedTest, setSelectedTest] = useState<StoredTest | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'review'>('view');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sort] = useState<SortState>({ key: 'lastUpdated', direction: 'desc' });

  const refreshTests = () => {
    setTests(workflowStore.getTests());
  };

  useEffect(() => {
    refreshTests();
    const unsubscribe = workflowStore.subscribe(() => {
      refreshTests();
    });
    return unsubscribe;
  }, []);

  const openTestModal = (test: StoredTest, mode: 'view' | 'review' = 'view') => {
    setSelectedTest(test);
    setModalMode(mode);
    setIsModalOpen(true);
  };

  const handleDownloadPDF = (e: React.MouseEvent, test: StoredTest) => {
    e.stopPropagation();
    downloadTestReportPDF(test);
  };

  // Role-scope the list: viewers only see finalized certificates; reviewers see
  // everything except in-progress drafts (they act on submitted + finalized records).
  // Admins and testers see all records.
  const scopedTests =
    userRole === 'viewer'
      ? tests.filter(t => t.status === 'completed' || t.status === 'approved')
      : userRole === 'reviewer'
        ? tests.filter(t => t.status !== 'draft' && t.status !== 'in-testing')
        : tests;

  const filteredData = activeFilter === 'all'
    ? scopedTests
    : scopedTests.filter(t => t.status === activeFilter);

  const pagination: PaginationState = {
    page: 1,
    pageSize: 25,
    total: filteredData.length,
  };

  const COLUMNS: ColumnDef<StoredTest>[] = [
    {
      key: 'testNumber',
      header: 'Test No.',
      mono: true,
      sortable: true,
      width: 135,
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
      width: 160,
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
      key: 'status',
      header: 'Status',
      sortable: true,
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
      width: 110,
    },
    {
      key: 'lastUpdated',
      header: 'Updated',
      sortable: true,
      width: 100,
      render: (_, row) => {
        try {
          return new Date(row.lastUpdated).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        } catch {
          return '—';
        }
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 170,
      align: 'right',
      render: (_, row) => {
        const isPending = row.status === 'pending-review';
        const isCompleted = row.status === 'completed' || row.status === 'approved';
        const canReview = isPending && (userRole === 'reviewer' || userRole === 'admin');

        return (
          <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => openTestModal(row, canReview ? 'review' : 'view')}
              className="px-2 py-1 bg-white hover:bg-gray-100 text-[#1e3a5f] border border-gray-300 rounded text-[11px] font-medium transition-colors cursor-pointer"
              title="View Test Observations & Details"
            >
              {canReview ? 'Review' : 'View'}
            </button>

            {row.status === 'revision-requested' && (userRole === 'tester' || userRole === 'admin') && (
              <button
                onClick={() => openTestModal(row, 'view')}
                className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
                title="Edit observations and resubmit"
              >
                Fix / Resubmit
              </button>
            )}

            {userRole !== 'reviewer' && (
            <button
              onClick={(e) => handleDownloadPDF(e, row)}
              className="px-2 py-1 bg-[#1e3a5f] hover:bg-[#162d4a] text-white rounded text-[11px] font-medium transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1"
              title="Download PDF Test Report"
            >
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M7 1.5v8m0 0L4 6.5m3 3l3-3M2 11.5h10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              PDF
            </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <Shell
      breadcrumbs={[{ label: 'Tests', current: true }]}
      onSelectTest={(testId, mode) => {
        const test = workflowStore.getTest(testId);
        if (test) openTestModal(test, mode);
      }}
    >
      <PageHeader
        title="Tests"
        subtitle="Manage Non-Automatic Weighing Instrument (NAWI) test records per OIML R-76"
        actions={
          (userRole === 'admin' || userRole === 'tester') ? (
            <Link href="/tests/new">
              <Button variant="primary" size="md">
                New Test Report
              </Button>
            </Link>
          ) : undefined
        }
      />

      {/* ── Filter Tabs ── */}
      <div className="mb-3 overflow-x-auto">
        <FilterTabs
          tabs={TEST_STATUS_FILTERS.map(f => ({
            ...f,
            count: f.value === 'all' ? scopedTests.length : scopedTests.filter(t => t.status === f.value).length,
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
        onRowClick={(row) => openTestModal(row)}
        emptyState={<NoResults />}
        caption="NAWI test records"
      />

      {/* ── Test Result Modal ── */}
      <TestResultModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        test={selectedTest}
        mode={modalMode}
        onActionComplete={() => {
          refreshTests();
        }}
      />
    </Shell>
  );
}
