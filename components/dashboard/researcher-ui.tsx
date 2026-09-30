'use client';

import Link from 'next/link';
import { ArrowRight, BookMarked, CalendarDays, Database, FileText, Film, Image as ImageIcon, Newspaper, Ship, type LucideIcon } from 'lucide-react';
import type { ContentType } from '@/types';
import { cn, formatCompact } from '@/lib/utils';

/** Shared building blocks for the researcher workspace sections. */

export const TYPE_ICON: Record<ContentType, LucideIcon> = {
  blog: Newspaper,
  report: FileText,
  dataset: Database,
  publication: BookMarked,
  photo: ImageIcon,
  video: Film,
  event: CalendarDays,
  expedition: Ship,
};

export const TYPE_TONE: Record<ContentType, string> = {
  blog: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
  report: 'bg-sky-500/10 text-sky-600 dark:text-sky-300',
  dataset: 'bg-teal-500/10 text-teal-600 dark:text-teal-300',
  publication: 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
  photo: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
  video: 'bg-orange-500/10 text-orange-600 dark:text-orange-300',
  event: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  expedition: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300',
};

export function TypeBadge({ type, className }: { type: ContentType; className?: string }) {
  const Icon = TYPE_ICON[type];
  return (
    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', TYPE_TONE[type], className)} aria-hidden>
      <Icon className="h-4 w-4" />
    </span>
  );
}

export const TONES = {
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-300',
  teal: 'bg-teal-500/10 text-teal-600 dark:text-teal-300',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
} as const;
export type Tone = keyof typeof TONES;

export function Kpi({ label, value, icon: Icon, tone, note, href }: { label: string; value: number | string; icon: LucideIcon; tone: Tone; note?: string; href?: string }) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', TONES[tone])}><Icon className="h-4 w-4" aria-hidden /></span>
        {href && <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />}
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight">{typeof value === 'number' ? formatCompact(value) : value}</p>
      <p className="text-sm font-medium">{label}</p>
      {note && <p className="mt-0.5 truncate text-xs text-muted-foreground">{note}</p>}
    </>
  );
  const cls = 'group block rounded-xl border bg-card p-4 shadow-sm';
  return href ? <Link href={href} className={cn(cls, 'transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring')}>{body}</Link> : <div className={cls}>{body}</div>;
}

export function Panel({ id, title, icon: Icon, subtitle, action, className, bodyClassName, children }: { id: string; title: string; icon: LucideIcon; subtitle?: string; action?: React.ReactNode; className?: string; bodyClassName?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className={cn('flex min-w-0 flex-col rounded-xl border bg-card shadow-sm', className)}>
      <div className="flex items-start justify-between gap-3 border-b px-5 py-3.5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><Icon className="h-4 w-4" aria-hidden /></span>
          <div className="min-w-0">
            <h2 id={id} className="font-semibold">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className={cn('flex-1 p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

export const MoreLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline">{children} <ArrowRight className="h-3 w-3" aria-hidden /></Link>
);

export const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export function daysSince(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}
