import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RequireRole } from '@/components/auth/require-role';
import { DashboardSkeleton } from '@/components/skeletons';
import { SettingsView } from '@/components/dashboard/settings-view';

export const metadata: Metadata = { title: 'Settings' };

export default function Page() {
  return (
    <RequireRole roles={['admin', 'scientist', 'content_manager', 'researcher', 'student']}>
      <Suspense fallback={<DashboardSkeleton />}>
        <SettingsView />
      </Suspense>
    </RequireRole>
  );
}
