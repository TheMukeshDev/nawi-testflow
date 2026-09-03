/**
 * NAWI TestFlow — Audit Log
 *
 * System activity log for administrators.
 * Tracks all significant actions for auditability.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { workflowStore } from '@/lib/workflow-store';
import { useDashboardSearch, setDashboardSearch } from '@/components/layout/DashboardSearchContext';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { Badge } from '@/components/ui/Badge';
import { rowMatchesQuery } from '@/lib/search';

interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  ipAddress: string;
}

const ACTION_BADGE: Record<string, { color: 'primary' | 'success' | 'warning' | 'danger' | 'gray' }> = {
  REPORT_CREATED: { color: 'primary' },
  REPORT_SUBMITTED: { color: 'primary' },
  REPORT_APPROVED: { color: 'success' },
  REPORT_REJECTED: { color: 'danger' },
  REPORT_FINALIZED: { color: 'success' },
  REPORT_REVISION_REQUESTED: { color: 'danger' },
  REPORT_RESUBMITTED: { color: 'warning' },
  TEST_STARTED: { color: 'primary' },
  OBSERVATION_ADDED: { color: 'gray' },
  CALCULATION_EXECUTED: { color: 'gray' },
  ATTACHMENT_UPLOADED: { color: 'gray' },
  USER_LOGIN: { color: 'gray' },
  REPORT_EXPORTED: { color: 'gray' },
};

// Map live workflow-history actions onto the audit event vocabulary.
const HISTORY_ACTION_MAP: Record<string, string> = {
  SUBMITTED: 'REPORT_SUBMITTED',
  APPROVED: 'REPORT_APPROVED',
  REVISED: 'REPORT_REVISION_REQUESTED',
  DISAPPROVED: 'REPORT_REVISION_REQUESTED',
  UPDATED: 'REPORT_RESUBMITTED',
};

const MOCK_AUDIT: AuditEvent[] = [
  {
    id: 'aud-001',
    timestamp: '2026-09-02T14:30:00Z',
    actor: 'Priya Mehta',
    actorRole: 'tester',
    action: 'REPORT_SUBMITTED',
    entityType: 'test_report',
    entityId: 'TR-2026-001',
    description: 'Submitted test report TR-2026-001 for review',
    ipAddress: '192.168.1.45',
  },
  {
    id: 'aud-002',
    timestamp: '2026-09-02T11:15:00Z',
    actor: 'Priya Mehta',
    actorRole: 'tester',
    action: 'CALCULATION_EXECUTED',
    entityType: 'test_report',
    entityId: 'TR-2026-001',
    description: 'Executed calculations for TR-2026-001 (RPT, ECC)',
    ipAddress: '192.168.1.45',
  },
  {
    id: 'aud-003',
    timestamp: '2026-09-01T16:00:00Z',
    actor: 'Dr. Anand Kumar',
    actorRole: 'reviewer',
    action: 'REPORT_APPROVED',
    entityType: 'test_report',
    entityId: 'TR-2026-003',
    description: 'Approved test report TR-2026-003',
    ipAddress: '192.168.1.50',
  },
  {
    id: 'aud-004',
    timestamp: '2026-08-31T15:30:00Z',
    actor: 'Dr. Anand Kumar',
    actorRole: 'reviewer',
    action: 'REPORT_REJECTED',
    entityType: 'test_report',
    entityId: 'TR-2026-004',
    description: 'Rejected test report TR-2026-004 — observations incomplete for eccentricity test',
    ipAddress: '192.168.1.50',
  },
  {
    id: 'aud-005',
    timestamp: '2026-08-28T09:00:00Z',
    actor: 'Rajesh Nair',
    actorRole: 'tester',
    action: 'TEST_STARTED',
    entityType: 'test_report',
    entityId: 'TR-2026-003',
    description: 'Started test report TR-2026-003 for ABC-220 (ABC-2025-EL-00589)',
    ipAddress: '192.168.1.60',
  },
  {
    id: 'aud-006',
    timestamp: '2026-08-27T14:00:00Z',
    actor: 'Rajesh Nair',
    actorRole: 'tester',
    action: 'REPORT_CREATED',
    entityType: 'test_report',
    entityId: 'TR-2026-004',
    description: 'Created test report TR-2026-004 for MetroScale 2000 (MST-2024-EL-00247)',
    ipAddress: '192.168.1.60',
  },
  {
    id: 'aud-007',
    timestamp: '2026-08-26T11:00:00Z',
    actor: 'Suresh Iyer',
    actorRole: 'tester',
    action: 'REPORT_CREATED',
    entityType: 'test_report',
    entityId: 'TR-2026-005',
    description: 'Created draft test report TR-2026-005 for PWS Platform Scale 3000',
    ipAddress: '192.168.1.70',
  },
  {
    id: 'aud-008',
    timestamp: '2026-09-02T08:00:00Z',
    actor: 'Rajesh Kumar',
    actorRole: 'admin',
    action: 'USER_LOGIN',
    entityType: 'user',
    entityId: 'usr-001',
    description: 'Administrator login',
    ipAddress: '192.168.1.10',
  },
];

export default function AdminAuditPage() {
  const [actionFilter, setActionFilter] = useState('all');
  // Shared live search — bound to the TopBar header search
  const search = useDashboardSearch();
  // Live entries from the actual test workflow (rejections, revisions, approvals…)
  const [liveEvents, setLiveEvents] = useState<AuditEvent[]>([]);

  useEffect(() => {
    const refresh = () => {
      const events = workflowStore.getHistory().map((h, i) => ({
        id: `live-${h.id}`,
        timestamp: h.timestamp,
        actor: h.actorName,
        actorRole: h.actorRole,
        action: HISTORY_ACTION_MAP[h.action] || h.action,
        entityType: 'test_report',
        entityId: h.testNumber,
        description: `${h.notes || `${h.action.replace(/_/g, ' ').toLowerCase()} ${h.testNumber}`} (${h.previousStatus || '—'} → ${h.newStatus})`,
        ipAddress: 'local',
      }));
      setLiveEvents(events);
    };
    refresh();
    const unsubscribe = workflowStore.subscribe(refresh);
    return unsubscribe;
  }, []);

  // Live workflow events first, then the seeded system events — newest first.
  const allEvents = [...liveEvents, ...MOCK_AUDIT].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  const filtered = allEvents.filter(e => {
    const matchAction = actionFilter === 'all' || e.action === actionFilter;
    return matchAction && rowMatchesQuery(e, search);
  });

  return (
    <RouteGuard requiredRoles={['admin']}>
      <DashboardLayout breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Audit Log', current: true }]}>
        <div className="mb-4">
          <h1 className="text-[18px] font-semibold text-gray-900">Audit Log</h1>
          <p className="text-[12px] text-gray-500 mt-0.5">System activity and change tracking</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            value={search}
            onChange={e => setDashboardSearch(e.target.value)}
            placeholder="Search actor, description, entity..."
            className="flex-1 max-w-[300px] h-[34px] px-3 border border-gray-300 rounded-sm text-[13px] text-gray-900 focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-blue-200"
          />
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="h-[34px] px-3 border border-gray-300 rounded-sm text-[13px] text-gray-900 focus:outline-none focus:border-[#1e3a5f]"
          >
            <option value="all">All Actions</option>
            <option value="REPORT_CREATED">Report Created</option>
            <option value="REPORT_SUBMITTED">Report Submitted</option>
            <option value="REPORT_APPROVED">Report Approved</option>
            <option value="REPORT_REJECTED">Report Rejected</option>
            <option value="REPORT_REVISION_REQUESTED">Revision Requested</option>
            <option value="REPORT_RESUBMITTED">Report Resubmitted</option>
            <option value="TEST_STARTED">Test Started</option>
            <option value="CALCULATION_EXECUTED">Calculation Executed</option>
            <option value="USER_LOGIN">User Login</option>
          </select>
          <span className="text-[12px] text-gray-500">{filtered.length} event{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Audit Table */}
        <div className="bg-white border border-gray-200 rounded-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide whitespace-nowrap">Timestamp</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">Actor</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">Action</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">Entity</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide min-w-[300px]">Description</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 text-[11px] uppercase tracking-wide">IP</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(event => {
                  const badge = ACTION_BADGE[event.action] || { color: 'gray' as const };
                  return (
                    <tr key={event.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[11px] text-gray-500">
                        {new Date(event.timestamp).toLocaleString('en-GB', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-gray-900">{event.actor}</div>
                        <div className="text-[10px] text-gray-400 capitalize">{event.actorRole}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge color={badge.color} variant="subtle">
                          {event.action.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-gray-600">
                        {event.entityId}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700">
                        {event.description}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-gray-400">
                        {event.ipAddress}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="px-3 py-8 text-center text-[13px] text-gray-400">
              No audit events match the current filters.
            </div>
          )}
        </div>
      </DashboardLayout>
    </RouteGuard>
  );
}
