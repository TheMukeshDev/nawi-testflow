/**
 * NAWI TestFlow — Shell Layout v2
 *
 * Delegates to DashboardLayout for consistent auth, mobile nav, and layout.
 */

'use client';

import { DashboardLayout } from './DashboardLayout';
import type { BreadcrumbItem } from '@/types';

interface ShellProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}

export function Shell({ children, breadcrumbs = [] }: ShellProps) {
  return (
    <DashboardLayout breadcrumbs={breadcrumbs}>
      {children}
    </DashboardLayout>
  );
}
