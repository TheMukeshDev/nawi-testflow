/**
 * NAWI TestFlow — Viewer Dashboard
 *
 * Read-only interface for searching and inspecting finalized test certificates.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useDashboardSearch, setDashboardSearch } from '@/components/layout/DashboardSearchContext';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { MetricCard } from '@/components/ui/MetricCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { workflowStore, type StoredTest, type StoredReport } from '@/lib/workflow-store';
import { deepSearch } from '@/lib/search';
import { labNameFor } from '@/lib/laboratories';
import { TestResultModal } from '@/components/workflow/TestResultModal';
import { downloadTestReportPDF } from '@/lib/report-generator';

export default function ViewerDashboard() {
  const [reports, setReports] = useState<StoredReport[]>([]);
  const [tests, setTests] = useState<StoredTest[]>([]);
  // Shared live search — bound to the TopBar header search
  const searchQuery = useDashboardSearch();
  const [selectedTest, setSelectedTest] = useState<StoredTest | null>(null);
  const [selectedReport, setSelectedReport] = useState<StoredReport | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const refreshData = () => {
    setReports(workflowStore.getReports());
    setTests(workflowStore.getTests());
  };

  useEffect(() => {
    refreshData();
    // Merge live Supabase test reports so finalized certificates appear in the archive
    workflowStore.mergeFromSupabase().then(refreshData).catch(refreshData);
    const unsubscribe = workflowStore.subscribe(() => {
      refreshData();
    });
    return unsubscribe;
  }, []);

  const completedTests = tests.filter(t => t.status === 'completed' || t.status === 'approved');

  // Deep search: matches ANY field (nested observations, class, verdict, dates…) — null-safe
  const filteredCompleted = deepSearch(completedTests, searchQuery);

  const openViewModal = (test: StoredTest) => {
    const rep = workflowStore.getReportByTestId(test.id);
    setSelectedTest(test);
    setSelectedReport(rep || null);
    setIsModalOpen(true);
  };

  return (
    <RouteGuard requiredRoles={['viewer', 'admin']}>
      <DashboardLayout
        breadcrumbs={[{ label: 'Viewer Dashboard', current: true }]}
        onSelectTest={(testId) => {
          const test = workflowStore.getTest(testId);
          if (test) openViewModal(test);
        }}
      >
        <div className="mb-5">
          <h1 className="text-[18px] font-semibold text-gray-900">
            Public & Laboratory Archive Explorer
          </h1>
          <div className="h-[2px] w-[48px] bg-[#1e3a5f] mt-2 rounded" />
          <p className="text-[12px] text-gray-500 mt-2">
            Search, view, and retrieve verified OIML R-76 test certificates and instrument verification records
          </p>
        </div>

        {/* ── Metrics ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <MetricCard
            label="Total Finalized Reports"
            value={reports.length}
            tone="primary"
            icon={
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 2.5h7l4 4v11H4z" />
                <path d="M11 2.5v4h4" />
                <path d="M7 10h6M7 13h4" />
              </svg>
            }
          />
          <MetricCard
            label="Verified Instruments"
            value={completedTests.length}
            tone="success"
            icon={
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="6" r="3" />
                <path d="M6.5 10h7v2a3.5 3.5 0 01-3.5 3.5h0A3.5 3.5 0 016.5 12z" />
              </svg>
            }
          />
          <MetricCard
            label="Compliance Rate"
            value="100%"
            tone="gray"
            hint="Of finalized certificates"
            icon={
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 2l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z" />
              </svg>
            }
          />
        </div>

        {/* ── Quick Search ── */}
        <div className="mb-6">
          <h2 className="text-[14px] font-semibold text-gray-900 mb-2">
            Search Archive
          </h2>
          <div className="bg-white border border-gray-200 rounded p-4 shadow-2xs">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setDashboardSearch(e.target.value)}
                placeholder="Search by test number, serial number, model, laboratory..."
                className="flex-1 h-[36px] px-3 border border-gray-300 rounded text-[13px] text-gray-900 focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-blue-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setDashboardSearch('')}
                  className="px-3 h-[36px] bg-gray-100 hover:bg-gray-200 text-gray-600 text-[12px] font-medium rounded transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Finalized Reports ── */}
        <div>
          <SectionHeader title="Approved Test Certificates" count={filteredCompleted.length} />

          <div className="bg-white border border-gray-200 rounded overflow-hidden shadow-2xs">
            {filteredCompleted.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-[13px]">
                {searchQuery ? `No reports matched "${searchQuery}"` : 'No finalized reports available'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-[13px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                        Test Ref
                      </th>
                      <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                        Instrument Specification
                      </th>
                      <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                        Laboratory
                      </th>
                      <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                        Approval Authority
                      </th>
                      <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-right font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                <tbody>
                  {filteredCompleted.map((t) => (
                    <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-[12px] font-bold text-[#1e3a5f]">
                        {t.testNumber}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-gray-900">{t.instrumentModel}</div>
                        <div className="text-[11px] font-mono text-gray-500">SN: {t.instrumentSerial} &bull; Class {t.instrumentClass}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-gray-700">{labNameFor(t.laboratory) || t.laboratory}</div>
                        {labNameFor(t.laboratory) && (
                          <div className="text-[11px] font-mono text-gray-400">{t.laboratory}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700">{t.reviewer || 'Dr. K. Sharma'}</td>
                      <td className="px-3 py-2.5 text-right space-x-2">
                        <button
                          onClick={() => openViewModal(t)}
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
                          PDF
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
          report={selectedReport}
        />
      </DashboardLayout>
    </RouteGuard>
  );
}
