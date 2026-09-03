/**
 * NAWI TestFlow — User Guide
 *
 * Role-based user instructions for operating the system.
 * Covers Tester, Reviewer, Administrator, and Viewer workflows.
 */

'use client';

import React, { useState } from 'react';
import { DocLayout, Callout, CodeBlock } from '@/components/layout/DocLayout';

// ============================================================================
// HELPERS
// ============================================================================

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-20">
      <h2 className="text-[18px] font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200">{title}</h2>
      <div className="text-[13px] text-gray-700 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

function SubSection({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 id={id} className="text-[14px] font-semibold text-gray-900 mb-2 scroll-mt-20">{title}</h3>
      <div className="text-[13px] text-gray-700 leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

function StepList({ steps }: { steps: { title: string; detail: string }[] }) {
  return (
    <ol className="space-y-3 my-3">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3">
          <div className="flex items-center justify-center w-[22px] h-[22px] bg-[#1e3a5f] text-white text-[11px] font-bold rounded-full shrink-0 mt-0.5">
            {i + 1}
          </div>
          <div>
            <div className="text-[13px] font-semibold text-gray-900">{step.title}</div>
            <div className="text-[12px] text-gray-600 mt-0.5">{step.detail}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-[12px] border border-gray-200">
        <thead>
          <tr className="bg-gray-50">
            {headers.map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 last:border-0">
              {row.map((cell, j) => <td key={j} className="px-3 py-2 text-gray-700">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// ROLE TABS
// ============================================================================

const ROLES = [
  { key: 'tester', label: 'Tester' },
  { key: 'reviewer', label: 'Reviewer' },
  { key: 'admin', label: 'Administrator' },
  { key: 'viewer', label: 'Viewer' },
] as const;

type RoleKey = typeof ROLES[number]['key'];

// ============================================================================
// PAGE
// ============================================================================

export default function UserGuidePage() {
  const [activeRole, setActiveRole] = useState<RoleKey>('tester');

  return (
    <DocLayout
      title="User Guide"
      subtitle="Step-by-step instructions for operating the NAWI TestFlow system. Select your role below."
    >
      {/* ── Role Tabs ── */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {ROLES.map(role => (
          <button
            key={role.key}
            onClick={() => setActiveRole(role.key)}
            className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors -mb-[1px] ${
              activeRole === role.key
                ? 'border-[#1e3a5f] text-[#1e3a5f]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {role.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TESTER GUIDE
          ══════════════════════════════════════════════════════════════════ */}
      {activeRole === 'tester' && (
        <Section id="tester-guide" title="Tester Guide">
          <p>
            The Tester is responsible for creating test reports, entering instrument details,
            recording observations, running calculations, and submitting reports for review.
          </p>

          <SubSection title="Demo Credentials">
            <Table
              headers={['Field', 'Value']}
              rows={[
                ['Email', 'tester@nawi-demo.local'],
                ['Password', 'Tester@123'],
                ['Role', 'Tester'],
              ]}
            />
          </SubSection>

          <SubSection title="Login and Dashboard">
            <StepList steps={[
              { title: 'Open the application', detail: 'Navigate to the application URL. You will see the landing page.' },
              { title: 'Click Sign In', detail: 'Navigate to the login page.' },
              { title: 'Enter credentials', detail: 'Enter tester@nawi-demo.local and Tester@123, or click the Tester demo button to auto-fill.' },
              { title: 'Click Sign In', detail: 'After authentication, you will see "Signed In Successfully" with your role displayed.' },
              { title: 'Click Go to Dashboard', detail: 'You will be redirected to the Tester Dashboard showing your testing overview.' },
            ]} />
          </SubSection>

          <SubSection title="Create New Test Report">
            <StepList steps={[
              { title: 'Click New Test Report', detail: 'From the dashboard or sidebar, click "New Test Report" or "New Test" to start the wizard.' },
              { title: 'Fill Instrument Details (Step 1)', detail: 'Enter manufacturer, model, serial number, instrument type, class, capacity, and scale interval. All measurement fields show their units.' },
              { title: 'Fill Laboratory Conditions (Step 2)', detail: 'Record temperature (°C), humidity (%RH), atmospheric pressure (hPa), laboratory name, test location, and test date.' },
              { title: 'Select Applicable Tests (Step 3)', detail: 'Check the OIML R-76 tests to perform: Repeatability (RPT), Eccentricity (ECC), Linearity (LIN), Discrimination (DIS), Stability (STB).' },
              { title: 'Enter Observations (Step 4)', detail: 'For each selected test, enter the measured values. Each reading field has its unit displayed. Add notes for each test.' },
              { title: 'Calculate & Review (Step 5)', detail: 'The system automatically calculates mean and standard deviation for each test. Review the calculated results and PASS/FAIL status.' },
              { title: 'Read rule-based explanations (Step 5)', detail: 'Each result shows Why this result: the actual formula, observed vs allowed values, margin, and why it passed or failed. This needs no API key.' },
              { title: 'Enhance with AI (optional)', detail: 'Click Enhance with AI for a plain-language rephrasing. Works only after you add a Gemini key in Settings; the verdict never changes.' },
              { title: 'Review Summary (Step 6)', detail: 'Review the complete test record — instrument, conditions, and results — before submission.' },
              { title: 'Submit for Review', detail: 'Click "Submit for Review" to send the report to a reviewer. The status changes to PENDING_REVIEW.' },
            ]} />
          </SubSection>

          <SubSection title="Fill Sample Data (Demo Feature)">
            <p>
              For demonstrations, click the <strong>"Fill Sample Data"</strong> button at the top of the
              New Test wizard. This auto-populates all fields with realistic fictional data:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Instrument: ABC-3000 Electronic Balance (ABC-2026-EL-00412)</li>
              <li>Laboratory: Central Metrology Testing Lab, Room 204</li>
              <li>Tests: Repeatability and Eccentricity with 5 readings each</li>
              <li>Environmental conditions: 22.5°C, 48%RH, 1013 hPa</li>
            </ul>
            <p>You can modify any values before submitting. Click <strong>"Clear Data"</strong> to reset all fields.</p>
          </SubSection>

          <SubSection title="Test Status Lifecycle">
            <CodeBlock language="text">DRAFT → IN_TESTING → PENDING_REVIEW → APPROVED → FINAL
                                        ↓
                                   REJECTED → IN_TESTING (resubmit after corrections)</CodeBlock>
            <p>You can save a draft at any step and continue later. Track your report status in the dashboard.</p>
          </SubSection>
        </Section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          REVIEWER GUIDE
          ══════════════════════════════════════════════════════════════════ */}
      {activeRole === 'reviewer' && (
        <Section id="reviewer-guide" title="Reviewer Guide">
          <p>
            The Reviewer is responsible for reviewing submitted test reports, verifying observations
            and calculations, and approving or rejecting reports with comments.
          </p>

          <SubSection title="Demo Credentials">
            <Table
              headers={['Field', 'Value']}
              rows={[
                ['Email', 'reviewer@nawi-demo.local'],
                ['Password', 'Reviewer@123'],
                ['Role', 'Reviewer'],
              ]}
            />
          </SubSection>

          <SubSection title="Login and Dashboard">
            <StepList steps={[
              { title: 'Open the application', detail: 'Navigate to the application URL.' },
              { title: 'Click Sign In and enter credentials', detail: 'Use reviewer@nawi-demo.local / Reviewer@123, or click the Reviewer demo button.' },
              { title: 'Access the Reviewer Dashboard', detail: 'The dashboard shows pending reviews, approved reports, rejected reports, and recently reviewed items.' },
            ]} />
          </SubSection>

          <SubSection title="Review a Report">
            <StepList steps={[
              { title: 'Find pending reports', detail: 'In the "Reports Awaiting Review" table on the dashboard, or navigate to test reports filtered by PENDING_REVIEW status.' },
              { title: 'Click Review on a report', detail: 'Open the report to see the full test record.' },
              { title: 'Review Instrument Details', detail: 'Verify the manufacturer, model, serial number, class, capacity, and scale interval.' },
              { title: 'Review Observations', detail: 'Check each test observation. Verify the measured values are reasonable and complete.' },
              { title: 'Review Calculations', detail: 'Verify the calculated mean, standard deviation, and test-specific calculations.' },
              { title: 'Review Compliance', detail: 'Check the compliance evaluation — PASS or FAIL — and verify the applicable rule reference.' },
              { title: 'Approve or Reject', detail: 'If the report is correct, click Approve. If issues are found, click Reject with a required comment explaining what needs to be corrected.' },
            ]} />
          </SubSection>

          <SubSection title="Rejection Requirements">
            <Callout type="warning" title="Rejection Requires a Comment">
              When rejecting a report, you must provide a reason. The tester will see your comment
              and can correct the issues before resubmitting. Rejected reports return to IN_TESTING status.
            </Callout>
          </SubSection>

          <SubSection title="Report Status Transitions">
            <Table
              headers={['Action', 'From Status', 'To Status', 'Who Can Do This']}
              rows={[
                ['Submit for Review', 'IN_TESTING', 'PENDING_REVIEW', 'Tester'],
                ['Approve', 'PENDING_REVIEW', 'APPROVED', 'Reviewer'],
                ['Reject', 'PENDING_REVIEW', 'REJECTED', 'Reviewer'],
                ['Resubmit (after corrections)', 'REJECTED', 'IN_TESTING', 'Tester'],
                ['Finalize', 'APPROVED', 'FINAL', 'Reviewer or Admin'],
              ]}
            />
          </SubSection>
        </Section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ADMINISTRATOR GUIDE
          ══════════════════════════════════════════════════════════════════ */}
      {activeRole === 'admin' && (
        <Section id="administrator-guide" title="Administrator Guide">
          <p>
            The Administrator has full access to all system features including user management,
            laboratory configuration, system settings, and audit logs.
          </p>

          <SubSection title="Demo Credentials">
            <Table
              headers={['Field', 'Value']}
              rows={[
                ['Email', 'admin@nawi-demo.local'],
                ['Password', 'Admin@123'],
                ['Role', 'Administrator'],
              ]}
            />
          </SubSection>

          <SubSection title="Admin Dashboard">
            <p>The admin dashboard shows system-level metrics:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Total Reports, In Progress, Pending Review, Completed</li>
              <li>Quick Actions: Manage Users, Laboratories, Settings</li>
              <li>Recent Activity feed</li>
            </ul>
          </SubSection>

          <SubSection id="admin-users" title="User Management">
            <p>Navigate to <strong>Users</strong> in the sidebar to manage application users.</p>
            <StepList steps={[
              { title: 'View all users', detail: 'The users table shows name, email, role, laboratory, status, and last login.' },
              { title: 'Search users', detail: 'Filter by name or email using the search field.' },
              { title: 'Filter by role', detail: 'Use the role dropdown to filter users by Administrator, Tester, Reviewer, or Viewer.' },
              { title: 'Edit user', detail: 'Click Edit to modify a user\'s role or laboratory assignment.' },
              { title: 'Activate/Deactivate', detail: 'Deactivate a user to prevent login without deleting their account.' },
              { title: 'Configure AI assistance (global)', detail: 'In System Settings, enable Gemini, pick the model, and paste the global API key. This enables Enhance with AI for all users.' },
              { title: 'Edit system settings', detail: 'Admins can also edit upload size, session timeout, and report prefix directly in System Settings.' },
            ]} />
          </SubSection>

          <SubSection id="admin-labs" title="Laboratory Management">
            <p>Navigate to <strong>Laboratory</strong> to view and manage testing laboratory facilities. The laboratory page shows each lab's code, name, city, accreditation, instrument count, and active tests.</p>
          </SubSection>

          <SubSection id="admin-audit" title="Audit Log">
            <p>Navigate to <strong>Audit Log</strong> in the sidebar to view all system activity.</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Every significant action is logged: report creation, submission, approval, rejection, calculations, logins</li>
              <li>Filter by action type using the dropdown</li>
              <li>Search by actor name, description, or entity ID</li>
              <li>Each entry shows timestamp, actor, role, action, entity, description, and IP address</li>
            </ul>
          </SubSection>

          <SubSection id="admin-settings" title="System Settings">
            <p>Navigate to <strong>Settings</strong> to view and manage system configuration.</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>System Configuration</strong> — Application version, default standard (OIML R-76), active rule version, upload limits, session timeout</li>
              <li><strong>OIML Rule Versions</strong> — View active and available rule versions. Finalized reports retain their rule version permanently.</li>
              <li><strong>Demo Data Management</strong> — Seed, Clear, or Reset demonstration data for mentor presentations</li>
              <li><strong>Environment</strong> — View frontend, backend, database, and auth technology versions</li>
            </ul>
          </SubSection>

          <SubSection id="admin-demo" title="Demo Data Management">
            <Callout type="note" title="Demo Data">
              The "Fill Sample Data" button in the test wizard populates realistic fictional data for demonstrations.
              In the Settings page, administrators can seed, clear, or reset demo data. All demo records are marked
              with is_demo=true and never affect production data.
            </Callout>
          </SubSection>
        </Section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          VIEWER GUIDE
          ══════════════════════════════════════════════════════════════════ */}
      {activeRole === 'viewer' && (
        <Section id="viewer-guide" title="Viewer Guide">
          <p>
            The Viewer has read-only access to the system. Viewers can search and view
            permitted finalized reports and instrument history.
          </p>

          <SubSection title="Demo Credentials">
            <Table
              headers={['Field', 'Value']}
              rows={[
                ['Email', 'viewer@nawi-demo.local'],
                ['Password', 'Viewer@123'],
                ['Role', 'Viewer'],
              ]}
            />
          </SubSection>

          <SubSection title="What Viewers Can Do">
            <ul className="list-disc list-inside space-y-1">
              <li>Search and view finalized reports in the Repository</li>
              <li>View instrument details and test history</li>
              <li>Download permitted finalized reports (PDF/DOCX)</li>
              <li>View the Dashboard with read-only metrics</li>
            </ul>
          </SubSection>

          <SubSection title="What Viewers Cannot Do">
            <Callout type="warning" title="Access Restrictions">
              Viewers cannot create test reports, enter observations, upload attachments,
              approve or reject reports, modify any data, or access admin functions.
              All of these operations are blocked at the frontend, backend API, and database RLS levels.
            </Callout>
          </SubSection>

          <SubSection title="Search and View Reports">
            <StepList steps={[
              { title: 'Navigate to Repository', detail: 'Click "Repository" in the sidebar.' },
              { title: 'Search', detail: 'Enter a test number, serial number, model, or manufacturer name in the search field.' },
              { title: 'Filter', detail: 'Use the type filter (Tests, Instruments, Reports) and laboratory filter to narrow results.' },
              { title: 'Open a report', detail: 'Click on any row to view the full report details.' },
              { title: 'Download', detail: 'For finalized reports, click the download button to get the PDF or DOCX file.' },
            ]} />
          </SubSection>

          <SubSection title="View Instrument History">
            <p>
              Navigate to <strong>Instruments</strong> to see all registered instruments.
              Click on any instrument to view its full specifications and a history of all test reports
              linked to that instrument.
            </p>
          </SubSection>
        </Section>
      )}
    </DocLayout>
  );
}
