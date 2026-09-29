'use client';

import * as React from 'react';
import type { Role } from '@/types';
import { useAuthStore } from '@/store/auth';
import { useHydrated } from '@/store/hydration';
import { Forbidden } from '@/components/common/forbidden';
import { DashboardSkeleton } from '@/components/skeletons';

/**
 * Client-side guard (middleware already redirects based on the cookie; this handles
 * in-app role switches and renders a friendly 403 instead of crashing).
 */
export function RequireRole({ roles, children, fallback }: { roles: Role[]; children: React.ReactNode; fallback?: React.ReactNode }) {
  const hydrated = useHydrated();
  const user = useAuthStore((s) => s.user);
  if (!hydrated) return <>{fallback ?? <DashboardSkeleton />}</>;
  if (!user || !roles.includes(user.role)) return <Forbidden className="my-8" />;
  return <>{children}</>;
}
