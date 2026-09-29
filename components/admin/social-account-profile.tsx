'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, CalendarClock, Link2Off, Plug } from 'lucide-react';
import type { SocialPost } from '@/types';
import { PlatformIcon, PlatformTile, brandHex } from '@/components/studio/platform-icon';
import { PlatformPreview } from '@/components/studio/previews';
import { Stat, EmptyState, StatusBadge } from '@/components/common';
import { BarSimple, ChartCard } from '@/components/charts/lazy';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardSkeleton } from '@/components/skeletons';
import { useApi, useInvalidate } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { PLATFORM_META } from '@/lib/constants';
import { accountStats, postsForAccount, profileUrl } from '@/lib/social';
import { formatCompact, initials } from '@/lib/utils';

const when = (p: SocialPost) => p.publishedAt ?? p.scheduledAt ?? p.updatedAt;
const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

/** Profile page of one social account, styled after its platform, with its posts and performance. */
export function SocialAccountProfile({ accountId }: { accountId: string }) {
  const accounts = useApi(['accounts'], api.getAccounts);
  const posts = useApi(['posts'], api.getPosts);
  const audit = useApi(['audit'], api.getAudit);
  const invalidate = useInvalidate();
  const a = accounts.data?.find((x) => x.id === accountId);
  const mine = useMemo(() => (a ? postsForAccount(posts.data ?? [], a.id).sort((x, y) => when(y).localeCompare(when(x))) : []), [a, posts.data]);

  if (accounts.isPending || posts.isPending) return <DashboardSkeleton />;
  if (!a)
    return (
      <EmptyState
        title="Account not found"
        description="It may have been removed. Go back to Social governance to see all accounts."
        action={
          <Button asChild>
            <Link href="/dashboard/admin?tab=social">Back to Social governance</Link>
          </Button>
        }
      />
    );

  const s = accountStats(posts.data ?? [], a);
  const published = mine.filter((p) => p.status === 'published');
  const upcoming = mine.filter((p) => p.status === 'scheduled' || p.status === 'approved' || p.status === 'in_review');
  const history = (audit.data ?? []).filter((e) => e.itemTitle === a.handle || e.itemId === a.id);
  const color = brandHex(a.platform);
  const mono = color === '#000000';
  const chart = published.slice(0, 8).reverse().map((p) => ({ post: p.title.length > 18 ? `${p.title.slice(0, 18)}…` : p.title, reach: Math.round((p.metrics?.reach ?? 0) / Math.max(1, p.accountIds.length)) }));
  const textFor = (p: SocialPost) => p.variants?.find((v) => v.accountId === a.id)?.text ?? p.variants?.find((v) => v.platform === a.platform && !v.accountId)?.text ?? p.text;

  const toggle = async () => {
    await api.saveAccount({ ...a, connected: !a.connected, connectedAt: a.connected ? a.connectedAt : new Date().toISOString().slice(0, 10) });
    toast.success(`${a.handle} ${a.connected ? 'revoked' : 'reconnected'} (demo)`);
    invalidate([['accounts'], ['audit']]);
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/dashboard/admin?tab=social">
          <ArrowLeft /> Social governance
        </Link>
      </Button>

      <section aria-label={`${PLATFORM_META[a.platform].label} profile`} className="overflow-hidden rounded-xl border bg-card">
        <div
          className="h-28 sm:h-36"
          style={{ background: mono ? 'linear-gradient(135deg, #0B1F3A, #1f2937 60%, #475569)' : `linear-gradient(135deg, #0B1F3A, ${color})` }}
          aria-hidden
        />
        <div className="relative px-5 pb-5">
          <div className="-mt-10 flex flex-wrap items-end gap-4">
            <span className="relative inline-flex h-20 w-20 items-center justify-center rounded-full border-4 border-card bg-muted text-xl font-bold">
              {initials(a.displayName)}
              <PlatformTile id={a.platform} className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full" iconClassName="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 pt-10">
              <h1 className="text-xl font-semibold md:text-2xl">{a.displayName}</h1>
              <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <PlatformIcon id={a.platform} /> {PLATFORM_META[a.platform].label}
                </span>
                <span>·</span>
                <span className="font-mono">{a.handle}</span>
                <Badge variant={a.connected ? 'success' : 'muted'}>{a.connected ? 'Connected' : 'Revoked'}</Badge>
              </p>
            </div>
            <Button variant={a.connected ? 'outline' : 'default'} onClick={toggle}>
              {a.connected ? (
                <>
                  <Link2Off /> Revoke access
                </>
              ) : (
                <>
                  <Plug /> Reconnect
                </>
              )}
            </Button>
          </div>
          <p className="mt-3 text-sm">{a.purpose} account of NCPOR (demo).</p>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div>
              <dt className="sr-only">Followers</dt>
              <dd>
                <strong className="tabular-nums">{formatCompact(a.followers)}</strong> <span className="text-muted-foreground">followers</span>
              </dd>
            </div>
            <div>
              <dt className="sr-only">Posts</dt>
              <dd>
                <strong className="tabular-nums">{s.posts}</strong> <span className="text-muted-foreground">posts via PolarVerse</span>
              </dd>
            </div>
            <div>
              <dt className="sr-only">Connected since</dt>
              <dd className="text-muted-foreground">Connected since {new Date(a.connectedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</dd>
            </div>
            <div>
              <dt className="sr-only">Profile address</dt>
              <dd className="text-muted-foreground">{profileUrl(a)} (demo handle)</dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Published" value={s.published} />
        <Stat label="Upcoming" value={upcoming.length} />
        <Stat label="Reach" value={s.reach} />
        <Stat label="Engagement" value={s.engagement} />
        <Stat label="Engagement rate" value={`${s.rate}%`} />
      </div>

      {chart.length > 0 && (
        <ChartCard title="Reach per post (this account’s share)">
          <BarSimple data={chart} x="post" ys={[{ key: 'reach', name: 'Reach', color: mono ? '#3B82C4' : color }]} label={`Reach per post for ${a.displayName}`} />
        </ChartCard>
      )}

      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">Posts ({published.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="history">Account history ({history.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="posts">
          {published.length === 0 ? (
            <EmptyState title="No published posts yet" />
          ) : (
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {published.map((p) => (
                <li key={p.id} className="space-y-1.5">
                  <PlatformPreview platform={a.platform} text={textFor(p)} images={[]} account={a} lang={p.language} />
                  <p className="flex flex-wrap justify-between gap-2 px-1 text-xs text-muted-foreground">
                    <span>{fmt(when(p))} IST</span>
                    {p.metrics && (
                      <span className="tabular-nums">
                        {formatCompact(Math.round(p.metrics.reach / p.accountIds.length))} reach · {formatCompact(Math.round(p.metrics.engagement / p.accountIds.length))} eng.
                      </span>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
        <TabsContent value="upcoming">
          {upcoming.length === 0 ? (
            <EmptyState title="Nothing scheduled or in review" />
          ) : (
            <ul className="divide-y rounded-lg border bg-card">
              {upcoming.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <span className="flex-1 font-medium">{p.title}</span>
                  <StatusBadge status={p.status} />
                  <span className="text-xs text-muted-foreground">{p.scheduledAt ? `${fmt(p.scheduledAt)} IST` : `by ${p.createdBy}`}</span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
        <TabsContent value="history">
          {history.length === 0 ? (
            <EmptyState title="No account changes recorded" description="Connections, revocations and removals appear here." />
          ) : (
            <ul className="divide-y rounded-lg border bg-card text-sm">
              {history.map((h) => (
                <li key={h.id} className="flex flex-wrap justify-between gap-2 p-3">
                  <span>
                    <strong>{h.actor}</strong> {h.action}
                  </span>
                  <span className="text-xs text-muted-foreground">{fmt(h.at)} IST</span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
