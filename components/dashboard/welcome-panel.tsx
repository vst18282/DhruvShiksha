'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { SearchBox } from '@/components/search/search-box';
import { cn } from '@/lib/utils';

export function greeting(now = new Date()) {
  const h = Number(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export interface WelcomeLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Overview greeting shared by every role's dashboard: a quiet primary-tinted card with a small-caps
 * eyebrow, "Good morning, <name>" with the name in the cursive display face, a subtitle, shortcut
 * chips, and a right-hand slot (the archive search by default).
 */
export function WelcomePanel({
  eyebrow,
  name,
  subtitle,
  links = [],
  aside,
  searchPlaceholder = 'Search the archive…',
  tip,
  children,
  className,
}: {
  eyebrow: string;
  name: string;
  subtitle?: React.ReactNode;
  links?: WelcomeLink[];
  aside?: React.ReactNode;
  searchPlaceholder?: string;
  tip?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby="welcome" className={cn('relative mb-6 overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm md:p-8', className)}>
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-polar-teal/10 blur-3xl" aria-hidden />
      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">
            <span className="h-px w-8 bg-primary/50" aria-hidden /> {eyebrow}
          </p>
          <h1 id="welcome" className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
            {greeting()}, <span className="font-script text-[1.2em] font-normal text-primary">{name}</span>
          </h1>
          {subtitle && <div className="mt-2 text-sm text-muted-foreground">{subtitle}</div>}
          {links.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {links.map((l) => (
                <Link key={l.href + l.label} href={l.href} className="inline-flex items-center gap-1.5 rounded-full border bg-background/80 px-3 py-1 text-sm transition-colors hover:border-primary hover:bg-primary/5">
                  <l.icon className="h-3.5 w-3.5 text-primary" aria-hidden /> {l.label}
                </Link>
              ))}
            </div>
          )}
          {children}
        </div>
        <div className="min-w-0 text-foreground">
          {aside ?? (
            <>
              <SearchBox size="lg" placeholder={searchPlaceholder} />
              {tip && <p className="mt-2 text-xs text-muted-foreground">{tip}</p>}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
