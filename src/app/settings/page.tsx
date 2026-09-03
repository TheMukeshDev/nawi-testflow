/**
 * NAWI TestFlow — User Settings (personal Gemini key).
 *
 * Any authenticated user (tester/reviewer/viewer/admin) can add their own
 * Gemini API key here. It is stored only in this browser (localStorage) and
 * sent per-request as X-Gemini-Key — enabling "Enhance with AI" for them
 * without needing the admin global key. Rule-based explanations always work.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { Badge } from '@/components/ui/Badge';
import { fetchAiStatus, getPersonalKey, setPersonalKey } from '@/lib/ai';

export default function UserSettingsPage() {
  const [key, setKey] = useState('');
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [status, setStatus] = useState<Awaited<ReturnType<typeof fetchAiStatus>>>(null);

  useEffect(() => {
    setSaved(getPersonalKey() ? 'Personal key saved in this browser.' : null);
    fetchAiStatus().then(setStatus).catch(() => {});
  }, []);

  const save = () => {
    if (!key.trim() || key.trim().length < 8) return;
    setPersonalKey(key.trim());
    setKey('');
    setSaved('Personal key saved in this browser. "Enhance with AI" is now available to you.');
    fetchAiStatus().then(setStatus).catch(() => {});
  };

  const clear = () => {
    setPersonalKey(null);
    setSaved(null);
  };

  return (
    <RouteGuard requiredRoles={['admin', 'tester', 'reviewer', 'viewer']}>
      <DashboardLayout breadcrumbs={[{ label: 'Settings', current: true }]}>
        <div className="mb-5">
          <h1 className="text-[18px] font-semibold text-gray-900">Settings</h1>
          <p className="text-[12px] text-gray-500 mt-0.5">Personal preferences and optional AI enhancement</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-sm mb-6">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-semibold text-gray-900">AI Enhancement (optional)</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">Rule-based results always work · Gemini only on explicit click</p>
            </div>
            {status?.ai_available
              ? <Badge color="success" variant="subtle">AI ready</Badge>
              : <Badge color="warning" variant="subtle">Rule-based only</Badge>}
          </div>
          <div className="p-4 space-y-3">
            <p className="text-[12px] text-gray-600">
              Add your own Gemini API key to enable &ldquo;Enhance with AI&rdquo; on test results.
              The key stays in this browser and is sent only with your own AI requests.
              Admins can alternatively configure one global key for everyone in System Settings.
            </p>
            <div className="flex gap-2">
              <input
                type={show ? 'text' : 'password'}
                value={key}
                onChange={e => setKey(e.target.value)}
                placeholder="Paste Gemini API key (min 8 chars)"
                className="flex-1 h-[34px] px-3 border border-gray-300 rounded-sm text-[13px] font-mono"
              />
              <button onClick={() => setShow(!show)} className="px-3 h-[34px] border border-gray-300 rounded-sm text-[12px]">{show ? 'Hide' : 'Show'}</button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={save} disabled={key.trim().length < 8} className="px-4 py-2 bg-[#1e3a5f] text-white text-[12px] font-medium rounded-sm hover:bg-[#162d4a] disabled:opacity-50">
                Save Personal Key
              </button>
              <button onClick={clear} className="px-4 py-2 border border-gray-300 text-gray-700 text-[12px] font-medium rounded-sm hover:bg-gray-50">
                Remove
              </button>
              {saved && <span className="text-[11px] text-green-700">{saved}</span>}
            </div>
            <p className="text-[11px] text-gray-400">
              Get a key from Google AI Studio. Gemini receives only the already-computed rule, values and verdict to rephrase — it never decides compliance.
            </p>
          </div>
        </div>
      </DashboardLayout>
    </RouteGuard>
  );
}
