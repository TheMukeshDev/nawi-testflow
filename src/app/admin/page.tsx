/**
 * NAWI TestFlow — Admin Dashboard
 *
 * System overview for administrators.
 * Shows total reports, system metrics, recent activity.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { useAuth } from '@/lib/auth-context';
import { supabaseDb } from '@/lib/supabase-db';
import { MetricCard } from '@/components/ui/MetricCard';
import { SectionHeader } from '@/components/ui/SectionHeader';

interface AdminMetrics {
  totalReports: number;
  inProgress: number;
  pendingReview: number;
  completed: number;
  totalInstruments: number;
  totalEquipment: number;
  totalUsers: number;
  activeUsers: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = React.useState<AdminMetrics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [recentUsers, setRecentUsers] = React.useState<any[]>([]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [users, instruments, labs, equipment, reports] = await Promise.all([
          supabaseDb.getUsers(),
          supabaseDb.getInstruments(),
          supabaseDb.getLaboratories(),
          supabaseDb.getEquipment(),
          supabaseDb.getTestReports(),
        ]);
        if (!mounted) return;
        const reportStatus = (r: any) => (r.status || '').toLowerCase();
        setMetrics({
          totalReports: reports.length,
          inProgress: reports.filter(r => reportStatus(r) === 'in-testing' || reportStatus(r) === 'draft').length,
          pendingReview: reports.filter(r => reportStatus(r) === 'pending-review').length,
          completed: reports.filter(r => ['completed', 'approved'].includes(reportStatus(r))).length,
          totalInstruments: instruments.length,
          totalEquipment: equipment.length,
          totalUsers: users.length,
          activeUsers: users.filter(u => u.isActive).length,
        });
        setRecentUsers(users.slice(0, 5));
      } catch (err) {
        console.warn('Failed to load admin metrics:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <RouteGuard requiredRoles={['admin']}>
      <DashboardLayout breadcrumbs={[{ label: 'Dashboard', current: true }]}>
        <h1 className="text-[18px] font-semibold text-gray-900 mb-1">
          System Overview
        </h1>
        <div className="h-[2px] w-[48px] bg-[#1e3a5f] mb-4 rounded" />

        {loading ? (
          <div className="text-[13px] text-gray-500 py-8 text-center bg-white border border-gray-200 rounded">
            Loading system metrics…
          </div>
        ) : (
          <>
            {/* ── Metrics ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
              <MetricCard label="Total Reports" value={metrics?.totalReports ?? 0} tone="primary" icon={reportIcon} />
              <MetricCard label="In Testing" value={metrics?.inProgress ?? 0} tone="warning" icon={clockIcon} />
              <MetricCard label="Pending Review" value={metrics?.pendingReview ?? 0} tone="info" icon={hourglassIcon} />
              <MetricCard label="Completed" value={metrics?.completed ?? 0} tone="success" icon={checkIcon} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
              <MetricCard label="Total Users" value={metrics?.totalUsers ?? 0} tone="gray" icon={usersIcon} />
              <MetricCard label="Active Users" value={metrics?.activeUsers ?? 0} tone="success" icon={userCheckIcon} />
              <MetricCard label="Instruments" value={metrics?.totalInstruments ?? 0} tone="gray" icon={instIcon} />
              <MetricCard label="Equipment" value={metrics?.totalEquipment ?? 0} tone="warning" icon={equipIcon} />
            </div>

            {/* ── Quick Actions ── */}
            <div className="mb-6">
              <SectionHeader title="Quick Actions" />
              <div className="flex flex-wrap gap-2">
                <QuickActionLink href="/admin/users" label="Manage Users" />
                <QuickActionLink href="/instruments" label="Instruments" />
                <QuickActionLink href="/laboratories" label="Laboratories" />
                <QuickActionLink href="/equipment" label="Equipment" />
                <QuickActionLink href="/admin/settings" label="Settings" />
              </div>
            </div>

            {/* ── Registered Users ── */}
            <div>
              <SectionHeader title="Registered Users" count={recentUsers.length} />
              <div className="bg-white border border-gray-200 rounded overflow-hidden">
                {recentUsers.length === 0 ? (
                  <p className="text-[13px] text-gray-500 p-4">No users registered yet</p>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-[11px] font-semibold text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-2 text-[11px] font-semibold text-gray-500 uppercase">Email</th>
                        <th className="px-4 py-2 text-[11px] font-semibold text-gray-500 uppercase">Role</th>
                        <th className="px-4 py-2 text-[11px] font-semibold text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentUsers.map(u => (
                        <tr key={u.id} className="border-b border-gray-100 last:border-0">
                          <td className="px-4 py-2.5 text-[13px] text-gray-900 font-medium">{u.fullName}</td>
                          <td className="px-4 py-2.5 text-[13px] text-gray-600">{u.email}</td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                              u.role === 'admin' ? 'bg-blue-50 text-blue-700' :
                              u.role === 'tester' ? 'bg-green-50 text-green-700' :
                              u.role === 'reviewer' ? 'bg-purple-50 text-purple-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center gap-1.5 ${u.isActive ? 'text-success-600' : 'text-gray-400'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-success-500' : 'bg-gray-300'}`} />
                              {u.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </DashboardLayout>
    </RouteGuard>
  );
}

const strokeProps = {
  width: 18 as const,
  height: 18 as const,
  viewBox: '0 0 20 20' as const,
  fill: 'none' as const,
  stroke: 'currentColor' as const,
  strokeWidth: 1.6 as const,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const reportIcon = (
  <svg {...strokeProps}>
    <path d="M4 2.5h9l3 3v12H4z" />
    <path d="M13 2.5v3h3" />
    <path d="M4 13.5h12" />
  </svg>
);

const clockIcon = (
  <svg {...strokeProps}>
    <circle cx="10" cy="10" r="7" />
    <path d="M10 6v4l2.5 2.5" />
  </svg>
);

const hourglassIcon = (
  <svg {...strokeProps}>
    <path d="M6 3h8M6 17h8" />
    <path d="M6 3v3l4 4-4 4v3h8v-3l-4-4 4-4V3" />
  </svg>
);

const checkIcon = (
  <svg {...strokeProps}>
    <circle cx="10" cy="10" r="7" />
    <path d="M6.5 10l2.5 2.5 4.5-5" />
  </svg>
);

const usersIcon = (
  <svg {...strokeProps}>
    <circle cx="8" cy="7" r="3" />
    <path d="M2.5 16c0-2.5 2-4.5 5.5-4.5s5.5 2 5.5 4.5" />
    <circle cx="13.5" cy="7.5" r="2" />
    <path d="M13 11.5c2 0 3.5 1.7 3.5 3.8" />
  </svg>
);

const userCheckIcon = (
  <svg {...strokeProps}>
    <circle cx="8" cy="7" r="3" />
    <path d="M2.5 16c0-2.5 2-4.5 5.5-4.5" />
    <path d="M12.5 13l2 2 3.5-4" />
  </svg>
);

const instIcon = (
  <svg {...strokeProps}>
    <rect x="3.5" y="3.5" width="13" height="13" rx="1" />
    <path d="M7 7.5h6M7 10h6" />
    <circle cx="14" cy="9.5" r="0.8" />
  </svg>
);

const equipIcon = (
  <svg {...strokeProps}>
    <circle cx="10" cy="5.5" r="3" />
    <path d="M10 8.5v3.5" />
    <path d="M7 12h6v3a1 1 0 01-1 1H8a1 1 0 01-1-1z" />
  </svg>
);

function QuickActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 bg-white rounded text-[12px] font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900 transition-colors shadow-xs cursor-pointer"
    >
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M6 2h3l1.5 4A3.5 3.5 0 017 12 3.5 3.5 0 013.5 6L5 2h1z" />
        <path d="M7 5v7" />
      </svg>
      {label}
    </Link>
  );
}
