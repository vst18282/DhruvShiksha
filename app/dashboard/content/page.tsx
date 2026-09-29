import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RequireRole } from '@/components/auth/require-role';
import { DashboardSkeleton } from '@/components/skeletons';
import { ContentDashboard } from '@/components/dashboard/content-dashboard';

export const metadata: Metadata = { title: 'Content dashboard' };

export default function Page() {
  return (
    <RequireRole roles={['content_manager', 'admin']}>
      <Suspense fallback={<DashboardSkeleton />}>
        <ContentDashboard />
      </Suspense>
    </RequireRole>
  );
}
