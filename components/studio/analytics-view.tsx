'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ExternalLink, Eye, MousePointerClick, Share2, Sparkles, TrendingUp, X } from 'lucide-react';
import type { PlatformId, SocialPost } from '@/types';
import { Stat, EmptyState } from '@/components/common';
import { AreaTrend, BarColors, BarSimple, ChartCard, DonutTotal, TrendDual } from '@/components/charts/lazy';
import { PlatformIcon, PlatformTile, brandHex } from './platform-icon';
import { PostDetailDialog } from './post-detail';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/misc';
import { ListRowSkeleton, Skeleton, StatSkeleton } from '@/components/skeletons';
import { useApi } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { PLATFORM_META } from '@/lib/constants';
import { accountStats } from '@/lib/social';
import { useAuthStore } from '@/store/auth';
import { cn, formatCompact } from '@/lib/utils';

type AccSort = 'reach' | 'rate' | 'followers';
type PostMetric = 'reach' | 'engagement' | 'clicks';
const METRIC_LABEL: Record<PostMetric, string> = { reach: 'Reach', engagement: 'Engagement', clicks: 'Clicks' };
const PLATFORMS = Object.keys(PLATFORM_META) as PlatformId[];

/**
 * Social analytics. Top of the page: per-account performance and top posts (click an account to
 * filter the top posts; click a post for details). Other insights follow below.
 */
export function AnalyticsView({ embedded = false }: { embedded?: boolean }) {
  const analytics = useApi(['analytics'], api.getAnalytics);
  const posts = useApi(['posts'], api.getPosts);
  const accounts = useApi(['accounts'], api.getAccounts);
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  // Content managers get the richer insight charts; the admin's embedded view keeps its own.
  const fancy = useAuthStore((s) => s.user?.role === 'content_manager');
  const [platform, setPlatform] = useState<PlatformId | 'all'>('all');
  const [account, setAccount] = useState<string | null>(null);
  const [accSort, setAccSort] = useState<AccSort>('reach');
  const [metric, setMetric] = useState<PostMetric>('reach');
  const [open, setOpen] = useState<SocialPost | null>(null);

  const published = useMemo(() => (posts.data ?? []).filter((p) => p.status === 'published' && p.metrics), [posts.data]);
  const scoped = published.filter((p) => (platform === 'all' || p.platforms.includes(platform)) && (!account || p.accountIds.includes(account)));
  const totals = scoped.reduce((a, p) => ({ reach: a.reach + p.metrics!.reach, impressions: a.impressions + p.metrics!.impressions, engagement: a.engagement + p.metrics!.engagement, clicks: a.clicks + p.metrics!.clicks }), { reach: 0, impressions: 0, engagement: 0, clicks: 0 });

  const perAccount = useMemo(() => {
    const list = (accounts.data ?? []).filter((a) => platform === 'all' || a.platform === platform).map((a) => ({ a, s: accountStats(published, a) }));
    const key = (r: (typeof list)[number]) => (accSort === 'reach' ? r.s.reach : accSort === 'rate' ? r.s.rate : r.a.followers);
    return list.sort((x, y) => key(y) - key(x));
  }, [accounts.data, published, platform, accSort]);
  const maxReach = Math.max(1, ...perAccount.map((r) => r.s.reach));

  const top = [...scoped].sort((x, y) => y.metrics![metric] - x.metrics![metric]).slice(0, 8);
  const maxMetric = Math.max(1, ...top.map((p) => p.metrics![metric]));
  const selected = accounts.data?.find((a) => a.id === account);
  const a = analytics.data;
  const loading = posts.isPending || accounts.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {embedded ? <h2 className="text-lg font-semibold">Social analytics</h2> : <h1 className="text-2xl font-semibold">Social analytics</h1>}
          <p className="text-xs text-muted-foreground">Demo metrics · click an account to focus its top posts</p>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by platform">
          <button type="button" aria-pressed={platform === 'all'} onClick={() => { setPlatform('all'); setAccount(null); }} className={cn('rounded-full border px-2.5 py-1 text-xs hover:bg-muted', platform === 'all' && 'border-primary bg-primary/10 font-medium')}>
            All platforms
          </button>
          {PLATFORMS.filter((p) => accounts.data?.some((x) => x.platform === p)).map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={platform === p}
              onClick={() => { setPlatform(platform === p ? 'all' : p); setAccount(null); }}
              className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs hover:bg-muted', platform === p && 'border-primary bg-primary/10 font-medium')}
            >
              <PlatformIcon id={p} className="h-3.5 w-3.5" /> {PLATFORM_META[p].label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2 [&>*]:min-w-0">
        <section aria-labelledby="pa-h" className="rounded-xl border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <h2 id="pa-h" className="font-semibold">
              Per-account performance
            </h2>
            <ToggleGroup type="single" value={accSort} onValueChange={(v) => v && setAccSort(v as AccSort)} aria-label="Sort accounts by">
              <ToggleGroupItem value="reach" className="h-7 text-xs">Reach</ToggleGroupItem>
              <ToggleGroupItem value="rate" className="h-7 text-xs">Eng. rate</ToggleGroupItem>
              <ToggleGroupItem value="followers" className="h-7 text-xs">Followers</ToggleGroupItem>
            </ToggleGroup>
          </div>
          {loading ? (
            <div className="space-y-2 p-3">{Array.from({ length: 4 }).map((_, i) => <ListRowSkeleton key={i} />)}</div>
          ) : perAccount.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No accounts on this platform.</p>
          ) : (
            <ul className="divide-y">
              {perAccount.map(({ a: acc, s }) => {
                const on = account === acc.id;
                return (
                  <li key={acc.id} className={cn('relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40', on && 'bg-primary/5')}>
                    <button type="button" aria-pressed={on} onClick={() => setAccount(on ? null : acc.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`${on ? 'Stop focusing' : 'Focus'} ${acc.displayName}`}>
                      <PlatformTile id={acc.platform} className={cn(on && 'ring-2 ring-primary')} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-medium">{acc.displayName}</span>
                          <span className="shrink-0 text-sm font-semibold tabular-nums">{formatCompact(s.reach)}</span>
                        </span>
                        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                          <span className="block h-full rounded-full bg-gradient-to-r from-polar-teal to-primary transition-all" style={{ width: `${(s.reach / maxReach) * 100}%` }} />
                        </span>
                        <span className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                          <span>{acc.handle}</span>
                          <span>{formatCompact(acc.followers)} followers</span>
                          <span>{s.published} posts</span>
                          <span className={cn(s.rate >= 5 && 'font-medium text-success')}>{s.rate}% eng.</span>
                        </span>
                      </span>
                    </button>
                    {isAdmin && (
                      <Link href={`/dashboard/admin/social/${acc.id}`} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Open profile of ${acc.displayName}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="tp-h" className="rounded-xl border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <h2 id="tp-h" className="font-semibold">
              Top posts
            </h2>
            <ToggleGroup type="single" value={metric} onValueChange={(v) => v && setMetric(v as PostMetric)} aria-label="Rank posts by">
              {(Object.keys(METRIC_LABEL) as PostMetric[]).map((m) => (
                <ToggleGroupItem key={m} value={m} className="h-7 text-xs">
                  {METRIC_LABEL[m]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          {selected && (
            <div className="flex items-center gap-2 border-b bg-primary/5 px-4 py-2 text-xs">
              <PlatformIcon id={selected.platform} /> Showing posts on <strong>{selected.displayName}</strong>
              <Button variant="ghost" size="sm" className="ml-auto h-6 px-2 text-xs" onClick={() => setAccount(null)}>
                <X className="h-3 w-3" /> Clear
              </Button>
            </div>
          )}
          {loading ? (
            <div className="space-y-2 p-3">{Array.from({ length: 4 }).map((_, i) => <ListRowSkeleton key={i} />)}</div>
          ) : top.length === 0 ? (
            <EmptyState className="m-4" title="No published posts" description="Nothing matches this platform or account yet." />
          ) : (
            <ol className="divide-y">
              {top.map((p, i) => (
                <li key={p.id}>
                  <button type="button" onClick={() => setOpen(p)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40">
                    <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold', i === 0 ? 'bg-polar-amber/25 text-foreground' : 'bg-muted text-muted-foreground')}>{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium">{p.title}</span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums">{formatCompact(p.metrics![metric])}</span>
                      </span>
                      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                        <span className="block h-full rounded-full bg-gradient-to-r from-polar-violet to-primary transition-all" style={{ width: `${(p.metrics![metric] / maxMetric) * 100}%` }} />
                      </span>
                      <span className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        {p.platforms.map((pl) => (
                          <PlatformIcon key={pl} id={pl} title={PLATFORM_META[pl].label} className="h-3 w-3" />
                        ))}
                        <span>{new Date(p.publishedAt!).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <h2 className="border-t pt-5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">More insights</h2>
      {fancy ? <Insights a={a} totals={totals} loading={loading} /> : (
      <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <Stat label="Reach" value={totals.reach} icon={<TrendingUp className="h-4 w-4" />} />
            <Stat label="Impressions" value={totals.impressions} icon={<Eye className="h-4 w-4" />} />
            <Stat label="Engagement" value={totals.engagement} icon={<Share2 className="h-4 w-4" />} />
            <Stat label="Link clicks" value={totals.clicks} icon={<MousePointerClick className="h-4 w-4" />} />
          </>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Reach & engagement over 12 months">{a && <AreaTrend data={a.monthly} x="month" ys={[{ key: 'reach', name: 'Reach' }, { key: 'engagement', name: 'Engagement', color: '#8B5CF6' }]} label="Reach and engagement trend" />}</ChartCard>
        <ChartCard title="By platform">{a && <BarSimple data={a.byPlatform} x="platform" ys={[{ key: 'reach', name: 'Reach' }, { key: 'engagement', name: 'Engagement' }]} label="Reach and engagement by platform" />}</ChartCard>
        <ChartCard title="Best posting times (IST, engagement score)">{a && <BarSimple data={a.bestTimes} x="slot" ys={[{ key: 'score', name: 'Score', color: '#F59E0B' }]} label="Engagement score by time slot" />}</ChartCard>
        <ChartCard title="Language performance">{a && <BarSimple data={a.byLanguage} x="language" ys={[{ key: 'engagement', name: 'Engagement', color: '#2DD4BF' }]} layout="vertical" label="Engagement by language" />}</ChartCard>
      </div>
      </>
      )}
      <PostDetailDialog post={open} accounts={accounts.data ?? []} onClose={() => setOpen(null)} />
    </div>
  );
}

type Analytics = Awaited<ReturnType<typeof api.getAnalytics>>;
type Totals = { reach: number; impressions: number; engagement: number; clicks: number };

const LANG_COLORS = ['#3B82C4', '#8B5CF6', '#14B8A6', '#F59E0B', '#EC4899', '#0EA5E9'];
/** Cool-to-warm scale for the posting-time scores (0–100). */
const heat = (score: number) => (score >= 80 ? '#F97316' : score >= 65 ? '#F59E0B' : score >= 50 ? '#14B8A6' : '#3B82C4');

function InsightCard({ title, subtitle, insight, children }: { title: string; subtitle?: string; insight?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="flex min-w-0 flex-col rounded-xl border bg-card p-4 shadow-sm sm:p-5">
      <h3 className="font-semibold">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      <div className="mt-4 flex-1">{children}</div>
      {insight && <p className="mt-3 flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-polar-amber" aria-hidden /><span>{insight}</span></p>}
    </section>
  );
}

/** Content manager view of the lower analytics: KPI tiles and four presentation charts. */
function Insights({ a, totals, loading }: { a?: Analytics; totals: Totals; loading: boolean }) {
  const reduce = useReducedMotion() ?? false;
  const rate = totals.reach ? (totals.engagement / totals.reach) * 100 : 0;
  const ctr = totals.impressions ? (totals.clicks / totals.impressions) * 100 : 0;
  const kpis: { label: string; value: number; icon: typeof Eye; tone: string; note: string }[] = [
    { label: 'Reach', value: totals.reach, icon: TrendingUp, tone: 'bg-sky-500/10 text-sky-600 dark:text-sky-300', note: 'Unique people reached' },
    { label: 'Impressions', value: totals.impressions, icon: Eye, tone: 'bg-violet-500/10 text-violet-600 dark:text-violet-300', note: `${totals.reach ? (totals.impressions / totals.reach).toFixed(1) : '0'}× per person` },
    { label: 'Engagement', value: totals.engagement, icon: Share2, tone: 'bg-teal-500/10 text-teal-600 dark:text-teal-300', note: `${rate.toFixed(1)}% of reach` },
    { label: 'Link clicks', value: totals.clicks, icon: MousePointerClick, tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-300', note: `${ctr.toFixed(2)}% click-through` },
  ];
  const platforms = [...(a?.byPlatform ?? [])].sort((x, y) => y.reach - x.reach).map((r) => {
    const id = (Object.keys(PLATFORM_META) as PlatformId[]).find((p) => PLATFORM_META[p].label === r.platform);
    const hex = id ? brandHex(id) : '#3B82C4';
    return { name: r.platform, value: r.reach, color: hex === '#000000' ? '#334155' : hex, note: `${((r.engagement / r.reach) * 100).toFixed(1)}% engagement rate` };
  });
  const bestRate = [...(a?.byPlatform ?? [])].sort((x, y) => y.engagement / y.reach - x.engagement / x.reach)[0];
  const times = (a?.bestTimes ?? []).map((t) => ({ name: t.slot, value: t.score, color: heat(t.score) }));
  const best = [...(a?.bestTimes ?? [])].sort((x, y) => y.score - x.score)[0];
  const langs = (a?.byLanguage ?? []).map((l, i) => ({ name: l.language, value: l.engagement, color: LANG_COLORS[i % LANG_COLORS.length] }));
  const langTotal = langs.reduce((s, l) => s + l.value, 0);
  const m = a?.monthly ?? [];
  const peak = m.reduce<(typeof m)[number] | undefined>((b, r) => (!b || r.reach > b.reach ? r : b), undefined);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />) : kpis.map((k) => (
          <div key={k.label} className="rounded-xl border bg-card p-4 shadow-sm">
            <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', k.tone)}><k.icon className="h-4 w-4" aria-hidden /></span>
            <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight">{formatCompact(k.value)}</p>
            <p className="text-sm font-medium">{k.label}</p>
            <p className="text-xs text-muted-foreground">{k.note}</p>
          </div>
        ))}
      </div>
      {!a ? (
        <div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 w-full rounded-xl" />)}</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <InsightCard title="Reach & engagement over 12 months" subtitle="Reach on the left axis, engagement on the right" insight={peak && <>Reach peaked in <strong>{peak.month}</strong> at {formatCompact(peak.reach)}.</>}>
            <TrendDual data={m} x="month" a={{ key: 'reach', name: 'Reach', color: '#3B82C4' }} b={{ key: 'engagement', name: 'Engagement', color: '#8B5CF6' }} label="Reach and engagement over 12 months" height={240} animate={!reduce} />
          </InsightCard>
          <InsightCard title="Reach by platform" subtitle="Bars in each platform's brand colour" insight={bestRate && <><strong>{bestRate.platform}</strong> has the best engagement rate at {((bestRate.engagement / bestRate.reach) * 100).toFixed(1)}%.</>}>
            <BarColors data={platforms} valueName="Reach" label="Reach by platform" height={240} animate={!reduce} />
          </InsightCard>
          <InsightCard title="Best posting times" subtitle="Engagement score by time slot (IST), warmer is better" insight={best && <>Post around <strong>{best.slot} IST</strong> for the highest engagement (score {best.score}).</>}>
            <BarColors data={times} valueName="Score" label="Engagement score by time slot" height={240} animate={!reduce} />
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground" aria-hidden>
              {[['#3B82C4', 'Below 50'], ['#14B8A6', '50–64'], ['#F59E0B', '65–79'], ['#F97316', '80+']].map(([c, l]) => (
                <span key={l} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: c }} /> {l}</span>
              ))}
            </div>
          </InsightCard>
          <InsightCard title="Language performance" subtitle="Share of engagement by post language" insight={langs[0] && <><strong>{langs.slice(1).reduce((s, l) => s + l.value, 0) ? Math.round((langs.slice(1).reduce((s, l) => s + l.value, 0) / langTotal) * 100) : 0}%</strong> of engagement comes from non-English posts.</>}>
            <div className="grid items-center gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
              <DonutTotal data={langs} centerLabel="engagement" label="Engagement by language" height={200} animate={!reduce} />
              <ul className="space-y-2">
                {langs.map((l) => (
                  <li key={l.name} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} aria-hidden />{l.name}</span>
                      <span className="tabular-nums"><span className="font-semibold">{formatCompact(l.value)}</span> <span className="text-xs text-muted-foreground">{Math.round((l.value / langTotal) * 100)}%</span></span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted" aria-hidden><div className="h-full rounded-full" style={{ width: `${(l.value / langTotal) * 100}%`, background: l.color }} /></div>
                  </li>
                ))}
              </ul>
            </div>
          </InsightCard>
        </div>
      )}
    </>
  );
}
