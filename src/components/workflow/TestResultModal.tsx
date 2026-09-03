/**
 * NAWI TestFlow — Test Result Modal
 *
 * Full-screen / large modal to inspect completed or pending test records,
 * view metrological evaluation per OIML R-76, download PDF/DOCX reports,
 * and execute Reviewer approval/rejection workflows.
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TestStatusBadge, ComplianceBadge } from '@/components/ui/StatusBadge';
import { downloadTestReportPDF, downloadTestReportDOCX, printTestReport } from '@/lib/report-generator';
import { workflowStore, type StoredTest, type StoredReport } from '@/lib/workflow-store';
import { DocaPortalModal } from './DocaPortalModal';
import { EditTestModal } from './EditTestModal';

interface TestResultModalProps {
  open: boolean;
  onClose: () => void;
  test: StoredTest | null;
  report?: StoredReport | null;
  mode?: 'view' | 'review';
  onActionComplete?: () => void;
}

export function TestResultModal({
  open,
  onClose,
  test,
  report,
  mode = 'view',
  onActionComplete,
}: TestResultModalProps) {
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<'approved' | 'rejected' | 'disapproved' | null>(null);
  const [showDocaModal, setShowDocaModal] = useState(false);
  const [showDisapproveInput, setShowDisapproveInput] = useState(false);
  const [disapproveReason, setDisapproveReason] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  if (!open || !test) return null;

  const handleApprove = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      workflowStore.approveTest(test.id, 'Dr. K. Sharma', reviewNotes || 'Verified and approved per OIML R-76 requirements.');
      setIsSubmitting(false);
      setActionSuccess('approved');
      if (onActionComplete) onActionComplete();
    }, 400);
  };

  const handleReject = () => {
    if (!reviewNotes.trim()) {
      alert('Please enter review remarks explaining the reason for revision.');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      workflowStore.rejectTest(test.id, 'Dr. K. Sharma', reviewNotes);
      setIsSubmitting(false);
      setActionSuccess('rejected');
      if (onActionComplete) onActionComplete();
    }, 400);
  };

  const handleDisapprove = () => {
    if (!disapproveReason.trim()) {
      alert('Please specify the reason for revoking approval.');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      workflowStore.disapproveTest(test.id, 'Dr. K. Sharma', disapproveReason);
      setIsSubmitting(false);
      setActionSuccess('disapproved');
      setShowDisapproveInput(false);
      if (onActionComplete) onActionComplete();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-gray-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-md shadow-2xl border border-gray-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#1e3a5f] text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-white/10 flex items-center justify-center text-[11px] font-mono font-bold">
              TR
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-bold tracking-tight">{test.testNumber}</h2>
                <span className="text-[11px] font-mono text-blue-200 bg-white/10 px-1.5 py-0.5 rounded">
                  {test.verificationType} Verification
                </span>
              </div>
              <p className="text-[11px] text-blue-100">
                {test.laboratory} &bull; Performed on {test.testDate}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded flex items-center justify-center text-blue-100 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close dialog"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Action feedback alert */}
        {actionSuccess && (
          <div className={`p-3 text-[13px] font-medium flex items-center justify-between ${
            actionSuccess === 'approved' ? 'bg-green-50 text-green-800 border-b border-green-200' : 'bg-red-50 text-red-800 border-b border-red-200'
          }`}>
            <span>
              {actionSuccess === 'approved'
                ? 'Test report approved successfully! Finalized report is ready to download.'
                : 'Revision requested. Tester has been notified.'}
            </span>
            <button
              onClick={() => setActionSuccess(null)}
              className="text-xs underline font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-[13px] text-gray-700">
          {/* Status & Overview Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-gray-50 border border-gray-200 rounded-sm">
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Workflow Status</div>
              <div className="mt-1"><TestStatusBadge status={test.status} /></div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Compliance Result</div>
              <div className="mt-1"><ComplianceBadge verdict={test.complianceResult} /></div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Testing Officer</div>
              <div className="mt-1 font-medium text-gray-900">{test.technician}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Reviewer</div>
              <div className="mt-1 font-medium text-gray-900">{test.reviewer || 'Pending Assignment'}</div>
            </div>
          </div>

          {/* Instrument Specifications */}
          <div className="border border-gray-200 rounded-sm p-4">
            <h3 className="text-[12px] font-bold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <span className="w-1.5 h-3 bg-[#1e3a5f] rounded-xs" />
              Instrument Specifications
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4 text-[12px]">
              <div><span className="text-gray-500">Model:</span> <span className="font-semibold text-gray-900">{test.instrumentModel}</span></div>
              <div><span className="text-gray-500">Serial No.:</span> <span className="font-mono font-semibold text-gray-900">{test.instrumentSerial}</span></div>
              <div><span className="text-gray-500">Accuracy Class:</span> <span className="font-bold text-primary-700">Class {test.instrumentClass}</span></div>
              <div><span className="text-gray-500">Max Capacity:</span> <span className="font-mono text-gray-900">{test.maxCapacity} {test.maxCapacityUnit}</span></div>
              <div><span className="text-gray-500">Scale Interval (d):</span> <span className="font-mono text-gray-900">{test.scaleInterval} {test.scaleIntervalUnit}</span></div>
              <div><span className="text-gray-500">Verification Interval (e):</span> <span className="font-mono text-gray-900">{test.verificationScaleInterval || test.scaleInterval} {test.scaleIntervalUnit}</span></div>
            </div>
          </div>

          {/* Environmental Conditions */}
          <div className="border border-gray-200 rounded-sm p-4">
            <h3 className="text-[12px] font-bold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <span className="w-1.5 h-3 bg-[#1e3a5f] rounded-xs" />
              Environmental Conditions
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-4 text-[12px]">
              <div><span className="text-gray-500">Temperature:</span> <span className="font-mono text-gray-900">{test.temperature || '22.0'} °C</span></div>
              <div><span className="text-gray-500">Humidity:</span> <span className="font-mono text-gray-900">{test.humidity || '50'} %RH</span></div>
              <div><span className="text-gray-500">Pressure:</span> <span className="font-mono text-gray-900">{test.airPressure || '1013'} hPa</span></div>
              <div><span className="text-gray-500">Bay / Location:</span> <span className="text-gray-900">{test.testLocation || 'Main Lab'}</span></div>
            </div>
          </div>

          {/* Observations & Metrological Calculations */}
          <div className="border border-gray-200 rounded-sm p-4">
            <h3 className="text-[12px] font-bold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <span className="w-1.5 h-3 bg-[#1e3a5f] rounded-xs" />
              Metrological Observations & Calculations
            </h3>
            {test.observations.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No observation data points recorded</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 text-[11px] uppercase tracking-wider">
                      <th className="py-2 px-2 text-left font-semibold">Test Procedure</th>
                      <th className="py-2 px-2 text-left font-semibold">Code</th>
                      <th className="py-2 px-2 text-left font-semibold">Readings</th>
                      <th className="py-2 px-2 text-right font-semibold">Mean</th>
                      <th className="py-2 px-2 text-right font-semibold">Std Dev</th>
                      <th className="py-2 px-2 text-center font-semibold">Evaluation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {test.observations.map((obs, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/60">
                        <td className="py-2 px-2 font-medium text-gray-900">{obs.testName}</td>
                        <td className="py-2 px-2 font-mono text-gray-500">{obs.testCode}</td>
                        <td className="py-2 px-2 font-mono text-gray-700">{obs.readings.join(', ')} {obs.unit}</td>
                        <td className="py-2 px-2 font-mono text-right font-bold text-gray-900">{obs.mean} {obs.unit}</td>
                        <td className="py-2 px-2 font-mono text-right text-gray-600">{obs.stddev} {obs.unit}</td>
                        <td className="py-2 px-2 text-center">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            obs.verdict === 'PASS'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {obs.verdict}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Reviewer remarks / Review Mode form */}
          {mode === 'review' && test.status === 'pending-review' ? (
            <div className="border-2 border-primary-200 bg-blue-50/40 rounded-sm p-4">
              <h3 className="text-[13px] font-bold text-gray-900 mb-2">Reviewer Verification & Approval Decision</h3>
              <p className="text-[12px] text-gray-600 mb-3">
                Review all test points against OIML R-76 standards. Enter verification remarks and choose an action:
              </p>
              <textarea
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                placeholder="Enter remarks or justification for approval / revision..."
                rows={3}
                className="w-full p-2.5 bg-white border border-gray-300 rounded text-[13px] text-gray-900 focus:outline-none focus:border-[#1e3a5f]"
              />
              <div className="flex items-center justify-end gap-2.5 mt-3">
                <Button
                  variant="danger"
                  size="md"
                  onClick={handleReject}
                  loading={isSubmitting}
                >
                  Request Revision
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleApprove}
                  loading={isSubmitting}
                >
                  Approve & Issue Certificate
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {test.reviewNotes && (
                <div className="border border-gray-200 bg-gray-50 rounded-sm p-3.5">
                  <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1">
                    Reviewer Remarks ({test.reviewer || 'Review Authority'}):
                  </div>
                  <p className="text-[12px] text-gray-800 leading-relaxed">{test.reviewNotes}</p>
                </div>
              )}

              {/* Revision Requested - Action for Tester */}
              {test.status === 'revision-requested' && (
                <div className="border border-amber-300 bg-amber-50 rounded-sm p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-[13px] font-bold text-amber-900 flex items-center gap-1.5">
                      <span>⚠️</span> Revision Required by Reviewer
                    </h4>
                    <p className="text-[12px] text-amber-800 mt-0.5">
                      This test was disapproved / sent back for revision. Update your environmental readings or observations and resubmit.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setShowEditModal(true)}
                    className="bg-amber-700 hover:bg-amber-800 text-white shrink-0 shadow-xs cursor-pointer"
                  >
                    ✏️ Edit &amp; Resubmit Test
                  </Button>
                </div>
              )}

              {/* Post-Approval Revocation Control for Completed Tests */}
              {test.status === 'completed' && (
                <div className="border border-red-200 bg-red-50/40 rounded-sm p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-[13px] font-bold text-red-900 flex items-center gap-1.5">
                        <span>⚠️</span> Disapprove / Revoke Approval
                      </h4>
                      <p className="text-[11.5px] text-red-700 mt-0.5">
                        If discrepancies or audit errors are discovered post-approval, you can revoke approval and send this report back to the tester.
                      </p>
                    </div>
                    {!showDisapproveInput && (
                      <button
                        onClick={() => setShowDisapproveInput(true)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[12px] font-semibold rounded shadow-xs transition-colors shrink-0 cursor-pointer"
                      >
                        Disapprove / Revoke Approval
                      </button>
                    )}
                  </div>

                  {showDisapproveInput && (
                    <div className="mt-3 pt-3 border-t border-red-200 space-y-2.5">
                      <label className="block text-[12px] font-semibold text-red-900">
                        Reason for Disapproval &amp; Revocation Remarks:
                      </label>
                      <textarea
                        value={disapproveReason}
                        onChange={e => setDisapproveReason(e.target.value)}
                        placeholder="Specify discrepancy found (e.g. Load cell calibration drift detected during re-verification, observation points need re-measurement)..."
                        rows={2}
                        className="w-full p-2 bg-white border border-red-300 rounded text-[12.5px] text-gray-900 focus:outline-none focus:border-red-600"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setShowDisapproveInput(false)}>
                          Cancel
                        </Button>
                        <button
                          onClick={handleDisapprove}
                          disabled={isSubmitting}
                          className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white text-[12px] font-semibold rounded transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {isSubmitting ? 'Revoking...' : 'Confirm Disapproval & Notify Tester'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 bg-gray-50 border-t border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadTestReportPDF(test, report || undefined)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1e3a5f] hover:bg-[#162d4a] text-white text-[12px] font-medium rounded transition-colors shadow-xs"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M7 1.5v8m0 0L4 6.5m3 3l3-3M2 11.5h10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Download PDF
            </button>

            <button
              onClick={() => downloadTestReportDOCX(test, report || undefined)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-[12px] font-medium rounded transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 3h10M2 7h10M2 11h6" strokeLinecap="round" />
              </svg>
              Download DOCX
            </button>

            <button
              onClick={() => printTestReport(test, report || undefined)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-[12px] font-medium rounded transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 5V2h6v3M4 10h6v2H4v-2zM2 6h10v4H2V6z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Print
            </button>

            <button
              onClick={() => setShowDocaModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[12px] font-medium rounded transition-colors shadow-2xs cursor-pointer"
              title="Push to Ministry of Consumer Affairs National Portal"
            >
              <span>🏛️ e-Maap Gateway</span>
            </button>

            <a
              href={`/verify/${encodeURIComponent(test.testNumber)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[12px] font-medium rounded transition-colors"
              title="Inspect Public Cryptographic Ledger Verification"
            >
              <span>🔍 Verify QR</span>
            </a>
          </div>

          <Button variant="secondary" size="md" onClick={onClose}>
            Close
          </Button>
        </div>

        {/* e-Maap National Portal Integration Modal */}
        <DocaPortalModal
          open={showDocaModal}
          onClose={() => setShowDocaModal(false)}
          test={test}
          report={report}
        />

        {/* Edit & Resubmit Test Modal */}
        <EditTestModal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          test={test}
          onSaved={() => {
            setShowEditModal(false);
            if (onActionComplete) onActionComplete();
            onClose();
          }}
        />
      </div>
    </div>
  );
}
