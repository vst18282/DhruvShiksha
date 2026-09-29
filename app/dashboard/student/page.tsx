import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RequireRole } from '@/components/auth/require-role';
import { DashboardSkeleton } from '@/components/skeletons';
import { StudentDashboard } from '@/components/dashboard/student-dashboard';

export const metadata: Metadata = { title: 'Student dashboard' };

export default function Page() {
  return (
    <RequireRole roles={['student', 'admin']}>
      <Suspense fallback={<DashboardSkeleton />}>
        <StudentDashboard />
      </Suspense>
    </RequireRole>
  );
}
