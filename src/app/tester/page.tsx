/**
 * NAWI Sahayak — Tester Dashboard
 *
 * Focuses on testing work:
 * - Real-time metrics for active, submitted, and completed tests
 * - Table of in-progress and submitted tests
 * - Quick access to view completed results and download reports
 */

'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { TestStatusBadge } from '@/components/ui/StatusBadge';
import { SearchInput } from '@/components/ui/SearchInput';
import { MetricCard } from '@/components/ui/MetricCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useDashboardSearch, setDashboardSearch } from '@/components/layout/DashboardSearchContext';
import { workflowStore, type StoredTest } from '@/lib/workflow-store';
import { deepSearch } from '@/lib/search';
import { TestResultModal } from '@/components/workflow/TestResultModal';
import { downloadTestReportPDF } from '@/lib/report-generator';
import Link from 'next/link';

export default function TesterDashboard() {
  const [tests, setTests] = useState<StoredTest[]>([]);
  const [selectedTest, setSelectedTest] = useState<StoredTest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Shared live search — bound to the TopBar header search
  const searchQuery = useDashboardSearch();

  const refreshData = () => {
    setTests(workflowStore.getTests());
  };

  useEffect(() => {
    refreshData();
    // Merge live Supabase test reports so real data appears alongside local drafts
    workflowStore.mergeFromSupabase().then(refreshData).catch(refreshData);
    const unsubscribe = workflowStore.subscribe(() => {
      refreshData();
    });
    return unsubscribe;
  }, []);

  const activeTests = tests.filter(t => t.status === 'in-testing' || t.status === 'draft' || t.status === 'revision-requested');
  const submittedTests = tests.filter(t => t.status === 'pending-review');
  const completedTests = tests.filter(t => t.status === 'completed' || t.status === 'approved');
  // Tests the reviewer returned — top-priority attention queue
  const revisionTests = tests.filter(t => t.status === 'revision-requested');

  // Universal deep search across every field of each section (null-safe)
  const applySearch = <T,>(rows: T[]): T[] => (searchQuery.trim() ? deepSearch(rows, searchQuery) : rows);
  const visibleActive = applySearch(tests.filter(t => t.status !== 'completed' && t.status !== 'approved'));
  const visibleCompleted = applySearch(completedTests);

  const openTestModal = (test: StoredTest) => {
    setSelectedTest(test);
    setIsModalOpen(true);
  };

  return (
    <RouteGuard requiredRoles={['tester', 'admin']}>
      <DashboardLayout
        breadcrumbs={[{ label: 'Tester Dashboard', current: true }]}
        onSelectTest={(testId) => {
          const test = workflowStore.getTest(testId);
          if (test) openTestModal(test);
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
          <div>
            <h1 className="text-[18px] font-semibold text-gray-900">
              Testing Workspace & Report Management
            </h1>
            <div className="h-[2px] w-[48px] bg-[#1e3a5f] mt-2 rounded" />
            <p className="text-[12px] text-gray-500 mt-2">
              Record instrument observations, run calculations, and submit for verification
            </p>
          </div>
          <Link
            href="/tests/new"
            className="px-4 py-2 bg-[#1e3a5f] hover:bg-[#162d4a] text-white text-[13px] font-medium rounded transition-colors self-start sm:self-auto shadow-xs inline-flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 2v10M2 7h10" strokeLinecap="round" />
            </svg>
            New Test Report
          </Link>
        </div>

        {/* ── Needs Revision: Action Required attention queue ── */}
        {revisionTests.length > 0 && (
          <div className="mb-5 border border-amber-400 bg-amber-50 rounded-md overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-100 border-b border-amber-300">
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-amber-700 shrink-0">
                <path d="M9 2l7 13H2z" />
                <path d="M9 7v3.5" />
                <circle cx="9" cy="13" r="0.5" fill="currentColor" />
              </svg>
              <h2 className="text-[13px] font-bold text-amber-900">
                Action Required — {revisionTests.length} test{revisionTests.length > 1 ? 's' : ''} returned by Reviewer for correction
              </h2>
              <span className="ml-auto text-[11px] text-amber-800 font-mono">Needs Revision</span>
            </div>
            <div className="divide-y divide-amber-200/70">
              {revisionTests.map(t => (
                <div key={t.id} className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px] font-bold text-[#1e3a5f]">{t.testNumber}</span>
                      <span className="text-[11px] text-gray-600">{t.instrumentModel} &bull; {t.instrumentSerial}</span>
                      {t.revisionCount ? (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-600 text-white rounded">Round {t.revisionCount}</span>
                      ) : null}
                    </div>
                    {t.reviewNotes && (
                      <p className="text-[11.5px] text-amber-900 leading-snug truncate mt-0.5">
                        <span className="font-semibold">Reviewer ({t.reviewer || 'Dr. K. Sharma'}):</span> {t.reviewNotes}
                      </p>
                    )}
                    {t.returnedAt && (
                      <p className="text-[10.5px] text-gray-500 font-mono mt-0.5">
                        Returned {new Date(t.returnedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => openTestModal(t)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold transition-colors shadow-xs shrink-0 cursor-pointer"
                  >
                    Fix & Resubmit →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Live Search ── */}
        <SearchInput
          value={searchQuery}
          onChange={setDashboardSearch}
          placeholder="Search by test ref, model, serial number, status, reviewer…"
          ariaLabel="Search tester records"
          className="mb-6 max-w-xl"
        />

        {/* ── Metrics ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
          <MetricCard
            label="Active / In-Testing"
            value={activeTests.length}
            tone="primary"
            icon={
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="2.5" width="12" height="15" rx="1" />
                <path d="M7 6.5h6M7 10h4" />
                <circle cx="13" cy="13" r="1.4" />
              </svg>
            }
          />
          <MetricCard
            label="Pending Review"
            value={submittedTests.length}
            tone="warning"
            icon={
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="10" r="7" />
                <path d="M10 6v4l2.5 2.5" />
              </svg>
            }
          />
          <MetricCard
            label="Completed & Approved"
            value={completedTests.length}
            tone="success"
            icon={
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="10" r="7" />
                <path d="M6.5 10l2.5 2.5 4.5-5" />
              </svg>
            }
          />
          <MetricCard
            label="Total Records"
            value={tests.length}
            tone="gray"
            icon={
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 3.5h10v13H5z" />
                <path d="M5 7h10M5 10.5h6" />
              </svg>
            }
          />
        </div>

        {/* ── Active Tests ── */}
        <div className="mb-6">
          <SectionHeader title="Active & Pending Review Tests" count={visibleActive.length} />
          <div className="bg-white border border-gray-200 rounded overflow-hidden shadow-2xs">
            {visibleActive.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-[13px]">
                {searchQuery.trim()
                  ? `No active tests match "${searchQuery.trim()}".`
                  : 'No active tests. Start a new test report to begin.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-[13px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                        Test Ref
                      </th>
                      <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                        Instrument
                      </th>
                      <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                        Status
                      </th>
                      <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                        Last Updated
                      </th>
                      <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-right font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                <tbody>
                  {visibleActive.map((t) => (
                    <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-[12px] font-bold text-[#1e3a5f]">
                        {t.testNumber}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-gray-900">{t.instrumentModel}</div>
                        <div className="text-[11px] font-mono text-gray-500">{t.instrumentSerial}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <TestStatusBadge status={t.status} />
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 font-mono text-[12px]">
                        {new Date(t.lastUpdated).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="px-3 py-2.5 text-right space-x-2">
                        <button
                          onClick={() => openTestModal(t)}
                          className="px-2.5 py-1 bg-white hover:bg-gray-100 text-[#1e3a5f] border border-gray-300 rounded text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          View Details
                        </button>
                        {t.status === 'revision-requested' && (
                          <button
                            onClick={() => openTestModal(t)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer shadow-xs"
                          >
                            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9.5 1.5a1.8 1.8 0 012.5 2.5L4.5 11.5 1 12.5l1-3.5z" />
                            </svg>
                            Edit &amp; Resubmit
                          </button>
                        )}
                        {t.status === 'in-testing' && (
                          <Link
                            href="/tests/new"
                            className="px-2.5 py-1 bg-[#1e3a5f] hover:bg-[#162d4a] text-white rounded text-[11px] font-medium transition-colors cursor-pointer"
                          >
                            Continue
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Completed Test Results ── */}
        <div>
          <SectionHeader title="Completed & Approved Test Reports" count={visibleCompleted.length} />
          <div className="bg-white border border-gray-200 rounded overflow-hidden shadow-2xs">
            {visibleCompleted.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-[13px]">
                {searchQuery.trim()
                  ? `No completed test reports match "${searchQuery.trim()}".`
                  : 'No completed test reports yet.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-[13px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                        Test Ref
                      </th>
                      <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                        Instrument
                      </th>
                      <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                        Approved By
                      </th>
                      <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                        Compliance
                      </th>
                      <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-right font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                <tbody>
                  {visibleCompleted.map((t) => (
                    <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-[12px] font-bold text-[#1e3a5f]">
                        {t.testNumber}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-gray-900">{t.instrumentModel}</div>
                        <div className="text-[11px] font-mono text-gray-500">{t.instrumentSerial}</div>
                      </td>
                      <td className="px-3 py-2.5 text-gray-700">
                        {t.reviewer || 'Dr. K. Sharma'}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold rounded border ${
                          t.complianceResult === 'compliant'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {t.complianceResult.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right space-x-2">
                        <button
                          onClick={() => openTestModal(t)}
                          className="px-2.5 py-1 bg-white hover:bg-gray-100 text-[#1e3a5f] border border-gray-300 rounded text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          View Results
                        </button>
                        <button
                          onClick={() => downloadTestReportPDF(t)}
                          className="px-2.5 py-1 bg-[#1e3a5f] hover:bg-[#162d4a] text-white rounded text-[11px] font-medium transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1"
                        >
                          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M7 1.5v8m0 0L4 6.5m3 3l3-3M2 11.5h10" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Download PDF
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

        {/* ── Test Result Modal ── */}
        <TestResultModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          test={selectedTest}
        />
      </DashboardLayout>
    </RouteGuard>
  );
}
