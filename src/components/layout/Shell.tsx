/**
 * NAWI Sahayak — Shell Layout v2
 *
 * Delegates to DashboardLayout for consistent auth, mobile nav, and layout.
 */

'use client';

import { DashboardLayout } from './DashboardLayout';
import type { BreadcrumbItem } from '@/types';

interface ShellProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  onSelectTest?: (testId: string, mode: 'view' | 'review') => void;
}

export function Shell({ children, breadcrumbs = [], onSelectTest }: ShellProps) {
  return (
    <DashboardLayout breadcrumbs={breadcrumbs} onSelectTest={onSelectTest}>
      {children}
    </DashboardLayout>
  );
}
