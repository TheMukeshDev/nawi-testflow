/**
 * NAWI TestFlow — Admin User Management
 *
 * List and manage application users.
 * Assign roles, activate/deactivate accounts.
 */

'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { Badge } from '@/components/ui/Badge';

interface UserRecord {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'tester' | 'reviewer' | 'viewer';
  laboratory: string;
  isActive: boolean;
  lastLogin: string;
  createdAt: string;
}

const MOCK_USERS: UserRecord[] = [
  {
    id: 'usr-001',
    email: 'admin@nawi-demo.local',
    fullName: 'Rajesh Kumar',
    role: 'admin',
    laboratory: 'CMTL-PY-01',
    isActive: true,
    lastLogin: '2026-09-02T14:00:00Z',
    createdAt: '2025-06-01',
  },
  {
    id: 'usr-002',
    email: 'tester@nawi-demo.local',
    fullName: 'Priya Mehta',
    role: 'tester',
    laboratory: 'CMTL-PY-01',
    isActive: true,
    lastLogin: '2026-09-02T10:30:00Z',
    createdAt: '2025-06-15',
  },
  {
    id: 'usr-003',
    email: 'reviewer@nawi-demo.local',
    fullName: 'Dr. Anand Kumar',
    role: 'reviewer',
    laboratory: 'CMTL-PY-01',
    isActive: true,
    lastLogin: '2026-09-01T16:00:00Z',
    createdAt: '2025-07-01',
  },
  {
    id: 'usr-004',
    email: 'viewer@nawi-demo.local',
    fullName: 'S. Venkatesh',
    role: 'viewer',
    laboratory: 'PITL-PR-02',
    isActive: true,
    lastLogin: '2026-08-28T09:00:00Z',
    createdAt: '2025-08-01',
  },
  {
    id: 'usr-005',
    email: 'rajesh.nair@laboratory.example.in',
    fullName: 'Rajesh Nair',
    role: 'tester',
    laboratory: 'PITL-PR-02',
    isActive: true,
    lastLogin: '2026-09-01T11:00:00Z',
    createdAt: '2025-09-01',
  },
  {
    id: 'usr-006',
    email: 'suresh.iyer@laboratory.example.in',
    fullName: 'Suresh Iyer',
    role: 'tester',
    laboratory: 'PITL-PR-02',
    isActive: false,
    lastLogin: '2026-06-15T08:00:00Z',
    createdAt: '2025-10-01',
  },
];

const ROLE_BADGE: Record<string, { color: 'primary' | 'success' | 'warning' | 'gray' }> = {
  admin: { color: 'primary' },
  tester: { color: 'success' },
  reviewer: { color: 'warning' },
  viewer: { color: 'gray' },
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  tester: 'Tester',
  reviewer: 'Reviewer',
  viewer: 'Viewer',
};

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const filteredUsers = MOCK_USERS.filter(u => {
    const matchSearch = !search ||
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <RouteGuard requiredRoles={['admin']}>
      <DashboardLayout breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Users', current: true }]}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-[18px] font-semibold text-gray-900">User Management</h1>
            <p className="text-[12px] text-gray-500 mt-0.5">Manage application users and role assignments</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="flex-1 max-w-[300px] h-[34px] px-3 border border-gray-300 rounded-sm text-[13px] text-gray-900 font-mono focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-blue-200"
          />
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="h-[34px] px-3 border border-gray-300 rounded-sm text-[13px] text-gray-900 focus:outline-none focus:border-[#1e3a5f]"
          >
            <option value="all">All Roles</option>
            <option value="admin">Administrator</option>
            <option value="tester">Tester</option>
            <option value="reviewer">Reviewer</option>
            <option value="viewer">Viewer</option>
          </select>
          <span className="text-[12px] text-gray-500">{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Users Table */}
        <div className="bg-white border border-gray-200 rounded-sm overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">User</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">Email</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">Role</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">Laboratory</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">Status</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">Last Login</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-gray-900">{user.fullName}</div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[12px] text-gray-600">{user.email}</td>
                  <td className="px-3 py-2.5">
                    <Badge color={ROLE_BADGE[user.role].color} variant="subtle">
                      {ROLE_LABELS[user.role]}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[12px]">{user.laboratory}</td>
                  <td className="px-3 py-2.5">
                    <Badge color={user.isActive ? 'success' : 'gray'} variant="subtle">
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-gray-500">
                    {new Date(user.lastLogin).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <button className="text-[12px] text-[#1e3a5f] hover:text-[#162d4a] font-medium">
                        Edit
                      </button>
                      <button className={`text-[12px] font-medium ${user.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}>
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="px-3 py-8 text-center text-[13px] text-gray-400">
              No users match the current filters.
            </div>
          )}
        </div>
      </DashboardLayout>
    </RouteGuard>
  );
}
