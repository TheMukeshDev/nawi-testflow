/**
 * NAWI TestFlow — Tester Dashboard
 *
 * Focuses on testing work.
 * Shows active tests, pending tests, recent activity.
 */

'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RouteGuard } from '@/components/auth/RouteGuard';
import Link from 'next/link';

export default function TesterDashboard() {
  return (
    <RouteGuard requiredRoles={['tester', 'admin']}>
      <DashboardLayout breadcrumbs={[{ label: 'Dashboard', current: true }]}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[18px] font-semibold text-gray-900">
            Testing Overview
          </h1>
          <Link
            href="/tests/new"
            className="px-4 py-2 bg-primary-600 text-white text-[13px] font-medium rounded hover:bg-primary-700 transition-colors"
          >
            New Test Report
          </Link>
        </div>

        {/* ── Metrics ── */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <MetricCard label="My Active Tests" value="2" color="primary" />
          <MetricCard label="Pending Tests" value="1" color="warning" />
          <MetricCard label="Submitted" value="3" color="info" />
          <MetricCard label="Completed" value="5" color="success" />
        </div>

        {/* ── Active Tests ── */}
        <div className="mb-6">
          <h2 className="text-[14px] font-semibold text-gray-900 mb-3">
            Active Tests
          </h2>
          <div className="bg-white border border-gray-200 rounded">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[12px] uppercase tracking-wide">
                    Test No.
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[12px] uppercase tracking-wide">
                    Instrument
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[12px] uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[12px] uppercase tracking-wide">
                    Last Updated
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[12px] uppercase tracking-wide">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-2 font-mono text-[12px]">TR-2026-001</td>
                  <td className="px-3 py-2">ABC-3000 (ABC-2026-EL-00412)</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold bg-primary-50 text-primary-700 border border-primary-200 rounded-sm">
                      <span className="w-[5px] h-[5px] rounded-full bg-primary-400" />
                      IN TESTING
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-500">2026-09-02</td>
                  <td className="px-3 py-2">
                    <button className="text-[12px] text-primary-600 hover:text-primary-700 font-medium">
                      Continue
                    </button>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-2 font-mono text-[12px]">TR-2026-002</td>
                  <td className="px-3 py-2">PWS Precision 220 (PWS-2025-PR-00089)</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200 rounded-sm">
                      DRAFT
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-500">2026-09-01</td>
                  <td className="px-3 py-2">
                    <button className="text-[12px] text-primary-600 hover:text-primary-700 font-medium">
                      Continue
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Recent Tests ── */}
        <div>
          <h2 className="text-[14px] font-semibold text-gray-900 mb-3">
            Recent Tests
          </h2>
          <div className="bg-white border border-gray-200 rounded p-4">
            <p className="text-[13px] text-gray-500">No recent tests</p>
          </div>
        </div>
      </DashboardLayout>
    </RouteGuard>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  const borderColors: Record<string, string> = {
    gray: 'border-t-gray-400',
    primary: 'border-t-primary-500',
    warning: 'border-t-warning-500',
    success: 'border-t-success-500',
    info: 'border-t-info-500',
  };

  return (
    <div className={`bg-white border border-gray-200 rounded border-t-2 ${borderColors[color]}`}>
      <div className="px-3 py-2.5">
        <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
          {label}
        </div>
        <div className="text-[22px] font-bold text-gray-900 leading-none">
          {value}
        </div>
      </div>
    </div>
  );
}
