/**
 * NAWI TestFlow — Admin Settings
 *
 * System configuration for administrators.
 * Includes editable system settings, rule versions, and demo data management.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { Badge } from '@/components/ui/Badge';

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
  { key: 'rule_version', label: 'Active Rule Version', value: '2009', description: 'Rule version used for new calculations', editable: true },
  { key: 'max_upload_size', label: 'Max Upload Size', value: '10 MB', description: 'Maximum file upload size', editable: true },
  { key: 'session_timeout', label: 'Session Timeout', value: '8 hours', description: 'User session inactivity timeout', editable: true },
  { key: 'report_prefix', label: 'Report Number Prefix', value: 'TR-', description: 'Prefix for auto-generated test report numbers', editable: true },
];

export default function AdminSettingsPage() {
  const [showDemoConfirm, setShowDemoConfirm] = useState<string | null>(null);
  const [sysSettings, setSysSettings] = useState<SystemSetting[]>(DEFAULT_SYSTEM_SETTINGS);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('nawi_admin_sys_settings');
      if (raw) {
        const parsed = JSON.parse(raw) as SystemSetting[];
        if (Array.isArray(parsed) && parsed.length > 0) setSysSettings(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  const persistSys = (next: SystemSetting[]) => {
    setSysSettings(next);
    try { window.localStorage.setItem('nawi_admin_sys_settings', JSON.stringify(next)); } catch { /* ignore */ }
  };

  return (
    <RouteGuard requiredRoles={['admin']}>
      <DashboardLayout breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Settings', current: true }]}>
        <div className="mb-5">
          <h1 className="text-[18px] font-semibold text-gray-900">System Settings</h1>
          <p className="text-[12px] text-gray-500 mt-0.5">Application configuration and demo data management</p>
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
                    {setting.key === 'rule_version' ? (
                      <select value={editVal} onChange={e => setEditVal(e.target.value)} className="h-[30px] px-2 border border-gray-300 rounded-sm text-[12px] font-mono w-32">
                        <option value="2006">2006</option>
                        <option value="2009">2009</option>
                        <option value="2024">2024</option>
                      </select>
                    ) : (
                      <input value={editVal} onChange={e => setEditVal(e.target.value)} className="h-[30px] px-2 border border-gray-300 rounded-sm text-[12px] font-mono w-32" />
                    )}
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
              The selected version is used for new calculations when matching rules are available. Finalized reports retain their original version and old rules are never overwritten.
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
