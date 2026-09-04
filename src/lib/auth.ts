/**
 * NAWI TestFlow — Authentication Utilities
 *
 * Frontend authentication helpers and route guards.
 *
 * IMPORTANT: Frontend route hiding is for UX only, NOT security.
 * All authorization checks happen on the backend via API middleware
 * and database Row-Level Security (RLS) policies.
 */

import type { UserRole } from '@/types';

// ============================================================================
// ROLE DEFINITIONS
// ============================================================================
//
// NOTE: These roles are PROPOSED application roles.
// See docs/ROLES.md for full documentation.
// ============================================================================

export const ROLES: Record<UserRole, string> = {
  admin: 'Administrator',
  tester: 'Tester',
  reviewer: 'Reviewer',
  viewer: 'Viewer',
};

// Role-based dashboard landing paths
export const ROLE_DASHBOARD_PATHS: Record<UserRole, string> = {
  admin: '/admin',
  tester: '/tester',
  reviewer: '/reviewer',
  viewer: '/viewer',
};

// ============================================================================
// PERMISSION DEFINITIONS
// ============================================================================

export const PERMISSIONS: Record<string, UserRole[]> = {
  // Users
  'users:create': ['admin'],
  'users:read': ['admin'],
  'users:update': ['admin'],
  'users:delete': ['admin'],

  // Laboratories
  'laboratories:create': ['admin'],
  'laboratories:read': ['admin', 'tester', 'reviewer', 'viewer'],
  'laboratories:update': ['admin'],
  'laboratories:delete': ['admin'],

  // Instruments
  'instruments:create': ['admin', 'tester'],
  'instruments:read': ['admin', 'tester', 'reviewer', 'viewer'],
  'instruments:update': ['admin', 'tester'],
  'instruments:delete': ['admin'],

  // Test Reports
  'test_reports:create': ['admin', 'tester'],
  'test_reports:read_own': ['admin', 'tester'],
  'test_reports:read_lab': ['admin', 'reviewer'],
  'test_reports:read_completed': ['admin', 'tester', 'reviewer', 'viewer'],
  'test_reports:update_draft': ['admin', 'tester'],
  'test_reports:update_review': ['admin', 'reviewer'],
  'test_reports:delete_draft': ['admin', 'tester'],
  'test_reports:submit': ['admin', 'tester'],
  'test_reports:approve': ['admin', 'reviewer'],
  'test_reports:reject': ['admin', 'reviewer'],

  // Test Data
  'test_data:create': ['admin', 'tester'],
  'test_data:read_own': ['admin', 'tester'],
  'test_data:read_lab': ['admin', 'reviewer'],
  'test_data:read_completed': ['admin', 'tester', 'reviewer', 'viewer'],
  'test_data:update': ['admin', 'tester'],
  'test_data:delete': ['admin', 'tester'],

  // Reports (generated PDFs/DOCX)
  'reports:generate': ['admin', 'tester', 'reviewer'],
  'reports:read': ['admin', 'tester', 'reviewer', 'viewer'],
  'reports:download': ['admin', 'tester', 'reviewer', 'viewer'],
  'reports:approve': ['admin', 'reviewer'],

  // Attachments
  'attachments:create': ['admin', 'tester'],
  'attachments:read_own': ['admin', 'tester'],
  'attachments:read_lab': ['admin', 'reviewer'],
  'attachments:read_completed': ['admin', 'tester', 'reviewer', 'viewer'],
  'attachments:delete': ['admin'],

  // Compliance Rules
  'compliance_rules:create': ['admin'],
  'compliance_rules:read': ['admin', 'tester', 'reviewer'],
  'compliance_rules:update': ['admin'],
  'compliance_rules:delete': ['admin'],

  // Audit Logs
  'audit_logs:read': ['admin'],

  // System
  'system:configure': ['admin'],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if user has a specific role.
 */
export function hasRole(userRole: UserRole | undefined, requiredRoles: UserRole[]): boolean {
  if (!userRole) return false;
  return requiredRoles.includes(userRole);
}

/**
 * Check if user has a specific permission.
 */
export function hasPermission(userRole: UserRole | undefined, permission: string): boolean {
  if (!userRole) return false;
  const allowedRoles = PERMISSIONS[permission] || [];
  return allowedRoles.includes(userRole);
}

/**
 * Get user's display name for role.
 */
export function getRoleDisplayName(role: UserRole): string {
  return ROLES[role] || role;
}

// ============================================================================
// ROUTE DEFINITIONS
// ============================================================================

export interface RouteConfig {
  path: string;
  requiredRoles: UserRole[];
  requiredPermission?: string;
}

/**
 * Route access configuration.
 * Used by middleware and components to check access.
 *
 * IMPORTANT: This is for UX only. Real security is on the backend.
 */
export const PROTECTED_ROUTES: RouteConfig[] = [
  // Dashboard - all authenticated users
  { path: '/', requiredRoles: ['admin', 'tester', 'reviewer', 'viewer'] },
  
  // Test Reports
  { path: '/tests', requiredRoles: ['admin', 'tester', 'reviewer', 'viewer'] },
  { path: '/tests/new', requiredRoles: ['admin', 'tester'], requiredPermission: 'test_reports:create' },
  
  // Instruments
  { path: '/instruments', requiredRoles: ['admin', 'tester', 'reviewer', 'viewer'] },
  { path: '/instruments/new', requiredRoles: ['admin', 'tester'], requiredPermission: 'instruments:create' },
  
  // Laboratories
  { path: '/laboratories', requiredRoles: ['admin', 'tester', 'reviewer', 'viewer'] },
  { path: '/laboratories/new', requiredRoles: ['admin'], requiredPermission: 'laboratories:create' },
  
  // Equipment
  { path: '/equipment', requiredRoles: ['admin', 'tester', 'reviewer', 'viewer'] },
  { path: '/equipment/new', requiredRoles: ['admin', 'tester'], requiredPermission: 'instruments:create' },
  
  // Reports
  { path: '/reports', requiredRoles: ['admin', 'tester', 'reviewer', 'viewer'] },
  
  // Repository
  { path: '/repository', requiredRoles: ['admin', 'tester', 'reviewer', 'viewer'] },
  
  // Admin
  { path: '/admin', requiredRoles: ['admin'] },
  { path: '/admin/users', requiredRoles: ['admin'], requiredPermission: 'users:read' },
  
  // Settings
  { path: '/settings', requiredRoles: ['admin', 'tester', 'reviewer', 'viewer'] },
];

/**
 * Check if user can access a specific route.
 */
export function canAccessRoute(
  userRole: UserRole | undefined,
  routePath: string,
): boolean {
  if (!userRole) return false;
  
  const route = PROTECTED_ROUTES.find(r => r.path === routePath);
  if (!route) return true; // Public route
  
  return hasRole(userRole, route.requiredRoles);
}

// ============================================================================
// NAVIGATION FILTERING
// ============================================================================

export interface NavItem {
  label: string;
  href: string;
  requiredRoles: UserRole[];
}

/**
 * Navigation items with role requirements.
 * Used to filter sidebar based on user role.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/', requiredRoles: ['admin', 'tester', 'reviewer', 'viewer'] },
  { label: 'Test Reports', href: '/tests', requiredRoles: ['admin', 'tester', 'reviewer', 'viewer'] },
  { label: 'New Test', href: '/tests/new', requiredRoles: ['admin', 'tester'] },
  { label: 'Instruments', href: '/instruments', requiredRoles: ['admin', 'tester', 'reviewer', 'viewer'] },
  { label: 'Laboratory', href: '/laboratories', requiredRoles: ['admin', 'tester', 'reviewer', 'viewer'] },
  { label: 'Equipment', href: '/equipment', requiredRoles: ['admin', 'tester', 'reviewer', 'viewer'] },
  { label: 'Repository', href: '/repository', requiredRoles: ['admin', 'tester', 'reviewer', 'viewer'] },
  { label: 'Users', href: '/admin', requiredRoles: ['admin'] },
  { label: 'Settings', href: '/settings', requiredRoles: ['admin', 'tester', 'reviewer', 'viewer'] },
];

/**
 * Filter navigation items based on user role.
 */
export function filterNavByRole(
  items: NavItem[],
  userRole: UserRole | undefined,
): NavItem[] {
  if (!userRole) return [];
  return items.filter(item => hasRole(userRole, item.requiredRoles));
}
