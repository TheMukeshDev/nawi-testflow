/**
 * NAWI TestFlow — Admin User Management
 *
 * List, add, and manage application users.
 * Assign roles, activate/deactivate accounts.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useDashboardSearch, setDashboardSearch } from '@/components/layout/DashboardSearchContext';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { Badge } from '@/components/ui/Badge';
import { rowMatchesQuery } from '@/lib/search';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormControls';
import { Dialog } from '@/components/ui/Dialog';
import { Alert } from '@/components/ui/Alert';
import { supabaseDb, type DbUser } from '@/lib/supabase-db';

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

const LAB_OPTIONS = [
  { label: 'Central Metrology Testing Lab (CMTL-PY-01)', value: 'CMTL-PY-01' },
  { label: 'Prayagraj Instrument Testing Lab (PITL-PR-02)', value: 'PITL-PR-02' },
  { label: 'North Zone Calibration Laboratory (NZCL-DL-03)', value: 'NZCL-DL-03' },
];

type ModalMode = 'add' | 'edit';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>(MOCK_USERS);
  // Shared live search — bound to the TopBar header search
  const search = useDashboardSearch();
  const [roleFilter, setRoleFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [formData, setFormData] = useState({ fullName: '', email: '', role: 'viewer', laboratory: 'CMTL-PY-01' });
  const [formError, setFormError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    supabaseDb.getUsers().then(dbUsers => {
      if (dbUsers && dbUsers.length > 0) {
        setUsers(dbUsers);
      }
    });
  }, []);

  const filteredUsers = users.filter(u => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchRole && rowMatchesQuery(u, search);
  });

  const openAddModal = () => {
    setModalMode('add');
    setEditingUser(null);
    setFormData({ fullName: '', email: '', role: 'viewer', laboratory: 'CMTL-PY-01' });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (user: UserRecord) => {
    setModalMode('edit');
    setEditingUser(user);
    setFormData({ fullName: user.fullName, email: user.email, role: user.role, laboratory: user.laboratory });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.fullName.trim() || !formData.email.trim()) {
      setFormError('Name and email are required.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setFormError('Please enter a valid email address.');
      return;
    }

    if (modalMode === 'add') {
      const tempPassword = `Nawi#${Math.floor(1000 + Math.random() * 9000)}@Lab`;

      const created = await supabaseDb.createUser({
        email: formData.email.trim(),
        fullName: formData.fullName.trim(),
        role: formData.role as UserRecord['role'],
        laboratory: formData.laboratory,
        isActive: true,
      });

      if (created) {
        setUsers(prev => [created, ...prev]);

        // Dispatch welcome email via Gmail SMTP
        fetch('/api/auth/welcome-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: created.email,
            fullName: created.fullName,
            role: created.role,
            laboratory: created.laboratory,
            password: tempPassword,
          }),
        }).catch(err => console.warn('[AdminUsers] Email send error:', err));

        setActionMessage({
          type: 'success',
          text: `User "${created.fullName}" saved to Supabase & login credentials emailed to ${created.email} (Password: ${tempPassword}).`,
        });
      }
    } else if (editingUser) {
      const updated = {
        fullName: formData.fullName.trim(),
        role: formData.role as UserRecord['role'],
      };

      await supabaseDb.updateUser(editingUser.id, updated);

      setUsers(prev => prev.map(u =>
        u.id === editingUser.id
          ? { ...u, fullName: formData.fullName.trim(), email: formData.email.trim(), role: formData.role as UserRecord['role'], laboratory: formData.laboratory }
          : u
      ));
      setActionMessage({ type: 'success', text: `User "${formData.fullName.trim()}" updated and saved to Supabase database.` });
    }
    setModalOpen(false);
  };

  const toggleActive = async (user: UserRecord) => {
    const newActiveState = !user.isActive;
    await supabaseDb.updateUser(user.id, { isActive: newActiveState });

    setUsers(prev => prev.map(u =>
      u.id === user.id ? { ...u, isActive: newActiveState } : u
    ));
    setActionMessage({
      type: 'success',
      text: `User "${user.fullName}" ${newActiveState ? 'activated' : 'deactivated'} in database.`,
    });
  };

  return (
    <RouteGuard requiredRoles={['admin']}>
      <DashboardLayout breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Users', current: true }]}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-[18px] font-semibold text-gray-900">User Management</h1>
            <p className="text-[12px] text-gray-500 mt-0.5">Manage application users and role assignments</p>
          </div>
          <Button variant="primary" size="md" onClick={openAddModal}>
            + Add New User
          </Button>
        </div>

        {actionMessage && (
          <div className="mb-4">
            <Alert
              type={actionMessage.type}
              title={actionMessage.type === 'success' ? 'Success' : 'Error'}
              onDismiss={() => setActionMessage(null)}
            >
              {actionMessage.text}
            </Alert>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            type="text"
            value={search}
            onChange={e => setDashboardSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="flex-1 min-w-[200px] max-w-[300px] h-[34px] px-3 border border-gray-300 rounded-sm text-[13px] text-gray-900 font-mono focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-blue-200"
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
          <div className="overflow-x-auto">
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
                      <div className="font-medium text-gray-900 whitespace-nowrap">{user.fullName}</div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[12px] text-gray-600 whitespace-nowrap">{user.email}</td>
                    <td className="px-3 py-2.5">
                      <Badge color={ROLE_BADGE[user.role].color} variant="subtle">
                        {ROLE_LABELS[user.role]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[12px] whitespace-nowrap">{user.laboratory}</td>
                    <td className="px-3 py-2.5">
                      <Badge color={user.isActive ? 'success' : 'gray'} variant="subtle">
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-gray-500 whitespace-nowrap">
                      {user.lastLogin
                        ? new Date(user.lastLogin).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'Never'
                      }
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-3 whitespace-nowrap">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-[12px] text-[#1e3a5f] hover:text-[#162d4a] font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleActive(user)}
                          className={`text-[12px] font-medium ${user.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                        >
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredUsers.length === 0 && (
            <div className="px-3 py-8 text-center text-[13px] text-gray-400">
              No users match the current filters.
            </div>
          )}
        </div>

        {/* Add/Edit User Modal */}
        <Dialog
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={modalMode === 'add' ? 'Add New User' : 'Edit User'}
        >
          <div className="space-y-4">
            {formError && (
              <Alert type="error" title="Validation Error">
                {formError}
              </Alert>
            )}
            <Input
              label="Full Name"
              value={formData.fullName}
              onChange={e => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="e.g. John Smith"
              required
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g. john@lab.example.in"
              monospace
              required
            />
            <Select
              label="Role"
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value as UserRecord['role'] })}
              options={[
                { label: 'Viewer', value: 'viewer' },
                { label: 'Tester', value: 'tester' },
                { label: 'Reviewer', value: 'reviewer' },
                { label: 'Administrator', value: 'admin' },
              ]}
            />
            <Select
              label="Laboratory"
              value={formData.laboratory}
              onChange={e => setFormData({ ...formData, laboratory: e.target.value })}
              options={LAB_OPTIONS}
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="secondary" size="md" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="md" onClick={handleSave}>
                {modalMode === 'add' ? 'Add User' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Dialog>
      </DashboardLayout>
    </RouteGuard>
  );
}