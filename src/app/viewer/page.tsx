/**
 * NAWI TestFlow — Viewer Dashboard
 *
 * Simple dashboard for read-only access.
 * Allows searching and viewing permitted reports.
 */

'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RouteGuard } from '@/components/auth/RouteGuard';

export default function ViewerDashboard() {
  return (
    <RouteGuard requiredRoles={['viewer', 'admin']}>
      <DashboardLayout breadcrumbs={[{ label: 'Dashboard', current: true }]}>
        <h1 className="text-[18px] font-semibold text-gray-900 mb-4">
          Dashboard
        </h1>

        {/* ── Metrics ── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <MetricCard label="Total Reports" value="12" color="gray" />
          <MetricCard label="Completed" value="7" color="success" />
          <MetricCard label="Instruments" value="5" color="primary" />
        </div>

        {/* ── Quick Search ── */}
        <div className="mb-6">
          <h2 className="text-[14px] font-semibold text-gray-900 mb-3">
            Quick Search
          </h2>
          <div className="bg-white border border-gray-200 rounded p-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search by test number, serial number, report number..."
                className="flex-1 h-[36px] px-3 border border-gray-300 rounded text-[13px] text-gray-900 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-200"
              />
              <button className="px-4 h-[36px] bg-primary-600 text-white text-[13px] font-medium rounded hover:bg-primary-700 transition-colors">
                Search
              </button>
            </div>
          </div>
        </div>

        {/* ── Recent Reports ── */}
        <div>
          <h2 className="text-[14px] font-semibold text-gray-900 mb-3">
            Recent Reports
          </h2>
          <div className="bg-white border border-gray-200 rounded p-4">
            <p className="text-[13px] text-gray-500">No recent reports</p>
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
    success: 'border-t-success-500',
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
