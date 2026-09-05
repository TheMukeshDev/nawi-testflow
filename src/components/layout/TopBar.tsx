/**
 * NAWI Sahayak — TopBar Component
 *
 * Fixed top bar across all pages.
 * Desktop: breadcrumbs, search, new test button.
 * Mobile: hamburger, compact search.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

import { NotificationDropdown } from './NotificationDropdown';
import { useDashboardSearch, setDashboardSearch } from './DashboardSearchContext';
import { useOfflineSync } from '@/lib/offline-sync';
import { useAuth } from '@/lib/auth-context';

interface TopBarProps {
  breadcrumbs?: BreadcrumbItem[];
  onMenuToggle?: () => void;
  onSelectTest?: (testId: string, mode: 'view' | 'review') => void;
}

export function TopBar({ breadcrumbs = [], onMenuToggle, onSelectTest }: TopBarProps) {
  // Global header search — shared with the page content below via the store,
  // so typing here live-filters every section on the current dashboard.
  const searchQuery = useDashboardSearch();
  const [searchFocused, setSearchFocused] = React.useState(false);
  const { isOnline, pendingCount } = useOfflineSync();
  const { userRole } = useAuth();
  // Only roles that run tests may start a new test from the header.
  const canCreateTests = userRole === 'admin' || userRole === 'tester';

  return (
    <header className="flex items-center h-[52px] bg-white border-b border-gray-200 shadow-xs px-3 sm:px-4 shrink-0">
      {/* Mobile hamburger */}
      {onMenuToggle && (
        <button
          onClick={onMenuToggle}
          className="lg:hidden mr-2 p-1.5 -ml-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-sm"
          aria-label="Open navigation menu"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="3" y1="5" x2="15" y2="5" />
            <line x1="3" y1="9" x2="15" y2="9" />
            <line x1="3" y1="13" x2="15" y2="13" />
          </svg>
        </button>
      )}

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-[12px] text-gray-500 min-w-0" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className="text-gray-300 mx-0.5 select-none">/</span>}
            {crumb.href ? (
              <Link href={crumb.href} className="text-gray-500 hover:text-gray-700 hover:underline truncate">
                {crumb.label}
              </Link>
            ) : (
              <span className={cn('truncate', index === breadcrumbs.length - 1 ? 'text-gray-800 font-medium' : 'text-gray-500')}>
                {crumb.label}
              </span>
            )}
          </React.Fragment>
        ))}
        {breadcrumbs.length === 0 && <span className="text-gray-400">Dashboard</span>}
      </nav>

      <div className="flex-1" />

      {/* Search — hidden on very small screens */}
      <div className="relative mr-2 sm:mr-3 hidden sm:block">
        <div className={cn(
          'flex items-center gap-1.5 h-[30px] rounded-sm border px-2 text-[12px] transition-all',
          searchFocused
            ? 'border-brand-500 bg-white ring-2 ring-brand-100 shadow-sm'
            : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white',
        )}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className={cn('shrink-0', searchFocused ? 'text-brand-600' : 'text-gray-400')}>
            <circle cx="6" cy="6" r="4.5" />
            <path d="M9.5 9.5L13 13" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setDashboardSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search tests, instruments..."
            className="bg-transparent border-none outline-none text-[12px] text-gray-800 placeholder:text-gray-400 w-[150px] lg:w-[190px] min-w-0"
            aria-label="Global search"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setDashboardSearch('')}
              aria-label="Clear search"
              className="w-[18px] h-[18px] flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors cursor-pointer shrink-0"
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" />
              </svg>
            </button>
          )}
          <kbd className="hidden lg:inline-flex items-center h-[18px] px-1 text-[10px] font-medium text-gray-400 bg-gray-100 border border-gray-200 rounded">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Network Connectivity Status Indicator */}
      <div
        className={cn(
          'mr-2 sm:mr-3 hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono border transition-colors select-none',
          isOnline
            ? 'bg-gray-50 border-gray-200 text-gray-600'
            : 'bg-warning-50 border-warning-300 text-warning-800',
        )}
        title={isOnline ? 'Network Online — Connected to Central Metrology Server' : 'Offline Mode — Changes Saved to Local Browser Cache'}
      >
        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
        <span>{isOnline ? 'Online' : pendingCount > 0 ? `${pendingCount} Local` : 'Offline'}</span>
      </div>

      {/* Workflow Notification Dropdown */}
      <div className="mr-2 sm:mr-3">
        <NotificationDropdown onSelectTest={onSelectTest} />
      </div>

      {/* New Test — only tester/admin roles can create tests */}
      {canCreateTests && (
        <Link
          href="/tests/new"
          className="flex items-center gap-1.5 h-[30px] px-2.5 rounded-sm bg-brand-600 text-white text-[12px] font-medium shadow-xs hover:bg-brand-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-1"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 2v8M2 6h8" />
          </svg>
          <span className="hidden sm:inline">New Test</span>
        </Link>
      )}
    </header>
  );
}
