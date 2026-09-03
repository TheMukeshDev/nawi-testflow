/**
 * NAWI TestFlow — Admin Dashboard
 *
 * System overview for administrators.
 * Shows total reports, system metrics, recent activity.
 */

'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RouteGuard } from '@/components/auth/RouteGuard';

export default function AdminDashboard() {
  return (
    <RouteGuard requiredRoles={['admin']}>
      <DashboardLayout breadcrumbs={[{ label: 'Dashboard', current: true }]}>
        <h1 className="text-[18px] font-semibold text-gray-900 mb-4">
          System Overview
        </h1>

        {/* ── Metrics ── */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <MetricCard label="Total Reports" value="12" color="gray" />
          <MetricCard label="In Progress" value="3" color="primary" />
          <MetricCard label="Pending Review" value="2" color="warning" />
          <MetricCard label="Completed" value="7" color="success" />
        </div>

        {/* ── Quick Actions ── */}
        <div className="mb-6">
          <h2 className="text-[14px] font-semibold text-gray-900 mb-3">
            Quick Actions
          </h2>
          <div className="flex gap-2">
            <a href="/admin/users" className="px-3 py-1.5 border border-gray-300 rounded text-[12px] font-medium text-gray-700 hover:bg-gray-50">
              Manage Users
            </a>
            <a href="/laboratories" className="px-3 py-1.5 border border-gray-300 rounded text-[12px] font-medium text-gray-700 hover:bg-gray-50">
              Laboratories
            </a>
            <a href="/admin/settings" className="px-3 py-1.5 border border-gray-300 rounded text-[12px] font-medium text-gray-700 hover:bg-gray-50">
              Settings
            </a>
          </div>
        </div>

        {/* ── Recent Activity ── */}
        <div>
          <h2 className="text-[14px] font-semibold text-gray-900 mb-3">
            Recent Activity
          </h2>
          <div className="bg-white border border-gray-200 rounded p-4">
            <p className="text-[13px] text-gray-500">No recent activity</p>
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
