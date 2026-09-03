/**
 * NAWI TestFlow — Tester Dashboard
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
import { workflowStore, type StoredTest } from '@/lib/workflow-store';
import { TestResultModal } from '@/components/workflow/TestResultModal';
import { downloadTestReportPDF } from '@/lib/report-generator';
import Link from 'next/link';

export default function TesterDashboard() {
  const [tests, setTests] = useState<StoredTest[]>([]);
  const [selectedTest, setSelectedTest] = useState<StoredTest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const refreshData = () => {
    setTests(workflowStore.getTests());
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = workflowStore.subscribe(() => {
      refreshData();
    });
    return unsubscribe;
  }, []);

  const activeTests = tests.filter(t => t.status === 'in-testing' || t.status === 'draft' || t.status === 'revision-requested');
  const submittedTests = tests.filter(t => t.status === 'pending-review');
  const completedTests = tests.filter(t => t.status === 'completed' || t.status === 'approved');

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-[18px] font-semibold text-gray-900">
              Testing Workspace & Report Management
            </h1>
            <p className="text-[12px] text-gray-500 mt-0.5">
              Record instrument observations, run calculations, and submit for verification
            </p>
          </div>
          <Link
            href="/tests/new"
            className="px-4 py-2 bg-[#1e3a5f] hover:bg-[#162d4a] text-white text-[13px] font-medium rounded transition-colors self-start sm:self-auto shadow-2xs inline-flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 2v10M2 7h10" strokeLinecap="round" />
            </svg>
            New Test Report
          </Link>
        </div>

        {/* ── Metrics ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <MetricCard label="Active / In-Testing" value={String(activeTests.length)} color="primary" />
          <MetricCard label="Pending Review" value={String(submittedTests.length)} color="warning" />
          <MetricCard label="Completed & Approved" value={String(completedTests.length)} color="success" />
          <MetricCard label="Total Records" value={String(tests.length)} color="gray" />
        </div>

        {/* ── Active Tests ── */}
        <div className="mb-6">
          <h2 className="text-[14px] font-semibold text-gray-900 mb-3">
            Active & Pending Review Tests
          </h2>
          <div className="bg-white border border-gray-200 rounded overflow-hidden shadow-2xs">
            {tests.filter(t => t.status !== 'completed' && t.status !== 'approved').length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-[13px]">
                No active tests. Start a new test report to begin.
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                      Test Ref
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                      Instrument
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                      Last Updated
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tests.filter(t => t.status !== 'completed' && t.status !== 'approved').map((t) => (
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
            )}
          </div>
        </div>

        {/* ── Completed Test Results ── */}
        <div>
          <h2 className="text-[14px] font-semibold text-gray-900 mb-3">
            Completed & Approved Test Reports
          </h2>
          <div className="bg-white border border-gray-200 rounded overflow-hidden shadow-2xs">
            {completedTests.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-[13px]">
                No completed test reports yet.
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                      Test Ref
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                      Instrument
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                      Approved By
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                      Compliance
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {completedTests.map((t) => (
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

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  const borderColors: Record<string, string> = {
    gray: 'border-t-gray-400',
    primary: 'border-t-primary-500',
    warning: 'border-t-warning-500',
    success: 'border-t-success-500',
    info: 'border-t-info-500',
  };

  return (
    <div className={`bg-white border border-gray-200 rounded border-t-2 ${borderColors[color]}`}>
      <div className="px-3 py-2.5">
        <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
          {label}
        </div>
        <div className="text-[22px] font-bold text-gray-900 leading-none">
          {value}
        </div>
      </div>
    </div>
  );
}
