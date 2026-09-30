'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  Clock,
  FilePlus2,
  Megaphone,
  PenSquare,
  Repeat2,
  Rocket,
  Share2,
  Sparkles,
  TrendingUp,
  Trophy,
  Wand2,
  type LucideIcon,
} from 'lucide-react';
import type { PlatformId, SocialPost } from '@/types';
import { ApprovalQueue } from '@/components/approvals/approval-queue';
import { EmbargoNotice } from '@/components/archive/embargo-notice';
import { TrendDual } from '@/components/charts/lazy';
import { EmptyState } from '@/components/common';
import { PlatformIcon, brandHex } from '@/components/studio/platform-icon';
import { Button } from '@/components/ui/button';
import { Skeleton, StatSkeleton } from '@/components/skeletons';
import { useApi } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { itemHref, publishedItems } from '@/lib/archive';
import { PLATFORM_META, SPECIAL_DAYS } from '@/lib/constants';
import { useCan } from '@/lib/permissions';
import { cn, formatCompact } from '@/lib/utils';

const DAY = 86_400_000;
const IST: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Kolkata' };
const istDayKey = (d: Date) => d.toLocaleDateString('en-CA', IST);

function upcomingSpecialDays(n = 4) {
  const now = new Date();
  return SPECIAL_DAYS.map((d) => {
    let dt = new Date(now.getFullYear(), d.month - 1, d.day);
    if (dt < now) dt = new Date(now.getFullYear() + 1, d.month - 1, d.day);
    return { ...d, date: dt, days: Math.ceil((dt.getTime() - now.getTime()) / DAY) };
  })
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, n);
}

/** "in 3 h", "in 2 days". */
function until(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) return 'due';
  const h = Math.round(ms / 3_600_000);
  if (h < 1) return `in ${Math.max(1, Math.round(ms / 60_000))} min`;
  if (h < 24) return `in ${h} h`;
  const d = Math.round(ms / DAY);
  return `in ${d} day${d === 1 ? '' : 's'}`;
}

function dayHeading(d: Date) {
  const key = istDayKey(d);
  if (key === istDayKey(new Date())) return 'Today';
  if (key === istDayKey(new Date(Date.now() + DAY))) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { ...IST, weekday: 'long', day: 'numeric', month: 'short' });
}

const platformIdOf = (label: string) => (Object.keys(PLATFORM_META) as PlatformId[]).find((p) => PLATFORM_META[p].label === label);

const TONES = {
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-300',
  teal: 'bg-teal-500/10 text-teal-600 dark:text-teal-300',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
} as const;

function Kpi({ label, value, icon: Icon, tone, note, delta, href }: { label: string; value: number; icon: LucideIcon; tone: keyof typeof TONES; note?: string; delta?: number; href?: string }) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', TONES[tone])}><Icon className="h-4 w-4" aria-hidden /></span>
        {typeof delta === 'number' && <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-success">+{delta}%</span>}
        {href && typeof delta !== 'number' && <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />}
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight">{formatCompact(value)}</p>
      <p className="text-sm font-medium">{label}</p>
      {note && <p className="mt-0.5 truncate text-xs text-muted-foreground">{note}</p>}
    </>
  );
  const cls = 'group block rounded-xl border bg-card p-4 shadow-sm';
  return href ? <Link href={href} className={cn(cls, 'transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring')}>{body}</Link> : <div className={cls}>{body}</div>;
}

function Card({ id, title, icon: Icon, subtitle, action, className, children }: { id: string; title: string; icon: LucideIcon; subtitle?: string; action?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className={cn('flex min-w-0 flex-col rounded-xl border bg-card p-4 shadow-sm sm:p-5', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><Icon className="h-4 w-4" aria-hidden /></span>
          <div className="min-w-0">
            <h2 id={id} className="font-semibold">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const moreLink = (href: string, text: string) => (
  <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline">{text} <ArrowRight className="h-3 w-3" aria-hidden /></Link>
);

function UpcomingSchedule({ scheduled }: { scheduled: SocialPost[] }) {
  const now = Date.now();
  const future = scheduled.filter((p) => new Date(p.scheduledAt!).getTime() >= now);
  const week = future.filter((p) => new Date(p.scheduledAt!).getTime() - now < 7 * DAY);
  const shown = (week.length ? week : future).slice(0, 6);
  const groups = shown.reduce<{ key: string; label: string; posts: SocialPost[] }[]>((acc, p) => {
    const d = new Date(p.scheduledAt!);
    const key = istDayKey(d);
    const g = acc.find((x) => x.key === key);
    if (g) g.posts.push(p);
    else acc.push({ key, label: dayHeading(d), posts: [p] });
    return acc;
  }, []);
  const next = future[0];
  return (
    <Card id="cal" title="Upcoming schedule" icon={CalendarClock} subtitle={week.length ? `${week.length} post${week.length === 1 ? '' : 's'} in the next 7 days` : future.length ? 'Nothing this week · showing what is next' : undefined} action={moreLink('/studio/calendar', 'Calendar')}>
      {next && (
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-primary/5 px-3 py-2.5 text-sm">
          <Clock className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 flex-1 truncate">Next up: <span className="font-medium">{next.title}</span></span>
          <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">{until(next.scheduledAt!)}</span>
        </div>
      )}
      {groups.length === 0 ? (
        <EmptyState title="Nothing scheduled" description="Schedule a post from the Content Studio." action={<Button size="sm" asChild><Link href="/studio">New post</Link></Button>} />
      ) : (
        <ol className="space-y-4">
          {groups.map((g) => (
            <li key={g.key}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</p>
              <ul className="relative space-y-2 border-l pl-4">
                {g.posts.map((p) => {
                  const c = brandHex(p.platforms[0] ?? 'x');
                  return (
                    <li key={p.id} className="relative">
                      <span className="absolute -left-[21px] top-3 h-2.5 w-2.5 rounded-full border-2 border-card" style={{ background: c === '#000000' ? '#3B82C4' : c }} aria-hidden />
                      <div className="flex items-center gap-3 rounded-lg border p-2.5 transition-colors hover:bg-muted/40">
                        <span className="w-12 shrink-0 text-sm font-semibold tabular-nums">{new Date(p.scheduledAt!).toLocaleTimeString('en-IN', { ...IST, hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-1 text-sm font-medium">{p.title}</span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            {p.platforms.map((pl) => <PlatformIcon key={pl} id={pl} title={PLATFORM_META[pl].label} className="h-3.5 w-3.5" />)}
                            <span>· {p.accountIds.length} account{p.accountIds.length === 1 ? '' : 's'}</span>
                          </span>
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{until(p.scheduledAt!)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

type Analytics = Awaited<ReturnType<typeof api.getAnalytics>>;

function SocialReach({ data, animate }: { data?: Analytics; animate: boolean }) {
  const m = data?.monthly ?? [];
  const total = m.reduce((s, r) => s + r.reach, 0);
  const best = m.reduce<(typeof m)[number] | undefined>((b, r) => (!b || r.reach > b.reach ? r : b), undefined);
  const last = m[m.length - 1];
  const prev = m[m.length - 2];
  const change = last && prev ? Math.round(((last.reach - prev.reach) / prev.reach) * 100) : 0;
  const rate = total ? (m.reduce((s, r) => s + r.engagement, 0) / total) * 100 : 0;
  return (
    <Card id="reach" title="Social reach" icon={TrendingUp} subtitle="Last 12 months, all accounts" action={moreLink('/studio/analytics', 'Analytics')}>
      {!data ? <Skeleton className="h-[300px] w-full" /> : (
        <>
          <dl className="mb-4 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-muted/50 px-3 py-2"><dt className="text-[11px] text-muted-foreground">Total reach</dt><dd className="text-lg font-semibold tabular-nums">{formatCompact(total)}</dd></div>
            <div className="rounded-lg bg-muted/50 px-3 py-2"><dt className="text-[11px] text-muted-foreground">Last month</dt><dd className={cn('text-lg font-semibold tabular-nums', change >= 0 ? 'text-success' : 'text-destructive')}>{change >= 0 ? '+' : ''}{change}%</dd></div>
            <div className="rounded-lg bg-muted/50 px-3 py-2"><dt className="text-[11px] text-muted-foreground">Engagement rate</dt><dd className="text-lg font-semibold tabular-nums">{rate.toFixed(1)}%</dd></div>
          </dl>
          <TrendDual data={m} x="month" a={{ key: 'reach', name: 'Reach', color: '#3B82C4' }} b={{ key: 'engagement', name: 'Engagement', color: '#8B5CF6' }} label="Monthly reach and engagement" height={230} animate={animate} />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-3" aria-hidden>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-[#3B82C4]" /> Reach (left axis)</span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded border-t-2 border-dashed border-[#8B5CF6]" /> Engagement (right axis)</span>
            </span>
            {best && <span>Peak: <span className="font-medium text-foreground">{best.month}</span> · {formatCompact(best.reach)}</span>}
          </div>
        </>
      )}
    </Card>
  );
}

function ReachByPlatform({ data }: { data?: Analytics }) {
  const rows = [...(data?.byPlatform ?? [])].sort((a, b) => b.reach - a.reach);
  const total = rows.reduce((s, r) => s + r.reach, 0);
  const max = Math.max(1, ...rows.map((r) => r.reach));
  return (
    <Card id="plat" title="Reach by platform" icon={Share2} subtitle="Share of total reach and engagement rate" action={moreLink('/studio/accounts', 'Accounts')}>
      {!data ? <Skeleton className="h-[260px] w-full" /> : (
        <>
          {/* One restrained blue scale (darkest = largest share) instead of brand colours. */}
          <div className="mb-4 flex h-2.5 gap-px overflow-hidden rounded-full bg-muted" aria-hidden>
            {rows.map((r, i) => (
              <span key={r.platform} className="h-full bg-primary" style={{ width: `${(r.reach / total) * 100}%`, opacity: Math.max(0.25, 1 - i * 0.15) }} title={r.platform} />
            ))}
          </div>
          <ul className="space-y-3">
            {rows.map((r, i) => {
              const id = platformIdOf(r.platform);
              const er = (r.engagement / r.reach) * 100;
              return (
                <li key={r.platform} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground">
                    {id ? <PlatformIcon id={id} monochrome className="h-4 w-4" /> : null}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium">{r.platform}</span>
                      <span className="tabular-nums"><span className="font-semibold">{formatCompact(r.reach)}</span> <span className="text-xs text-muted-foreground">· {Math.round((r.reach / total) * 100)}%</span></span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(r.reach / max) * 100}%`, opacity: Math.max(0.35, 1 - i * 0.12) }} />
                    </div>
                  </div>
                  <span className={cn('w-16 shrink-0 rounded-md border px-2 py-0.5 text-center text-[11px] tabular-nums', er >= 6 ? 'font-semibold text-foreground' : 'text-muted-foreground')} title="Engagement rate">{er.toFixed(1)}%</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[11px] text-muted-foreground">Right-hand figure: engagement rate (engagement ÷ reach). Bold: 6% or more.</p>
        </>
      )}
    </Card>
  );
}

const MEDALS = ['bg-amber-400/25 text-amber-700 dark:text-amber-300', 'bg-slate-400/25 text-slate-700 dark:text-slate-300', 'bg-orange-400/25 text-orange-700 dark:text-orange-300'];

function TopPosts({ published }: { published: SocialPost[] }) {
  const top = [...published].filter((p) => p.metrics).sort((a, b) => b.metrics!.reach - a.metrics!.reach).slice(0, 5);
  const max = Math.max(1, ...top.map((p) => p.metrics!.reach));
  return (
    <Card id="top" title="Top posts" icon={Trophy} subtitle="Ranked by reach" action={moreLink('/studio/analytics', 'All posts')}>
      {top.length === 0 ? <EmptyState title="No published posts yet" /> : (
        <ol className="space-y-3">
          {top.map((p, i) => {
            const er = p.metrics!.reach ? (p.metrics!.engagement / p.metrics!.reach) * 100 : 0;
            return (
              <li key={p.id} className="flex items-start gap-3">
                <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold', MEDALS[i] ?? 'bg-muted text-muted-foreground')}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium">{p.title}</p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary" style={{ width: `${(p.metrics!.reach / max) * 100}%` }} />
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">{p.platforms.map((pl) => <PlatformIcon key={pl} id={pl} title={PLATFORM_META[pl].label} className="h-3 w-3" />)}</span>
                    <span><span className="font-semibold text-foreground">{formatCompact(p.metrics!.reach)}</span> reach</span>
                    <span>{formatCompact(p.metrics!.clicks)} clicks</span>
                    <span className={cn(er >= 6 && 'font-medium text-success')}>{er.toFixed(1)}% eng.</span>
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

export function ContentOverview() {
  const { can, canFully } = useCan();
  const reduce = useReducedMotion() ?? false;
  const posts = useApi(['posts'], api.getPosts);
  const analytics = useApi(['analytics'], api.getAnalytics);
  const all = posts.data ?? [];
  const scheduled = all.filter((p) => p.status === 'scheduled' && p.scheduledAt).sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!));
  const soon = scheduled.filter((p) => { const t = new Date(p.scheduledAt!).getTime() - Date.now(); return t >= 0 && t < 7 * DAY; }).length;
  const pending = all.filter((p) => p.status === 'in_review').length;
  const published = all.filter((p) => p.status === 'published');
  const reach = published.reduce((a, p) => a + (p.metrics?.reach ?? 0), 0);
  const evergreen = useMemo(() => publishedItems().filter((i) => i.year <= 2020 && (i.type === 'blog' || i.type === 'report')).sort((a, b) => b.views - a.views).slice(0, 4), []);

  const actions: { href: string; label: string; hint: string; icon: LucideIcon; show?: boolean; primary?: boolean }[] = [
    { href: '/studio', label: 'New post', hint: 'Write for web or social', icon: PenSquare, primary: true },
    { href: '/studio?source=report:rep-bharati-sea-ice', label: 'Generate from report', hint: 'AI draft from the archive', icon: Wand2 },
    { href: '/studio/calendar', label: 'Schedule', hint: 'Plan the calendar', icon: CalendarDays },
    { href: '/studio/accounts', label: 'Manage accounts', hint: 'Connected channels', icon: Share2, show: canFully('manage_social_accounts') },
    { href: '/dashboard/content?tab=cms', label: 'Write a blog', hint: 'Editor & homepage', icon: FilePlus2 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {posts.isPending ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />) : (
          <>
            <Kpi label="Awaiting approval" value={pending} icon={ClipboardCheck} tone="amber" note={pending ? 'Drafts from scientists & researchers' : 'Queue is clear'} href="/studio/approvals" />
            <Kpi label="Scheduled" value={scheduled.length} icon={CalendarClock} tone="sky" note={`${soon} in the next 7 days`} href="/studio/calendar" />
            <Kpi label="Published (30 days)" value={published.length} icon={Rocket} tone="teal" note="Across all connected accounts" />
            <Kpi label="Total reach" value={reach} icon={BarChart3} tone="violet" delta={14} note="vs previous 30 days" />
          </>
        )}
      </div>

      <nav aria-label="Quick actions" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {actions.filter((a) => a.show !== false).map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className={cn(
              'group flex items-center gap-3 rounded-xl border p-3 transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:translate-y-0',
              a.primary ? 'border-primary/30 bg-primary text-primary-foreground' : 'bg-card',
            )}
          >
            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', a.primary ? 'bg-white/15' : 'bg-secondary text-primary')}><a.icon className="h-4 w-4" aria-hidden /></span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{a.label}</span>
              <span className={cn('block truncate text-[11px]', a.primary ? 'text-primary-foreground/75' : 'text-muted-foreground')}>{a.hint}</span>
            </span>
          </Link>
        ))}
      </nav>

      {can('approve_publish') && (
        <Card id="queue" title="Approval queue" icon={ClipboardCheck} subtitle="Drafts and uploads from scientists and researchers. Your own posts publish directly." action={moreLink('/studio/approvals', 'Full queue')}>
          <ApprovalQueue />
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <UpcomingSchedule scheduled={scheduled} />
        <SocialReach data={analytics.data} animate={!reduce} />
        <ReachByPlatform data={analytics.data} />
        <TopPosts published={published} />
      </div>

      <EmbargoNotice scope="all" />

      <section aria-label="Suggestions" className="grid gap-4 lg:grid-cols-2">
        <Card id="sugg" title="Suggested: special days" icon={Sparkles} subtitle="Coming up on the calendar" className="bg-gradient-to-br from-polar-amber/10 via-card to-card">
          <ul className="space-y-2">
            {upcomingSpecialDays().map((d) => (
              <li key={d.name} className="flex items-center gap-3 rounded-lg border bg-card p-2.5 text-sm">
                <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-polar-amber/15 leading-none">
                  <span className="text-sm font-bold">{d.date.getDate()}</span>
                  <span className="text-[9px] uppercase">{d.date.toLocaleDateString('en-IN', { month: 'short' })}</span>
                </span>
                <span className="min-w-0 flex-1"><span className="block truncate font-medium">{d.name}</span><span className="text-xs text-muted-foreground">in {d.days} days</span></span>
                <Button size="sm" variant="outline" asChild><Link href={`/studio?note=${encodeURIComponent(`Post for ${d.name}`)}`}><Megaphone /> Draft</Link></Button>
              </li>
            ))}
          </ul>
        </Card>
        <Card id="ever" title="Evergreen content worth re-sharing" icon={Repeat2} subtitle="Older articles that still draw readers">
          <ul className="space-y-2">
            {evergreen.map((i) => (
              <li key={i.id} className="flex items-center gap-3 rounded-lg border p-2.5 text-sm">
                <span className="min-w-0 flex-1">
                  <Link href={itemHref(i)} className="line-clamp-1 font-medium hover:text-primary hover:underline">{i.title}</Link>
                  <span className="text-xs text-muted-foreground">{i.year} · {formatCompact(i.views)} views</span>
                </span>
                <Button size="sm" variant="ghost" asChild><Link href={`/studio?source=${i.type}:${i.id}`}><Repeat2 /> Re-share</Link></Button>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
