/**
 * NAWI TestFlow — Documentation Layout
 *
 * Provides sidebar navigation, breadcrumbs, search, and responsive mobile drawer
 * for the documentation center.
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface DocSection {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
}

const DOC_SECTIONS: DocSection[] = [
  { label: 'Overview', href: '/documentation' },
  {
    label: 'Technical Architecture',
    href: '/documentation/technical-architecture',
    children: [
      { label: 'System Architecture', href: '/documentation/technical-architecture#system-architecture' },
      { label: 'Technology Stack', href: '/documentation/technical-architecture#technology-stack' },
      { label: 'Database Schema', href: '/documentation/technical-architecture#database-schema' },
      { label: 'API Design', href: '/documentation/technical-architecture#api-design' },
      { label: 'Calculation Engine', href: '/documentation/technical-architecture#calculation-engine' },
      { label: 'Compliance Engine', href: '/documentation/technical-architecture#compliance-engine' },
      { label: 'Report Engine', href: '/documentation/technical-architecture#report-engine' },
      { label: 'Security', href: '/documentation/technical-architecture#security-architecture' },
      { label: 'Deployment', href: '/documentation/technical-architecture#deployment-architecture' },
    ],
  },
  {
    label: 'User Guide',
    href: '/documentation/user-guide',
    children: [
      { label: 'Tester Guide', href: '/documentation/user-guide#tester-guide' },
      { label: 'Reviewer Guide', href: '/documentation/user-guide#reviewer-guide' },
      { label: 'Administrator Guide', href: '/documentation/user-guide#administrator-guide' },
      { label: 'Viewer Guide', href: '/documentation/user-guide#viewer-guide' },
    ],
  },
  {
    label: 'OIML R-76 Reference',
    href: '/documentation/oiml-r76-reference',
    children: [
      { label: 'Test Procedures', href: '/documentation/oiml-r76-reference#test-procedures' },
      { label: 'Calculations', href: '/documentation/oiml-r76-reference#calculation-methodology' },
      { label: 'Compliance Rules', href: '/documentation/oiml-r76-reference#compliance-rule-configuration' },
      { label: 'Rule Versioning', href: '/documentation/oiml-r76-reference#rule-versioning' },
    ],
  },
];

interface SearchEntry {
  title: string;
  section: string;
  href: string;
  keywords: string[];
}

const SEARCH_INDEX: SearchEntry[] = [
  { title: 'System Architecture', section: 'Technical Architecture', href: '/documentation/technical-architecture#system-architecture', keywords: ['architecture', 'system', 'diagram', 'components'] },
  { title: 'Technology Stack', section: 'Technical Architecture', href: '/documentation/technical-architecture#technology-stack', keywords: ['next.js', 'fastapi', 'python', 'typescript', 'react', 'tailwind'] },
  { title: 'Database Schema', section: 'Technical Architecture', href: '/documentation/technical-architecture#database-schema', keywords: ['database', 'tables', 'schema', 'postgresql', 'supabase', 'rls'] },
  { title: 'API Design', section: 'Technical Architecture', href: '/documentation/technical-architecture#api-design', keywords: ['api', 'endpoints', 'rest', 'fastapi', 'routes'] },
  { title: 'Calculation Engine', section: 'Technical Architecture', href: '/documentation/technical-architecture#calculation-engine', keywords: ['calculation', 'engine', 'mean', 'standard deviation', 'formula'] },
  { title: 'Compliance Engine', section: 'Technical Architecture', href: '/documentation/technical-architecture#compliance-engine', keywords: ['compliance', 'pass', 'fail', 'rules', 'evaluation'] },
  { title: 'Report Engine', section: 'Technical Architecture', href: '/documentation/technical-architecture#report-engine', keywords: ['report', 'pdf', 'docx', 'generation', 'export'] },
  { title: 'Security Architecture', section: 'Technical Architecture', href: '/documentation/technical-architecture#security-architecture', keywords: ['security', 'authentication', 'authorization', 'rls', 'session'] },
  { title: 'Deployment', section: 'Technical Architecture', href: '/documentation/technical-architecture#deployment-architecture', keywords: ['deployment', 'vercel', 'render', 'supabase', 'production'] },
  { title: 'Authentication', section: 'Technical Architecture', href: '/documentation/technical-architecture#authentication', keywords: ['auth', 'login', 'jwt', 'supabase auth', 'session'] },
  { title: 'Audit Trail', section: 'Technical Architecture', href: '/documentation/technical-architecture#audit-trail', keywords: ['audit', 'logging', 'tracking', 'events'] },
  { title: 'File Storage', section: 'Technical Architecture', href: '/documentation/technical-architecture#file-storage', keywords: ['storage', 'attachments', 'upload', 'files'] },
  { title: 'Tester Guide', section: 'User Guide', href: '/documentation/user-guide#tester-guide', keywords: ['tester', 'create test', 'observations', 'submit', 'sample data'] },
  { title: 'Reviewer Guide', section: 'User Guide', href: '/documentation/user-guide#reviewer-guide', keywords: ['reviewer', 'review', 'approve', 'reject'] },
  { title: 'Administrator Guide', section: 'User Guide', href: '/documentation/user-guide#administrator-guide', keywords: ['admin', 'users', 'settings', 'demo data', 'laboratories'] },
  { title: 'Viewer Guide', section: 'User Guide', href: '/documentation/user-guide#viewer-guide', keywords: ['viewer', 'search', 'view', 'download', 'repository'] },
  { title: 'Test Procedures', section: 'OIML R-76 Reference', href: '/documentation/oiml-r76-reference#test-procedures', keywords: ['repeatability', 'eccentricity', 'linearity', 'discrimination', 'stability', 'test'] },
  { title: 'Calculation Methodology', section: 'OIML R-76 Reference', href: '/documentation/oiml-r76-reference#calculation-methodology', keywords: ['calculation', 'methodology', 'formula', 'mean', 'stddev'] },
  { title: 'Compliance Rule Configuration', section: 'OIML R-76 Reference', href: '/documentation/oiml-r76-reference#compliance-rule-configuration', keywords: ['rules', 'limits', 'pass', 'fail', 'config'] },
  { title: 'Rule Versioning', section: 'OIML R-76 Reference', href: '/documentation/oiml-r76-reference#rule-versioning', keywords: ['version', 'versioning', 'historical', 'immutable'] },
];

const PAGE_ORDER = [
  '/documentation',
  '/documentation/technical-architecture',
  '/documentation/user-guide',
  '/documentation/oiml-r76-reference',
];

function labelFor(p: string) {
  const seg = p.split('/').pop() || '';
  return seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/Oiml r 76/g, 'OIML R-76');
}

export function DocLayout({ children, title, subtitle }: { children: React.ReactNode; title?: string; subtitle?: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const cleanPath = pathname.split('#')[0];
  const activeSection = cleanPath;

  const searchResults = searchQuery.length >= 2
    ? SEARCH_INDEX.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()) || e.keywords.some(k => k.includes(searchQuery.toLowerCase()))).slice(0, 8)
    : [];

  const idx = PAGE_ORDER.indexOf(cleanPath);
  const prevPage = idx > 0 ? PAGE_ORDER[idx - 1] : null;
  const nextPage = idx < PAGE_ORDER.length - 1 ? PAGE_ORDER[idx + 1] : null;

  const segments = cleanPath.split('/').filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];
  let acc = '';
  segments.forEach(seg => {
    acc += '/' + seg;
    crumbs.push({ label: seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/Oiml r 76/g, 'OIML R-76'), href: acc });
  });

  const navClick = (href: string) => {
    setMobileOpen(false);
    if (href.startsWith('/')) {
      window.location.href = href;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-[48px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="flex items-center justify-center w-[24px] h-[24px] bg-[#1e3a5f] rounded-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <line x1="12" y1="3" x2="12" y2="21" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="5" y1="21" x2="19" y2="21" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="3" y1="8" x2="21" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="text-[13px] font-semibold text-gray-900 hidden sm:inline">NAWI TestFlow</span>
            </Link>
            <span className="text-gray-300 hidden sm:inline">|</span>
            <span className="text-[12px] text-gray-500 hidden sm:inline">Documentation</span>
          </div>
          <div className="relative flex-1 max-w-[280px]">
            <div className="flex items-center h-[34px] border border-gray-300 rounded-sm bg-white px-2 gap-2 focus-within:border-[#1e3a5f] focus-within:ring-1 focus-within:ring-blue-200">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400 shrink-0">
                <circle cx="6" cy="6" r="4.5" /><path d="M9.5 9.5L13 13" strokeLinecap="round" />
              </svg>
              <input type="text" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} placeholder="Search documentation..." className="flex-1 text-[12px] text-gray-900 bg-transparent focus:outline-none placeholder:text-gray-400" />
              {searchQuery && <button onClick={() => { setSearchQuery(''); setSearchOpen(false); }} className="text-gray-400 hover:text-gray-600"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3l6 6M9 3l-6 6" /></svg></button>}
            </div>
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-sm shadow-lg z-50 max-h-[300px] overflow-y-auto">
                {searchResults.map((r, i) => (
                  <a key={i} href={r.href} onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="block px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                    <div className="text-[12px] font-medium text-gray-900">{r.title}</div>
                    <div className="text-[11px] text-gray-500">{r.section}</div>
                  </a>
                ))}
              </div>
            )}
            {searchOpen && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-sm shadow-lg z-50 px-3 py-4 text-center text-[12px] text-gray-400">
                No results found
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[12px] text-gray-500 hover:text-gray-700 hidden sm:inline">Home</Link>
            <Link href="/login" className="text-[12px] text-gray-500 hover:text-gray-700 hidden sm:inline">Login</Link>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-1 text-gray-600 hover:text-gray-900" aria-label="Toggle navigation">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h14M3 10h14M3 14h14" strokeLinecap="round" /></svg>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto flex">
        {mobileOpen && (
          <div className="fixed inset-0 z-30 lg:hidden">
            <div className="absolute inset-0 bg-black/20" onClick={() => setMobileOpen(false)} />
            <div className="absolute left-0 top-[48px] bottom-0 w-[260px] bg-white border-r border-gray-200 p-4 overflow-y-auto">
              <SidebarNav active={activeSection} onNav={navClick} />
            </div>
          </div>
        )}
        <aside className="hidden lg:block w-[220px] shrink-0 border-r border-gray-200 min-h-[calc(100vh-48px)] p-4 sticky top-[48px] self-start">
          <SidebarNav active={activeSection} onNav={navClick} />
        </aside>
        <main className="flex-1 min-w-0 px-4 sm:px-8 py-6 max-w-[900px]">
          <nav className="flex items-center gap-1 text-[12px] text-gray-500 mb-4" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-gray-700">Home</Link>
            {crumbs.map((c, i) => (
              <React.Fragment key={c.href}>
                <span>/</span>
                {i === crumbs.length - 1 ? <span className="text-gray-900 font-medium">{c.label}</span> : <Link href={c.href} className="hover:text-gray-700">{c.label}</Link>}
              </React.Fragment>
            ))}
          </nav>
          {title && <div className="mb-6"><h1 className="text-[22px] font-bold text-gray-900 leading-tight">{title}</h1>{subtitle && <p className="text-[13px] text-gray-500 mt-1 leading-relaxed">{subtitle}</p>}</div>}
          {children}
          {(prevPage || nextPage) && (
            <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-200">
              {prevPage ? <a href={prevPage} className="flex items-center gap-2 text-[13px] text-gray-600 hover:text-[#1e3a5f]"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 3L5 7l4 4" /></svg>{labelFor(prevPage)}</a> : <div />}
              {nextPage ? <a href={nextPage} className="flex items-center gap-2 text-[13px] text-gray-600 hover:text-[#1e3a5f]">{labelFor(nextPage)}<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 3l4 4-4 4" /></svg></a> : <div />}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function SidebarNav({ active, onNav }: { active: string; onNav: (href: string) => void }) {
  return (
    <nav className="w-full" aria-label="Documentation navigation">
      {DOC_SECTIONS.map(section => {
        const isActive = active === section.href;
        return (
          <div key={section.href} className="mb-3">
            <a href={section.href} onClick={e => { e.preventDefault(); onNav(section.href); }} className={`block px-3 py-1.5 text-[13px] font-semibold rounded-sm transition-colors ${isActive ? 'bg-[#1e3a5f] text-white' : 'text-gray-700 hover:bg-gray-100'}`}>{section.label}</a>
            {section.children && isActive && (
              <div className="ml-3 mt-1 space-y-0.5 border-l border-gray-200 pl-3">
                {section.children.map(child => <a key={child.href} href={child.href} onClick={e => { e.preventDefault(); onNav(child.href); }} className="block py-1 text-[12px] text-gray-600 hover:text-[#1e3a5f] transition-colors">{child.label}</a>)}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/* Shared doc helpers */

export function Callout({ type = 'info', title, children }: { type?: 'info' | 'warning' | 'danger' | 'note'; title?: string; children: React.ReactNode }) {
  const styles: Record<string, string> = { info: 'bg-blue-50 border-blue-200 text-blue-800', warning: 'bg-amber-50 border-amber-200 text-amber-800', danger: 'bg-red-50 border-red-200 text-red-800', note: 'bg-gray-50 border-gray-200 text-gray-700' };
  return <div className={`p-4 border rounded-sm my-4 text-[12px] leading-relaxed ${styles[type]}`}>{title && <div className="font-semibold mb-1">{title}</div>}{children}</div>;
}

export function CodeBlock({ children, language = '' }: { children: string; language?: string }) {
  return <div className="my-4">{language && <div className="text-[10px] font-mono text-gray-500 bg-gray-100 px-3 py-1 rounded-t-sm border border-b-0 border-gray-200">{language}</div>}<pre className={`bg-gray-900 text-gray-100 p-4 text-[12px] font-mono overflow-x-auto leading-relaxed ${language ? 'rounded-b-sm' : 'rounded-sm'}`}><code>{children}</code></pre></div>;
}

export function DocSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return <section id={id} className="mb-10 scroll-mt-20"><h2 className="text-[18px] font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200">{title}</h2><div className="text-[13px] text-gray-700 leading-relaxed space-y-3">{children}</div></section>;
}

export function DocSubSection({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return <div className="mb-6"><h3 id={id} className="text-[14px] font-semibold text-gray-900 mb-2 scroll-mt-20">{title}</h3><div className="text-[13px] text-gray-700 leading-relaxed space-y-2">{children}</div></div>;
}

export function DocTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return <div className="overflow-x-auto my-3"><table className="w-full text-[12px] border border-gray-200"><thead><tr className="bg-gray-50">{headers.map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i} className="border-b border-gray-100 last:border-0">{row.map((cell, j) => <td key={j} className="px-3 py-2 text-gray-700">{cell}</td>)}</tr>)}</tbody></table></div>;
}
