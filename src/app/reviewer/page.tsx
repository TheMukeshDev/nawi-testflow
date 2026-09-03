/**
 * NAWI TestFlow — Reviewer Dashboard
 *
 * Focuses on pending verification.
 * Shows reports awaiting review, approval/rejection actions.
 */

'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RouteGuard } from '@/components/auth/RouteGuard';

export default function ReviewerDashboard() {
  return (
    <RouteGuard requiredRoles={['reviewer', 'admin']}>
      <DashboardLayout breadcrumbs={[{ label: 'Dashboard', current: true }]}>
        <h1 className="text-[18px] font-semibold text-gray-900 mb-4">
          Review Overview
        </h1>

        {/* ── Metrics ── */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <MetricCard label="Pending Review" value="3" color="warning" />
          <MetricCard label="Approved" value="5" color="success" />
          <MetricCard label="Rejected" value="1" color="danger" />
          <MetricCard label="Recently Reviewed" value="6" color="gray" />
        </div>

        {/* ── Reports Awaiting Review ── */}
        <div>
          <h2 className="text-[14px] font-semibold text-gray-900 mb-3">
            Reports Awaiting Review
          </h2>
          <div className="bg-white border border-gray-200 rounded">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[12px] uppercase tracking-wide">
                    Report No.
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[12px] uppercase tracking-wide">
                    Instrument
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[12px] uppercase tracking-wide">
                    Tester
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[12px] uppercase tracking-wide">
                    Submitted
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[12px] uppercase tracking-wide">
                    Result
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
                  <td className="px-3 py-2">Priya Mehta</td>
                  <td className="px-3 py-2 text-gray-500">2026-09-02</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold bg-success-50 text-success-700 border border-success-200 rounded-sm">
                      PASS
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <button className="text-[12px] text-primary-600 hover:text-primary-700 font-medium">
                      Review
                    </button>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-2 font-mono text-[12px]">TR-2026-004</td>
                  <td className="px-3 py-2">MetroScale 2000 (MST-2024-EL-00247)</td>
                  <td className="px-3 py-2">Rajesh Nair</td>
                  <td className="px-3 py-2 text-gray-500">2026-09-01</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold bg-danger-50 text-danger-700 border border-danger-200 rounded-sm">
                      FAIL
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <button className="text-[12px] text-primary-600 hover:text-primary-700 font-medium">
                      Review
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
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
    danger: 'border-t-danger-500',
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
