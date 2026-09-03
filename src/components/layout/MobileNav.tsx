/**
 * NAWI TestFlow — Mobile Navigation Drawer
 *
 * Replaces the sidebar on mobile/tablet.
 * Slide-in drawer with role-based navigation.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { getRoleDisplayName } from '@/lib/auth';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  requiredRoles: string[];
}

const icons = {
  dashboard: <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="6" height="7" rx="1" /><rect x="10" y="2" width="6" height="4" rx="1" /><rect x="2" y="11" width="6" height="5" rx="1" /><rect x="10" y="8" width="6" height="8" rx="1" /></svg>,
  testReports: <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2h7l4 4v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" /><path d="M11 2v4h4" /><path d="M6 9h6M6 11.5h4" /></svg>,
  newTest: <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2v4M6 6h6l1 8H5l1-8z" /><circle cx="9" cy="11" r="0.5" fill="currentColor" /><path d="M7 13h4" /></svg>,
  instruments: <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="12" height="10" rx="1" /><path d="M6 8h6M6 10.5h4" /><circle cx="12" cy="10.5" r="1" /></svg>,
  laboratory: <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v5l-3 5a1 1 0 00.87 1.5h10.26A1 1 0 0015 13l-3-5V3" /><path d="M5 3h8" /><path d="M8 11h2" /></svg>,
  equipment: <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="5" r="3" /><path d="M9 8v4" /><path d="M6 12h6v2a1 1 0 01-1 1H7a1 1 0 01-1-1v-2z" /></svg>,
  repository: <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4h12M3 8h12M3 12h8" /><path d="M14 10l2 2-2 2" /></svg>,
  users: <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="6" r="3" /><path d="M2 16c0-3 2.5-5 5-5s5 2 5 5" /><circle cx="13" cy="6" r="2" /><path d="M13 10c2 0 3.5 1.5 3.5 4" /></svg>,
  settings: <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="2" /><path d="M9 2v2M9 14v2M2 9h2M14 9h2M3.76 3.76l1.42 1.42M12.82 12.82l1.42 1.42M3.76 14.24l1.42-1.42M12.82 5.18l1.42-1.42" /></svg>,
  audit: <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2v14M2 9h14" /><circle cx="9" cy="9" r="7" /></svg>,
};

const ALL_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: icons.dashboard, requiredRoles: ['admin', 'tester', 'reviewer', 'viewer'] },
  { label: 'Test Reports', href: '/tests', icon: icons.testReports, requiredRoles: ['admin', 'tester', 'reviewer', 'viewer'] },
  { label: 'New Test', href: '/tests/new', icon: icons.newTest, requiredRoles: ['admin', 'tester'] },
  { label: 'Instruments', href: '/instruments', icon: icons.instruments, requiredRoles: ['admin', 'tester', 'reviewer', 'viewer'] },
  { label: 'Laboratory', href: '/laboratories', icon: icons.laboratory, requiredRoles: ['admin', 'tester', 'reviewer', 'viewer'] },
  { label: 'Equipment', href: '/equipment', icon: icons.equipment, requiredRoles: ['admin', 'tester', 'reviewer', 'viewer'] },
  { label: 'Repository', href: '/repository', icon: icons.repository, requiredRoles: ['admin', 'tester', 'reviewer', 'viewer'] },
  { label: 'Users', href: '/admin/users', icon: icons.users, requiredRoles: ['admin'] },
  { label: 'Audit Log', href: '/admin/audit', icon: icons.audit, requiredRoles: ['admin'] },
  { label: 'Settings', href: '/admin/settings', icon: icons.settings, requiredRoles: ['admin'] },
];

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const { user, userRole, logout, getRoleRedirectPath } = useAuth();

  // Dashboard always lands on the signed-in role's home, not the public landing page.
  const dashboardHref = getRoleRedirectPath();

  const navItems = ALL_NAV_ITEMS.filter(item => {
    if (!userRole) return false;
    return item.requiredRoles.includes(userRole);
  }).map(item =>
    item.label === 'Dashboard' ? { ...item, href: dashboardHref } : item,
  );

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const displayName = user?.full_name || user?.email || 'User';

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="absolute left-0 top-0 bottom-0 w-[260px] bg-gray-800 text-gray-300 flex flex-col overflow-hidden" role="navigation" aria-label="Mobile navigation">
        {/* Header */}
        <div className="flex items-center justify-between px-3 h-[56px] border-b border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-[28px] h-[28px] bg-[#1e3a5f] rounded-sm flex items-center justify-center">
              <span className="text-white text-[11px] font-bold">NW</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[13px] font-semibold text-gray-100">NAWI TestFlow</span>
              <span className="text-[10px] text-gray-400">OIML R-76</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white" aria-label="Close menu">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="5" y1="5" x2="15" y2="15" /><line x1="15" y1="5" x2="5" y2="15" />
            </svg>
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-1 px-1">
          {navItems.map(item => {
            const isDashboard = item.label === 'Dashboard';
            const isActive = isDashboard ? pathname === dashboardHref : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-sm text-[13px] font-medium transition-colors',
                  isActive
                    ? 'bg-gray-900 text-white border-l-[3px] border-blue-400 -ml-[1px]'
                    : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200 border-l-[3px] border-transparent -ml-[1px]',
                )}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="flex-1 truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User + logout */}
        <div className="border-t border-gray-700 px-3 py-3 shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-[28px] h-[28px] bg-gray-600 rounded-sm flex items-center justify-center text-[11px] font-medium text-gray-200 shrink-0">
              {getInitials(displayName)}
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-gray-200 truncate">{displayName}</p>
              <p className="text-[10px] text-gray-400">{userRole ? getRoleDisplayName(userRole) : ''}</p>
            </div>
          </div>
          <button
            onClick={() => { onClose(); logout(); }}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[12px] text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-sm transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h2" /><path d="M9 10l3-3-3-3" /><path d="M5 7h7" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>
    </div>
  );
}
