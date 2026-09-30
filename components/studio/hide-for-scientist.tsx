'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useHydrated } from '@/store/hydration';
import { DashboardSkeleton } from '@/components/skeletons';

/**
 * Scientists have no science-review section: anyone signed in as a scientist who reaches the
 * approval queue (bookmark, old link) is sent back to their dashboard.
 */
export function HideForScientist({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const role = useAuthStore((s) => s.user?.role);
  const router = useRouter();
  const scientist = hydrated && role === 'scientist';
  useEffect(() => {
    if (scientist) router.replace('/dashboard/scientist');
  }, [scientist, router]);
  if (!hydrated || scientist) return <DashboardSkeleton />;
  return <>{children}</>;
}
