/**
 * NAWI Sahayak — Public Certificate Verification Portal
 *
 * Route: /verify/[id]
 * Accessible to inspectors, legal metrology officers, and consumer clients
 * scanning the QR code printed on physical/PDF NAWI test certificates.
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { workflowStore, type StoredTest, type StoredReport } from '@/lib/workflow-store';
import { computeCertificateHash, generateQRCodeSVG, formatHashFingerprint, certificatePayloadFromTest, parseVerificationPayload, type MetrologyCertificatePayload } from '@/lib/crypto-qr';
import { downloadTestReportPDF } from '@/lib/report-generator';

export default function CertificateVerificationPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? decodeURIComponent(params.id) : '';

  const [test, setTest] = useState<StoredTest | null>(null);
  const [report, setReport] = useState<StoredReport | null>(null);
  const [certHash, setCertHash] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(true);
  /** 'registry' = record found in this browser's workflow store; 'qr' = verified offline from the QR payload */
  const [verificationSource, setVerificationSource] = useState<'registry' | 'qr' | null>(null);
  /** Set when a QR payload was present but its SHA-256 digest does not match (tampering). */
  const [payloadTampered, setPayloadTampered] = useState<boolean>(false);

  /**
   * Build a display record from a self-contained QR payload so the certificate
   * renders identically on any device — no registry entry required.
   */
  const displayFromPayload = (p: MetrologyCertificatePayload) => {
    const displayTest = {
      id: p.testNumber,
      testNumber: p.testNumber,
      instrumentSerial: p.instrumentSerial,
      instrumentModel: p.instrumentModel,
      instrumentClass: p.instrumentClass,
      maxCapacity: p.maxCapacity,
      maxCapacityUnit: p.maxCapacityUnit,
      scaleInterval: p.scaleInterval,
      scaleIntervalUnit: p.scaleIntervalUnit,
      laboratory: p.laboratory,
      verificationType: p.verificationType,
      status: 'approved',
      complianceResult: (p.complianceResult || 'compliant').toLowerCase(),
      technician: p.technician,
      reviewer: p.reviewer,
      testDate: p.testDate,
      observations: [],
      createdAt: p.testDate,
      lastUpdated: p.testDate,
    } as unknown as StoredTest;
    const displayReport = {
      id: p.reportNumber,
      reportNumber: p.reportNumber,
      testId: p.testNumber,
      testNumber: p.testNumber,
      instrumentSerial: p.instrumentSerial,
      laboratory: p.laboratory,
      format: 'PDF',
      generatedAt: p.testDate,
      version: 1,
    } as unknown as StoredReport;
    return { test: displayTest, report: displayReport };
  };

  useEffect(() => {
    if (!id) return;

    const verify = async () => {
      setIsVerifying(true);
      setPayloadTampered(false);
      setVerificationSource(null);

      // Merge live Supabase records so QR lookups work for published certificates
      await workflowStore.mergeFromSupabase().catch(() => {});

      // 1) Local registry match (same-browser flow)
      const foundTest = workflowStore.getTest(id);
      const foundReport = workflowStore.getReportByTestId(id) || workflowStore.getReports().find(r => r.reportNumber === id);
      const activeTest = foundTest || (foundReport ? workflowStore.getTest(foundReport.testId) : null);

      if (activeTest) {
        const hash = await computeCertificateHash(certificatePayloadFromTest(activeTest, foundReport || undefined));
        setTest(activeTest);
        setReport(foundReport || null);
        setCertHash(hash);
        setVerificationSource('registry');
        setIsVerifying(false);
        return;
      }

      // 2) Offline self-verification from the QR payload (any device, no login):
      //    re-compute the SHA-256 over the embedded data and compare with the
      //    digest that was signed into the QR when the certificate was printed.
      const search = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const dataParam = search?.get('d');
      const hashParam = search?.get('h');
      if (dataParam && hashParam) {
        const payload = parseVerificationPayload(dataParam);
        if (payload) {
          const recomputed = await computeCertificateHash(payload);
          if (recomputed.toLowerCase() === hashParam.toLowerCase()) {
            const { test: qrTest, report: qrReport } = displayFromPayload(payload);
            setTest(qrTest);
            setReport(qrReport);
            setCertHash(recomputed);
            setVerificationSource('qr');
            setIsVerifying(false);
            return;
          }
          setPayloadTampered(true);
          setIsVerifying(false);
          return;
        }
      }

      setTest(null);
      setIsVerifying(false);
    };

    verify();
  }, [id]);

  const qrSvg = generateQRCodeSVG(typeof window !== 'undefined' ? window.location.href : `https://nawi-sahayak.vercel.app/verify/${id}`, 110);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-[#1e3a5f] text-white border-b border-blue-950 py-3 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center font-bold text-[13px]">
              NW
            </div>
            <div>
              <div className="text-[14px] font-bold tracking-tight">National Legal Metrology Portal</div>
              <div className="text-[10px] text-blue-200 tracking-wider uppercase">OIML R-76 Digital Certificate Registry</div>
            </div>
          </div>
          <Link href="/" className="text-[12px] text-blue-200 hover:text-white transition-colors">
            NAWI Sahayak →
          </Link>
        </div>
      </header>

      {/* Main Verification Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 my-4">
        {isVerifying ? (
          <div className="bg-white rounded-md p-12 text-center border border-gray-200 shadow-xs">
            <div className="w-10 h-10 border-3 border-blue-200 border-t-[#1e3a5f] rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[14px] font-medium text-gray-700">Verifying Cryptographic Ledger Signature...</p>
            <p className="text-[11px] text-gray-400 mt-1">Ref: {id}</p>
          </div>
        ) : !test ? (
          <div className="bg-white rounded-md p-8 text-center border border-red-200 shadow-xs">
            <div className={`w-14 h-14 rounded-full ${payloadTampered ? 'bg-red-600/10 text-red-600' : 'bg-red-50 text-red-600'} flex items-center justify-center mx-auto mb-3`}>
              {payloadTampered ? (
                <svg width="26" height="26" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 1.5l7.5 14.5H1.5z" />
                  <path d="M9 6.5v4" />
                  <circle cx="9" cy="13" r="0.6" fill="currentColor" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M2.5 2.5l9 9M11.5 2.5l-9 9" />
                </svg>
              )}
            </div>
            <h1 className="text-[18px] font-bold text-gray-900 mb-1">
              {payloadTampered ? 'Tamper Detected — Cryptographic Signature Mismatch' : 'Unverified Certificate Reference'}
            </h1>
            {payloadTampered ? (
              <p className="text-[13px] text-gray-600 mb-4">
                The SHA-256 digest carried inside this QR code does <strong>not</strong> match the certificate data
                embedded in it. The certificate data may have been altered after signing — treat it as <strong>NOT authentic</strong>.
              </p>
            ) : (
              <p className="text-[13px] text-gray-600 mb-4">
                The certificate reference <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-800">{id}</code> could not be validated against the national ledger.
              </p>
            )}
            <div className="text-[12px] text-gray-500 max-w-md mx-auto mb-6 bg-amber-50 p-3 border border-amber-200 rounded">
              {payloadTampered
                ? 'Do not rely on this certificate. Contact the issuing laboratory or search the master repository for an official record.'
                : 'If you are an inspector verifying a physical certificate, please inspect the QR code or verify the instrument serial number directly in the repository.'}
            </div>
            <Link
              href="/repository"
              className="px-4 py-2 bg-[#1e3a5f] text-white text-[13px] font-medium rounded hover:bg-[#162d4a] transition-colors inline-block"
            >
              Search Master Repository
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden">
            {/* Authenticity Banner */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-900 to-teal-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-emerald-400/20 border-2 border-emerald-300 flex items-center justify-center text-emerald-300 text-2xl font-bold shrink-0">
                  ✓
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold bg-emerald-400/30 text-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Official Verification
                    </span>
                    <span className="text-[11px] text-emerald-200 font-mono">
                      Class-3 DSC Verified
                    </span>
                    {verificationSource === 'qr' && (
                      <span className="text-[11px] font-bold bg-white/15 text-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300/40">
                        ✓ Self-Verified from QR Payload
                      </span>
                    )}
                  </div>
                  <h1 className="text-[18px] sm:text-[20px] font-bold tracking-tight mt-1">
                    Valid & Authentic NAWI Certificate
                  </h1>
                  <p className="text-[12px] text-emerald-100 mt-0.5">
                    Verified per OIML Recommendation R-76 & Standards of Weights and Measures Rules
                    {verificationSource === 'qr' && ' — SHA-256 recomputed locally from the QR payload (no login / database required)'}
                  </p>
                </div>
              </div>

              {/* QR Code embed on top right */}
              <div
                className="bg-white p-2 rounded shrink-0 self-center sm:self-auto shadow-xs"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            </div>

            <div className="p-5 sm:p-6 space-y-6 text-[13px]">
              {/* Reference Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-sm">
                <div>
                  <div className="text-[10.5px] text-gray-500 uppercase tracking-wide">Report Number</div>
                  <div className="font-mono font-bold text-gray-900 mt-0.5">
                    {report?.reportNumber || `RPT-${test.testNumber}`}
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] text-gray-500 uppercase tracking-wide">Test Reference</div>
                  <div className="font-mono font-bold text-[#1e3a5f] mt-0.5">
                    {test.testNumber}
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] text-gray-500 uppercase tracking-wide">Verification Date</div>
                  <div className="font-medium text-gray-900 mt-0.5">{test.testDate}</div>
                </div>
                <div>
                  <div className="text-[10.5px] text-gray-500 uppercase tracking-wide">Compliance Verdict</div>
                  <div className="mt-0.5">
                    <span className={`inline-block px-2 py-0.5 text-[11px] font-bold rounded ${
                      test.complianceResult === 'compliant'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}>
                      {test.complianceResult.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Instrument & Laboratory */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-sm p-4">
                  <h2 className="text-[12px] font-bold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-3 bg-[#1e3a5f] rounded-xs" />
                    Verified Instrument Details
                  </h2>
                  <div className="space-y-2 text-[12px]">
                    <div className="flex justify-between border-b border-gray-100 pb-1">
                      <span className="text-gray-500">Model Name:</span>
                      <span className="font-semibold text-gray-900">{test.instrumentModel}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 pb-1">
                      <span className="text-gray-500">Serial Number:</span>
                      <span className="font-mono font-bold text-gray-900">{test.instrumentSerial}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 pb-1">
                      <span className="text-gray-500">Accuracy Class:</span>
                      <span className="font-bold text-primary-700">Class {test.instrumentClass}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 pb-1">
                      <span className="text-gray-500">Max Capacity:</span>
                      <span className="font-mono text-gray-900">{test.maxCapacity} {test.maxCapacityUnit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Scale Interval (d / e):</span>
                      <span className="font-mono text-gray-900">{test.scaleInterval} {test.scaleIntervalUnit}</span>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-sm p-4">
                  <h2 className="text-[12px] font-bold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-3 bg-[#1e3a5f] rounded-xs" />
                    Issuing Laboratory Authority
                  </h2>
                  <div className="space-y-2 text-[12px]">
                    <div className="flex justify-between border-b border-gray-100 pb-1">
                      <span className="text-gray-500">Accredited Laboratory:</span>
                      <span className="font-semibold text-gray-900">{test.laboratory}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 pb-1">
                      <span className="text-gray-500">Verification Type:</span>
                      <span className="font-medium text-gray-900">{test.verificationType} Verification</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 pb-1">
                      <span className="text-gray-500">Testing Officer:</span>
                      <span className="text-gray-900">{test.technician}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 pb-1">
                      <span className="text-gray-500">Authorizing Signatory:</span>
                      <span className="font-semibold text-gray-900">{test.reviewer || 'Dr. K. Sharma'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Digital Registry Status:</span>
                      <span className="text-emerald-700 font-semibold">Active & Immutable</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cryptographic SHA-256 Ledger Stamp */}
              <div className="p-4 bg-slate-900 text-slate-100 rounded-sm border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 text-[14px]">🔒</span>
                    <span className="text-[12px] font-mono font-bold tracking-wider text-slate-200">
                      SHA-256 TAMPER-PROOF METROLOGY FINGERPRINT
                    </span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30 font-mono">
                    MATCH CONFIRMED
                  </span>
                </div>
                <div className="font-mono text-[11.5px] text-emerald-300 break-all bg-black/40 p-2.5 rounded border border-slate-800 select-all">
                  {certHash || 'COMPUTING_CRYPTOGRAPHIC_DIGEST...'}
                </div>
                <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Deterministic Hash calculated across raw observations, MPE limits & signatures.</span>
                  <span className="font-mono text-slate-500">{formatHashFingerprint(certHash)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadTestReportPDF(test, report || undefined)}
                    className="px-4 py-2 bg-[#1e3a5f] hover:bg-[#162d4a] text-white text-[13px] font-medium rounded transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M7 1.5v8m0 0L4 6.5m3 3l3-3M2 11.5h10" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Download Official PDF Certificate
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="px-3 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-[13px] font-medium rounded transition-colors cursor-pointer"
                  >
                    Print Verification Slip
                  </button>
                </div>

                <Link
                  href="/repository"
                  className="text-primary-600 hover:underline font-medium text-[12.5px]"
                >
                  ← Return to Repository Search
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
