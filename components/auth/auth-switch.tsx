'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LockKeyhole } from 'lucide-react';
import { safeNext } from '@/lib/auth/redirect';
import { cn } from '@/lib/utils';

/** Segmented Log in / Sign up switch. Carries `?next=` across so either path ends at the same page. */
export function AuthSwitchLinks({ mode, next }: { mode: 'login' | 'register'; next: string | null }) {
  const q = next ? `?next=${encodeURIComponent(next)}` : '';
  const tab = (active: boolean) =>
    cn(
      'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
      active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
    );
  return (
    <div role="tablist" aria-label="Account" className="inline-flex rounded-lg border bg-muted p-1">
      <Link role="tab" aria-selected={mode === 'login'} href={`/login${q}`} className={tab(mode === 'login')}>
        Log in
      </Link>
      <Link role="tab" aria-selected={mode === 'register'} href={`/register${q}`} className={tab(mode === 'register')}>
        Sign up
      </Link>
    </div>
  );
}

export function AuthSwitch({ mode }: { mode: 'login' | 'register' }) {
  const next = safeNext(useSearchParams().get('next'));
  return <AuthSwitchLinks mode={mode} next={next} />;
}

/** Shown when the visitor was sent here from a page that needs an account. */
export function ContinueNotice() {
  const next = safeNext(useSearchParams().get('next'));
  if (!next) return null;
  return (
    <p role="status" className="mb-6 flex items-start gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
      <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
      <span>
        Log in or sign up to continue. You’ll be taken to <span className="font-mono text-xs">{next.split(/[?#]/)[0]}</span> straight after.
      </span>
    </p>
  );
}
