'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, Newspaper, Rss, Search } from 'lucide-react';
import type { PlatformId, SocialPost } from '@/types';
import { AiBadge, EmptyState } from '@/components/common';
import { HeroChip, PageHero } from '@/components/common/page-hero';
import { PlatformIcon } from '@/components/studio/platform-icon';
import { ReactionBar } from '@/components/engagement/reaction-bar';
import { ShareButtons } from '@/components/archive/actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ListRowSkeleton } from '@/components/skeletons';
import { useApi } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { LANGUAGES, PLATFORM_META, ROLE_LABELS } from '@/lib/constants';
import { findRef, itemHref } from '@/lib/archive';
import { isPublicToAll, visibilityLabel } from '@/lib/visibility';
import { useAuthStore } from '@/store/auth';
import { cn, initials } from '@/lib/utils';

const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
const PLATFORMS = Object.keys(PLATFORM_META) as PlatformId[];

function FeedCard({ p, showVisibility }: { p: SocialPost; showVisibility: boolean }) {
  const sources = p.sources.map((s) => findRef(s)).filter(Boolean);
  return (
    <article
      id={p.id}
      className="group scroll-mt-28 overflow-hidden rounded-2xl border bg-card shadow-sm transition-all target:ring-2 target:ring-primary hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transform-none"
    >
      <div className="h-1 bg-gradient-to-r from-polar-ice via-polar-teal to-polar-violet opacity-70" aria-hidden />
      <div className="p-5">
        <header className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-primary" aria-hidden>
            {initials(p.createdBy)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium leading-tight">
              {p.createdBy}
              <Badge variant="outline" className="py-0 text-[10px] font-normal">
                {ROLE_LABELS[p.createdByRole]}
              </Badge>
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <time dateTime={p.publishedAt}>{fmt(p.publishedAt ?? p.updatedAt)} IST</time>
              <span aria-hidden>·</span>
              <span className="flex items-center gap-1">
                {p.platforms.length ? (
                  p.platforms.map((pl) => <PlatformIcon key={pl} id={pl} title={PLATFORM_META[pl].label} className="h-3.5 w-3.5" />)
                ) : (
                  <>
                    <Newspaper className="h-3.5 w-3.5" aria-hidden /> Website
                  </>
                )}
              </span>
              {p.language !== 'en' && <Badge variant="secondary" className="py-0 text-[10px]">{LANGUAGES.find((l) => l.code === p.language)?.label}</Badge>}
              {p.aiGenerated && <AiBadge label="AI-assisted, human-approved" className="py-0 text-[10px]" />}
              {showVisibility && !isPublicToAll(p) && (
                <Badge variant="warning" className="py-0 text-[10px]">
                  {visibilityLabel(p.visibleTo)}
                </Badge>
              )}
            </p>
          </div>
        </header>
        <h3 className="mt-3.5 text-lg font-semibold leading-snug group-hover:text-primary">{p.title}</h3>
        <p lang={p.language} className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
          {p.text}
        </p>
        {p.hashtags.length > 0 && (
          <p className="mt-2.5 flex flex-wrap gap-1.5">
            {p.hashtags.map((h) => (
              <span key={h} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {h}
              </span>
            ))}
          </p>
        )}
        {sources.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Source:{' '}
            {sources.map((it, i) => (
              <span key={it!.id}>
                {i > 0 && ', '}
                <Link href={itemHref(it!)} className="text-primary hover:underline">
                  {it!.title}
                </Link>
              </span>
            ))}
          </p>
        )}
        <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <ReactionBar type="post" id={p.id} title={p.title} size="xs" />
          <ShareButtons title={p.title} path={`/updates#${p.id}`} />
        </footer>
      </div>
    </article>
  );
}

/** Public feed of published posts. Visible to every role unless a manager limited a post's audience. */
export function UpdatesFeed() {
  const { data, isPending } = useApi(['feed'], api.getFeed);
  const role = useAuthStore((s) => s.user?.role);
  const [q, setQ] = useState('');
  const [platform, setPlatform] = useState<PlatformId | 'all' | 'web'>('all');
  const posts = useMemo(
    () =>
      (data ?? []).filter(
        (p) => (platform === 'all' || (platform === 'web' ? p.platforms.length === 0 : p.platforms.includes(platform))) && `${p.title} ${p.text} ${p.hashtags.join(' ')}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [data, platform, q],
  );

  /** Posts grouped by month so the feed reads as a dated timeline. */
  const groups = useMemo(() => {
    const m = new Map<string, SocialPost[]>();
    posts.forEach((p) => {
      const key = new Date(p.publishedAt ?? p.updatedAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
      m.set(key, [...(m.get(key) ?? []), p]);
    });
    return Array.from(m.entries());
  }, [posts]);

  const latest = useMemo(() => {
    const dates = (data ?? []).map((p) => p.publishedAt ?? p.updatedAt).sort();
    return dates.length ? dates[dates.length - 1] : undefined;
  }, [data]);

  // Deep links (#post-id) from Content health and share links: scroll once the feed has loaded.
  useEffect(() => {
    if (!data || !window.location.hash) return;
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [data]);

  const platformChips = ['all', ...PLATFORMS.filter((p) => data?.some((x) => x.platforms.includes(p)))] as (PlatformId | 'all')[];
  const filters = (
    <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm">
      <div>
        <Label htmlFor="feed-q" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Search
        </Label>
        <div className="relative mt-1.5">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input id="feed-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search updates…" className="pl-9" />
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Platform</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="Filter by platform">
          {platformChips.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={platform === p}
              onClick={() => setPlatform(p)}
              className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors hover:bg-muted', platform === p && 'border-primary bg-primary/10 font-medium text-primary')}
            >
              {p === 'all' ? (
                'All'
              ) : (
                <>
                  <PlatformIcon id={p} className="h-3.5 w-3.5" /> {PLATFORM_META[p].label}
                </>
              )}
            </button>
          ))}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2 border-t pt-3 text-center">
        <div className="rounded-lg bg-muted/60 py-2">
          <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Showing</dt>
          <dd className="text-lg font-semibold tabular-nums">{posts.length}</dd>
        </div>
        <div className="rounded-lg bg-muted/60 py-2">
          <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">All updates</dt>
          <dd className="text-lg font-semibold tabular-nums">{data?.length ?? 0}</dd>
        </div>
      </dl>
      {(q || platform !== 'all') && (
        <button
          type="button"
          onClick={() => {
            setQ('');
            setPlatform('all');
          }}
          className="w-full rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          Clear filters
        </button>
      )}
    </div>
  );

  return (
    <div>
      <PageHero
        eyebrow="Updates"
        title="News from"
        script="the ice"
        description="Posts and announcements published by NCPOR scientists and the outreach team (demo). Like, dislike or report anything that needs fixing."
        image="station-india"
        meta={
          <ul className="flex flex-wrap items-center gap-2">
            <li>
              <HeroChip>
                <Newspaper className="h-3.5 w-3.5" aria-hidden /> {data ? `${data.length} published posts` : 'Published posts'}
              </HeroChip>
            </li>
            <li>
              <HeroChip>
                <Rss className="h-3.5 w-3.5" aria-hidden /> Website & social
              </HeroChip>
            </li>
            {latest && (
              <li>
                <HeroChip>
                  <Clock className="h-3.5 w-3.5" aria-hidden /> Latest {fmt(latest)} IST
                </HeroChip>
              </li>
            )}
          </ul>
        }
      />

      <div className="container py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
          <aside className="order-first lg:order-last">
            <div className="lg:sticky lg:top-28">{filters}</div>
          </aside>

          <div className="min-w-0 max-w-3xl">
            {isPending ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <ListRowSkeleton key={i} />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <EmptyState title="No updates to show" description={q || platform !== 'all' ? 'Try another search or platform.' : 'Published posts will appear here.'} />
            ) : (
              <div className="space-y-8">
                <p className="sr-only" aria-live="polite">
                  {posts.length} update{posts.length > 1 ? 's' : ''}
                </p>
                {groups.map(([month, list]) => (
                  <section key={month} aria-labelledby={`m-${month.replace(/\s/g, '-')}`}>
                    <h2 id={`m-${month.replace(/\s/g, '-')}`} className="mb-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <CalendarDays className="h-4 w-4 text-primary" aria-hidden />
                      {month}
                      <span className="h-px flex-1 bg-border" aria-hidden />
                      <span className="tabular-nums">{list.length}</span>
                    </h2>
                    <div className="space-y-4">
                      {list.map((p) => (
                        <FeedCard key={p.id} p={p} showVisibility={role === 'admin' || role === 'content_manager'} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
