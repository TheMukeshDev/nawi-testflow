/**
 * NAWI TestFlow — PKI Digital Signature (Class-3 DSC) Simulation
 *
 * Implements digital signature simulation adhering to:
 * - Indian Information Technology (IT) Act, 2000
 * - Legal Metrology (General) Rules
 * - OIML R-76 Electronic Record Authenticity
 */

export interface DigitalSignatureInfo {
  signerName: string;
  designation: string;
  certifyingAuthority: string;
  certificateSerial: string;
  timestamp: string;
  reason: string;
  location: string;
  status: 'VALID' | 'REVOKED' | 'EXPIRED';
  digestAlgorithm: 'SHA-256';
}

export function getOfficialSignerInfo(name = 'Dr. K. Sharma', dateStr?: string): DigitalSignatureInfo {
  return {
    signerName: name,
    designation: 'Chief Verification Officer & Authorized Signatory',
    certifyingAuthority: 'e-Mudhra Class 3 Government Metrology CA (CCA India)',
    certificateSerial: 'eM-2026-IN-09884217',
    timestamp: dateStr || new Date().toISOString(),
    reason: 'Official Model Approval & Metrological Verification per OIML R-76',
    location: 'National Physical Metrology Laboratory, New Delhi, India',
    status: 'VALID',
    digestAlgorithm: 'SHA-256',
  };
}

/**
 * Generates an official HTML digital signature stamp for embedding into certificates & PDFs
 */
export function generateDigitalSignatureStampHTML(signer?: DigitalSignatureInfo): string {
  const s = signer || getOfficialSignerInfo();

  return `
    <div style="border: 1.5px solid #16a34a; background-color: #f0fdf4; border-radius: 4px; padding: 8px 12px; display: inline-flex; align-items: center; gap: 10px; font-family: -apple-system, sans-serif;">
      <div style="width: 32px; height: 32px; border-radius: 50%; background-color: #16a34a; color: white; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold; shrink-0;">
        ✓
      </div>
      <div style="line-height: 1.3; text-align: left;">
        <div style="font-size: 8.5pt; font-weight: bold; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">
          Digitally Signed with Class-3 DSC
        </div>
        <div style="font-size: 9.5pt; font-weight: bold; color: #0f172a;">
          ${s.signerName}
        </div>
        <div style="font-size: 7.5pt; color: #475569;">
          ${s.designation} &bull; ${s.certifyingAuthority}
        </div>
        <div style="font-size: 7pt; color: #64748b; font-family: monospace; margin-top: 1px;">
          Token: ${s.certificateSerial} &bull; ${new Date(s.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
        </div>
      </div>
    </div>
  `.trim();
}
