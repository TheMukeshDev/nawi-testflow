/**
 * NAWI Sahayak — About Page
 *
 * Provides information about the system.
 * Professional, technical documentation style.
 */

import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Header ── */}
      <header className="border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-6 h-[56px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-[28px] h-[28px] bg-primary-600 rounded flex items-center justify-center">
              <span className="text-white text-[11px] font-bold">NW</span>
            </div>
            <span className="text-[14px] font-semibold text-gray-900">
              NAWI Sahayak
            </span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/" className="text-[13px] text-gray-600 hover:text-gray-900">
              Home
            </Link>
            <Link
              href="/login"
              className="px-4 py-1.5 bg-primary-600 text-white text-[13px] font-medium rounded hover:bg-primary-700 transition-colors"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="max-w-[800px] mx-auto px-6 py-12">
        <h1 className="text-[24px] font-bold text-gray-900 mb-6">
          About NAWI Sahayak
        </h1>

        <section className="mb-8">
          <h2 className="text-[16px] font-semibold text-gray-900 mb-3">
            Purpose
          </h2>
          <p className="text-[14px] text-gray-700 leading-relaxed mb-4">
            NAWI Sahayak is a digital platform designed for testing laboratories
            that perform verification of Non-Automatic Weighing Instruments (NAWI)
            as per OIML Recommendation R-76.
          </p>
          <p className="text-[14px] text-gray-700 leading-relaxed">
            The system digitizes the entire test workflow from instrument registration
            through observation entry, calculation, compliance evaluation, and
            standardized report generation.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-[16px] font-semibold text-gray-900 mb-3">
            Key Capabilities
          </h2>
          <ul className="space-y-2 text-[14px] text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-gray-400 mt-0.5">-</span>
              Instrument registration and management
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400 mt-0.5">-</span>
              Structured test observation entry per OIML R-76 procedures
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400 mt-0.5">-</span>
              Deterministic calculation engine with configurable rules
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400 mt-0.5">-</span>
              Compliance evaluation against versioned regulatory rules
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400 mt-0.5">-</span>
              PDF and editable DOCX report generation
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400 mt-0.5">-</span>
              Complete audit trail for all actions
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400 mt-0.5">-</span>
              Role-based access control (Admin, Tester, Reviewer, Viewer)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400 mt-0.5">-</span>
              Instrument history and repository management
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-[16px] font-semibold text-gray-900 mb-3">
            Regulatory Standard
          </h2>
          <p className="text-[14px] text-gray-700 leading-relaxed">
            This application is designed to support testing procedures defined in
            OIML Recommendation R-76: Non-Automatic Weighing Instruments. The
            calculation engine and compliance rules are configurable and versioned
            to support future updates to the standard.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-[16px] font-semibold text-gray-900 mb-3">
            User Roles
          </h2>
          <p className="text-[14px] text-gray-700 leading-relaxed mb-3">
            The system supports four proposed user roles:
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded p-3">
              <h3 className="text-[13px] font-semibold text-gray-900">Admin</h3>
              <p className="text-[12px] text-gray-600">
                System administration, user management, laboratory configuration
              </p>
            </div>
            <div className="border border-gray-200 rounded p-3">
              <h3 className="text-[13px] font-semibold text-gray-900">Tester</h3>
              <p className="text-[12px] text-gray-600">
                Create tests, enter observations, run calculations
              </p>
            </div>
            <div className="border border-gray-200 rounded p-3">
              <h3 className="text-[13px] font-semibold text-gray-900">Reviewer</h3>
              <p className="text-[12px] text-gray-600">
                Review results, approve or reject reports
              </p>
            </div>
            <div className="border border-gray-200 rounded p-3">
              <h3 className="text-[13px] font-semibold text-gray-900">Viewer</h3>
              <p className="text-[12px] text-gray-600">
                View permitted reports, search repository
              </p>
            </div>
          </div>
          <p className="text-[12px] text-gray-500 mt-3">
            Note: These roles are proposed for this application and are not
            prescribed by the SIH Problem Statement.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-[16px] font-semibold text-gray-900 mb-3">
            Technology
          </h2>
          <ul className="space-y-1 text-[14px] text-gray-700">
            <li>Frontend: Next.js, React, TypeScript, Tailwind CSS</li>
            <li>Backend: FastAPI, Python</li>
            <li>Database: PostgreSQL (Supabase)</li>
            <li>Authentication: Supabase Auth</li>
            <li>Reports: ReportLab (PDF), python-docx (DOCX)</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
