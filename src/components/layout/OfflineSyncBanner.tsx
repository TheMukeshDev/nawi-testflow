/**
 * NAWI TestFlow — Offline Sync Banner Component
 *
 * Appears when network connection drops, assuring laboratory officers that
 * test observations are persisted in local storage and will sync automatically.
 */

'use client';

import React from 'react';
import { useOfflineSync } from '@/lib/offline-sync';

export function OfflineSyncBanner() {
  const { isOnline, isSyncing, pendingCount, syncQueue } = useOfflineSync();

  if (isOnline && !isSyncing && pendingCount === 0) {
    return null;
  }

  if (!isOnline) {
    return (
      <div className="bg-amber-500 text-slate-950 px-4 py-2 text-[12px] font-medium flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px]">⚡</span>
          <span>
            <strong>Offline Mode Active:</strong> Network connection lost. Observations and test records are securely saved to local laboratory storage.
          </span>
          {pendingCount > 0 && (
            <span className="bg-amber-600 text-white px-1.5 py-0.2 rounded text-[11px] font-bold">
              {pendingCount} pending sync
            </span>
          )}
        </div>
        <span className="text-[11px] font-semibold text-amber-950">Auto-sync on reconnect</span>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="bg-blue-600 text-white px-4 py-1.5 text-[12px] font-medium flex items-center justify-between shadow-xs shrink-0 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Restoring connection: Syncing {pendingCount} offline observation records to central repository...</span>
        </div>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="bg-emerald-600 text-white px-4 py-1.5 text-[12px] font-medium flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center gap-2">
          <span>✓ Connection online.</span>
          <span>{pendingCount} offline records ready to sync.</span>
        </div>
        <button
          onClick={syncQueue}
          className="px-2 py-0.5 bg-white text-emerald-800 text-[11px] font-bold rounded hover:bg-emerald-50 cursor-pointer"
        >
          Sync Now
        </button>
      </div>
    );
  }

  return null;
}
