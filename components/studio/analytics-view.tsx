'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ExternalLink, Eye, MousePointerClick, Share2, TrendingUp, X } from 'lucide-react';
import type { PlatformId, SocialPost } from '@/types';
import { Stat, EmptyState } from '@/components/common';
import { AreaTrend, BarSimple, ChartCard } from '@/components/charts/lazy';
import { PlatformIcon, PlatformTile } from './platform-icon';
import { PostDetailDialog } from './post-detail';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/misc';
import { ListRowSkeleton, StatSkeleton } from '@/components/skeletons';
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

      <div className="grid gap-4 xl:grid-cols-2">
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
      <PostDetailDialog post={open} accounts={accounts.data ?? []} onClose={() => setOpen(null)} />
    </div>
  );
}
