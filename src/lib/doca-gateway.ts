/**
 * NAWI Sahayak — Department of Consumer Affairs (DoCA) e-Maap Gateway
 *
 * Mock interoperability module connecting NAWI Sahayak with the
 * Ministry of Consumer Affairs National Legal Metrology Portal (e-Maap).
 */

import type { StoredTest, StoredReport } from './workflow-store';
import { certificatePayloadFromTest, buildVerificationUrl, computeCertificateHash } from './crypto-qr';

export interface DocaRegistrationPayload {
  '@context': string;
  '@type': string;
  nationalPortal: string;
  modelNumber: string;
  serialNumber: string;
  manufacturerName: string;
  manufacturerGst: string;
  oimlStandard: string;
  accuracyClass: string;
  maxCapacity: string;
  scaleInterval: string;
  complianceVerdict: string;
  issuingLaboratory: string;
  labAccreditationNumber: string;
  authorizedSignatory: string;
  digitalSignatureRef: string;
  certificateHash: string;
  publicVerificationUrl: string;
  submissionTimestamp: string;
}

export interface DocaGatewayResponse {
  success: boolean;
  docaRegistryUid: string;
  registrationNumber: string;
  timestamp: string;
  ledgerTxId: string;
  status: 'REGISTERED' | 'FAILED';
  remarks: string;
}

export async function buildDocaPayload(test: StoredTest, report?: StoredReport | null): Promise<DocaRegistrationPayload> {
  // Hash via the same canonical builder as the certificate QR / verification portal,
  // so the e-Maap registry digest always matches what a QR scan recomputes.
  const payload = certificatePayloadFromTest(test, report || undefined);
  const hash = await computeCertificateHash(payload);

  return {
    '@context': 'https://schema.doca.gov.in/legal-metrology/v1',
    '@type': 'LegalMetrologyVerificationCertificate',
    nationalPortal: 'e-Maap (National Legal Metrology Portal — Ministry of Consumer Affairs, GoI)',
    modelNumber: test.instrumentModel,
    serialNumber: test.instrumentSerial,
    manufacturerName: test.instrumentManufacturer || 'Standard Metrology OEM Ltd.',
    manufacturerGst: '07AAACN1928K1Z3',
    oimlStandard: 'OIML Recommendation R-76-1:2009',
    accuracyClass: `Class ${test.instrumentClass}`,
    maxCapacity: `${test.maxCapacity} ${test.maxCapacityUnit}`,
    scaleInterval: `${test.scaleInterval} ${test.scaleIntervalUnit}`,
    complianceVerdict: test.complianceResult.toUpperCase(),
    issuingLaboratory: test.laboratory,
    labAccreditationNumber: 'NABL/TC-2024/0991 (ISO/IEC 17025:2017)',
    authorizedSignatory: test.reviewer || 'Dr. K. Sharma',
    digitalSignatureRef: 'eMudhra-Class3-DSC-eM2026-IN-09884217',
    certificateHash: `sha256:${hash}`,
    publicVerificationUrl: await buildVerificationUrl(payload),
    submissionTimestamp: new Date().toISOString(),
  };
}

/**
 * Simulates API handshake with DoCA e-Maap Central Ledger
 */
export async function transmitToDocaPortal(payload: DocaRegistrationPayload): Promise<DocaGatewayResponse> {
  // Simulate network roundtrip
  await new Promise(r => setTimeout(r, 1200));

  const randomUid = Math.floor(100000 + Math.random() * 900000);
  const txHash = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  return {
    success: true,
    docaRegistryUid: `DOCA/EMAAP/2026/IND-${randomUid}`,
    registrationNumber: `LM-R76-CERT-${new Date().getFullYear()}-${randomUid}`,
    timestamp: new Date().toISOString(),
    ledgerTxId: `0x${txHash}...`,
    status: 'REGISTERED',
    remarks: 'Acknowledged and registered on Central Legal Metrology Registry ledger with immutable hash.',
  };
}
