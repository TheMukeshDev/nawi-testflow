/**
 * NAWI TestFlow — Dashboard Layout
 *
 * Wraps authenticated pages with sidebar navigation.
 * Desktop: persistent sidebar. Mobile: hamburger + drawer.
 * Handles loading state and authentication checks.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { TopBar } from './TopBar';
import { OfflineSyncBanner } from './OfflineSyncBanner';
import { setDashboardSearch } from './DashboardSearchContext';
import { workflowStore } from '@/lib/workflow-store';
import type { BreadcrumbItem } from '@/types';

interface DashboardLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  onSelectTest?: (testId: string, mode: 'view' | 'review') => void;
}

export function DashboardLayout({ children, breadcrumbs = [], onSelectTest }: DashboardLayoutProps) {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    workflowStore.syncFromSupabase();
    // Each dashboard page starts with a clean shared search box
    setDashboardSearch('');
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-[32px] h-[32px] border-2 border-gray-300 border-t-[#1e3a5f] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[13px] text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile nav drawer */}
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar breadcrumbs={breadcrumbs} onMenuToggle={() => setMobileNavOpen(true)} onSelectTest={onSelectTest} />
        <OfflineSyncBanner />
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 py-5 max-w-[1400px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
