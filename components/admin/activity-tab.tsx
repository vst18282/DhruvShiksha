'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, CalendarClock, FilePen, Megaphone, PenSquare, TrendingUp } from 'lucide-react';
import type { SocialPost, Status } from '@/types';
import { Stat, EmptyState, StatusBadge } from '@/components/common';
import { BarSimple, ChartCard, PieSimple } from '@/components/charts/lazy';
import { PlatformIcon } from '@/components/studio/platform-icon';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/misc';
import { ListRowSkeleton, StatSkeleton } from '@/components/skeletons';
import { useApi } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { LANGUAGES, PLATFORM_META, STATUS_META } from '@/lib/constants';
import { RANGE_LABELS, activityDate, inRange, summariseActivity, type ActivityRange } from '@/lib/activity';
import { PostDetailSheet, shortDescription } from '@/components/studio/post-detail';
import { cn } from '@/lib/utils';

const ist = (iso: string) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

/**
 * Admin view of content-manager work: a summary of content creation (no approving here),
 * plus a queue of their posts. Clicking a post opens a right-side panel with the details.
 */
export function ActivityTab() {
  const users = useApi(['users'], api.getUsers);
  const posts = useApi(['posts'], api.getPosts);
  const audit = useApi(['audit'], api.getAudit);
  const accounts = useApi(['accounts'], api.getAccounts);
  const [range, setRange] = useState<ActivityRange>('90d');
  const [who, setWho] = useState<string>('all');
  const [status, setStatus] = useState<Status | 'all'>('all');
  const [open, setOpen] = useState<SocialPost | null>(null);

  const managers = useMemo(() => (users.data ?? []).filter((u) => u.role === 'content_manager'), [users.data]);
  const names = who === 'all' ? managers.map((m) => m.name) : [who];
  const summary = useMemo(() => summariseActivity(posts.data ?? [], audit.data ?? [], { names, range }), [posts.data, audit.data, names.join('|'), range]); // eslint-disable-line react-hooks/exhaustive-deps
  const queue = useMemo(
    () =>
      (posts.data ?? [])
        .filter((p) => names.includes(p.createdBy) && inRange(activityDate(p), range) && (status === 'all' || p.status === status))
        .sort((a, b) => activityDate(b).localeCompare(activityDate(a))),
    [posts.data, names.join('|'), range, status], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const loading = users.isPending || posts.isPending || audit.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup type="single" value={range} onValueChange={(v) => v && setRange(v as ActivityRange)} aria-label="Date range">
          {(Object.keys(RANGE_LABELS) as ActivityRange[]).map((r) => (
            <ToggleGroupItem key={r} value={r} className="text-xs">
              {RANGE_LABELS[r]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Select value={who} onValueChange={setWho}>
          <SelectTrigger className="w-56" aria-label="Content manager">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All content managers ({managers.length})</SelectItem>
            {managers.map((m) => (
              <SelectItem key={m.id} value={m.name}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <Stat label="Posts created" value={summary.created} icon={<PenSquare className="h-4 w-4" />} />
            <Stat label="Published" value={summary.published} icon={<Megaphone className="h-4 w-4" />} />
            <Stat label="Scheduled" value={summary.scheduled} icon={<CalendarClock className="h-4 w-4" />} />
            <Stat label="Drafts" value={summary.drafts} icon={<FilePen className="h-4 w-4" />} />
            <Stat label="Reviews done" value={summary.reviews} icon={<CheckCircle2 className="h-4 w-4" />} />
            <Stat label="Reach" value={summary.reach} icon={<TrendingUp className="h-4 w-4" />} />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Posts by platform">
          {summary.byPlatform.length ? (
            <BarSimple data={summary.byPlatform.map((p) => ({ platform: PLATFORM_META[p.platform].label, posts: p.posts }))} x="platform" ys={[{ key: 'posts', name: 'Posts' }]} label="Posts by platform" height={220} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">No posts in this range.</p>
          )}
        </ChartCard>
        <ChartCard title="Posts by language">
          {summary.byLanguage.length ? (
            <PieSimple data={summary.byLanguage.map((l) => ({ name: LANGUAGES.find((x) => x.code === l.language)?.label ?? l.language, value: l.posts }))} nameKey="name" valueKey="value" label="Posts by language" height={220} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">No posts in this range.</p>
          )}
        </ChartCard>
        <ChartCard title="Created vs published by month">
          {summary.byMonth.length ? (
            <BarSimple data={summary.byMonth} x="month" ys={[{ key: 'created', name: 'Created' }, { key: 'published', name: 'Published', color: '#2DD4BF' }]} label="Posts created and published per month" height={220} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">No posts in this range.</p>
          )}
        </ChartCard>
      </div>

      <section aria-labelledby="q-h" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="q-h" className="font-semibold">
            Post queue <span className="text-sm font-normal text-muted-foreground">({queue.length})</span>
          </h2>
          <Select value={status} onValueChange={(v) => setStatus(v as Status | 'all')}>
            <SelectTrigger className="w-44" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(Object.keys(STATUS_META) as Status[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <ListRowSkeleton key={i} />
            ))}
          </div>
        ) : queue.length === 0 ? (
          <EmptyState title="No posts in this range" description="Try a longer date range or another content manager." />
        ) : (
          <ul className="space-y-2">
            {queue.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setOpen(p)}
                  className={cn('flex w-full flex-col gap-2 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/30 sm:flex-row sm:items-center', open?.id === p.id && 'border-primary')}
                >
                  <span className="flex shrink-0 gap-1">
                    {p.platforms.length ? p.platforms.map((pl) => <PlatformIcon key={pl} id={pl} title={PLATFORM_META[pl].label} className="h-5 w-5" />) : <span className="text-xs text-muted-foreground">Website</span>}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 font-medium">{p.title}</span>
                    <span className="line-clamp-1 text-xs text-muted-foreground">{shortDescription(p)}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">{ist(activityDate(p))}</span>
                    <StatusBadge status={p.status} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <PostDetailSheet post={open} accounts={accounts.data ?? []} onClose={() => setOpen(null)} />
    </div>
  );
}
