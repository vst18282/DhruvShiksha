'use client';

import Link from 'next/link';
import { ArrowLeft, Compass, LogIn, UserPlus } from 'lucide-react';
import { Wordmark } from '@/components/layout/wordmark';
import { Button } from '@/components/ui/button';
import { PORTAL_HOME } from '@/lib/nav';
import { dashboardPathFor } from '@/lib/permissions';
import { useAuthStore } from '@/store/auth';
import { useHydrated } from '@/store/hydration';

/**
 * Slim top bar for the public landing page. The landing page carries no site navigation bar, so
 * this is the only way in: log in / sign up for visitors, or straight through to the portal and
 * the role-specific dashboard for anyone already signed in.
 */
export function LandingBar() {
  const hydrated = useHydrated();
  const user = useAuthStore((s) => s.user);
  return (
    <div className="container flex shrink-0 flex-wrap items-center justify-between gap-3 py-5">
      <Wordmark href="/" subtitleClassName="text-white/70" />
      <div className="flex shrink-0 items-center gap-2">
        {hydrated && user ? (
          <>
            <Button asChild variant="outline" size="sm" className="gap-1.5 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <Link href={dashboardPathFor(user.role)}>
                <ArrowLeft className="h-4 w-4" aria-hidden /> Back to Dashboard
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-white text-neutral-900 hover:bg-white/90">
              <Link href={PORTAL_HOME}>
                <Compass className="h-4 w-4" aria-hidden /> Enter the portal
              </Link>
            </Button>
          </>
        ) : (
          /* Default for visitors, and the pre-hydration state: signing in is the point of this bar. */
          <>
            <Button asChild variant="ghost" size="sm" className="gap-1.5 text-white hover:bg-white/10 hover:text-white">
              <Link href="/login">
                <LogIn className="h-4 w-4" aria-hidden /> Log in
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-white text-neutral-900 hover:bg-white/90">
              <Link href="/register">
                <UserPlus className="h-4 w-4" aria-hidden /> Sign up
              </Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
