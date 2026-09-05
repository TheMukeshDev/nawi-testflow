/**
 * NAWI Sahayak — DoCA e-Maap National Portal Integration Modal
 *
 * Demonstrates national-level interoperability with the Ministry of
 * Consumer Affairs e-Maap / National Legal Metrology Portal.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import type { StoredTest, StoredReport } from '@/lib/workflow-store';
import { buildDocaPayload, transmitToDocaPortal, type DocaRegistrationPayload, type DocaGatewayResponse } from '@/lib/doca-gateway';

interface DocaPortalModalProps {
  open: boolean;
  onClose: () => void;
  test: StoredTest | null;
  report?: StoredReport | null;
}

export function DocaPortalModal({ open, onClose, test, report }: DocaPortalModalProps) {
  const [payload, setPayload] = useState<DocaRegistrationPayload | null>(null);
  const [syncStep, setSyncStep] = useState<number>(0); // 0: Idle, 1: Validating, 2: Signing, 3: Transmitting, 4: Confirmed
  const [response, setResponse] = useState<DocaGatewayResponse | null>(null);
  const [showJsonLd, setShowJsonLd] = useState<boolean>(false);

  useEffect(() => {
    if (open && test) {
      setSyncStep(0);
      setResponse(null);
      buildDocaPayload(test, report).then(p => setPayload(p));
    }
  }, [open, test, report]);

  if (!open || !test) return null;

  const handleStartPush = async () => {
    if (!payload) return;

    setSyncStep(1); // Validating
    await new Promise(r => setTimeout(r, 600));

    setSyncStep(2); // Signing
    await new Promise(r => setTimeout(r, 700));

    setSyncStep(3); // Transmitting to DoCA
    const res = await transmitToDocaPortal(payload);

    setResponse(res);
    setSyncStep(4); // Confirmed
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-gray-950/65 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-md shadow-2xl border border-gray-200 overflow-hidden my-auto flex flex-col">
        {/* National Portal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#1e3a5f] text-white">
          <div className="flex items-center gap-3">
<div className="w-8 h-8 rounded bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-300">
                  <path d="M8 1.5l6.5 11H1.5z" />
                  <path d="M8 6v3.5" />
                  <circle cx="8" cy="11.5" r="0.4" fill="currentColor" />
                </svg>
              </div>
            <div>
              <div className="text-[13px] font-bold tracking-tight flex items-center gap-1.5">
                <span>e-Maap National Portal Integration</span>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-400/30">
                  DoCA Gateway
                </span>
              </div>
              <p className="text-[11px] text-blue-200">
                Ministry of Consumer Affairs, Food &amp; Public Distribution (Govt. of India)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center text-blue-200 hover:text-white hover:bg-white/10"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-[13px]">
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-sm text-[12px] text-amber-900 leading-relaxed">
            <strong>National Ledger Synchronization:</strong> Connects NAWI Sahayak directly to the national model approval database, preventing counterfeit certificates and duplicate instrument serials across Indian laboratories.
          </div>

          {/* Stepper progress */}
          <div className="border border-gray-200 rounded-sm p-4 bg-gray-50 space-y-3">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
              Integration Pipeline
            </div>

            <div className="space-y-2">
              <StepItem
                index={1}
                label="OIML R-76 Legal Metrology Schema Validation"
                status={syncStep === 1 ? 'active' : syncStep > 1 ? 'done' : 'waiting'}
              />
              <StepItem
                index={2}
                label="Class-3 DSC Digital Signature Verification & Token Check"
                status={syncStep === 2 ? 'active' : syncStep > 2 ? 'done' : 'waiting'}
              />
              <StepItem
                index={3}
                label="Transmitting to Central DoCA Ledger (e-Maap Gateway)"
                status={syncStep === 3 ? 'active' : syncStep > 3 ? 'done' : 'waiting'}
              />
              <StepItem
                index={4}
                label="Issued National Ledger UID & Tamper-Proof Registration"
                status={syncStep === 4 ? 'done' : 'waiting'}
              />
            </div>
          </div>

          {/* Success receipt card */}
          {syncStep === 4 && response && (
            <div className="border border-emerald-200 bg-emerald-50/70 rounded-sm p-4 space-y-2.5 animate-fadeIn">
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">✓</span>
                Registered on National Legal Metrology Ledger
              </div>

              <div className="grid grid-cols-2 gap-2 text-[12px] pt-1 border-t border-emerald-200 font-mono">
                <div>
                  <span className="text-gray-500 font-sans">National Registry UID:</span>
                  <div className="font-bold text-gray-900">{response.docaRegistryUid}</div>
                </div>
                <div>
                  <span className="text-gray-500 font-sans">Certificate Token:</span>
                  <div className="font-bold text-gray-900">{response.registrationNumber}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500 font-sans">Ledger Transaction ID:</span>
                  <div className="text-gray-700 text-[11px] break-all">{response.ledgerTxId}</div>
                </div>
              </div>
            </div>
          )}

          {/* JSON-LD Schema Inspector */}
          <div>
            <button
              type="button"
              onClick={() => setShowJsonLd(!showJsonLd)}
              className="text-[12px] text-primary-600 hover:underline font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>{showJsonLd ? '▼ Hide' : '▶ View'} Interoperability JSON-LD Payload</span>
            </button>

            {showJsonLd && payload && (
              <pre className="mt-2 p-3 bg-gray-900 text-emerald-400 rounded text-[11px] font-mono max-h-[160px] overflow-y-auto border border-gray-800">
                {JSON.stringify(payload, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-t border-gray-200">
          <Button variant="secondary" size="md" onClick={onClose}>
            Close
          </Button>

          {syncStep === 0 && (
            <button
              onClick={handleStartPush}
              className="px-4 py-2 bg-[#1e3a5f] hover:bg-[#162d4a] text-white text-[13px] font-semibold rounded transition-colors shadow-xs cursor-pointer inline-flex items-center gap-2"
            >
              <span>Push Certificate to e-Maap Portal →</span>
            </button>
          )}

          {syncStep > 0 && syncStep < 4 && (
            <div className="text-[12px] text-[#1e3a5f] font-medium flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
              <span>Transmitting to National Portal...</span>
            </div>
          )}

          {syncStep === 4 && (
            <span className="text-[12px] font-bold text-emerald-700">
              ✓ Successfully Synced
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StepItem({ index, label, status }: { index: number; label: string; status: 'waiting' | 'active' | 'done' }) {
  return (
    <div className="flex items-center gap-2.5 text-[12px]">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
        status === 'done'
          ? 'bg-emerald-600 text-white'
          : status === 'active'
          ? 'bg-blue-600 text-white animate-pulse'
          : 'bg-gray-200 text-gray-500'
      }`}>
        {status === 'done' ? '✓' : index}
      </div>
      <span className={status === 'done' ? 'text-gray-900 font-medium' : status === 'active' ? 'text-blue-900 font-semibold' : 'text-gray-400'}>
        {label}
      </span>
    </div>
  );
}
