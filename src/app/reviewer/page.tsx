/**
 * NAWI Sahayak — Reviewer Dashboard
 *
 * Focuses on verification and approval workflow:
 * - Live queue of test reports submitted for review
 * - Inspection of metrological calculations & compliance per OIML R-76
 * - Approval with digital verification certificate generation
 * - Request revisions with specific technical feedback
 */

'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { ComplianceBadge } from '@/components/ui/StatusBadge';
import { SearchInput } from '@/components/ui/SearchInput';
import { MetricCard } from '@/components/ui/MetricCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useDashboardSearch, setDashboardSearch } from '@/components/layout/DashboardSearchContext';
import { TestResultModal } from '@/components/workflow/TestResultModal';
import { workflowStore, type StoredTest } from '@/lib/workflow-store';
import { deepSearch } from '@/lib/search';

export default function ReviewerDashboard() {
  const [tests, setTests] = useState<StoredTest[]>([]);
  const [selectedTest, setSelectedTest] = useState<StoredTest | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'review'>('review');
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Shared live search — bound to the TopBar header search
  const searchQuery = useDashboardSearch();

  const refreshData = () => {
    setTests(workflowStore.getTests());
  };

  useEffect(() => {
    refreshData();
    // Merge live Supabase test reports so real data appears alongside local workflow
    workflowStore.mergeFromSupabase().then(refreshData).catch(refreshData);
    const unsubscribe = workflowStore.subscribe(() => {
      refreshData();
    });
    return unsubscribe;
  }, []);

  const pendingTests = tests.filter(t => t.status === 'pending-review');
  const approvedTests = tests.filter(t => t.status === 'completed' || t.status === 'approved');
  const rejectedTests = tests.filter(t => t.status === 'revision-requested' || t.status === 'rejected');

  // Universal deep search across every field (null-safe) — cards/metrics keep real counts
  const applySearch = <T,>(rows: T[]): T[] => (searchQuery.trim() ? deepSearch(rows, searchQuery) : rows);
  const visiblePending = applySearch(pendingTests);

  const openReviewModal = (test: StoredTest, mode: 'view' | 'review' = 'review') => {
    setSelectedTest(test);
    setModalMode(mode);
    setIsModalOpen(true);
  };

  return (
    <RouteGuard requiredRoles={['reviewer', 'admin']}>
      <DashboardLayout
        breadcrumbs={[{ label: 'Reviewer Dashboard', current: true }]}
        onSelectTest={(testId, mode) => {
          const test = workflowStore.getTest(testId);
          if (test) openReviewModal(test, mode);
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-[18px] font-semibold text-gray-900">
              Metrology Review & Approval Workspace
            </h1>
            <div className="h-[2px] w-[48px] bg-[#1e3a5f] mt-2 rounded" />
            <p className="text-[12px] text-gray-500 mt-2">
              Evaluate submitted NAWI test observations and issue official OIML R-76 certificates
            </p>
          </div>
        </div>

        {/* ── Live Search ── */}
        <SearchInput
          value={searchQuery}
          onChange={setDashboardSearch}
          placeholder="Search by test ref, model, serial number, officer, verdict…"
          ariaLabel="Search reviewer records"
          className="mb-6 max-w-xl"
        />

        {/* ── Metrics ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
          <MetricCard
            label="Pending Review"
            value={pendingTests.length}
            tone="warning"
            icon={
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="10" r="7" />
                <path d="M10 6v4l2.5 2.5" />
              </svg>
            }
          />
          <MetricCard
            label="Approved Reports"
            value={approvedTests.length}
            tone="success"
            icon={
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="10" r="7" />
                <path d="M6.5 10l2.5 2.5 4.5-5" />
              </svg>
            }
          />
          <MetricCard
            label="Revision Requested"
            value={rejectedTests.length}
            tone="danger"
            icon={
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h12v10H4z" />
                <path d="M7 4h6" />
                <path d="M7 10h6M7 13h4" />
              </svg>
            }
          />
          <MetricCard
            label="Total Evaluated"
            value={approvedTests.length + rejectedTests.length}
            tone="gray"
            icon={
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 3.5h10v13H5z" />
                <path d="M5 7h10M5 10.5h6" />
              </svg>
            }
          />
        </div>

        {/* ── Reports Awaiting Review ── */}
        <div className="mb-8">
          <SectionHeader
            title="Reports Awaiting Review"
            count={visiblePending.length}
            action={
              pendingTests.length > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-300 animate-pulse">
                  {pendingTests.length} action required
                </span>
              )
            }
          />

          <div className="bg-white border border-gray-200 rounded overflow-hidden shadow-2xs">
            {visiblePending.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-[13px]">
                {searchQuery.trim() ? (
                  <p className="font-medium text-gray-600">No pending reports match &quot;{searchQuery.trim()}&quot;</p>
                ) : (
                  <>
                    <p className="font-medium text-gray-600">No reports currently awaiting review</p>
                    <p className="text-[11px] text-gray-400 mt-1">When testers submit test records, they will automatically appear here.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-[13px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                        Test Ref No.
                      </th>
                      <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                        Instrument Details
                      </th>
                      <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                        Testing Officer
                      </th>
                      <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                        Submitted Date
                      </th>
                      <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                        OIML Verdict
                      </th>
                      <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-right font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                        Review Action
                      </th>
                    </tr>
                  </thead>
                <tbody>
                  {visiblePending.map((t) => (
                    <tr key={t.id} className="border-b border-gray-100 hover:bg-amber-50/30 transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="font-mono text-[12px] font-bold text-[#1e3a5f]">{t.testNumber}</div>
                        {(t.revisionCount ?? 0) > 0 && (
                          <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded">
                            ⟳ Re-Review · Round {t.revisionCount}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-gray-900">{t.instrumentModel}</div>
                        <div className="text-[11px] font-mono text-gray-500">SN: {t.instrumentSerial} &bull; Class {t.instrumentClass}</div>
                        {t.testerResolutionNote && (
                          <div className="text-[11px] text-amber-800 mt-0.5 truncate max-w-[260px]" title={t.testerResolutionNote}>
                            <span className="font-semibold">Tester:</span> {t.testerResolutionNote}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-gray-800">{t.technician}</td>
                      <td className="px-3 py-2.5 text-gray-500 font-mono text-[12px]">{t.testDate}</td>
                      <td className="px-3 py-2.5">
                        <ComplianceBadge verdict={t.complianceResult} />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          onClick={() => openReviewModal(t, 'review')}
                          className="px-3 py-1 bg-[#1e3a5f] hover:bg-[#162d4a] text-white text-[12px] font-medium rounded transition-colors shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                        >
                          Review & Decide →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Test Result & Review Modal ── */}
        <TestResultModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          test={selectedTest}
          mode={modalMode}
          onActionComplete={() => {
            refreshData();
          }}
        />
      </DashboardLayout>
    </RouteGuard>
  );
}
