/**
 * NAWI TestFlow — Dashboard Live Search Store
 *
 * Module-level singleton so the TopBar header search and every dashboard page
 * share EXACTLY one query value (no provider nesting / duplicate-context risk).
 * Typing in the header live-filters every section on the current page — for
 * every role (tester, reviewer, viewer, admin …).
 */

'use client';

import React from 'react';

type Listener = () => void;

let currentQuery = '';
const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) listener();
}

/** Set the shared dashboard search query (used by the header + page inputs). */
export function setDashboardSearch(value: string): void {
  const next = value ?? '';
  if (next === currentQuery) return;
  currentQuery = next;
  emit();
}

/** Subscribe a component to the shared query (returns current value). */
export function useDashboardSearch(): string {
  return React.useSyncExternalStore(
    (onStoreChange: Listener) => {
      listeners.add(onStoreChange);
      return () => {
        listeners.delete(onStoreChange);
      };
    },
    () => currentQuery,
    // Server snapshot — required so prerendered pages (e.g. /reviewer, /admin/audit)
    // always render the empty initial query and hydrate cleanly.
    () => '',
  );
}
