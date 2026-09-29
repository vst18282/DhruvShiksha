'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useHydrated } from '@/store/hydration';
import { useCan, ACTION_LABELS, type Action } from '@/lib/permissions';
import { Forbidden } from '@/components/common/forbidden';
import { DashboardSkeleton } from '@/components/skeletons';

export interface Need {
  action: Action;
  /** Require an unconditional grant (not 'own' / 'draft' / 'science'). */
  full?: boolean;
}

/**
 * Client-side guard driven by the live (admin-editable) permission table.
 * Passes when ANY of the needs is granted. Admins can be sent elsewhere instead of a 403
 * (e.g. /studio → Publishing & Insights, because admins do not write content).
 */
export function RequireCan({ anyOf, children, adminRedirect }: { anyOf: Need[]; children: React.ReactNode; adminRedirect?: string }) {
  const hydrated = useHydrated();
  const user = useAuthStore((s) => s.user);
  const { can, canFully } = useCan();
  const router = useRouter();
  const allowed = !!user && anyOf.some((n) => (n.full ? canFully(n.action) : can(n.action)));
  const redirect = hydrated && !!user && user.role === 'admin' && !!adminRedirect && !allowed;

  React.useEffect(() => {
    if (redirect && adminRedirect) router.replace(adminRedirect);
  }, [redirect, adminRedirect, router]);

  if (!hydrated || redirect) return <DashboardSkeleton />;
  if (!allowed) return <Forbidden className="my-8" need={anyOf.map((n) => ACTION_LABELS[n.action]).join(' or ')} />;
  return <>{children}</>;
}
