/**
 * NAWI TestFlow — Repository & Metrological Audit History
 *
 * Route: /repository
 * Comprehensive repository containing all test reports, generated documents,
 * and the complete immutable lifecycle audit history trail (Submissions, Approvals, Disapprovals, and Revisions).
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Shell } from '@/components/layout/Shell';
import { PageHeader } from '@/components/layout/PageHeader';
import { workflowStore, type StoredTest, type StoredReport, type WorkflowHistoryEntry } from '@/lib/workflow-store';
import { TestResultModal } from '@/components/workflow/TestResultModal';
import { TestStatusBadge } from '@/components/ui/StatusBadge';

export default function RepositoryPage() {
  const [activeTab, setActiveTab] = useState<'history' | 'records'>('history');
  const [history, setHistory] = useState<WorkflowHistoryEntry[]>([]);
  const [tests, setTests] = useState<StoredTest[]>([]);
  const [reports, setReports] = useState<StoredReport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActionFilter, setSelectedActionFilter] = useState('all');
  const [selectedTest, setSelectedTest] = useState<StoredTest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadRepositoryData = () => {
    setHistory(workflowStore.getHistory());
    setTests(workflowStore.getTests());
    setReports(workflowStore.getReports());
  };

  useEffect(() => {
    loadRepositoryData();
    const unsub = workflowStore.subscribe(loadRepositoryData);
    return () => unsub();
  }, []);

  // Filter history entries
  const filteredHistory = history.filter(item => {
    const matchesSearch =
      item.testNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = selectedActionFilter === 'all' || item.action === selectedActionFilter;
    return matchesSearch && matchesAction;
  });

  const getActionBadge = (action: WorkflowHistoryEntry['action']) => {
    switch (action) {
      case 'APPROVED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">✓ APPROVED</span>;
      case 'DISAPPROVED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">⚠️ DISAPPROVED</span>;
      case 'UPDATED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">✏️ UPDATED &amp; RESUBMITTED</span>;
      case 'REVISED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">⚠️ REVISION REQUESTED</span>;
      case 'SUBMITTED':
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">📤 SUBMITTED</span>;
    }
  };

  return (
    <Shell breadcrumbs={[{ label: 'Repository', current: true }]}>
      <PageHeader
        title="Metrological Repository & Lifecycle Audit History"
        subtitle="Complete immutable trail of submissions, reviews, approvals, disapprovals, and revisions per ISO/IEC 17025"
      />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-4 border-b border-gray-200 mb-5 text-[13px]">
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-2.5 font-semibold transition-colors relative cursor-pointer ${
            activeTab === 'history'
              ? 'text-[#1e3a5f] border-b-2 border-[#1e3a5f]'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <span>📜 Lifecycle &amp; Audit History Log</span>
          <span className="ml-2 px-1.5 py-0.2 bg-gray-100 text-gray-700 text-[11px] rounded-full">
            {history.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('records')}
          className={`pb-2.5 font-semibold transition-colors relative cursor-pointer ${
            activeTab === 'records'
              ? 'text-[#1e3a5f] border-b-2 border-[#1e3a5f]'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <span>📁 All Test &amp; Report Records</span>
          <span className="ml-2 px-1.5 py-0.2 bg-gray-100 text-gray-700 text-[11px] rounded-full">
            {tests.length}
          </span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-gray-200 rounded p-3 mb-4 flex flex-col sm:flex-row items-center gap-3 shadow-2xs">
        <div className="flex-1 w-full relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by test reference number, officer name, or remarks..."
            className="w-full h-[36px] pl-9 pr-3 border border-gray-300 rounded text-[13px] text-gray-900 focus:outline-none focus:border-[#1e3a5f]"
          />
          <svg
            className="w-4 h-4 text-gray-400 absolute left-3 top-2.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {activeTab === 'history' && (
          <select
            value={selectedActionFilter}
            onChange={e => setSelectedActionFilter(e.target.value)}
            aria-label="Filter by lifecycle action"
            className="h-[36px] px-3 border border-gray-300 rounded text-[12.5px] bg-white text-gray-700 focus:outline-none focus:border-[#1e3a5f]"
          >
            <option value="all">All Lifecycle Actions</option>
            <option value="APPROVED">Approved Only</option>
            <option value="DISAPPROVED">Disapproved / Revoked</option>
            <option value="UPDATED">Updated &amp; Resubmitted</option>
            <option value="REVISED">Revision Requested</option>
            <option value="SUBMITTED">Submitted</option>
          </select>
        )}
      </div>

      {/* Tab 1: Lifecycle & Audit History */}
      {activeTab === 'history' && (
        <div className="bg-white border border-gray-200 rounded overflow-hidden shadow-2xs">
          {filteredHistory.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-[13px]">
              No audit history entries found matching criteria.
            </div>
          ) : (
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 font-semibold text-left">
                  <th className="py-2.5 px-3 uppercase text-[11px] tracking-wide">Timestamp</th>
                  <th className="py-2.5 px-3 uppercase text-[11px] tracking-wide">Action</th>
                  <th className="py-2.5 px-3 uppercase text-[11px] tracking-wide">Test Reference</th>
                  <th className="py-2.5 px-3 uppercase text-[11px] tracking-wide">Authorized Officer</th>
                  <th className="py-2.5 px-3 uppercase text-[11px] tracking-wide">Role</th>
                  <th className="py-2.5 px-3 uppercase text-[11px] tracking-wide">Status Transition</th>
                  <th className="py-2.5 px-3 uppercase text-[11px] tracking-wide">Remarks &amp; Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="py-2.5 px-3 text-gray-500 font-mono text-[11.5px] whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {getActionBadge(item.action)}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#1e3a5f] whitespace-nowrap">
                      <button
                        onClick={() => {
                          const t = tests.find(x => x.id === item.testId || x.testNumber === item.testNumber);
                          if (t) {
                            setSelectedTest(t);
                            setIsModalOpen(true);
                          }
                        }}
                        className="hover:underline cursor-pointer"
                        title="Open Test Result Details"
                      >
                        {item.testNumber}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-gray-900 whitespace-nowrap">
                      {item.actorName}
                    </td>
                    <td className="py-2.5 px-3 text-gray-600 text-[11.5px] capitalize">
                      {item.actorRole}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-gray-600 whitespace-nowrap">
                      <span className="text-gray-400">{item.previousStatus || 'draft'}</span> &rarr; <span className="font-semibold text-gray-900">{item.newStatus}</span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-700 max-w-[340px] truncate" title={item.notes || ''}>
                      {item.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 2: All Records */}
      {activeTab === 'records' && (
        <div className="bg-white border border-gray-200 rounded overflow-hidden shadow-2xs">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 font-semibold text-left">
                <th className="py-2.5 px-3 uppercase text-[11px] tracking-wide">Test Ref</th>
                <th className="py-2.5 px-3 uppercase text-[11px] tracking-wide">Instrument Model &amp; Serial</th>
                <th className="py-2.5 px-3 uppercase text-[11px] tracking-wide">Accuracy Class</th>
                <th className="py-2.5 px-3 uppercase text-[11px] tracking-wide">Testing Officer</th>
                <th className="py-2.5 px-3 uppercase text-[11px] tracking-wide">Reviewer</th>
                <th className="py-2.5 px-3 uppercase text-[11px] tracking-wide">Current Status</th>
                <th className="py-2.5 px-3 text-right uppercase text-[11px] tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tests.map((t) => (
                <tr key={t.id} className="hover:bg-blue-50/20 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-[#1e3a5f]">
                    {t.testNumber}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-medium text-gray-900">{t.instrumentModel}</div>
                    <div className="text-[11px] font-mono text-gray-500">{t.instrumentSerial}</div>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-gray-700">
                    Class {t.instrumentClass}
                  </td>
                  <td className="py-2.5 px-3 text-gray-800">
                    {t.technician}
                  </td>
                  <td className="py-2.5 px-3 text-gray-800">
                    {t.reviewer || '—'}
                  </td>
                  <td className="py-2.5 px-3">
                    <TestStatusBadge status={t.status} />
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedTest(t);
                        setIsModalOpen(true);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-gray-100 text-[#1e3a5f] border border-gray-300 rounded text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      View Details &rarr;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Test Detail / Review / Disapproval Modal */}
      {selectedTest && (
        <TestResultModal
          open={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTest(null);
          }}
          test={selectedTest}
          onActionComplete={loadRepositoryData}
        />
      )}
    </Shell>
  );
}
