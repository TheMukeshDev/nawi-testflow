/** NAWI Sahayak — User Settings. */

'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RouteGuard } from '@/components/auth/RouteGuard';

export default function UserSettingsPage() {
  return (
    <RouteGuard requiredRoles={['admin', 'tester', 'reviewer', 'viewer']}>
      <DashboardLayout breadcrumbs={[{ label: 'Settings', current: true }]}>
        <div className="mb-5">
          <h1 className="text-[18px] font-semibold text-gray-900">Settings</h1>
          <p className="text-[12px] text-gray-500 mt-0.5">Personal preferences</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-sm mb-6">
          <div className="p-4">
            <h2 className="text-[14px] font-semibold text-gray-900">Application preferences</h2>
            <p className="text-[12px] text-gray-600 mt-2">No personal settings are currently configured.</p>
            <p className="text-[11px] text-gray-400 mt-3">AI assistance is reserved for a future product scope and is currently disabled.</p>
          </div>
        </div>
      </DashboardLayout>
    </RouteGuard>
  );
}
