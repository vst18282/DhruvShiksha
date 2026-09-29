import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RequireRole } from '@/components/auth/require-role';
import { DashboardSkeleton } from '@/components/skeletons';
import { ScientistDashboard } from '@/components/dashboard/scientist-dashboard';

export const metadata: Metadata = { title: 'Scientist dashboard' };

export default function Page() {
  return (
    <RequireRole roles={['scientist', 'admin']}>
      <Suspense fallback={<DashboardSkeleton />}>
        <ScientistDashboard />
      </Suspense>
    </RequireRole>
  );
}
