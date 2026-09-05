/**
 * NAWI Sahayak — Documentation Center
 *
 * Landing page for the documentation center with three major sections:
 * Technical Architecture, User Guide, OIML R-76 Reference.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { DocLayout } from '@/components/layout/DocLayout';

interface DocCard {
  title: string;
  description: string;
  href: string;
  items: string[];
}

const CARDS: DocCard[] = [
  {
    title: 'Technical Architecture',
    description: 'Understand how the system works internally — from the frontend through the backend services to the database.',
    href: '/documentation/technical-architecture',
    items: [
      'System Architecture',
      'Technology Stack',
      'Database Schema',
      'API Design',
      'Calculation Engine',
      'Compliance Engine',
      'Report Engine',
      'Security Architecture',
      'Deployment',
    ],
  },
  {
    title: 'User Guide',
    description: 'Learn how each type of user operates the system — step by step instructions for every role.',
    href: '/documentation/user-guide',
    items: [
      'Tester Guide',
      'Reviewer Guide',
      'Administrator Guide',
      'Viewer Guide',
      'Report Workflow',
      'Repository',
    ],
  },
  {
    title: 'OIML R-76 Reference',
    description: 'Reference information on how test procedures, calculations and compliance rules are represented in the application.',
    href: '/documentation/oiml-r76-reference',
    items: [
      'Test Procedures',
      'Test Inputs',
      'Calculations',
      'Compliance Evaluation',
      'Rule Configuration',
      'Rule Versioning',
    ],
  },
];

export default function DocumentationPage() {
  return (
    <DocLayout
      title="Documentation Center"
      subtitle="Technical architecture, application workflows, user instructions and OIML R-76 reference information for the NAWI Test Report Management System."
    >
      <div className="space-y-4">
        {CARDS.map(card => (
          <div key={card.title} className="border border-gray-200 rounded-sm p-5 hover:border-gray-300 transition-colors">
            <h2 className="text-[16px] font-bold text-gray-900 mb-1">{card.title}</h2>
            <p className="text-[13px] text-gray-600 mb-4 leading-relaxed">{card.description}</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-4">
              {card.items.map(item => (
                <div key={item} className="flex items-center gap-1.5 text-[12px] text-gray-500">
                  <span className="w-1 h-1 bg-gray-300 rounded-full shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            <Link
              href={card.href}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1e3a5f] text-white text-[12px] font-medium rounded-sm hover:bg-[#162d4a] transition-colors"
            >
              View {card.title}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2l4 4-4 4" /></svg>
            </Link>
          </div>
        ))}
      </div>

      {/* Quick Start */}
      <div className="mt-8 border-t border-gray-200 pt-6">
        <h2 className="text-[14px] font-bold text-gray-900 mb-3">Quick Start</h2>
        <div className="bg-gray-50 border border-gray-200 rounded-sm p-4 text-[12px] text-gray-700 leading-relaxed space-y-2">
          <p><strong>1.</strong> Read the <Link href="/documentation/technical-architecture" className="text-[#1e3a5f] hover:underline font-medium">Technical Architecture</Link> to understand the system design.</p>
          <p><strong>2.</strong> Follow the <Link href="/documentation/user-guide" className="text-[#1e3a5f] hover:underline font-medium">User Guide</Link> for your specific role.</p>
          <p><strong>3.</strong> Refer to the <Link href="/documentation/oiml-r76-reference" className="text-[#1e3a5f] hover:underline font-medium">OIML R-76 Reference</Link> for test procedure and calculation details.</p>
          <p><strong>4.</strong> Try the application using the <Link href="/login" className="text-[#1e3a5f] hover:underline font-medium">demo credentials</Link> and the Fill Sample Data feature.</p>
        </div>
      </div>

      {/* Version Info */}
      <div className="mt-6 text-[11px] text-gray-400">
        Documentation for NAWI Sahayak v0.1.0-mvp. All information reflects the current MVP implementation.
      </div>
    </DocLayout>
  );
}
