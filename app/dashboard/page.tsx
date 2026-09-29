'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useHydrated } from '@/store/hydration';
import { dashboardPathFor } from '@/lib/permissions';
import { DashboardSkeleton } from '@/components/skeletons';

/** /dashboard routes each role to its own dashboard. */
export default function DashboardRouter() {
  const router = useRouter();
  const hydrated = useHydrated();
  const user = useAuthStore((s) => s.user);
  useEffect(() => {
    if (!hydrated) return;
    router.replace(user ? dashboardPathFor(user.role) : '/login?next=/dashboard');
  }, [hydrated, user, router]);
  return <DashboardSkeleton />;
}
