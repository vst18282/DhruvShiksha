'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileClock,
  FileStack,
  Flag,
  HardDrive,
  Hourglass,
  Inbox,
  Layers,
  Link2Off,
  Settings2,
  Share2,
  ShieldCheck,
  TrendingUp,
  UploadCloud,
  UserX,
  Users,
} from 'lucide-react';
import type { AccessLevel, ArchiveItem, AuditEntry, ContentType, Region, Role, SocialAccount, SocialPost, Status, User } from '@/types';
import { AreaTrend } from '@/components/charts/lazy';
import { Donut, RadialGauge, SegmentBar, Sparkline, type Segment } from '@/components/charts/mini';
import { PlatformIcon } from '@/components/studio/platform-icon';
import { WelcomePanel } from '@/components/dashboard/welcome-panel';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/misc';
import { Skeleton, StatSkeleton } from '@/components/skeletons';
import { useApi } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { ACCESS_META, CONTENT_TYPE_LABELS, REGION_META, ROLE_LABELS, STATUS_META } from '@/lib/constants';
import { allItems, itemHref, publishedItems } from '@/lib/archive';
import { embargoDaysLeft, isEmbargoActiveAt } from '@/lib/access';
import { ACTIONS, SUBJECTS, grantKey, resolveCell, scienceReviewEnforced, useCan } from '@/lib/permissions';
import { engagementKey, healthScore } from '@/lib/engagement';
import { affiliationOf } from '@/lib/users';
import { combineEngagement, useEngagementStore } from '@/store/engagement';
import { usePermissionStore } from '@/store/permissions';
import { useDataStore } from '@/store/data';
import { useAuthStore } from '@/store/auth';
import { cn, formatCompact, formatNumber, initials } from '@/lib/utils';

/* --------------------------------- helpers -------------------------------- */

/** Restrained blue-slate scale (no bright accents) used across the overview charts. */
const PALETTE = ['#1E3A5F', '#2F5D8C', '#4A7FB0', '#7AA3C8', '#A9C4DD', '#64748B', '#94A3B8', '#CBD5E1'];
const ROLE_COLORS: Record<Role, string> = { admin: '#1E3A5F', scientist: '#2F5D8C', content_manager: '#4A7FB0', researcher: '#64748B', student: '#7AA3C8' };
const STATUS_COLORS: Record<Status, string> = { draft: '#CBD5E1', in_review: '#B7913A', changes_requested: '#B06F45', approved: '#7AA3C8', scheduled: '#4A7FB0', published: '#2F5D8C', rejected: '#A44B4B', archived: '#64748B' };
const ROLES: Role[] = ['admin', 'scientist', 'content_manager', 'researcher', 'student'];

type MetricKey = 'visitors' | 'downloads' | 'reach' | 'engagement' | 'uploads';
const METRICS: Record<MetricKey, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  // One brand blue for every metric: the selected pill and the chart carry the meaning, not the hue.
  visitors: { label: 'Visitors', color: '#2F5D8C', icon: Eye },
  downloads: { label: 'Downloads', color: '#2F5D8C', icon: Download },
  reach: { label: 'Social reach', color: '#2F5D8C', icon: TrendingUp },
  engagement: { label: 'Engagement', color: '#2F5D8C', icon: Share2 },
  uploads: { label: 'Uploads', color: '#2F5D8C', icon: UploadCloud },
};

const SIZE_WEIGHT: Record<ContentType, number> = { video: 8, dataset: 5, photo: 1.2, report: 0.9, publication: 0.5, expedition: 0.4, event: 0.6, blog: 0.2 };

/** Demo storage estimate: split of used space by content type and months left at the current upload rate. */
function storageEstimate(items: ArchiveItem[], usedGb: number, quotaGb: number, uploadsPerMonth = 40) {
  const weights = new Map<ContentType, number>();
  for (const i of items) weights.set(i.type, (weights.get(i.type) ?? 0) + SIZE_WEIGHT[i.type]);
  const totalW = Array.from(weights.values()).reduce((n, v) => n + v, 0) || 1;
  const split = Array.from(weights, ([t, w]) => ({ t, gb: Math.round((w / totalW) * usedGb) })).sort((a, b) => b.gb - a.gb);
  const perMonthGb = (uploadsPerMonth * usedGb) / Math.max(1, items.length);
  return { used: Math.round((usedGb / quotaGb) * 100), split, monthsLeft: Math.max(0, Math.floor((quotaGb - usedGb) / Math.max(1, perMonthGb))) };
}

const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : 0);
const scoreColor = (s: number) => (s >= 75 ? '#2F5D8C' : s >= 55 ? '#B7913A' : '#A44B4B');

function ago(iso: string, now: number) {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { dateStyle: 'medium' });
}

/** Shared card chrome for overview panels. */
function Panel({ title, icon, action, children, className, id }: { title: string; icon: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} aria-label={title} className={cn('flex min-w-0 flex-col rounded-xl border bg-card p-5 shadow-sm', className)}>
      <header className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden>
          {icon}
        </span>
        <h2 className="font-semibold">{title}</h2>
        {action && <div className="ml-auto">{action}</div>}
      </header>
      {children}
    </section>
  );
}

function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
      {children} <ArrowRight className="h-3 w-3" aria-hidden />
    </Link>
  );
}

/* ---------------------------------- KPIs ---------------------------------- */

function Delta({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold', up ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive')}>
      {up ? <ArrowUpRight className="h-3 w-3" aria-hidden /> : <ArrowDownRight className="h-3 w-3" aria-hidden />}
      {Math.abs(value)}%<span className="sr-only"> vs last month</span>
    </span>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  delta,
  spark,
  active,
  onClick,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  delta?: number;
  spark?: number[];
  active?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${color}1f`, color }} aria-hidden>
          <Icon className="h-4 w-4" />
        </span>
        {delta !== undefined && <Delta value={delta} />}
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {spark ? <Sparkline values={spark} color={color} className="mt-2" label={`${label} trend over 12 months`} /> : sub && <p className="mt-2 text-[11px] text-muted-foreground">{sub}</p>}
    </>
  );
  const cls = cn(
    'group relative rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none',
    active && 'border-transparent ring-2',
  );
  const style = active ? ({ '--tw-ring-color': color } as React.CSSProperties) : undefined;
  if (href)
    return (
      <Link href={href} className={cls} style={style}>
        {body}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cls} style={style}>
      {body}
    </button>
  );
}

/* --------------------------------- overview -------------------------------- */

export function OverviewTab() {
  const router = useRouter();
  const analytics = useApi(['analytics'], api.getAnalytics);
  const posts = useApi(['posts'], api.getPosts);
  const pipeline = useApi(['pipeline'], api.getPipelineItems);
  const users = useApi(['users'], api.getUsers);
  const accounts = useApi(['accounts'], api.getAccounts);
  const audit = useApi(['audit'], api.getAudit);
  const requests = useApi(['access'], api.getAccessRequests);
  const me = useAuthStore((s) => s.user);
  const settings = useDataStore((s) => s.settings);
  const patches = useDataStore((s) => s.patches);
  const uploads = useDataStore((s) => s.uploads);
  const reactions = useEngagementStore((s) => s.reactions);
  const reports = useEngagementStore((s) => s.reports);
  const resolved = useEngagementStore((s) => s.resolved);
  const workflow = usePermissionStore((s) => s.workflow);
  const overrides = usePermissionStore((s) => s.overrides);
  const { table } = useCan();

  const [metric, setMetric] = useState<MetricKey>('visitors');
  const [range, setRange] = useState<'6' | '12'>('12');
  const [dim, setDim] = useState<'type' | 'region' | 'access' | 'status'>('type');
  const [activeSeg, setActiveSeg] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);

  // allItems()/publishedItems() are memoised on these store references.
  const items = useMemo(() => allItems(), [patches, uploads]); // eslint-disable-line react-hooks/exhaustive-deps
  const published = useMemo(() => publishedItems(), [patches, uploads]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Content health across published items and posts */
  const health = useMemo(() => {
    const s = { reactions, reports, resolved };
    const keys = [...published.map((i) => engagementKey(i.type, i.id)), ...(posts.data ?? []).filter((p) => p.status === 'published').map((p) => engagementKey('post', p.id))];
    let sum = 0;
    let openReports = 0;
    let negative = 0;
    let low = 0;
    for (const k of keys) {
      const e = combineEngagement(k, s);
      const score = healthScore(e.likes, e.dislikes);
      sum += score;
      if (score < 55) low++;
      openReports += e.reports.filter((r) => r.status === 'open').length;
      negative += e.reviews.filter((r) => r.rating <= 2 && !resolved.includes(r.id)).length;
    }
    return { avg: keys.length ? Math.round(sum / keys.length) : 0, openReports, negative, low, count: keys.length };
  }, [published, posts.data, reactions, reports, resolved]);

  /* Attention list */
  const attention = useMemo(() => {
    const list: { id: string; level: 'high' | 'medium' | 'info'; icon: React.ComponentType<{ className?: string }>; title: string; detail: string; href: string }[] = [];
    const review = (posts.data ?? []).filter((p) => p.status === 'in_review').length + (pipeline.data ?? []).filter((i) => i.status === 'in_review').length;
    if (health.openReports) list.push({ id: 'reports', level: 'high', icon: Flag, title: `${health.openReports} open report${health.openReports > 1 ? 's' : ''}`, detail: 'Users flagged incorrect, outdated or broken content', href: '/dashboard/admin?tab=health' });
    if (!settings.allowDownloads) list.push({ id: 'downloads', level: 'high', icon: Download, title: 'Downloads are switched off', detail: 'Only owners and admins can download files', href: '/dashboard/admin?tab=system' });
    const soon = now ? items.filter((i) => isEmbargoActiveAt(i, new Date(now)) && embargoDaysLeft(i.embargoUntil!, new Date(now)) <= settings.embargoWarningDays) : [];
    if (soon.length) list.push({ id: 'embargo', level: 'medium', icon: Hourglass, title: `${soon.length} embargo${soon.length > 1 ? 'es' : ''} lifting within ${settings.embargoWarningDays} days`, detail: soon.map((i) => i.title).slice(0, 2).join(' · '), href: '/dashboard/admin?tab=system' });
    const revoked = (accounts.data ?? []).filter((a) => !a.connected);
    if (revoked.length) list.push({ id: 'social', level: 'medium', icon: Link2Off, title: `${revoked.length} social account${revoked.length > 1 ? 's' : ''} disconnected`, detail: revoked.map((a) => a.displayName).join(' · '), href: '/dashboard/admin?tab=social' });
    const conflicts = ACTIONS.flatMap((a) => SUBJECTS.map((s) => resolveCell(a, s, workflow, overrides))).filter((c) => c.source === 'override' && c.workflowKey && grantKey(c.value) !== grantKey(c.workflowValue!)).length;
    if (conflicts) list.push({ id: 'perm', level: 'medium', icon: Settings2, title: `${conflicts} permission edit${conflicts > 1 ? 's' : ''} override the workflow`, detail: 'Review them in the permission table', href: '/dashboard/admin?tab=system#permissions' });
    if (health.negative) list.push({ id: 'reviews', level: 'medium', icon: AlertTriangle, title: `${health.negative} negative review${health.negative > 1 ? 's' : ''} to address`, detail: 'Rated 1–2 stars by readers', href: '/dashboard/admin?tab=health' });
    if (review) list.push({ id: 'review', level: 'info', icon: Inbox, title: `${review} item${review > 1 ? 's' : ''} waiting for content managers`, detail: 'Posts and uploads in review', href: '/dashboard/admin?tab=activity' });
    const a0 = analytics.data;
    if (a0) {
      const st = storageEstimate(items, a0.storage.usedGb, a0.storage.quotaGb, a0.monthly[a0.monthly.length - 1]?.uploads);
      if (st.used >= 85 || st.monthsLeft < 3)
        list.push({ id: 'storage', level: st.used >= 85 ? 'high' : 'medium', icon: HardDrive, title: `Storage ${st.used}% full`, detail: `About ${st.monthsLeft < 1 ? 'less than a month' : `${st.monthsLeft} month${st.monthsLeft === 1 ? '' : 's'}`} left at the current upload rate`, href: '/dashboard/admin#storage' });
    }
    const pendingAccess = (requests.data ?? []).filter((r) => r.status === 'pending').length;
    if (pendingAccess) list.push({ id: 'access', level: 'info', icon: ShieldCheck, title: `${pendingAccess} access request${pendingAccess > 1 ? 's' : ''} pending`, detail: 'Decided by the data owners', href: '/dashboard/admin?tab=audit' });
    const inactive = (users.data ?? []).filter((u) => !u.active).length;
    if (inactive) list.push({ id: 'inactive', level: 'info', icon: UserX, title: `${inactive} deactivated account${inactive > 1 ? 's' : ''}`, detail: 'Reactivate or keep for the record', href: '/dashboard/admin?tab=users' });
    const order = { high: 0, medium: 1, info: 2 };
    return list.sort((a, b) => order[a.level] - order[b.level]);
  }, [posts.data, pipeline.data, health, settings, items, now, accounts.data, workflow, overrides, requests.data, users.data, analytics.data]);

  const a = analytics.data;
  const monthly = a?.monthly ?? [];
  const last = monthly[monthly.length - 1];
  const prev = monthly[monthly.length - 2];
  const series = (k: MetricKey) => monthly.map((m) => m[k]);
  const shown = range === '6' ? monthly.slice(-6) : monthly;
  const vals = shown.map((m) => m[metric]);
  const peak = shown.reduce((best, m) => (m[metric] > (best?.[metric] ?? -1) ? m : best), shown[0]);
  const loading = !a || !users.data || !posts.data;

  const hour = now ? Number(new Date(now).toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false })) : 12;
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const highCount = attention.filter((x) => x.level !== 'info').length;

  return (
    <div className="space-y-6">
      {/* ------------------------------ Greeting ------------------------------ */}
      <WelcomePanel
        className="mb-0"
        eyebrow="Admin console"
        name={me?.name.split(' ').slice(0, 2).join(' ') ?? 'Admin'}
        subtitle={
          <>
            <p>{now ? new Date(now).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '\u00a0'}</p>
            <p className="mt-1">
              {highCount ? `${highCount} thing${highCount > 1 ? 's' : ''} need${highCount === 1 ? 's' : ''} your attention today.` : 'Everything important is in order.'} The portal holds {formatCompact(items.length)} items and {users.data?.length ?? '…'} accounts.
            </p>
          </>
        }
        links={[
          { href: '/dashboard/admin?tab=users', label: 'Manage users', icon: Users },
          { href: '/dashboard/admin?tab=system', label: 'System settings', icon: Settings2 },
          { href: '/dashboard/admin?tab=audit', label: 'Audit log', icon: FileClock },
          { href: '/dashboard/admin?tab=publishing', label: 'Publishing & Insights', icon: TrendingUp },
        ]}
        aside={
          <Link href="/dashboard/admin?tab=health" className="flex items-center gap-5 rounded-xl border bg-background/80 p-5 transition-colors hover:border-primary/40">
            <RadialGauge value={health.avg} color={scoreColor(health.avg)} size={104} label={`Average content health score ${health.avg} out of 100`}>
              <span className="text-2xl font-bold tabular-nums">{health.avg}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">health</span>
            </RadialGauge>
            <div className="min-w-0 space-y-2 text-sm">
              <div>
                <p className="font-medium">Content health</p>
                <p className="text-xs text-muted-foreground">{health.count} published items &amp; posts · {health.low} low score · {health.openReports} open reports</p>
              </div>
              <ul className="flex flex-wrap gap-1.5 text-[11px]">
                <li className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5', !settings.allowDownloads && 'border-destructive/40 text-destructive')}>
                  <Download className="h-3 w-3" aria-hidden /> Downloads {settings.allowDownloads ? 'on' : 'off'}
                </li>
                <li className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                  <ShieldCheck className="h-3 w-3" aria-hidden /> Science review {scienceReviewEnforced(workflow, table) ? 'required' : 'optional'}
                </li>
                <li className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                  <Flag className="h-3 w-3" aria-hidden /> Reactions {settings.enableReactions ? 'on' : 'off'} · reports {settings.enableReporting ? 'on' : 'off'}
                </li>
              </ul>
            </div>
          </Link>
        }
      />
      {/* -------------------------------- KPIs -------------------------------- */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {loading || !last || !prev ? (
          Array.from({ length: 6 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            {(['visitors', 'downloads', 'reach', 'uploads'] as MetricKey[]).map((k) => (
              <KpiCard key={k} label={`${METRICS[k].label} · ${last.month}`} value={formatCompact(last[k])} icon={METRICS[k].icon} color={METRICS[k].color} delta={pct(last[k], prev[k])} spark={series(k)} active={metric === k} onClick={() => setMetric(k)} />
            ))}
            <KpiCard
              label="Active users"
              value={String(users.data!.filter((u) => u.active).length)}
              sub={`${users.data!.filter((u) => affiliationOf(u) === 'internal').length} internal · ${users.data!.filter((u) => affiliationOf(u) === 'external').length} external`}
              icon={Users}
              color="#0EA5E9"
              href="/dashboard/admin?tab=users"
            />
            <KpiCard
              label="Awaiting review"
              value={String((posts.data ?? []).filter((p) => p.status === 'in_review').length + (pipeline.data ?? []).filter((i) => i.status === 'in_review').length)}
              sub="Posts and uploads with content managers"
              icon={Inbox}
              color="#F59E0B"
              href="/dashboard/admin?tab=activity"
            />
          </>
        )}
      </div>

      {/* ------------------------- Trend + attention ------------------------- */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="Traffic & engagement"
          icon={<Activity className="h-4 w-4" />}
          className="lg:col-span-2"
          action={
            <ToggleGroup type="single" value={range} onValueChange={(v) => v && setRange(v as '6' | '12')} aria-label="Range">
              <ToggleGroupItem value="6" className="h-7 text-xs" aria-label="Last 6 months">
                6M
              </ToggleGroupItem>
              <ToggleGroupItem value="12" className="h-7 text-xs" aria-label="Last 12 months">
                12M
              </ToggleGroupItem>
            </ToggleGroup>
          }
        >
          <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Metric">
            {(Object.keys(METRICS) as MetricKey[]).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={metric === k}
                onClick={() => setMetric(k)}
                className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted', metric === k && 'border-transparent text-white hover:bg-transparent')}
                style={metric === k ? { background: METRICS[k].color } : undefined}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: metric === k ? '#fff' : METRICS[k].color }} aria-hidden />
                {METRICS[k].label}
              </button>
            ))}
          </div>
          {a ? (
            <>
              <dl className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ['Total', formatCompact(vals.reduce((n, v) => n + v, 0))],
                  ['Monthly average', formatCompact(Math.round(vals.reduce((n, v) => n + v, 0) / Math.max(1, vals.length)))],
                  ['Peak month', peak ? `${peak.month} · ${formatCompact(peak[metric])}` : '—'],
                  ['Growth', `${pct(vals[vals.length - 1], vals[0]) >= 0 ? '+' : ''}${pct(vals[vals.length - 1], vals[0])}%`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-muted/40 px-3 py-2">
                    <dt className="text-[11px] text-muted-foreground">{k}</dt>
                    <dd className="text-sm font-semibold tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
              <AreaTrend key={`${metric}-${range}`} data={shown} x="month" ys={[{ key: metric, name: METRICS[metric].label, color: METRICS[metric].color }]} height={250} label={`${METRICS[metric].label} per month`} />
            </>
          ) : (
            <Skeleton className="h-[320px] w-full" />
          )}
        </Panel>

        <Panel title="Needs attention" icon={<AlertTriangle className="h-4 w-4" />} action={attention.length ? <Badge variant={highCount ? 'destructive' : 'secondary'}>{attention.length}</Badge> : undefined}>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : attention.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-success" aria-hidden />
              <p className="mt-2 font-medium">All clear</p>
              <p className="text-sm text-muted-foreground">Nothing needs your attention right now.</p>
            </div>
          ) : (
            <ul className="-mx-2 space-y-1">
              {attention.map((x) => (
                <li key={x.id}>
                  <Link href={x.href} className="group flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60">
                    <span
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        x.level === 'high' ? 'bg-destructive/10 text-destructive' : x.level === 'medium' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-primary/10 text-primary',
                      )}
                      aria-hidden
                    >
                      <x.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{x.title}</span>
                      <span className="line-clamp-1 text-xs text-muted-foreground">{x.detail}</span>
                    </span>
                    <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                    <span className="sr-only">{x.level === 'high' ? '(high priority)' : x.level === 'medium' ? '(medium priority)' : '(for information)'}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ------------------------ Mix, pipeline, users ------------------------ */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ContentMix items={items} dim={dim} setDim={(d) => { setDim(d); setActiveSeg(null); }} active={activeSeg} setActive={setActiveSeg} />
        <Pipeline posts={posts.data} pipeline={pipeline.data} onOpen={() => router.push('/dashboard/admin?tab=publishing')} />
        <UsersByRole users={users.data} />
      </div>

      {/* ------------------- Activity, top content, storage ------------------- */}
      <div className="grid gap-4 lg:grid-cols-3">
        <RecentActivity entries={audit.data} now={now} />
        <TopContent items={published} />
        <div className="space-y-4">
          <Storage items={items} usedGb={a?.storage.usedGb} quotaGb={a?.storage.quotaGb} uploadsPerMonth={last?.uploads} />
          <SocialSnapshot accounts={accounts.data} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Content mix ------------------------------- */

function ContentMix({ items, dim, setDim, active, setActive }: { items: ArchiveItem[]; dim: 'type' | 'region' | 'access' | 'status'; setDim: (d: 'type' | 'region' | 'access' | 'status') => void; active: string | null; setActive: (k: string | null) => void }) {
  const segments = useMemo<Segment[]>(() => {
    const counts = new Map<string, number>();
    for (const i of items) {
      const k = dim === 'type' ? i.type : dim === 'region' ? i.region : dim === 'access' ? i.accessLevel : i.status;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const label = (k: string) =>
      dim === 'type' ? CONTENT_TYPE_LABELS[k as ContentType].plural : dim === 'region' ? REGION_META[k as Region].label : dim === 'access' ? ACCESS_META[k as AccessLevel].label : STATUS_META[k as Status].label;
    const color = (k: string, i: number) => (dim === 'status' ? STATUS_COLORS[k as Status] : PALETTE[i % PALETTE.length]);
    return Array.from(counts, ([k, v]) => ({ key: k, label: label(k), value: v }))
      .sort((x, y) => y.value - x.value)
      .map((s, i) => ({ ...s, color: color(s.key, i) }));
  }, [items, dim]);
  const total = segments.reduce((n, s) => n + s.value, 0) || 1;
  return (
    <Panel title="Content mix" icon={<Layers className="h-4 w-4" />}>
      <ToggleGroup type="single" value={dim} onValueChange={(v) => v && setDim(v as typeof dim)} aria-label="Group content by" className="mb-4 justify-start">
        {(['type', 'region', 'access', 'status'] as const).map((d) => (
          <ToggleGroupItem key={d} value={d} className="h-7 px-2.5 text-xs capitalize">
            {d}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="flex flex-col items-center gap-4 sm:flex-row lg:flex-col xl:flex-row">
        <Donut segments={segments} active={active} onActive={setActive} label={`Content by ${dim}`} size={150} />
        <ul className="w-full min-w-0 flex-1 space-y-1" aria-label={`Content by ${dim}`}>
          {segments.map((s) => (
            <li key={s.key}>
              <button
                type="button"
                onMouseEnter={() => setActive(s.key)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(s.key)}
                onBlur={() => setActive(null)}
                className={cn('flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-muted', active === s.key && 'bg-muted')}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{s.label}</span>
                <span className="tabular-nums text-muted-foreground">{s.value}</span>
                <span className="w-9 text-right tabular-nums font-medium">{Math.round((s.value / total) * 100)}%</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

/* -------------------------------- Pipeline -------------------------------- */

function Pipeline({ posts, pipeline, onOpen }: { posts?: SocialPost[]; pipeline?: ArchiveItem[]; onOpen: () => void }) {
  const order: Status[] = ['draft', 'in_review', 'changes_requested', 'approved', 'scheduled', 'published', 'rejected'];
  const segs: Segment[] = order.map((s) => ({ key: s, label: STATUS_META[s].label, value: (posts ?? []).filter((p) => p.status === s).length, color: STATUS_COLORS[s] }));
  const uploadsIn = (pipeline ?? []).filter((i) => i.status === 'in_review').length;
  const uploadDrafts = (pipeline ?? []).filter((i) => i.status === 'draft').length;
  const month = 30 * 86_400_000;
  const t = Date.now();
  const next30 = (posts ?? []).filter((p) => p.status === 'scheduled' && p.scheduledAt && new Date(p.scheduledAt).getTime() > t && new Date(p.scheduledAt).getTime() - t < month).length;
  const last30 = (posts ?? []).filter((p) => p.status === 'published' && p.publishedAt && t - new Date(p.publishedAt).getTime() < month).length;
  return (
    <Panel title="Publishing pipeline" icon={<FileStack className="h-4 w-4" />} action={<PanelLink href="/dashboard/admin?tab=publishing">Open</PanelLink>}>
      {!posts ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <>
          <p className="mb-2 text-xs text-muted-foreground">{posts.length} posts by stage · click a segment</p>
          <SegmentBar segments={segs} onSelect={onOpen} label="Posts by stage" className="h-4" />
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            {segs.map((s) => (
              <li key={s.key} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} aria-hidden />
                <span className="flex-1 text-muted-foreground">{s.label}</span>
                <span className="font-semibold tabular-nums">{s.value}</span>
              </li>
            ))}
          </ul>
          <div className="mt-auto grid grid-cols-3 gap-2 border-t pt-4 text-center">
            {[
              ['Published, last 30 days', last30, CheckCircle2],
              ['Scheduled, next 30 days', next30, Clock],
              ['Uploads in review or draft', uploadsIn + uploadDrafts, Inbox],
            ].map(([l, v, I]) => {
              const Icon = I as React.ComponentType<{ className?: string }>;
              return (
                <div key={l as string} className="rounded-lg bg-muted/40 p-2">
                  <Icon className="mx-auto h-4 w-4 text-muted-foreground" aria-hidden />
                  <p className="mt-1 text-lg font-semibold tabular-nums">{v as number}</p>
                  <p className="text-[10px] leading-tight text-muted-foreground">{l as string}</p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Panel>
  );
}

/* ------------------------------ Users by role ------------------------------ */

function UsersByRole({ users }: { users?: User[] }) {
  if (!users)
    return (
      <Panel title="Users & roles" icon={<Users className="h-4 w-4" />}>
        <Skeleton className="h-40 w-full" />
      </Panel>
    );
  const max = Math.max(1, ...ROLES.map((r) => users.filter((u) => u.role === r).length));
  const internal = users.filter((u) => affiliationOf(u) === 'internal').length;
  const active = users.filter((u) => u.active).length;
  return (
    <Panel title="Users & roles" icon={<Users className="h-4 w-4" />} action={<PanelLink href="/dashboard/admin?tab=users">All users</PanelLink>}>
      <ul className="space-y-2.5">
        {ROLES.map((r) => {
          const list = users.filter((u) => u.role === r);
          const int = list.filter((u) => affiliationOf(u) === 'internal').length;
          return (
            <li key={r}>
              <Link href={`/dashboard/admin?tab=users&role=${r}`} className="group block rounded-md px-1 py-0.5 hover:bg-muted/50" aria-label={`${ROLE_LABELS[r]}: ${list.length} users, ${int} internal. Open list`}>
                <span className="flex items-center justify-between text-xs">
                  <span className="font-medium group-hover:text-primary">{ROLE_LABELS[r]}</span>
                  <span className="tabular-nums text-muted-foreground">{list.length}</span>
                </span>
                <span className="mt-1 flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <span style={{ width: `${(int / max) * 100}%`, background: ROLE_COLORS[r] }} />
                  <span style={{ width: `${((list.length - int) / max) * 100}%`, background: ROLE_COLORS[r], opacity: 0.4 }} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-3 rounded-sm bg-foreground/70" aria-hidden /> internal
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-3 rounded-sm bg-foreground/25" aria-hidden /> external
        </span>
      </p>
      <div className="mt-auto grid grid-cols-3 gap-2 border-t pt-4 text-center">
        {[
          ['Active', `${Math.round((active / users.length) * 100)}%`],
          ['Internal', String(internal)],
          ['External', String(users.length - internal)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-lg bg-muted/40 p-2">
            <p className="text-lg font-semibold tabular-nums">{v}</p>
            <p className="text-[10px] text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ----------------------------- Recent activity ----------------------------- */

function RecentActivity({ entries, now }: { entries?: AuditEntry[]; now: number | null }) {
  const list = (entries ?? []).slice().sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
  return (
    <Panel title="Recent activity" icon={<FileClock className="h-4 w-4" />} action={<PanelLink href="/dashboard/admin?tab=audit">Audit log</PanelLink>}>
      {!entries ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : (
        <ol className="relative space-y-3 border-l pl-5">
          {list.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border-2 border-card text-[9px] font-bold text-white" style={{ background: ROLE_COLORS[e.role] }} aria-hidden>
                {initials(e.actor)}
              </span>
              <p className="text-sm leading-snug">
                <span className="font-medium">{e.actor}</span> <span className="text-muted-foreground">{e.action}</span> <span className="line-clamp-1">{e.itemTitle}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                {ROLE_LABELS[e.role]} · {now ? ago(e.at, now) : ''}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

/* ------------------------------- Top content ------------------------------- */

function TopContent({ items }: { items: ArchiveItem[] }) {
  const [by, setBy] = useState<'views' | 'downloads'>('views');
  const top = [...items].sort((a, b) => b[by] - a[by]).slice(0, 6);
  const max = Math.max(1, ...top.map((i) => i[by]));
  return (
    <Panel
      title="Most popular content"
      icon={<TrendingUp className="h-4 w-4" />}
      action={
        <ToggleGroup type="single" value={by} onValueChange={(v) => v && setBy(v as typeof by)} aria-label="Rank by">
          <ToggleGroupItem value="views" className="h-7 text-xs">
            Views
          </ToggleGroupItem>
          <ToggleGroupItem value="downloads" className="h-7 text-xs">
            Downloads
          </ToggleGroupItem>
        </ToggleGroup>
      }
    >
      <ol className="space-y-2.5">
        {top.map((i, n) => (
          <li key={i.id}>
            <Link href={itemHref(i)} className="group flex items-center gap-3">
              <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold', n === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>{n + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium group-hover:text-primary">{i.title}</span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums">{formatCompact(i[by])}</span>
                </span>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <span className="block h-full rounded-full bg-primary/75 transition-all duration-500 motion-reduce:transition-none" style={{ width: `${(i[by] / max) * 100}%` }} />
                </span>
                <span className="text-[11px] text-muted-foreground">{CONTENT_TYPE_LABELS[i.type].singular}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

/* --------------------------------- Storage --------------------------------- */

function Storage({ items, usedGb, quotaGb, uploadsPerMonth }: { items: ArchiveItem[]; usedGb?: number; quotaGb?: number; uploadsPerMonth?: number }) {
  if (!usedGb || !quotaGb) return <Skeleton className="h-44 w-full rounded-xl" />;
  const { used, split: all, monthsLeft } = storageEstimate(items, usedGb, quotaGb, uploadsPerMonth);
  const split = all.slice(0, 4);
  return (
    <Panel title="Storage" icon={<HardDrive className="h-4 w-4" />} className="scroll-mt-28" id="storage">
      <div className="flex items-center gap-4">
        <RadialGauge value={used} color={used > 85 ? '#A44B4B' : used > 70 ? '#B7913A' : '#2F5D8C'} size={84} stroke={10} label={`Storage ${used}% used`}>
          <span className="text-lg font-bold tabular-nums">{used}%</span>
        </RadialGauge>
        <div className="min-w-0 flex-1 space-y-1.5 text-xs">
          {split.map((s) => (
            <div key={s.t} className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{CONTENT_TYPE_LABELS[s.t].plural}</span>
              <span className="font-medium tabular-nums">{formatNumber(s.gb)} GB</span>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        {formatNumber(usedGb)} of {formatNumber(quotaGb)} GB used · {monthsLeft < 1 ? 'less than a month' : `about ${monthsLeft} month${monthsLeft === 1 ? '' : 's'}`} left at the current upload rate (demo estimate)
      </p>
    </Panel>
  );
}

/* ----------------------------- Social snapshot ----------------------------- */

function SocialSnapshot({ accounts }: { accounts?: SocialAccount[] }) {
  if (!accounts) return <Skeleton className="h-44 w-full rounded-xl" />;
  const followers = accounts.reduce((n, a) => n + a.followers, 0);
  const top = [...accounts].sort((a, b) => b.followers - a.followers).slice(0, 4);
  return (
    <Panel title="Social audience" icon={<Share2 className="h-4 w-4" />} action={<PanelLink href="/dashboard/admin?tab=social">Accounts</PanelLink>}>
      <p className="text-2xl font-semibold tabular-nums">{formatCompact(followers)}</p>
      <p className="text-xs text-muted-foreground">
        followers across {accounts.length} accounts · {accounts.filter((a) => a.connected).length} connected
      </p>
      <ul className="mt-3 space-y-1.5">
        {top.map((a) => (
          <li key={a.id}>
            <Link href={`/dashboard/admin/social/${a.id}`} className="flex items-center gap-2 rounded-md px-1 py-0.5 text-xs hover:bg-muted/60">
              <PlatformIcon id={a.platform} className="h-4 w-4" />
              <span className="min-w-0 flex-1 truncate">{a.displayName}</span>
              <span className="tabular-nums text-muted-foreground">{formatCompact(a.followers)}</span>
              {!a.connected && <Link2Off className="h-3 w-3 text-destructive" aria-label="Disconnected" />}
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

