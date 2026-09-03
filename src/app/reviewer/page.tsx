/**
 * NAWI TestFlow — Reviewer Dashboard
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
import { TestResultModal } from '@/components/workflow/TestResultModal';
import { workflowStore, type StoredTest } from '@/lib/workflow-store';
import { downloadTestReportPDF } from '@/lib/report-generator';

export default function ReviewerDashboard() {
  const [tests, setTests] = useState<StoredTest[]>([]);
  const [selectedTest, setSelectedTest] = useState<StoredTest | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'review'>('review');
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

  const pendingTests = tests.filter(t => t.status === 'pending-review');
  const approvedTests = tests.filter(t => t.status === 'completed' || t.status === 'approved');
  const rejectedTests = tests.filter(t => t.status === 'revision-requested' || t.status === 'rejected');

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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-[18px] font-semibold text-gray-900">
              Metrology Review & Approval Workspace
            </h1>
            <p className="text-[12px] text-gray-500 mt-0.5">
              Evaluate submitted NAWI test observations and issue official OIML R-76 certificates
            </p>
          </div>
        </div>

        {/* ── Metrics ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <MetricCard label="Pending Review" value={String(pendingTests.length)} color="warning" />
          <MetricCard label="Approved Reports" value={String(approvedTests.length)} color="success" />
          <MetricCard label="Revision Requested" value={String(rejectedTests.length)} color="danger" />
          <MetricCard label="Total Evaluated" value={String(approvedTests.length + rejectedTests.length)} color="gray" />
        </div>

        {/* ── Reports Awaiting Review ── */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-[14px] font-semibold text-gray-900">
                Reports Awaiting Review
              </h2>
              {pendingTests.length > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-300 animate-pulse">
                  {pendingTests.length} action required
                </span>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded overflow-hidden shadow-2xs">
            {pendingTests.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-[13px]">
                <p className="font-medium text-gray-600">No reports currently awaiting review</p>
                <p className="text-[11px] text-gray-400 mt-1">When testers submit test records, they will automatically appear here.</p>
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                      Test Ref No.
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                      Instrument Details
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                      Testing Officer
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                      Submitted Date
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                      OIML Verdict
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                      Review Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pendingTests.map((t) => (
                    <tr key={t.id} className="border-b border-gray-100 hover:bg-amber-50/30 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-[12px] font-bold text-[#1e3a5f]">
                        {t.testNumber}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-gray-900">{t.instrumentModel}</div>
                        <div className="text-[11px] font-mono text-gray-500">SN: {t.instrumentSerial} &bull; Class {t.instrumentClass}</div>
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
            )}
          </div>
        </div>

        {/* ── Recently Approved & Completed Reports ── */}
        <div>
          <h2 className="text-[14px] font-semibold text-gray-900 mb-3">
            Recently Finalized & Approved Reports
          </h2>
          <div className="bg-white border border-gray-200 rounded overflow-hidden shadow-2xs">
            {approvedTests.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-[12px]">
                No approved reports recorded yet
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
                      Status
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700 text-[11px] uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {approvedTests.slice(0, 5).map((t) => (
                    <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-[12px] font-medium text-gray-900">
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
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200 rounded">
                          ✓ APPROVED
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right space-x-2">
                        <button
                          onClick={() => openReviewModal(t, 'view')}
                          className="text-[12px] text-primary-600 hover:text-primary-800 font-medium cursor-pointer"
                        >
                          View Results
                        </button>
                        <button
                          onClick={() => downloadTestReportPDF(t)}
                          className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-[11px] font-medium rounded border border-gray-300 transition-colors cursor-pointer"
                        >
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

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  const borderColors: Record<string, string> = {
    gray: 'border-t-gray-400',
    primary: 'border-t-primary-500',
    warning: 'border-t-warning-500',
    success: 'border-t-success-500',
    danger: 'border-t-danger-500',
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
