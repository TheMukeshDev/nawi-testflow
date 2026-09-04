/**
 * NAWI TestFlow — Sidebar Component v4
 *
 * Role-based persistent left navigation. Desktop-primary, always visible.
 *
 * Navigation is grouped into sections and filtered by user role.
 * Deep-navy shell (brand) for a professional laboratory/regulatory feel.
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
  section: 'overview' | 'records' | 'master' | 'system';
  badge?: number;
}

const NAV_SECTIONS: { id: NavItem['section']; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'records', label: 'Test Center' },
  { id: 'master', label: 'Master Data' },
  { id: 'system', label: 'System' },
];

/** Simple SVG icons — 18px, stroke-based, no fill */
const icons = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="6" height="7" rx="1" />
      <rect x="10" y="2" width="6" height="4" rx="1" />
      <rect x="2" y="11" width="6" height="5" rx="1" />
      <rect x="10" y="8" width="6" height="8" rx="1" />
    </svg>
  ),
  testReports: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2h7l4 4v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" />
      <path d="M11 2v4h4" />
      <path d="M6 9h6M6 11.5h4" />
    </svg>
  ),
  newTest: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2v4M6 6h6l1 8H5l1-8z" />
      <circle cx="9" cy="11" r="0.5" fill="currentColor" />
      <path d="M7 13h4" />
    </svg>
  ),
  instruments: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="12" height="10" rx="1" />
      <path d="M6 8h6M6 10.5h4" />
      <circle cx="12" cy="10.5" r="1" />
    </svg>
  ),
  laboratory: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3v5l-3 5a1 1 0 00.87 1.5h10.26A1 1 0 0015 13l-3-5V3" />
      <path d="M5 3h8" />
      <path d="M8 11h2" />
    </svg>
  ),
  equipment: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="5" r="3" />
      <path d="M9 8v4" />
      <path d="M6 12h6v2a1 1 0 01-1 1H7a1 1 0 01-1-1v-2z" />
    </svg>
  ),
  repository: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h12M3 8h12M3 12h8" />
      <path d="M14 10l2 2-2 2" />
    </svg>
  ),
  users: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="6" r="3" />
      <path d="M2 16c0-3 2.5-5 5-5s5 2 5 5" />
      <circle cx="13" cy="6" r="2" />
      <path d="M13 10c2 0 3.5 1.5 3.5 4" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="2" />
      <path d="M9 2v2M9 14v2M2 9h2M14 9h2M3.76 3.76l1.42 1.42M12.82 12.82l1.42 1.42M3.76 14.24l1.42-1.42M12.82 5.18l1.42-1.42" />
    </svg>
  ),
  audit: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2v14M2 9h14" />
      <circle cx="9" cy="9" r="7" />
    </svg>
  ),
};

/** Navigation items with role requirements */
const ALL_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: icons.dashboard, requiredRoles: ['admin', 'tester', 'reviewer', 'viewer'], section: 'overview' },
  { label: 'Test Reports', href: '/tests', icon: icons.testReports, requiredRoles: ['admin', 'tester', 'reviewer', 'viewer'], section: 'records' },
  { label: 'New Test', href: '/tests/new', icon: icons.newTest, requiredRoles: ['admin', 'tester'], section: 'records' },
  { label: 'Repository', href: '/repository', icon: icons.repository, requiredRoles: ['admin', 'tester', 'reviewer', 'viewer'], section: 'records' },
  { label: 'Instruments', href: '/instruments', icon: icons.instruments, requiredRoles: ['admin', 'tester', 'reviewer', 'viewer'], section: 'master' },
  { label: 'Laboratory', href: '/laboratories', icon: icons.laboratory, requiredRoles: ['admin', 'tester', 'reviewer', 'viewer'], section: 'master' },
  { label: 'Equipment', href: '/equipment', icon: icons.equipment, requiredRoles: ['admin', 'tester', 'reviewer', 'viewer'], section: 'master' },
  { label: 'Users', href: '/admin/users', icon: icons.users, requiredRoles: ['admin'], section: 'system' },
  { label: 'Audit Log', href: '/admin/audit', icon: icons.audit, requiredRoles: ['admin'], section: 'system' },
  { label: 'Settings', href: '/admin/settings', icon: icons.settings, requiredRoles: ['admin'], section: 'system' },
];

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const { user, userRole, logout, getRoleRedirectPath } = useAuth();

  // Dashboard always lands on the signed-in role's home (tester → /tester,
  // reviewer → /reviewer, …) instead of the public landing page.
  const dashboardHref = getRoleRedirectPath();

  // Filter nav items based on user role
  const navItems = ALL_NAV_ITEMS.filter(item => {
    if (!userRole) return false;
    return item.requiredRoles.includes(userRole);
  }).map(item =>
    item.label === 'Dashboard' ? { ...item, href: dashboardHref } : item,
  );

  // Group into sections, preserving defined order
  const sections = NAV_SECTIONS
    .map(section => ({
      ...section,
      items: navItems.filter(i => i.section === section.id),
    }))
    .filter(s => s.items.length > 0);

  // Get user initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = user?.full_name || user?.email || 'User';
  const initials = getInitials(displayName);

  const isItemActive = (item: NavItem) =>
    item.label === 'Dashboard' ? pathname === dashboardHref : pathname.startsWith(item.href);

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-brand-900 text-gray-300 select-none',
        'border-r border-brand-800',
        collapsed ? 'w-[56px]' : 'w-[248px]'
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo / Brand */}
      <div className={cn(
        'flex items-center gap-2.5 h-[52px] border-b border-white/[0.06] shrink-0',
        collapsed ? 'justify-center px-2' : 'px-4',
      )}>
        <div className="flex items-center justify-center w-[30px] h-[30px] bg-brand-600 rounded-sm ring-1 ring-inset ring-white/[0.12] shadow-sm shrink-0">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <line x1="12" y1="3" x2="12" y2="21" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <line x1="5" y1="21" x2="19" y2="21" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <line x1="3" y1="8" x2="21" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <path d="M3 8 L1 14 Q3 16 5 14 L3 8" stroke="white" strokeWidth="1.5" fill="none"/>
            <path d="M21 8 L19 14 Q21 16 23 14 L21 8" stroke="white" strokeWidth="1.5" fill="none"/>
            <polygon points="12,3 10.5,6 13.5,6" fill="white"/>
          </svg>
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-semibold text-white leading-tight truncate tracking-tight">
              NAWI TestFlow
            </span>
            <span className="text-[10px] text-gray-400 leading-tight tracking-wide">
              OIML R-76 Suite
            </span>
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {sections.map(section => (
          <div key={section.id}>
            {!collapsed && (
              <div className="px-2 pb-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-[0.12em]">
                {section.label}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map(item => {
                const isActive = isItemActive(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'group flex items-center gap-2.5 rounded-sm text-[13px] font-medium',
                      'transition-colors duration-100',
                      isActive
                        ? 'bg-brand-700 text-white shadow-xs'
                        : 'text-gray-400 hover:text-gray-100 hover:bg-white/[0.05]',
                      collapsed ? 'justify-center px-0 py-2' : 'px-2.5 py-[7px]',
                    )}
                  >
                    <span
                      className={cn(
                        'shrink-0 transition-colors',
                        isActive ? 'text-brand-200' : 'text-gray-500 group-hover:text-gray-300',
                      )}
                    >
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge !== undefined && (
                          <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold bg-brand-500 text-white rounded-sm">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Info + Logout */}
      <div className="border-t border-white/[0.06] px-3 py-2.5 shrink-0">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="flex items-center justify-center w-[30px] h-[30px] bg-brand-600 rounded-sm text-[11px] font-semibold text-white ring-1 ring-inset ring-white/[0.12] shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] font-medium text-gray-100 truncate">
                {displayName}
              </span>
              <span className="text-[10px] text-gray-400 truncate flex items-center gap-1">
                <span className="w-[5px] h-[5px] rounded-full bg-emerald-500 inline-block" />
                {userRole ? getRoleDisplayName(userRole) : 'Unknown'}
              </span>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] text-gray-400 hover:text-gray-100 hover:bg-white/[0.05] rounded-sm transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h2" />
              <path d="M9 10l3-3-3-3" />
              <path d="M5 7h7" />
            </svg>
            Sign Out
          </button>
        )}
      </div>
    </aside>
  );
}
