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
import { deepSearch, rowMatchesQuery } from '@/lib/search';
import { useDashboardSearch, setDashboardSearch } from '@/components/layout/DashboardSearchContext';
import { TestResultModal } from '@/components/workflow/TestResultModal';
import { TestStatusBadge } from '@/components/ui/StatusBadge';

export default function RepositoryPage() {
  const [activeTab, setActiveTab] = useState<'history' | 'records'>('history');
  const [history, setHistory] = useState<WorkflowHistoryEntry[]>([]);
  const [tests, setTests] = useState<StoredTest[]>([]);
  const [reports, setReports] = useState<StoredReport[]>([]);
  // Shared live search — bound to the TopBar header search
  const searchQuery = useDashboardSearch();
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
    // Merge live Supabase test reports so the audit trail reflects real records
    workflowStore.mergeFromSupabase().then(loadRepositoryData).catch(loadRepositoryData);
    const unsub = workflowStore.subscribe(loadRepositoryData);
    return () => unsub();
  }, []);

  // Deep search across ALL fields (nested, numbers, null-safe) — applied per tab
  const filteredTests = deepSearch(tests, searchQuery);
  const filteredHistory = history.filter(item => {
    const matchesAction = selectedActionFilter === 'all' || item.action === selectedActionFilter;
    return matchesAction && rowMatchesQuery(item, searchQuery);
  });

  const getActionBadge = (action: WorkflowHistoryEntry['action']) => {
    switch (action) {
      case 'APPROVED':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300"><svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6.5l2.5 2.5L10 3.5" /></svg>APPROVED</span>;
      case 'DISAPPROVED':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-300"><svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 2v4M6 9.5h0" /></svg>DISAPPROVED</span>;
      case 'UPDATED':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300"><svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 1.5a1.5 1.5 0 012 2L5 9 1 10l1-4z" /></svg>UPDATED &amp; RESUBMITTED</span>;
      case 'REVISED':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300"><svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 2v4M6 9.5h0" /></svg>REVISION REQUESTED</span>;
      case 'SUBMITTED':
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300"><svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9.5v-7M3 5.5L6 2.5l3 3" /><path d="M2 10.5h8" /></svg>SUBMITTED</span>;
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
          <span className="inline-flex items-center gap-1.5"><svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8.5V2.5h6v6l-3 2-3-2z" /><path d="M5 4.5h4" /></svg>Lifecycle &amp; Audit History Log</span>
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
          <span className="inline-flex items-center gap-1.5"><svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 2.5h10v9H2z" /><path d="M5 5h4" /></svg>All Test &amp; Report Records</span>
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
            onChange={e => setDashboardSearch(e.target.value)}
            placeholder="Search by test ref, model, serial number, lab, officer, status, remarks…"
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
              {filteredTests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400 text-[13px]">
                    {searchQuery.trim()
                      ? `No records match "${searchQuery.trim()}"`
                      : 'No test records in the repository yet.'}
                  </td>
                </tr>
              ) : filteredTests.map((t) => (
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
