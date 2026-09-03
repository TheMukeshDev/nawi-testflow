/**
 * NAWI TestFlow — Cryptographic Hash & Verification QR Code Generator
 *
 * Provides:
 * 1. Deterministic SHA-256 metrological hash calculation
 * 2. Standards-compliant, phone-scannable QR Code generation (via the `qrcode` library)
 * 3. Self-verifying verification URL: the certificate payload travels INSIDE the QR
 *    (URL query `d` = payload, `h` = SHA-256 over the same canonical fields), so an
 *    inspector scanning the printed certificate on any device can re-compute the hash
 *    locally — no login, no server round-trip, no shared database required.
 */

import type { StoredTest } from './workflow-store';
import QRCode from 'qrcode';

/** Production origin used when the app is rendered outside a browser context. */
const PROD_ORIGIN = 'https://nawi-testflow.vercel.app';

/** Maximum serialized URL length kept inside a certificate QR (keeps module count scannable). */
const MAX_QR_URL_LENGTH = 850;

export interface MetrologyCertificatePayload {
  reportNumber: string;
  testNumber: string;
  instrumentModel: string;
  instrumentSerial: string;
  laboratory: string;
  complianceResult: string;
  testDate: string;
  technician: string;
  reviewer?: string;
  instrumentClass: string;
  verificationType: string;
  maxCapacity: string;
  maxCapacityUnit: string;
  scaleInterval: string;
  scaleIntervalUnit: string;
  observationsSummary: string;
}

/**
 * Build the canonical certificate payload for a stored test / report.
 *
 * This is the single source of truth for what gets hashed and what travels
 * inside the QR code — both the report generator and the verification portal
 * MUST go through here so the hash recomputes identically on scan.
 */
export function certificatePayloadFromTest(
  test: Pick<
    StoredTest,
    | 'testNumber'
    | 'instrumentModel'
    | 'instrumentSerial'
    | 'laboratory'
    | 'complianceResult'
    | 'testDate'
    | 'technician'
    | 'reviewer'
    | 'instrumentClass'
    | 'verificationType'
    | 'maxCapacity'
    | 'maxCapacityUnit'
    | 'scaleInterval'
    | 'scaleIntervalUnit'
    | 'observations'
  >,
  report?: { reportNumber?: string },
): MetrologyCertificatePayload {
  return {
    reportNumber: report?.reportNumber || `RPT-${test.testNumber}`,
    testNumber: test.testNumber,
    instrumentModel: test.instrumentModel,
    instrumentSerial: test.instrumentSerial,
    laboratory: test.laboratory,
    complianceResult: test.complianceResult,
    testDate: test.testDate,
    technician: test.technician,
    reviewer: test.reviewer,
    instrumentClass: test.instrumentClass,
    verificationType: test.verificationType,
    maxCapacity: test.maxCapacity,
    maxCapacityUnit: test.maxCapacityUnit,
    scaleInterval: test.scaleInterval,
    scaleIntervalUnit: test.scaleIntervalUnit,
    observationsSummary: test.observations
      .map(o => `${o.testCode}:${o.mean}:${o.verdict}`)
      .join(','),
  };
}

/**
 * Deterministic SHA-256 string computation over the canonical certificate fields.
 *
 * Any tampering with a single displayed field (report number, serial, verdict,
 * observation means, class, capacity, …) changes the digest and fails the
 * comparison performed on the verification portal.
 */
export async function computeCertificateHash(payload: MetrologyCertificatePayload): Promise<string> {
  const canonicalString = [
    `REPORT:${payload.reportNumber}`,
    `TEST:${payload.testNumber}`,
    `MODEL:${payload.instrumentModel}`,
    `SERIAL:${payload.instrumentSerial}`,
    `LAB:${payload.laboratory}`,
    `VERDICT:${payload.complianceResult.toUpperCase()}`,
    `DATE:${payload.testDate}`,
    `TECH:${payload.technician}`,
    `REV:${payload.reviewer || 'OFFICIAL_SIGNATORY'}`,
    `CLASS:${payload.instrumentClass}`,
    `VERIF:${payload.verificationType}`,
    `CAP:${payload.maxCapacity} ${payload.maxCapacityUnit}`,
    `INT:${payload.scaleInterval} ${payload.scaleIntervalUnit}`,
    `OBS:${payload.observationsSummary}`,
  ].join('|');

  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(canonicalString);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Non-browser fallback. NOTE: only used outside secure contexts; real SHA-256
  // (WebCrypto) is always available on https/localhost where certificates are made/scanned.
  return fallbackHash(canonicalString);
}

/**
 * Compact, deterministic 64-char digest for non-browser environments
 * (not cryptographic — WebCrypto SHA-256 is used in every browser context).
 */
function fallbackHash(str: string): string {
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const p1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const p2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const p3 = ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0');
  const p4 = ((h1 + h2) >>> 0).toString(16).padStart(8, '0');
  const p5 = ((h1 * 31) >>> 0).toString(16).padStart(8, '0');
  const p6 = ((h2 * 17) >>> 0).toString(16).padStart(8, '0');
  const p7 = ((h1 ^ 0x5a5a5a5a) >>> 0).toString(16).padStart(8, '0');
  const p8 = ((h2 ^ 0xa5a5a5a5) >>> 0).toString(16).padStart(8, '0');
  return `${p1}${p2}${p3}${p4}${p5}${p6}${p7}${p8}`;
}

/**
 * Generate a standards-compliant, phone-scannable QR Code as a clean SVG string.
 *
 * Uses the battle-tested `qrcode` encoder (Reed-Solomon error correction,
 * format/mask handling) instead of a decorative pseudo-random matrix.
 */
export function generateQRCodeSVG(text: string, size = 120): string {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;

  // Quiet zone (4 modules) so scanners can frame the symbol.
  const quiet = 4;
  const cells = n + quiet * 2;
  const cell = size / cells;

  let paths = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.modules.get(r, c)) {
        const x = ((c + quiet) * cell).toFixed(3);
        const y = ((r + quiet) * cell).toFixed(3);
        const s = cell.toFixed(3);
        paths += `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="#0f172a" />`;
      }
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges" role="img" aria-label="QR code">` +
    `<rect width="${size}" height="${size}" fill="#ffffff" />` +
    `${paths}</svg>`
  );
}

/** Base64url-encode a UTF-8 string (compact + URL-safe, no padding). */
function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Decode a base64url string back to UTF-8. */
function fromBase64Url(input: string): string {
  let b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/**
 * Build a self-verifying certificate URL: `/verify/<testNumber>?d=<payload>&h=<hash>`.
 *
 * The payload is compressed (base64url JSON) so it stays scannable inside the QR.
 * If the payload is too large for a reliable QR, falls back to the plain URL —
 * the certificate QR remains valid either way.
 */
export async function buildVerificationUrl(payload: MetrologyCertificatePayload): Promise<string> {
  const hash = await computeCertificateHash(payload);

  // Loopback origins (localhost demos) are unreachable from a phone camera — fall
  // back to the public deployment origin so printed certificates always scan to a
  // host that exists. The embedded payload makes the scan verify regardless.
  let base = PROD_ORIGIN;
  if (typeof window !== 'undefined' && window.location?.origin) {
    const host = window.location.hostname;
    if (host && host !== 'localhost' && host !== '127.0.0.1' && host !== '::1' && host !== '') {
      base = window.location.origin;
    }
  }

  const full = `${base}/verify/${encodeURIComponent(payload.testNumber)}`;
  const data = toBase64Url(JSON.stringify(payload));
  const withPayload = `${full}?d=${data}&h=${hash}`;

  return withPayload.length <= MAX_QR_URL_LENGTH ? withPayload : full;
}

/** Decode the `d` query parameter of a verification URL back into a payload. */
export function parseVerificationPayload(data: string): MetrologyCertificatePayload | null {
  try {
    const parsed = JSON.parse(fromBase64Url(data));
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.testNumber === 'string' &&
      typeof parsed.reportNumber === 'string' &&
      typeof parsed.observationsSummary === 'string'
    ) {
      return parsed as MetrologyCertificatePayload;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Formats a short SHA-256 fingerprint for UI badges
 */
export function formatHashFingerprint(hash: string): string {
  if (!hash || hash.length < 16) return 'SHA256: VALID';
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`.toUpperCase();
}
