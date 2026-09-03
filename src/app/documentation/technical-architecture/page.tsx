'use client';

import React from 'react';
import { DocLayout, DocSection as Section, DocSubSection as SubSection, DocTable as Table, Callout, CodeBlock } from '@/components/layout/DocLayout';

export default function TechnicalArchitecturePage() {
  return (
    <DocLayout title="Technical Architecture" subtitle="Complete technical documentation of the NAWI TestFlow system design, implementation, and deployment.">

      <Section id="system-overview" title="System Overview">
        <p>NAWI TestFlow is a web-based application for managing Non-Automatic Weighing Instrument (NAWI) test reports as per OIML Recommendation R-76. It provides a complete digital workflow from instrument registration through test observation, calculation, compliance evaluation, review, and report generation.</p>
        <Callout type="note" title="Architecture Principle">All regulatory calculations and compliance determinations are performed by deterministic backend engines. AI is optional assistance only and never determines compliance.</Callout>
      </Section>

      <Section id="system-architecture" title="System Architecture">
        <p>The system follows a layered architecture with clear separation of concerns:</p>
        <CodeBlock language="text">{`User
  |
Web Browser (Next.js Frontend)
  |
Authentication Layer (Supabase Auth)
  |
FastAPI Backend (Python)
  |
+------------------------------------------+
|           Business Services              |
|                                          |
|  Instrument Service  |  Test Service     |
|  Calculation Service |  Compliance Svc   |
|  Report Service      |  Repository Svc   |
|  Audit Service       |  Attachment Svc   |
+------------------------------------------+
  |
PostgreSQL / Supabase (Database + RLS)
  |
Supabase Storage (File Attachments)`}</CodeBlock>
        <Callout type="note" title="Key Principle">The frontend provides the user interface and client-side validation. The backend is the authoritative source for all business logic, calculations, compliance evaluation, and authorization decisions. Database-level RLS provides a final enforcement layer.</Callout>
      </Section>

      <Section id="technology-stack" title="Technology Stack">
        <Table headers={['Layer', 'Technology', 'Purpose']} rows={[
          ['Frontend Framework', 'Next.js 15 (React)', 'Server-side rendering, routing, static generation'],
          ['Language', 'TypeScript', 'Type safety across the frontend codebase'],
          ['Styling', 'Tailwind CSS', 'Utility-first styling with design tokens'],
          ['Backend Framework', 'FastAPI (Python)', 'REST API, async request handling, OpenAPI docs'],
          ['Backend Language', 'Python 3.10+', 'Calculation engine, compliance engine, report generation'],
          ['Database', 'PostgreSQL', 'Relational data storage with RLS'],
          ['Database Platform', 'Supabase', 'Managed PostgreSQL, auth, storage, real-time'],
          ['Authentication', 'Supabase Auth', 'JWT-based authentication with role support'],
          ['File Storage', 'Supabase Storage', 'Secure file uploads with access policies'],
          ['PDF Generation', 'ReportLab', 'Programmatic PDF report creation'],
          ['DOCX Generation', 'python-docx', 'Editable Word document generation'],
        ]} />
      </Section>

      <Section id="application-workflow" title="Application Workflow">
        <p>The core user workflow follows this sequence:</p>
        <CodeBlock language="text">{`Login
  |
Role Detection and Redirect
  |
Dashboard (role-specific)
  |
Create New Test Report
  |
  +-- Instrument Details
  +-- Laboratory Conditions
  +-- Test Equipment
  +-- Select Applicable Tests
  +-- Enter Observations
  +-- Validate Data
  +-- Calculate Results
  +-- Evaluate Compliance
  +-- Submit for Review
  +-- Review (Approve / Reject)
  +-- Generate Report (PDF / DOCX)
  +-- Finalize -> Repository`}</CodeBlock>
      </Section>

      <Section id="database-schema" title="Database Schema">
        <p>The database uses PostgreSQL with Row-Level Security (RLS). All tables use UUID primary keys and include standard metadata columns (created_at, updated_at, created_by).</p>
        <SubSection id="db-relationships" title="Core Entity Relationships">
          <CodeBlock language="text">{`Manufacturer --> Instrument --> Test Report
                                  |
                             Laboratory
                                  |
                           Test Conditions

Test Report --> Test Case --> Test Observation
                   |              |
             Test Result    Calculation Result
                   |
          Compliance Result

Test Report --> Attachment
Test Report --> Audit Log`}</CodeBlock>
        </SubSection>
        <SubSection title="Key Tables">
          <Table headers={['Table', 'Purpose', 'Key Relationships']} rows={[
            ['profiles', 'User accounts with roles', 'Linked to auth.users'],
            ['laboratories', 'Testing laboratory facilities', 'Referenced by instruments, reports'],
            ['manufacturers', 'Instrument manufacturers', 'Referenced by instruments'],
            ['instruments', 'Registered weighing instruments', 'Belongs to manufacturer, laboratory'],
            ['test_reports', 'Test report records', 'Links instrument, laboratory, tester'],
            ['test_conditions', 'Environmental conditions during testing', 'Belongs to test_report'],
            ['test_cases', 'Individual test cases (RPT, ECC, etc.)', 'Belongs to test_report'],
            ['test_observations', 'Raw measurement values', 'Belongs to test_case'],
            ['test_results', 'Calculated results and compliance', 'Belongs to test_case'],
            ['test_equipment', 'Calibration equipment records', 'Linked to laboratories'],
            ['attachments', 'File uploads', 'Linked to test_reports'],
            ['compliance_rules', 'Versioned regulatory rules', 'Referenced by test_results'],
            ['audit_logs', 'System activity tracking', 'References all entities'],
          ]} />
        </SubSection>
        <Callout type="info" title="Row-Level Security">All tables enforce RLS policies. Users can only access records within their permitted scope. Testers modify only their own drafts. Reviewers approve/reject within their laboratory. Viewers access only finalized reports.</Callout>
      </Section>

      <Section id="api-design" title="API Design">
        <p>The backend exposes a RESTful API under <code className="text-[12px] bg-gray-100 px-1 rounded">/api/v1/</code>. All endpoints require authentication (except <code className="text-[12px] bg-gray-100 px-1 rounded">/health</code>). Authorization is checked at the API layer and enforced at the database layer.</p>
        <SubSection title="API Groups">
          <Table headers={['Group', 'Prefix', 'Methods']} rows={[
            ['Health', '/health', 'GET'],
            ['Auth', '/api/v1/auth', 'POST (login, logout, refresh)'],
            ['Users', '/api/v1/users', 'GET, POST, PATCH, DELETE'],
            ['Instruments', '/api/v1/instruments', 'GET, POST, PATCH, DELETE'],
            ['Laboratories', '/api/v1/laboratories', 'GET, POST, PATCH'],
            ['Equipment', '/api/v1/equipment', 'GET, POST, PATCH, DELETE'],
            ['Test Reports', '/api/v1/reports', 'GET, POST, PATCH'],
            ['Test Cases', '/api/v1/tests', 'GET, POST, PATCH'],
            ['Observations', '/api/v1/observations', 'GET, POST, PATCH'],
            ['Calculations', '/api/v1/calculations', 'POST'],
            ['Compliance', '/api/v1/compliance', 'POST'],
            ['Attachments', '/api/v1/attachments', 'GET, POST, DELETE'],
            ['Repository', '/api/v1/repository', 'GET'],
            ['Admin', '/api/v1/admin', 'GET, POST (system operations)'],
            ['Audit', '/api/v1/audit', 'GET'],
          ]} />
        </SubSection>
        <SubSection title="Key Endpoint Examples">
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-sm p-3">
              <div className="flex items-center gap-2 mb-1"><span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-mono font-bold rounded">GET</span><code className="text-[12px] font-mono text-gray-900">/api/health</code></div>
              <p className="text-[12px] text-gray-600 mt-1">Returns system health status. No authentication required.</p>
            </div>
            <div className="border border-gray-200 rounded-sm p-3">
              <div className="flex items-center gap-2 mb-1"><span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-mono font-bold rounded">POST</span><code className="text-[12px] font-mono text-gray-900">/api/v1/reports</code></div>
              <p className="text-[12px] text-gray-600 mt-1">Create a new test report. Requires TESTER or ADMIN role.</p>
            </div>
            <div className="border border-gray-200 rounded-sm p-3">
              <div className="flex items-center gap-2 mb-1"><span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-mono font-bold rounded">POST</span><code className="text-[12px] font-mono text-gray-900">/api/v1/calculations</code></div>
              <p className="text-[12px] text-gray-600 mt-1">Execute calculation engine on test observations. Returns calculated values and validation results.</p>
            </div>
            <div className="border border-gray-200 rounded-sm p-3">
              <div className="flex items-center gap-2 mb-1"><span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-mono font-bold rounded">GET</span><code className="text-[12px] font-mono text-gray-900">/api/v1/repository</code></div>
              <p className="text-[12px] text-gray-600 mt-1">Search and filter the report repository. Supports multi-field search, date ranges, status filters.</p>
            </div>
          </div>
        </SubSection>
      </Section>

      <Section id="authentication" title="Authentication">
        <p>Authentication is handled by Supabase Auth. Users authenticate with email and password. On successful authentication, a JWT token is issued and stored client-side.</p>
        <CodeBlock language="text">{`Login Request
  |
Supabase Auth validates credentials
  |
JWT token issued
  |
Token stored (localStorage for mock, httpOnly cookie for production)
  |
Auth context initialized
  |
User profile fetched from database
  |
Role determined from profile
  |
Role-based redirect to dashboard`}</CodeBlock>
        <p>Session tokens are refreshed automatically. Sessions expire after inactivity. Logout clears the token and redirects to the login page.</p>
      </Section>

      <Section id="authorization" title="Authorization">
        <p>Authorization is enforced at three levels:</p>
        <ol className="list-decimal list-inside space-y-1 text-[13px] text-gray-700">
          <li><strong>Frontend</strong> — Route hiding and UI restrictions. This is for UX only and provides zero security.</li>
          <li><strong>Backend API</strong> — Every endpoint checks the user&apos;s role and permissions. Unauthorized requests return 403.</li>
          <li><strong>Database RLS</strong> — Row-Level Security policies ensure users can only access permitted data, even if the API layer is bypassed.</li>
        </ol>
        <Callout type="warning" title="Security Principle">Frontend route hiding is NOT security. A user who manually enters a URL may see the frontend page, but the backend API and database RLS will deny access to any data they are not authorized to view.</Callout>
      </Section>

      <Section id="calculation-engine" title="Calculation Engine">
        <p>The calculation engine is a standalone Python module that processes raw observations through validation, normalization, calculation, and result generation. It is completely independent of the UI.</p>
        <CodeBlock language="text">{`Raw Observation (user input)
  |
Input Validation (missing values, type checks)
  |
Range Validation (min/max, impossible values)
  |
Duplicate Detection (identical readings)
  |
Unit Normalization (convert to consistent units)
  |
Statistical Calculation (mean, std deviation, min, max)
  |
Result Generation`}</CodeBlock>
        <SubSection title="Calculation Properties">
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Deterministic</strong> — Same inputs always produce the same outputs.</li>
            <li><strong>Unit-aware</strong> — Handles unit conversions between g, kg, mg.</li>
            <li><strong>Validated</strong> — Missing, out-of-range, and impossible values are caught before calculation.</li>
            <li><strong>Reproducible</strong> — Calculation results are stored and can be re-verified at any time.</li>
            <li><strong>Independent</strong> — No AI or LLM is involved in regulatory calculations.</li>
          </ul>
        </SubSection>
      </Section>

      <Section id="compliance-engine" title="Compliance Engine">
        <p>The compliance engine evaluates calculated results against configured versioned rules to determine PASS, FAIL, or other statuses.</p>
        <CodeBlock language="text">{`Test Result (from Calculation Engine)
  |
Rule Resolver (find applicable rule by test code + instrument class)
  |
Limit/Criterion Extraction (from rule configuration)
  |
Evaluation (calculated_value vs. applicable_limit)
  |
Decision: PASS / FAIL / NOT_APPLICABLE / INCOMPLETE / RULE_NOT_CONFIGURED`}</CodeBlock>
        <SubSection title="Compliance Result Fields">
          <CodeBlock language="json">{`{
  "standard": "OIML R-76",
  "standard_version": "2009",
  "rule_id": "RPT-III-001",
  "rule_version": "v2009",
  "test_code": "RPT",
  "calculated_value": 0.0837,
  "applicable_limit": 0.5,
  "unit": "d",
  "decision": "PASS",
  "reason": "0.0837 d <= 0.5 d"
}`}</CodeBlock>
        </SubSection>
        <Callout type="warning" title="Rule Not Configured">If a required compliance rule does not exist for a given test code and instrument class, the system returns RULE_NOT_CONFIGURED. It never guesses or fabricates a regulatory value.</Callout>
      </Section>

      <Section id="explanation-ai" title="Explanation & AI Assistance (Two-Tier)">
        <p>Explanations are rule-first. Tier 1 is deterministic and always available; Tier 2 (Gemini) only rephrases on explicit user request.</p>
        <CodeBlock language="text">{`Compliance Decision (authoritative)
  |
Tier 1 — Rule-based explainer (engine/rule_explainer.py, zero AI cost)
  |  actual formula + observed vs allowed + margin/excess + why pass/fail
  |  endpoints: POST /ai/explain-rule, POST /ai/summarize-rule,
  |             GET /ai/process/{test_code}  (no key needed)
  |
Tier 2 — Gemini enhancement ("Enhance with AI" click only)
   |  prompt grounded in the resolved rule (ID, version, formula,
   |  values, immutable verdict) — never invents limits or verdicts
   |  requires: feature enabled AND API key in Settings`}</CodeBlock>
        <SubSection title="Key Gating">
          <Table headers={['Key', 'Scope', 'How']} rows={[
            ['Personal key', 'One user', 'Settings page (/settings) — browser-local, sent per-request'],
            ['Global key', 'All users', 'System Settings (/admin/settings) — admin only'],
            ['None', 'Everyone', 'Rule-based results only, with a pointer to Settings'],
          ]} />
        </SubSection>
        <Callout type="warning" title="AI Invariants">AI never calculates values, never determines PASS/FAIL, never invents OIML requirements, and never overrides engine results. Every AI output is labeled as assistance.</Callout>
      </Section>

      <Section id="report-engine" title="Report Generation Engine">
        <p>The report engine generates professional technical test reports in PDF and editable DOCX formats.</p>
        <CodeBlock language="text">{`Structured Test Data
  |
Report Template Selection
  |
Data Population (instrument, conditions, observations, results)
  |
PDF Generation (ReportLab) -- or -- DOCX Generation (python-docx)
  |
Report Storage
  |
Repository (searchable, downloadable)`}</CodeBlock>
        <SubSection title="Report Sections">
          <ul className="list-disc list-inside space-y-1">
            <li>Report Identification (number, date, standard, version)</li>
            <li>Laboratory Information</li>
            <li>Manufacturer Information</li>
            <li>Instrument Identification and Technical Specifications</li>
            <li>Test Conditions (temperature, humidity, pressure)</li>
            <li>Test Equipment Used</li>
            <li>Test Procedures and Observations</li>
            <li>Calculated Results</li>
            <li>Applicable Limits and Compliance Evaluation</li>
            <li>Remarks and Notes</li>
            <li>Attachment References</li>
            <li>Review and Approval Information</li>
          </ul>
        </SubSection>
        <Callout type="info" title="Reproducibility">Finalized reports create a snapshot. The exact data, rule version, and calculation results used at finalization are preserved. Historical reports are never silently modified.</Callout>
      </Section>

      <Section id="file-storage" title="File Storage">
        <p>File attachments (photographs, calibration certificates, supporting documents) are stored in Supabase Storage with access policies.</p>
        <Table headers={['Property', 'Implementation']} rows={[
          ['Storage Provider', 'Supabase Storage (S3-compatible)'],
          ['Access Control', 'RLS-based policies tied to user role and report status'],
          ['Supported Formats', 'JPG, PNG, PDF, DOCX'],
          ['Max File Size', '10 MB (configurable)'],
          ['Public URLs', 'Not exposed for sensitive report files'],
          ['Metadata', 'File name, type, size, checksum, upload timestamp, uploader'],
        ]} />
      </Section>

      <Section id="audit-trail" title="Audit Trail">
        <p>Every significant system action is recorded in the audit log. The audit trail is append-only and provides tamper-evident tracking of all changes.</p>
        <SubSection title="Tracked Events">
          <Table headers={['Event', 'Description']} rows={[
            ['REPORT_CREATED', 'A new test report was created'],
            ['REPORT_UPDATED', 'A test report was modified'],
            ['TEST_STARTED', 'Testing began on a report'],
            ['OBSERVATION_ADDED', 'A new observation was recorded'],
            ['OBSERVATION_UPDATED', 'An observation was modified'],
            ['CALCULATION_EXECUTED', 'Calculations were performed'],
            ['REPORT_SUBMITTED', 'Report submitted for review'],
            ['REPORT_APPROVED', 'Report approved by reviewer'],
            ['REPORT_REJECTED', 'Report rejected with comments'],
            ['REPORT_FINALIZED', 'Report finalized and archived'],
            ['REPORT_EXPORTED', 'PDF or DOCX report was generated'],
            ['ATTACHMENT_UPLOADED', 'File attachment uploaded'],
          ]} />
        </SubSection>
        <SubSection title="Audit Record Fields">
          <CodeBlock language="json">{`{
  "id": "uuid",
  "timestamp": "2026-09-02T14:30:00Z",
  "actor_id": "usr-002",
  "actor_name": "Priya Mehta",
  "actor_role": "tester",
  "action": "REPORT_SUBMITTED",
  "entity_type": "test_report",
  "entity_id": "TR-2026-001",
  "description": "Submitted test report TR-2026-001 for review",
  "ip_address": "192.168.1.45"
}`}</CodeBlock>
        </SubSection>
      </Section>

      <Section id="security-architecture" title="Security Architecture">
        <Table headers={['Layer', 'Mechanism', 'Details']} rows={[
          ['Authentication', 'Supabase Auth (JWT)', 'Email/password login with JWT tokens'],
          ['Frontend Auth', 'Auth Context + Route Guard', 'UI-level restrictions (UX only, not security)'],
          ['API Auth', 'JWT Validation Middleware', 'Every API endpoint validates the token'],
          ['API Authorization', 'Role-Based Access Control', 'Endpoints check user role against required roles'],
          ['Database Auth', 'Row-Level Security (RLS)', 'Policies enforce data access at the database level'],
          ['File Storage', 'Supabase Storage Policies', 'Access tied to user role and report status'],
          ['Session', 'Token Refresh + Expiry', 'Automatic refresh, inactivity timeout'],
          ['Audit', 'Append-Only Log', 'All significant actions tracked with actor, timestamp, entity'],
        ]} />
        <Callout type="warning" title="Critical Security Rule">The frontend service-role key (if any) must NEVER be exposed to the browser. All sensitive operations must go through the authenticated backend API.</Callout>
      </Section>

      <Section id="deployment-architecture" title="Deployment Architecture">
        <CodeBlock language="text">{`User Browser
  |
Vercel (CDN + Edge + Serverless)
  |
Next.js Frontend (React SSR / Static)
  |
FastAPI Backend (Vercel serverless, api.index:app)
  |
+-------------------------+
|  Supabase Platform      |
|  -- PostgreSQL Database  |
|  -- Auth Service        |
|  -- Storage Service     |
|  -- RLS Policies        |
+-------------------------+`}</CodeBlock>
        <SubSection title="Environment Variables">
          <Table headers={['Variable', 'Location', 'Purpose']} rows={[
            ['NEXT_PUBLIC_SUPABASE_URL', 'Frontend', 'Supabase project URL'],
            ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Frontend', 'Supabase anonymous (public) key'],
            ['NEXT_PUBLIC_API_URL', 'Frontend', 'Backend base URL (code appends /api/v1)'],
            ['SUPABASE_URL', 'Backend', 'Supabase project URL'],
            ['SUPABASE_SERVICE_ROLE_KEY', 'Backend only', 'Supabase admin key (never in frontend)'],
            ['DATABASE_URL', 'Backend only', 'Direct PostgreSQL connection string'],
            ['CORS_ORIGINS', 'Backend only', 'Comma-separated frontend origins (deployed URL must be listed)'],
            ['GEMINI_API_KEY', 'Backend only', 'Optional: enables on-demand Enhance with AI'],
            ['GEMINI_MODEL', 'Backend only', 'Optional: gemini-2.0-flash / 2.5-flash / 3.8-flash'],
            ['AI_ASSISTANCE_ENABLED', 'Backend only', 'Optional kill-switch (admin can also toggle in UI)'],
          ]} />
        </SubSection>
        <SubSection title="Production Considerations">
          <ul className="list-disc list-inside space-y-1">
            <li>Frontend and backend are deployed independently</li>
            <li>CORS is configured to allow only the frontend domain</li>
            <li>Environment variables are managed in the hosting platform, not in code</li>
            <li>HTTPS is enforced in production</li>
            <li>Database backups are handled by Supabase</li>
            <li>Service-role keys are never committed to Git</li>
          </ul>
        </SubSection>
      </Section>

      <Section id="future-extensibility" title="Future Extensibility">
        <p>The architecture supports the following future extensions:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>New OIML test types</strong> — Add to the test-definition layer and compliance rules without changing the UI framework</li>
          <li><strong>New rule versions</strong> — Add versioned rules; historical reports retain their original rule version</li>
          <li><strong>Digital signatures</strong> — The approval/signature architecture is in place; integrate a signing mechanism when available</li>
          <li><strong>Additional standards</strong> — The rule engine is standard-agnostic; additional OIML or national standards can be added</li>
          <li><strong>Offline mode</strong> — The frontend architecture supports future service worker integration</li>
          <li><strong>Multilingual</strong> — The UI component structure supports i18n layer addition</li>
          <li><strong>LIMS integration</strong> — The API layer can expose webhooks for external system integration</li>
        </ul>
      </Section>

    </DocLayout>
  );
}
