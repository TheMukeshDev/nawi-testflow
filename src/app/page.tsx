/**
 * NAWI TestFlow — Public Home Page
 *
 * Professional landing page for the NAWI OIML R-76 Test Report Management System.
 * Responsive across all breakpoints. No gradients, no glassmorphism, no neon.
 * Clean, professional, laboratory-grade aesthetic.
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// ═══════════════════════════════════════════════════════════════
// NAVBAR
// ═══════════════════════════════════════════════════════════════

const NAV_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Features', href: '#features' },
  { label: 'Workflow', href: '#workflow' },
  { label: 'Documentation', href: '/documentation' },
];

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Track active section for nav highlighting
  useEffect(() => {
    const sectionIds = NAV_LINKS.map(l => l.href.replace('#', ''));
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );
    sectionIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    if (href.startsWith('/')) {
      window.location.href = href;
    } else {
      const id = href.replace('#', '');
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${scrolled ? 'bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm' : 'bg-white border-b border-gray-100'
          }`}
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-[56px] flex items-center justify-between">
          {/* Logo */}
          <a href="#home" onClick={(e) => { e.preventDefault(); handleNavClick('#home'); }} className="flex items-center gap-2.5 shrink-0">
            <div className="w-[32px] h-[32px] bg-[#1e3a5f] rounded-sm flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <line x1="12" y1="3" x2="12" y2="21" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <line x1="5" y1="21" x2="19" y2="21" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <line x1="3" y1="8" x2="21" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <path d="M3 8 L1 14 Q3 16 5 14 L3 8" stroke="white" strokeWidth="1.5" fill="none" />
                <path d="M21 8 L19 14 Q21 16 23 14 L21 8" stroke="white" strokeWidth="1.5" fill="none" />
                <polygon points="12,3 10.5,6 13.5,6" fill="white" />
              </svg>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[15px] font-bold text-[#1e3a5f] tracking-tight">NAWI</span>
              <span className="text-[9px] font-medium text-gray-500 tracking-widest uppercase">Test Report System</span>
            </div>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {NAV_LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => { e.preventDefault(); handleNavClick(link.href); }}
                className={`px-3 py-1.5 text-[13px] font-medium rounded-sm transition-colors ${activeSection === link.href.replace('#', '')
                    ? 'text-[#1e3a5f] bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 bg-[#1e3a5f] text-white text-[13px] font-medium rounded-sm hover:bg-[#162d4a] transition-colors"
            >
              Login
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 -mr-2 text-gray-600 hover:text-gray-900"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="5" y1="5" x2="17" y2="17" />
                <line x1="17" y1="5" x2="5" y2="17" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="19" y2="6" />
                <line x1="3" y1="11" x2="19" y2="11" />
                <line x1="3" y1="16" x2="19" y2="16" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/20" onClick={() => setMobileOpen(false)} />
          <nav className="absolute top-[56px] left-0 right-0 bg-white border-b border-gray-200 shadow-lg py-2 px-4" aria-label="Mobile navigation">
            {NAV_LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => { e.preventDefault(); handleNavClick(link.href); }}
                className={`block py-2.5 px-3 text-[14px] font-medium rounded-sm ${activeSection === link.href.replace('#', '')
                    ? 'text-[#1e3a5f] bg-blue-50'
                    : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                {link.label}
              </a>
            ))}
            <div className="border-t border-gray-100 mt-1 pt-2">
              <Link
                href="/login"
                className="block w-full py-2.5 px-3 text-center bg-[#1e3a5f] text-white text-[14px] font-medium rounded-sm"
              >
                Login
              </Link>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// HERO
// ═══════════════════════════════════════════════════════════════

function Hero() {
  return (
    <section id="home" className="pt-[56px]">
      <div className="bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-16 sm:py-20 md:py-28">
          <div className="max-w-[680px]">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-[#1e3a5f] text-[11px] font-medium rounded-sm mb-4 border border-blue-100">
              <span className="w-[5px] h-[5px] rounded-full bg-blue-400" />
              Smart India Hackathon 2026
            </div>
            <h1 className="text-[28px] sm:text-[36px] md:text-[42px] font-bold text-gray-900 leading-[1.15] tracking-tight mb-4">
              NAWI Test Report<br className="hidden sm:block" /> Management System
            </h1>
            <p className="text-[15px] sm:text-[16px] text-gray-600 leading-relaxed mb-8 max-w-[560px]">
              Digital testing, calculation and report management for Non-Automatic Weighing Instruments.
              Built on OIML Recommendation R 76 for laboratory-grade compliance testing.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center px-5 py-2.5 bg-[#1e3a5f] text-white text-[14px] font-medium rounded-sm hover:bg-[#162d4a] transition-colors"
              >
                Sign In
                <svg className="ml-2" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M1 7h12M8 2l5 5-5 5" />
                </svg>
              </Link>
              <a
                href="#workflow"
                onClick={(e) => { e.preventDefault(); document.getElementById('workflow')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="inline-flex items-center px-5 py-2.5 border border-gray-300 text-gray-700 text-[14px] font-medium rounded-sm hover:bg-gray-50 transition-colors"
              >
                Explore Workflow
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// ABOUT
// ═══════════════════════════════════════════════════════════════

function About() {
  return (
    <section id="about" className="py-16 sm:py-20 bg-white">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="max-w-[800px]">
          <h2 className="text-[22px] sm:text-[26px] font-bold text-gray-900 mb-4">About</h2>
          <div className="h-[2px] w-[48px] bg-[#1e3a5f] mb-6" />
          <p className="text-[14px] sm:text-[15px] text-gray-600 leading-relaxed mb-4">
            Non-Automatic Weighing Instruments (NAWI) require periodic testing and verification
            as per OIML Recommendation R 76. This process involves recording test observations,
            calculating permissible errors, evaluating compliance, and generating standardized
            test reports.
          </p>
          <p className="text-[14px] sm:text-[15px] text-gray-600 leading-relaxed">
            Traditionally, this workflow is managed through paper-based records and manual
            calculations. NAWI TestFlow digitizes the entire process — from instrument registration
            through test observation, automated calculation, compliance evaluation, review, and
            final report generation — while maintaining a complete audit trail and supporting
            future OIML recommendation updates.
          </p>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// FEATURES
// ═══════════════════════════════════════════════════════════════

const FEATURES = [
  {
    title: 'Digital Test Entry',
    desc: 'Record observations for repeatability, eccentricity, linearity, discrimination and stability tests with structured data entry forms.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1e3a5f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="2" width="14" height="16" rx="1" />
        <path d="M7 6h6M7 9.5h4M7 13h5" />
      </svg>
    ),
  },
  {
    title: 'Automated Calculations',
    desc: 'Python-based calculation engine computes mean, standard deviation, permissible errors, and test-point deviations deterministically.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1e3a5f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="14" height="14" rx="1" />
        <path d="M7 10h6M10 7v6" />
      </svg>
    ),
  },
  {
    title: 'Validation',
    desc: 'Multi-layer input validation checks required fields, numeric ranges, unit consistency, and detects impossible values before calculation.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1e3a5f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="7" />
        <path d="M7 10l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: 'Compliance Evaluation',
    desc: 'Deterministic compliance engine compares calculated values against versioned OIML R-76 rules. PASS, FAIL, or RULE_NOT_CONFIGURED — never guessed.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1e3a5f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z" />
      </svg>
    ),
  },
  {
    title: 'Report Generation',
    desc: 'Generate standardized PDF and editable DOCX test reports with full traceability, section headers, page numbers, and structured tables.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1e3a5f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 2h7l4 4v12a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" />
        <path d="M11 2v4h4" />
        <path d="M7 10h6M7 13h4" />
      </svg>
    ),
  },
  {
    title: 'Repository',
    desc: 'Searchable report repository with instrument-wise history, date filtering, and secure download of finalized reports.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1e3a5f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 4h14M3 8h14M3 12h10" />
        <path d="M16 10l2 2-2 2" />
      </svg>
    ),
  },
  {
    title: 'Instrument History',
    desc: 'Track every instrument across all tests, dates, results, and compliance outcomes in a single consolidated view.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1e3a5f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="7" />
        <path d="M10 5v5l3 3" />
      </svg>
    ),
  },
  {
    title: 'Secure Access',
    desc: 'Role-based access control with four distinct roles. Backend authorization, database RLS, and audit logging for every action.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1e3a5f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="9" width="12" height="9" rx="1" />
        <path d="M7 9V6a3 3 0 016 0v3" />
        <circle cx="10" cy="13" r="1" fill="#1e3a5f" />
      </svg>
    ),
  },
];

function Features() {
  return (
    <section id="features" className="py-16 sm:py-20 bg-slate-50">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <h2 className="text-[22px] sm:text-[26px] font-bold text-gray-900 mb-4">Features</h2>
        <div className="h-[2px] w-[48px] bg-[#1e3a5f] mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-white border border-gray-200 rounded-sm p-5 hover:border-gray-300 transition-colors">
              <div className="w-[36px] h-[36px] bg-blue-50 rounded-sm flex items-center justify-center mb-3">
                {f.icon}
              </div>
              <h3 className="text-[14px] font-semibold text-gray-900 mb-1.5">{f.title}</h3>
              <p className="text-[12px] text-gray-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// WORKFLOW
// ═══════════════════════════════════════════════════════════════

const WORKFLOW_STEPS = [
  { label: 'Instrument Data', desc: 'Register manufacturer and instrument details' },
  { label: 'Laboratory Conditions', desc: 'Record temperature, humidity, pressure' },
  { label: 'Test Observations', desc: 'Enter measurements per OIML R-76 procedures' },
  { label: 'Validation', desc: 'Verify data integrity and ranges' },
  { label: 'Calculation', desc: 'Compute mean, deviations, permissible errors' },
  { label: 'Compliance', desc: 'Evaluate against configured rules' },
  { label: 'Review', desc: 'Reviewer verifies observations and results' },
  { label: 'Report', desc: 'Generate PDF/DOCX and archive' },
];

function Workflow() {
  return (
    <section id="workflow" className="py-16 sm:py-20 bg-white">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <h2 className="text-[22px] sm:text-[26px] font-bold text-gray-900 mb-4">Workflow</h2>
        <div className="h-[2px] w-[48px] bg-[#1e3a5f] mb-8" />
        <p className="text-[14px] text-gray-600 mb-8 max-w-[600px]">
          The complete NAWI testing workflow, from instrument registration through standardized report generation.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {WORKFLOW_STEPS.map((step, i) => (
            <div key={step.label} className="flex items-start gap-3 bg-slate-50 border border-gray-200 rounded-sm p-4">
              <div className="flex items-center justify-center w-[28px] h-[28px] bg-[#1e3a5f] text-white text-[12px] font-bold rounded-sm shrink-0">
                {i + 1}
              </div>
              <div className="min-w-0">
                <h4 className="text-[13px] font-semibold text-gray-900">{step.label}</h4>
                <p className="text-[11px] text-gray-500 mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// REPORT PREVIEW
// ═══════════════════════════════════════════════════════════════

function ReportPreview() {
  return (
    <section id="report" className="py-16 sm:py-20 bg-slate-50">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <h2 className="text-[22px] sm:text-[26px] font-bold text-gray-900 mb-4">Report Preview</h2>
        <div className="h-[2px] w-[48px] bg-[#1e3a5f] mb-8" />
        <div className="bg-white border border-gray-200 rounded-sm overflow-hidden max-w-[720px] mx-auto shadow-sm">
          {/* Report header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-[24px] h-[24px] bg-[#1e3a5f] rounded-sm flex items-center justify-center">
                  <span className="text-white text-[8px] font-bold">NW</span>
                </div>
                <span className="text-[12px] font-semibold text-gray-900">NAWI TestFlow</span>
              </div>
              <span className="text-[11px] font-mono text-gray-500">TR-2026-001</span>
            </div>
            <h3 className="text-[14px] font-bold text-gray-900">
              Test Report — Non-Automatic Weighing Instrument
            </h3>
            <p className="text-[11px] text-gray-500 mt-1">
              As per OIML R 76 — Issued: 2026-01-15
            </p>
          </div>
          {/* Sample table */}
          <div className="px-6 py-4">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 font-semibold text-gray-700">Test</th>
                  <th className="text-right py-1.5 font-semibold text-gray-700">Observed</th>
                  <th className="text-right py-1.5 font-semibold text-gray-700">Limit</th>
                  <th className="text-right py-1.5 font-semibold text-gray-700">Result</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-100">
                  <td className="py-1.5">Repeatability (Max)</td>
                  <td className="py-1.5 text-right font-mono">0.08 d</td>
                  <td className="py-1.5 text-right font-mono">0.5 d</td>
                  <td className="py-1.5 text-right"><span className="text-green-700 font-medium">PASS</span></td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1.5">Eccentricity (Center)</td>
                  <td className="py-1.5 text-right font-mono">0.15 d</td>
                  <td className="py-1.5 text-right font-mono">1.0 d</td>
                  <td className="py-1.5 text-right"><span className="text-green-700 font-medium">PASS</span></td>
                </tr>
                <tr>
                  <td className="py-1.5">Linearity (0.5 Max)</td>
                  <td className="py-1.5 text-right font-mono">0.12 d</td>
                  <td className="py-1.5 text-right font-mono">0.5 d</td>
                  <td className="py-1.5 text-right"><span className="text-green-700 font-medium">PASS</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-3 bg-slate-50">
            <p className="text-[10px] text-gray-400 text-center">
              This is a sample report preview. Actual reports include full instrument details, conditions, and compliance evaluations.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENTATION
// ═══════════════════════════════════════════════════════════════

function Docs() {
  return (
    <section id="docs" className="py-16 sm:py-20 bg-white">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <h2 className="text-[22px] sm:text-[26px] font-bold text-gray-900 mb-4">Documentation</h2>
        <div className="h-[2px] w-[48px] bg-[#1e3a5f] mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { title: 'Technical Architecture', desc: 'System architecture, database schema, API design, and engine documentation.', href: '/documentation/technical-architecture' },
            { title: 'User Guide', desc: 'Step-by-step guide for testers, reviewers, administrators, and viewers.', href: '/documentation/user-guide' },
            { title: 'OIML R-76 Reference', desc: 'Test procedures, calculation methods, and compliance rule configuration.', href: '/documentation/oiml-r76-reference' },
          ].map(doc => (
            <Link key={doc.title} href={doc.href} className="block border border-gray-200 rounded-sm p-5 hover:border-[#1e3a5f] hover:shadow-sm transition-all group">
              <h3 className="text-[14px] font-semibold text-gray-900 mb-2 group-hover:text-[#1e3a5f]">{doc.title}</h3>
              <p className="text-[12px] text-gray-600 leading-relaxed mb-3">{doc.desc}</p>
              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#1e3a5f]">
                Read documentation
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2l4 4-4 4" /></svg>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════════════════════════

function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-slate-50">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-[24px] h-[24px] bg-[#1e3a5f] rounded-sm flex items-center justify-center">
                <span className="text-white text-[8px] font-bold">NW</span>
              </div>
              <span className="text-[13px] font-bold text-gray-900">NAWI TestFlow</span>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              OIML R-76 Test Report Management System for Non-Automatic Weighing Instruments.
            </p>
          </div>
          {/* Technology */}
          <div>
            <h4 className="text-[12px] font-semibold text-gray-900 mb-2">Technology</h4>
            <ul className="space-y-1 text-[11px] text-gray-500">
              <li>Next.js + TypeScript</li>
              <li>FastAPI + Python</li>
              <li>PostgreSQL / Supabase</li>
              <li>ReportLab / python-docx</li>
            </ul>
          </div>
          {/* Links */}
          <div>
            <h4 className="text-[12px] font-semibold text-gray-900 mb-2">Project</h4>
            <ul className="space-y-1 text-[11px] text-gray-500">
              <li><a href="#docs" className="hover:text-gray-700">Documentation</a></li>
              <li><a href="https://github.com/themukeshdev/navi-testflow" className="hover:text-gray-700">GitHub</a></li>
              <li><a href="#about" className="hover:text-gray-700">About</a></li>
            </ul>
          </div>
          {/* Contact */}
          <div>
            <h4 className="text-[12px] font-semibold text-gray-900 mb-2">Contact</h4>
            <ul className="space-y-1 text-[11px] text-gray-500">
              <li>Smart India Hackathon 2026</li>
              <li>Problem Statement 26035</li>
              <li>mukeshkumar916241@gmail.com</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-200 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-[11px] text-gray-400">
              &copy; 2026 NAWI TestFlow. Smart India Hackathon Project.
            </p>
            <p className="text-[10px] text-gray-400">
              This is a software prototype for SIH and must be validated against authoritative requirements before regulatory production use.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <About />
      <Features />
      <Workflow />
      <ReportPreview />
      <Docs />
      <Footer />
    </div>
  );
}
