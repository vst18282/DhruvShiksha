import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RequireRole } from '@/components/auth/require-role';
import { DashboardSkeleton } from '@/components/skeletons';
import { AdminDashboard } from '@/components/dashboard/admin-dashboard';

export const metadata: Metadata = { title: 'Admin dashboard' };

export default function Page() {
  return (
    <RequireRole roles={['admin']}>
      <Suspense fallback={<DashboardSkeleton />}>
        <AdminDashboard />
      </Suspense>
    </RequireRole>
  );
}
