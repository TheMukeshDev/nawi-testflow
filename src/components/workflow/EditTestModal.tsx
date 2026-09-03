/**
 * NAWI TestFlow — Edit & Resubmit Test Modal
 *
 * Allows testing officers to update readings, environmental conditions,
 * and comments for tests requiring revision or disapproved by reviewers,
 * and resubmit them into the approval pipeline.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { workflowStore, type StoredTest } from '@/lib/workflow-store';
import { useAuth } from '@/lib/auth-context';

interface EditTestModalProps {
  open: boolean;
  onClose: () => void;
  test: StoredTest | null;
  onSaved?: () => void;
}

export function EditTestModal({ open, onClose, test, onSaved }: EditTestModalProps) {
  const { user } = useAuth();
  const [temperature, setTemperature] = useState('');
  const [humidity, setHumidity] = useState('');
  const [testerNotes, setTesterNotes] = useState('');
  const [observations, setObservations] = useState<StoredTest['observations']>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (test) {
      setTemperature(test.temperature || '22.4');
      setHumidity(test.humidity || '52');
      setTesterNotes('');
      setSuccessMsg('');
      setObservations(JSON.parse(JSON.stringify(test.observations || [])));
    }
  }, [test, open]);

  if (!open || !test) return null;

  const handleReadingsChange = (idx: number, rawText: string) => {
    setObservations(prev => {
      const next = [...prev];
      const item = { ...next[idx] };
      const arr = rawText.split(',').map(s => s.trim()).filter(Boolean);
      item.readings = arr;

      // Recompute mean & stddev
      const nums = arr.map(Number).filter(n => !isNaN(n));
      if (nums.length > 0) {
        const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
        item.mean = avg.toFixed(3);
        const variance = nums.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / nums.length;
        item.stddev = Math.sqrt(variance).toFixed(4);
      }
      next[idx] = item;
      return next;
    });
  };

  const handleVerdictToggle = (idx: number) => {
    setObservations(prev => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        verdict: next[idx].verdict === 'PASS' ? 'FAIL' : 'PASS',
      };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const testerName = (user as any)?.fullName || (user as any)?.full_name || test.technician || 'Testing Officer';
      workflowStore.updateAndResubmitTest(
        test.id,
        {
          temperature,
          humidity,
          observations,
          notes: testerNotes,
        },
        testerName
      );

      setSuccessMsg('Test observations updated and successfully resubmitted to reviewer!');
      setTimeout(() => {
        setIsSubmitting(false);
        if (onSaved) onSaved();
        onClose();
      }, 900);
    } catch (err) {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
      <div className="bg-white border border-gray-200 rounded-lg shadow-xl w-full max-w-[840px] max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1e3a5f] text-white shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-400 text-slate-900 rounded uppercase">
                Update &amp; Resubmit
              </span>
              <h2 className="text-[16px] font-bold">{test.testNumber} &mdash; Edit Observations</h2>
            </div>
            <p className="text-[12px] text-blue-200 mt-0.5">
              {test.instrumentModel} ({test.instrumentSerial}) &bull; Class {test.instrumentClass}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Reviewer's Feedback Banner */}
          {test.reviewNotes && (
            <div className="border border-red-200 bg-red-50/80 rounded-md p-3.5 text-[12.5px]">
              <div className="font-bold text-red-900 flex items-center gap-1.5 mb-1">
                <span>⚠️</span> Reviewer / Disapproval Remarks:
              </div>
              <p className="text-red-800 leading-relaxed pl-5">{test.reviewNotes}</p>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded text-[13px] font-semibold flex items-center gap-2">
              <span>✓</span> {successMsg}
            </div>
          )}

          <form id="edit-test-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Environmental Conditions */}
            <div className="border border-gray-200 rounded p-4">
              <h3 className="text-[12px] font-bold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <span className="w-1.5 h-3 bg-[#1e3a5f] rounded-xs" />
                Environmental Conditions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1">Temperature (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={temperature}
                    onChange={e => setTemperature(e.target.value)}
                    required
                    className="w-full h-[36px] px-3 border border-gray-300 rounded text-[13px] text-gray-900 focus:outline-none focus:border-[#1e3a5f]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1">Relative Humidity (%RH)</label>
                  <input
                    type="number"
                    step="1"
                    value={humidity}
                    onChange={e => setHumidity(e.target.value)}
                    required
                    className="w-full h-[36px] px-3 border border-gray-300 rounded text-[13px] text-gray-900 focus:outline-none focus:border-[#1e3a5f]"
                  />
                </div>
              </div>
            </div>

            {/* Editable Observation Points */}
            <div className="border border-gray-200 rounded p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[12px] font-bold text-gray-900 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-[#1e3a5f] rounded-xs" />
                  Observation Test Procedures &amp; Measurement Points
                </h3>
                <span className="text-[11px] text-gray-500">Enter comma-separated readings for automatic calculation</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-left">
                      <th className="py-2 px-3">Test Procedure</th>
                      <th className="py-2 px-3">Readings Array ({test.scaleIntervalUnit || 'g'})</th>
                      <th className="py-2 px-3">Mean</th>
                      <th className="py-2 px-3">Std Dev (&sigma;)</th>
                      <th className="py-2 px-3 text-center">Verdict</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {observations.map((obs, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/20">
                        <td className="py-2.5 px-3 font-semibold text-gray-800">
                          <div>{obs.testName}</div>
                          <span className="text-[10.5px] font-mono text-gray-400">{obs.testCode}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={obs.readings.join(', ')}
                            onChange={e => handleReadingsChange(idx, e.target.value)}
                            className="w-full min-w-[180px] h-[32px] px-2.5 border border-blue-300 bg-blue-50/20 rounded font-mono text-[12px] text-gray-900 focus:border-[#1e3a5f]"
                            placeholder="e.g. 500.00, 500.01, 500.00"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-gray-800">
                          {obs.mean} {obs.unit}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-gray-600">
                          {obs.stddev}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleVerdictToggle(idx)}
                            className={`px-2.5 py-0.5 rounded text-[10.5px] font-bold border cursor-pointer transition-colors ${
                              obs.verdict === 'PASS'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                                : 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200'
                            }`}
                          >
                            {obs.verdict}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tester Notes */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1">
                Correction &amp; Resubmission Notes (Visible to Reviewer)
              </label>
              <textarea
                value={testerNotes}
                onChange={e => setTesterNotes(e.target.value)}
                placeholder="Explain the changes made (e.g., Re-zeroed balance, re-conducted weighing repeatability readings, all points verified within OIML MPE)..."
                rows={3}
                required
                className="w-full p-2.5 border border-gray-300 rounded text-[12.5px] text-gray-900 focus:outline-none focus:border-[#1e3a5f]"
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-gray-50 border-t border-gray-200 shrink-0">
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>

          <Button
            variant="primary"
            size="md"
            type="submit"
            form="edit-test-form"
            loading={isSubmitting}
          >
            Save Updates &amp; Resubmit for Review &rarr;
          </Button>
        </div>
      </div>
    </div>
  );
}
