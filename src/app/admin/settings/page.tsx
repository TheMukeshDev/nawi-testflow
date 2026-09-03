/**
 * NAWI TestFlow — Admin Settings
 *
 * System configuration for administrators.
 * Includes AI assistance gating (global Gemini key / enabled / model),
 * editable system settings, rule versions, and demo data management.
 *
 * Policy: rule-based explanations always work (no key). Gemini "Enhance
 * with AI" works only when a key is configured here (global) or by the
 * user in their own Settings.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { Badge } from '@/components/ui/Badge';
import { fetchAiStatus, getPersonalKey } from '@/lib/ai';

interface SystemSetting {
  key: string;
  label: string;
  value: string;
  description: string;
  editable?: boolean;
}

const DEFAULT_SYSTEM_SETTINGS: SystemSetting[] = [
  { key: 'app_version', label: 'Application Version', value: '0.1.0-mvp', description: 'Current application version' },
  { key: 'default_standard', label: 'Default Standard', value: 'OIML R-76', description: 'Default regulatory standard for new tests' },
  { key: 'rule_version', label: 'Active Rule Version', value: '2009', description: 'Currently active compliance rule version' },
  { key: 'max_upload_size', label: 'Max Upload Size', value: '10 MB', description: 'Maximum file upload size', editable: true },
  { key: 'session_timeout', label: 'Session Timeout', value: '8 hours', description: 'User session inactivity timeout', editable: true },
  { key: 'report_prefix', label: 'Report Number Prefix', value: 'TR-', description: 'Prefix for auto-generated test report numbers', editable: true },
];

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';

export default function AdminSettingsPage() {
  const [showDemoConfirm, setShowDemoConfirm] = useState<string | null>(null);
  const [sysSettings, setSysSettings] = useState<SystemSetting[]>(DEFAULT_SYSTEM_SETTINGS);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');

  // AI assistance (admin-global)
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiModel, setAiModel] = useState('gemini-3.8-flash');
  const [aiKey, setAiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [aiStatus, setAiStatus] = useState<{
    ai_available?: boolean; ai_configured?: boolean; masked_key?: string | null; model?: string | null;
  } | null>(null);
  const [aiMsg, setAiMsg] = useState<string | null>(null);
  const [aiSaving, setAiSaving] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('nawi_admin_sys_settings');
      if (raw) {
        const parsed = JSON.parse(raw) as SystemSetting[];
        if (Array.isArray(parsed) && parsed.length > 0) setSysSettings(parsed);
      }
    } catch { /* ignore */ }
    fetchAiStatus().then(s => {
      if (!s) return;
      setAiStatus(s);
      setAiEnabled(s.ai_enabled);
      if (s.model) setAiModel(s.model);
    }).catch(() => {});
  }, []);

  const persistSys = (next: SystemSetting[]) => {
    setSysSettings(next);
    try { window.localStorage.setItem('nawi_admin_sys_settings', JSON.stringify(next)); } catch { /* ignore */ }
  };

  const saveAi = async (clear = false) => {
    setAiSaving(true);
    setAiMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/ai/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(getPersonalKey() ? { 'X-Gemini-Key': getPersonalKey() as string } : {}),
        },
        body: JSON.stringify(
          clear
            ? { enabled: aiEnabled, model: aiModel, clear_key: true }
            : { enabled: aiEnabled, model: aiModel, ...(aiKey.trim() ? { api_key: aiKey.trim() } : {}) },
        ),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAiStatus(data);
      setAiKey('');
      setAiMsg(clear ? 'Global API key cleared. AI enhancement is now disabled until a key is added.' : 'AI settings saved.');
    } catch (e) {
      // Offline/demo: persist intent locally so UI still reflects admin choice
      setAiStatus({ ai_available: !clear && !!aiKey.trim(), ai_configured: !clear && !!aiKey.trim(), masked_key: clear ? null : '…(local)', model: aiModel });
      setAiMsg('Backend unreachable — saved locally for demo (wire auth headers in production).');
    } finally {
      setAiSaving(false);
    }
  };

  return (
    <RouteGuard requiredRoles={['admin']}>
      <DashboardLayout breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Settings', current: true }]}>
        <div className="mb-5">
          <h1 className="text-[18px] font-semibold text-gray-900">System Settings</h1>
          <p className="text-[12px] text-gray-500 mt-0.5">Application configuration and demo data management</p>
        </div>

        {/* AI Assistance (admin-global gating) */}
        <div className="bg-white border border-gray-200 rounded-sm mb-6">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-semibold text-gray-900">AI Assistance (Gemini)</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">Rule-based explanations are always on · Gemini is on-demand only and needs a key</p>
            </div>
            {aiStatus?.ai_available
              ? <Badge color="success" variant="subtle">AI enabled {aiStatus.masked_key ? `· ${aiStatus.masked_key}` : ''}</Badge>
              : <Badge color="warning" variant="subtle">Rule-based only</Badge>}
          </div>
          <div className="p-4 space-y-3">
            <label className="flex items-center gap-2 text-[12px] text-gray-700">
              <input type="checkbox" checked={aiEnabled} onChange={e => setAiEnabled(e.target.checked)} className="w-4 h-4" />
              Enable Gemini enhancement (applies globally; individual users may still use personal keys)
            </label>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1">
                <label className="block text-[12px] font-medium text-gray-700 mb-1">Gemini model</label>
                <select value={aiModel} onChange={e => setAiModel(e.target.value)} className="w-full h-[34px] px-3 border border-gray-300 rounded-sm text-[13px]">
                  <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                  <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                  <option value="gemini-3.8-flash">gemini-3.8-flash</option>
                </select>
              </div>
              <div className="flex-[2]">
                <label className="block text-[12px] font-medium text-gray-700 mb-1">Global Gemini API key (admin)</label>
                <div className="flex gap-2">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={aiKey}
                    onChange={e => setAiKey(e.target.value)}
                    placeholder={aiStatus?.masked_key ? `Configured (${aiStatus.masked_key}) — paste new to replace` : 'Paste Gemini API key'}
                    className="flex-1 h-[34px] px-3 border border-gray-300 rounded-sm text-[13px] font-mono"
                  />
                  <button onClick={() => setShowKey(!showKey)} className="px-3 h-[34px] border border-gray-300 rounded-sm text-[12px]">{showKey ? 'Hide' : 'Show'}</button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => saveAi(false)} disabled={aiSaving} className="px-4 py-2 bg-[#1e3a5f] text-white text-[12px] font-medium rounded-sm hover:bg-[#162d4a] disabled:opacity-50">
                {aiSaving ? 'Saving…' : 'Save AI Settings'}
              </button>
              <button onClick={() => saveAi(true)} disabled={aiSaving} className="px-4 py-2 border border-red-300 text-red-700 text-[12px] font-medium rounded-sm hover:bg-red-50 disabled:opacity-50">
                Clear Key
              </button>
              {aiMsg && <span className="text-[11px] text-gray-600">{aiMsg}</span>}
            </div>
            <p className="text-[11px] text-gray-400">
              Gemini reads the actual resolved rule (ID, version, formula, observed vs allowed) and only rephrases it — it never decides PASS/FAIL.
              Users see rule-based results first; &ldquo;Enhance with AI&rdquo; fires a single Gemini call per click.
            </p>
          </div>
        </div>

        {/* System Configuration */}
        <div className="bg-white border border-gray-200 rounded-sm mb-6">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-gray-900">System Configuration</h2>
            <span className="text-[11px] text-gray-400">Admin can edit marked settings</span>
          </div>
          <div className="divide-y divide-gray-100">
            {sysSettings.map(setting => (
              <div key={setting.key} className="px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[13px] font-medium text-gray-900">{setting.label}</div>
                  <div className="text-[11px] text-gray-500">{setting.description}</div>
                </div>
                {editingKey === setting.key ? (
                  <div className="flex items-center gap-2">
                    <input value={editVal} onChange={e => setEditVal(e.target.value)} className="h-[30px] px-2 border border-gray-300 rounded-sm text-[12px] font-mono w-32" />
                    <button
                      onClick={() => { persistSys(sysSettings.map(s => s.key === setting.key ? { ...s, value: editVal } : s)); setEditingKey(null); }}
                      className="px-2 py-1 bg-[#1e3a5f] text-white text-[11px] rounded-sm"
                    >Save</button>
                    <button onClick={() => setEditingKey(null)} className="px-2 py-1 text-[11px] text-gray-500">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-[12px] text-gray-700 bg-gray-50 px-2 py-1 rounded-sm border border-gray-200">
                      {setting.value}
                    </div>
                    {setting.editable && (
                      <button onClick={() => { setEditingKey(setting.key); setEditVal(setting.value); }} className="text-[11px] text-blue-700 underline">Edit</button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* OIML Rule Versions */}
        <div className="bg-white border border-gray-200 rounded-sm mb-6">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-[14px] font-semibold text-gray-900">OIML Rule Versions</h2>
          </div>
          <div className="p-4">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 font-semibold text-gray-700 text-[11px] uppercase">Version</th>
                  <th className="text-left py-1.5 font-semibold text-gray-700 text-[11px] uppercase">Effective Date</th>
                  <th className="text-left py-1.5 font-semibold text-gray-700 text-[11px] uppercase">Status</th>
                  <th className="text-left py-1.5 font-semibold text-gray-700 text-[11px] uppercase">Reports</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-2 font-mono">OIML R-76 v2009</td>
                  <td className="py-2">01 Jan 2009</td>
                  <td className="py-2"><Badge color="success" variant="subtle">Active</Badge></td>
                  <td className="py-2">3</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 font-mono">OIML R-76 v2024</td>
                  <td className="py-2">01 Jan 2025</td>
                  <td className="py-2"><Badge color="warning" variant="subtle">Available</Badge></td>
                  <td className="py-2">0</td>
                </tr>
              </tbody>
            </table>
            <p className="text-[11px] text-gray-400 mt-3">
              Finalized reports retain the exact rule version used during their evaluation. Old rule versions are never overwritten.
            </p>
          </div>
        </div>

        {/* Demo Data Management */}
        <div className="bg-white border border-gray-200 rounded-sm mb-6">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-[14px] font-semibold text-gray-900">Demo Data Management</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">Control demonstration data for mentor presentations</p>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDemoConfirm('seed')}
                className="px-4 py-2 bg-[#1e3a5f] text-white text-[12px] font-medium rounded-sm hover:bg-[#162d4a] transition-colors"
              >
                Seed Demo Data
              </button>
              <button
                onClick={() => setShowDemoConfirm('clear')}
                className="px-4 py-2 border border-red-300 text-red-700 text-[12px] font-medium rounded-sm hover:bg-red-50 transition-colors"
              >
                Clear Demo Data
              </button>
              <button
                onClick={() => setShowDemoConfirm('reset')}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-[12px] font-medium rounded-sm hover:bg-gray-50 transition-colors"
              >
                Reset Demo Data
              </button>
            </div>

            {showDemoConfirm && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-sm">
                <p className="text-[12px] text-amber-700 font-medium mb-2">
                  {showDemoConfirm === 'seed' && 'Seed Demo Data — This will add fictional demonstration records to the system.'}
                  {showDemoConfirm === 'clear' && 'Clear Demo Data — This will remove all records marked as demo data. Real records will not be affected.'}
                  {showDemoConfirm === 'reset' && 'Reset Demo Data — This will clear and re-seed all demonstration data.'}
                </p>
                <p className="text-[11px] text-amber-600 mb-3">
                  All demo data is clearly marked with is_demo=true and will never affect production records.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      alert(`Demo ${showDemoConfirm} action triggered (demo mode — no backend connected)`);
                      setShowDemoConfirm(null);
                    }}
                    className="px-3 py-1.5 bg-amber-600 text-white text-[12px] font-medium rounded-sm hover:bg-amber-700"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setShowDemoConfirm(null)}
                    className="px-3 py-1.5 text-gray-500 text-[12px] font-medium hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm">
              <p className="text-[11px] text-gray-600">
                <strong>Note:</strong> Demo credentials are documented in the README.
                Demo data uses clearly fictional manufacturers (ABC Instruments, Precision Weigh Systems, MetroScale Technologies)
                and fictional laboratories (Central Metrology Testing Lab, Prayagraj Instrument Testing Lab).
              </p>
            </div>
          </div>
        </div>

        {/* Environment Info */}
        <div className="bg-white border border-gray-200 rounded-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-[14px] font-semibold text-gray-900">Environment</h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[12px]">
              <div>
                <div className="text-gray-500 mb-0.5">Frontend</div>
                <div className="font-mono text-gray-700">Next.js 15.3</div>
              </div>
              <div>
                <div className="text-gray-500 mb-0.5">Backend</div>
                <div className="font-mono text-gray-700">FastAPI (Python)</div>
              </div>
              <div>
                <div className="text-gray-500 mb-0.5">Database</div>
                <div className="font-mono text-gray-700">PostgreSQL / Supabase</div>
              </div>
              <div>
                <div className="text-gray-500 mb-0.5">Auth</div>
                <div className="font-mono text-gray-700">Supabase Auth (Mock)</div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </RouteGuard>
  );
}
