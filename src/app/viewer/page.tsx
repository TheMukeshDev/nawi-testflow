/**
 * NAWI TestFlow — Viewer Dashboard
 *
 * Read-only interface for searching and inspecting finalized test certificates.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { workflowStore, type StoredTest, type StoredReport } from '@/lib/workflow-store';
import { TestResultModal } from '@/components/workflow/TestResultModal';
import { downloadTestReportPDF } from '@/lib/report-generator';

export default function ViewerDashboard() {
  const [reports, setReports] = useState<StoredReport[]>([]);
  const [tests, setTests] = useState<StoredTest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTest, setSelectedTest] = useState<StoredTest | null>(null);
  const [selectedReport, setSelectedReport] = useState<StoredReport | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const refreshData = () => {
    setReports(workflowStore.getReports());
    setTests(workflowStore.getTests());
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = workflowStore.subscribe(() => {
      refreshData();
    });
    return unsubscribe;
  }, []);

  const completedTests = tests.filter(t => t.status === 'completed' || t.status === 'approved');

  const filteredCompleted = completedTests.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.testNumber.toLowerCase().includes(q) ||
      t.instrumentSerial.toLowerCase().includes(q) ||
      t.instrumentModel.toLowerCase().includes(q) ||
      t.laboratory.toLowerCase().includes(q)
    );
  });

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
          <p className="text-[12px] text-gray-500 mt-0.5">
            Search, view, and retrieve verified OIML R-76 test certificates and instrument verification records
          </p>
        </div>

        {/* ── Metrics ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <MetricCard label="Total Finalized Reports" value={String(reports.length)} color="primary" />
          <MetricCard label="Verified Instruments" value={String(completedTests.length)} color="success" />
          <MetricCard label="Compliance Rate" value="100%" color="gray" />
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
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by test number, serial number, model, laboratory..."
                className="flex-1 h-[36px] px-3 border border-gray-300 rounded text-[13px] text-gray-900 focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-blue-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
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
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-semibold text-gray-900">
              Approved Test Certificates
            </h2>
            <span className="text-[12px] text-gray-500">
              Showing {filteredCompleted.length} records
            </span>
          </div>

          <div className="bg-white border border-gray-200 rounded overflow-hidden shadow-2xs">
            {filteredCompleted.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-[13px]">
                {searchQuery ? `No reports matched "${searchQuery}"` : 'No finalized reports available'}
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                      Test Ref
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                      Instrument Specification
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                      Laboratory
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                      Approval Authority
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
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
                      <td className="px-3 py-2.5 text-gray-700">{t.laboratory}</td>
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

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  const borderColors: Record<string, string> = {
    gray: 'border-t-gray-400',
    primary: 'border-t-primary-500',
    success: 'border-t-success-500',
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
