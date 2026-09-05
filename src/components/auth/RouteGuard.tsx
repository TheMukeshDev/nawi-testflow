/**
 * NAWI Sahayak — Route Guard Component
 *
 * Protects pages based on user role.
 * Shows access denied message if user doesn't have required role.
 *
 * IMPORTANT: This is for UX only. Real security is on the backend.
 */

'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import type { UserRole } from '@/types';
import { getRoleDisplayName } from '@/lib/auth';

interface RouteGuardProps {
  children: React.ReactNode;
  requiredRoles: UserRole[];
  fallback?: React.ReactNode;
}

export function RouteGuard({ children, requiredRoles, fallback }: RouteGuardProps) {
  const { user, isLoading, hasRole } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[13px] text-gray-500">Loading…</div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <h2 className="text-[16px] font-semibold text-gray-900 mb-2">
          Authentication Required
        </h2>
        <p className="text-[13px] text-gray-600 mb-4">
          Please log in to access this page.
        </p>
        <a
          href="/login"
          className="px-4 py-2 bg-primary-600 text-white rounded-md text-[13px] font-medium hover:bg-primary-700"
        >
          Go to Login
        </a>
      </div>
    );
  }

  // Check role
  if (!hasRole(requiredRoles)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="mb-4 text-danger-400">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="24" cy="24" r="20" />
            <path d="M24 16v10" strokeLinecap="round" />
            <circle cx="24" cy="32" r="1.5" fill="currentColor" />
          </svg>
        </div>
        <h2 className="text-[16px] font-semibold text-gray-900 mb-2">
          Access Denied
        </h2>
        <p className="text-[13px] text-gray-600 mb-2">
          You do not have permission to access this page.
        </p>
        <p className="text-[12px] text-gray-500">
          Required role: {requiredRoles.map(r => getRoleDisplayName(r)).join(' or ')}
        </p>
        <p className="text-[12px] text-gray-500 mt-1">
          Your role: {getRoleDisplayName(user.role)}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Higher-order component for page protection.
 */
export function withRouteGuard(
  Component: React.ComponentType,
  requiredRoles: UserRole[]
) {
  return function ProtectedComponent(props: any) {
    return (
      <RouteGuard requiredRoles={requiredRoles}>
        <Component {...props} />
      </RouteGuard>
    );
  };
}
