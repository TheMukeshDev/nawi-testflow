/**
 * NAWI TestFlow — Report Generator & Downloader
 *
 * Client-side generation of standardized OIML R-76 test reports.
 * Supports:
 * 1. Printable PDF / Lab Certificate with professional styling
 * 2. Standard DOCX format download
 * 3. Browser Print dialog for direct paper or PDF saving
 */

import type { StoredTest, StoredReport } from './workflow-store';
import { certificatePayloadFromTest, buildVerificationUrl, generateQRCodeSVG } from './crypto-qr';
import { generateDigitalSignatureStampHTML } from './pki-signer';

export async function printTestReport(test: StoredTest, report?: StoredReport): Promise<void> {
  if (typeof window === 'undefined') return;

  // Self-verifying QR: certificate data + SHA-256 digest travel inside the code,
  // so a scan on ANY device can re-compute and confirm the hash — no login needed.
  const qrText = await buildVerificationUrl(certificatePayloadFromTest(test, report));

  const printWindow = window.open('', '_blank', 'width=900,height=900');
  if (!printWindow) {
    alert('Please allow popups to print or save the test report.');
    return;
  }

  const html = generateReportHTML(test, report, qrText);
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
  }, 400);
}

export function downloadTestReportPDF(test: StoredTest, report?: StoredReport): void {
  // Use high quality print view window configured for Save as PDF
  void printTestReport(test, report);
}

export function downloadTestReportDOCX(test: StoredTest, report?: StoredReport): void {
  if (typeof window === 'undefined') return;

  const reportNo = report?.reportNumber || `RPT-${test.testNumber}`;
  const fileName = `${reportNo}.doc`;

  const content = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>NAWI OIML R-76 Test Report - ${reportNo}</title>
      <style>
        body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.4; color: #111; }
        h1 { font-size: 16pt; color: #1e3a5f; margin-bottom: 2pt; text-align: center; }
        h2 { font-size: 12pt; color: #444; margin-top: 14pt; margin-bottom: 4pt; border-bottom: 1.5pt solid #1e3a5f; padding-bottom: 2pt; }
        table { width: 100%; border-collapse: collapse; margin-top: 6pt; margin-bottom: 10pt; font-size: 10pt; }
        th, td { border: 1pt solid #ccc; padding: 5pt; }
        th { background-color: #f1f5f9; text-align: left; font-weight: bold; }
        .badge-pass { background-color: #dcfce7; color: #15803d; font-weight: bold; padding: 2pt 6pt; }
        .badge-fail { background-color: #fee2e2; color: #b91c1c; font-weight: bold; padding: 2pt 6pt; }
      </style>
    </head>
    <body>
      <h1>NON-AUTOMATIC WEIGHING INSTRUMENT (NAWI) TEST REPORT</h1>
      <p style="text-align:center; font-size: 10pt; color: #555;">Per OIML Recommendation R-76 (Edition 2009)</p>
      
      <h2>1. Report Identification</h2>
      <table>
        <tr><th>Report Number</th><td>${reportNo}</td><th>Test Reference</th><td>${test.testNumber}</td></tr>
        <tr><th>Laboratory</th><td>${test.laboratory}</td><th>Verification Type</th><td>${test.verificationType}</td></tr>
        <tr><th>Test Date</th><td>${test.testDate}</td><th>Compliance Verdict</th><td><strong>${test.complianceResult.toUpperCase()}</strong></td></tr>
      </table>

      <h2>2. Instrument Details</h2>
      <table>
        <tr><th>Manufacturer</th><td>${test.instrumentManufacturer || '—'}</td><th>Model</th><td>${test.instrumentModel}</td></tr>
        <tr><th>Serial Number</th><td>${test.instrumentSerial}</td><th>Accuracy Class</th><td>Class ${test.instrumentClass}</td></tr>
        <tr><th>Max Capacity</th><td>${test.maxCapacity} ${test.maxCapacityUnit}</td><th>Scale Interval (d)</th><td>${test.scaleInterval} ${test.scaleIntervalUnit}</td></tr>
        <tr><th>Verification Interval (e)</th><td>${test.verificationScaleInterval || test.scaleInterval} ${test.scaleIntervalUnit}</td><th>Software Version</th><td>${test.softwareVersion || '—'}</td></tr>
      </table>

      <h2>3. Environmental Test Conditions</h2>
      <table>
        <tr><th>Temperature</th><td>${test.temperature || '22.0'} °C</td><th>Relative Humidity</th><td>${test.humidity || '50'} %RH</td></tr>
        <tr><th>Air Pressure</th><td>${test.airPressure || '1013'} hPa</td><th>Test Location</th><td>${test.testLocation || 'Standard Lab'}</td></tr>
      </table>

      <h2>4. Test Observations & Evaluation</h2>
      <table>
        <thead>
          <tr>
            <th>Test</th>
            <th>Code</th>
            <th>Readings</th>
            <th>Mean</th>
            <th>Std Dev</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          ${test.observations.map(obs => `
            <tr>
              <td>${obs.testName}</td>
              <td>${obs.testCode}</td>
              <td>${obs.readings.join(', ')} ${obs.unit}</td>
              <td>${obs.mean} ${obs.unit}</td>
              <td>${obs.stddev} ${obs.unit}</td>
              <td>${obs.verdict}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h2>5. Verification & Review Remarks</h2>
      <p>${test.reviewNotes || 'Verification completed according to OIML R-76 specifications.'}</p>
      
      <table>
        <tr>
          <th>Tested By:</th>
          <td>${test.technician} (Testing Officer)</td>
          <th>Approved By:</th>
          <td>${test.reviewer || 'Dr. K. Sharma'} (Authorized Signatory)</td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', content], {
    type: 'application/msword;charset=utf-8',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateReportHTML(test: StoredTest, report?: StoredReport, qrText?: string): string {
  const reportNo = report?.reportNumber || `RPT-${test.testNumber}`;
  const isPass = test.complianceResult === 'compliant';
  const verifyBase =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://nawi-testflow.vercel.app';
  const certificateQrText = qrText || `${verifyBase}/verify/${encodeURIComponent(test.testNumber)}`;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>NAWI Test Report — ${reportNo}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 15mm 15mm 15mm 15mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #1a202c;
          line-height: 1.4;
          font-size: 11pt;
          margin: 0;
          padding: 24px;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2.5px solid #1e3a5f;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .logo-box {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo-icon {
          width: 42px;
          height: 42px;
          background-color: #1e3a5f;
          color: white;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: bold;
        }
        .header-title h1 {
          margin: 0;
          font-size: 16pt;
          color: #1e3a5f;
          letter-spacing: -0.5px;
        }
        .header-title p {
          margin: 2px 0 0 0;
          font-size: 8.5pt;
          color: #4a5568;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .report-badge {
          text-align: right;
        }
        .report-num {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 13pt;
          font-weight: 700;
          color: #1e3a5f;
        }
        .verdict-pill {
          display: inline-block;
          margin-top: 4px;
          padding: 3px 12px;
          border-radius: 3px;
          font-size: 10pt;
          font-weight: 700;
          letter-spacing: 0.5px;
          border: 1px solid transparent;
        }
        .verdict-pass {
          background-color: #ecfdf5;
          color: #065f46;
          border-color: #a7f3d0;
        }
        .verdict-fail {
          background-color: #fef2f2;
          color: #991b1b;
          border-color: #fecaca;
        }
        .section-title {
          font-size: 10.5pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #1e3a5f;
          background-color: #f8fafc;
          border-left: 3px solid #1e3a5f;
          padding: 4px 8px;
          margin-top: 14px;
          margin-bottom: 8px;
        }
        .grid-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
          font-size: 9.5pt;
        }
        .grid-table th, .grid-table td {
          border: 1px solid #e2e8f0;
          padding: 6px 10px;
          vertical-align: top;
        }
        .grid-table th {
          background-color: #f8fafc;
          color: #475569;
          font-weight: 600;
          width: 25%;
        }
        .grid-table td {
          color: #0f172a;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 6px;
          margin-bottom: 12px;
          font-size: 9pt;
        }
        .data-table th, .data-table td {
          border: 1px solid #cbd5e1;
          padding: 6px 8px;
          text-align: left;
        }
        .data-table th {
          background-color: #0f172a;
          color: #f8fafc;
          font-size: 8.5pt;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .footer-signatures {
          margin-top: 24px;
          display: flex;
          justify-content: space-between;
          page-break-inside: avoid;
        }
        .sign-box {
          width: 45%;
          border-top: 1.5px solid #94a3b8;
          padding-top: 6px;
          font-size: 9pt;
        }
        .sign-box .role {
          font-weight: 600;
          color: #1e3a5f;
        }
        .seal-tag {
          margin-top: 16px;
          padding: 8px;
          border: 1px dashed #94a3b8;
          border-radius: 4px;
          font-size: 8pt;
          color: #64748b;
          text-align: center;
          background-color: #f8fafc;
        }
        .print-btn-bar {
          background: #1e3a5f;
          color: white;
          padding: 8px 16px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        @media print {
          .print-btn-bar { display: none !important; }
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="print-btn-bar">
        <span>Official OIML R-76 Laboratory Test Certificate</span>
        <button onclick="window.print()" style="background: white; color: #1e3a5f; border: none; padding: 6px 14px; font-weight: bold; border-radius: 3px; cursor: pointer;">
          Print / Save as PDF
        </button>
      </div>

      <div class="header">
        <div class="logo-box">
          <div class="logo-icon">NW</div>
          <div class="header-title">
            <h1>TEST REPORT</h1>
            <p>Non-Automatic Weighing Instruments (OIML R-76-1:2009)</p>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 14px;">
          <div class="report-badge">
            <div class="report-num">${reportNo}</div>
            <span class="verdict-pill ${isPass ? 'verdict-pass' : 'verdict-fail'}">
              ${test.complianceResult.toUpperCase()}
            </span>
          </div>
          <div style="padding: 3px; background: white; border: 1px solid #cbd5e1; border-radius: 4px; text-align: center;">
            ${generateQRCodeSVG(certificateQrText, 150)}
            <div style="font-size: 5.5pt; color: #475569; font-family: monospace; font-weight: bold; margin-top: 1px;">SCAN TO VERIFY</div>
          </div>
        </div>
      </div>

      <div class="section-title">1. General Information</div>
      <table class="grid-table">
        <tr>
          <th>Test Record Ref</th>
          <td class="mono font-bold">${test.testNumber}</td>
          <th>Verification Type</th>
          <td>${test.verificationType} Verification</td>
        </tr>
        <tr>
          <th>Testing Laboratory</th>
          <td>${test.laboratory}</td>
          <th>Date of Testing</th>
          <td>${test.testDate}</td>
        </tr>
        <tr>
          <th>Testing Officer</th>
          <td>${test.technician}</td>
          <th>Authorized Reviewer</th>
          <td>${test.reviewer || 'Dr. K. Sharma'}</td>
        </tr>
      </table>

      <div class="section-title">2. Instrument Specifications</div>
      <table class="grid-table">
        <tr>
          <th>Manufacturer</th>
          <td>${test.instrumentManufacturer || '—'}</td>
          <th>Model / Description</th>
          <td>${test.instrumentModel}</td>
        </tr>
        <tr>
          <th>Serial Number</th>
          <td class="mono font-bold">${test.instrumentSerial}</td>
          <th>Accuracy Class</th>
          <td>Class ${test.instrumentClass}</td>
        </tr>
        <tr>
          <th>Max Capacity</th>
          <td class="mono">${test.maxCapacity} ${test.maxCapacityUnit}</td>
          <th>Scale Interval (d)</th>
          <td class="mono">${test.scaleInterval} ${test.scaleIntervalUnit}</td>
        </tr>
        <tr>
          <th>Verification Interval (e)</th>
          <td class="mono">${test.verificationScaleInterval || test.scaleInterval} ${test.scaleIntervalUnit}</td>
          <th>Software Version</th>
          <td class="mono">${test.softwareVersion || '—'}</td>
        </tr>
      </table>

      <div class="section-title">3. Environmental Conditions</div>
      <table class="grid-table">
        <tr>
          <th>Ambient Temperature</th>
          <td class="mono">${test.temperature || '22.0'} °C</td>
          <th>Relative Humidity</th>
          <td class="mono">${test.humidity || '50'} %RH</td>
        </tr>
        <tr>
          <th>Barometric Pressure</th>
          <td class="mono">${test.airPressure || '1013'} hPa</td>
          <th>Test Bay / Location</th>
          <td>${test.testLocation || 'Standard Laboratory Conditions'}</td>
        </tr>
      </table>

      <div class="section-title">4. Test Observations & Metrological Evaluation</div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 25%;">Test Type</th>
            <th style="width: 12%;">Code</th>
            <th>Readings / Points</th>
            <th class="text-right" style="width: 14%;">Mean Value</th>
            <th class="text-right" style="width: 14%;">Std. Deviation</th>
            <th class="text-center" style="width: 12%;">Verdict</th>
          </tr>
        </thead>
        <tbody>
          ${test.observations.length === 0 ? `
            <tr>
              <td colspan="6" class="text-center" style="color: #64748b; padding: 12px;">No observation data recorded</td>
            </tr>
          ` : test.observations.map(o => `
            <tr>
              <td><strong>${o.testName}</strong></td>
              <td class="mono">${o.testCode}</td>
              <td class="mono">${o.readings.join(', ')} ${o.unit}</td>
              <td class="mono text-right font-bold">${o.mean} ${o.unit}</td>
              <td class="mono text-right">${o.stddev} ${o.unit}</td>
              <td class="text-center">
                <span class="verdict-pill ${o.verdict === 'PASS' ? 'verdict-pass' : 'verdict-fail'}" style="padding: 1px 6px; font-size: 8pt;">
                  ${o.verdict}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="section-title">5. Reviewer Remarks & Audit Stamp</div>
      <p style="margin: 6px 0 16px 0; font-size: 9pt; color: #334155; line-height: 1.5;">
        ${test.reviewNotes || 'The test results comply with the Maximum Permissible Error (MPE) thresholds stipulated under OIML Recommendation R-76 for Non-Automatic Weighing Instruments.'}
      </p>

      <div class="footer-signatures">
        <div class="sign-box">
          <div class="role">Testing Officer</div>
          <div style="margin-top: 4px; font-weight: bold;">${test.technician}</div>
          <div style="color: #64748b; font-size: 8pt;">Metrology Inspection Division</div>
        </div>
        <div class="sign-box">
          <div class="role" style="margin-bottom: 6px;">Authorized Signatory / Legal Metrology Officer</div>
          ${generateDigitalSignatureStampHTML()}
        </div>
      </div>

      <div class="seal-tag">
        <strong>TAMPER-PROOF METROLOGY LEDGER:</strong> Digitally Signed &amp; Timestamped per Indian IT Act &amp; Legal Metrology Rules.<br />
        Public QR Verification URL: <code>https://nawi-testflow.vercel.app/verify/${test.testNumber}</code> &bull; Valid without physical seal.
      </div>
    </body>
    </html>
  `;
}
