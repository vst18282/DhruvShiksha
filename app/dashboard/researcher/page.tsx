import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RequireRole } from '@/components/auth/require-role';
import { DashboardSkeleton } from '@/components/skeletons';
import { ResearcherDashboard } from '@/components/dashboard/researcher-dashboard';

export const metadata: Metadata = { title: 'Researcher dashboard' };

export default function Page() {
  return (
    <RequireRole roles={['researcher', 'admin']}>
      <Suspense fallback={<DashboardSkeleton />}>
        <ResearcherDashboard />
      </Suspense>
    </RequireRole>
  );
}
