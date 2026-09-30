'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import { BookOpen, Check, Database, Download, Eye, FilePen, FolderOpen, Globe2, KeyRound, ListChecks, PenSquare, Quote, ShieldCheck, Ship, TrendingUp, Trophy, X, type LucideIcon } from 'lucide-react';
import type { ArchiveItem, Expedition } from '@/types';
import { WelcomePanel } from './welcome-panel';
import { StatusStepper } from './stepper';
import { AccessBadge, EmptyState, StatusBadge } from '@/components/common';
import { DataTable } from '@/components/common/client';
import { BarRanked } from '@/components/charts/lazy';
import { EmbargoCountdown } from '@/components/archive/actions';
import { SubmitUploadButton } from '@/components/upload/my-uploads';
import { EmbargoNotice } from '@/components/archive/embargo-notice';
import { useCan } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/misc';
import { StatSkeleton, TableSkeleton } from '@/components/skeletons';
import { useApi, useInvalidate } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { allItems, findItem, itemHref } from '@/lib/archive';
import { CONTENT_TYPE_LABELS, REGION_META } from '@/lib/constants';
import { metadataQuality } from '@/lib/quality';
import { useAuthStore } from '@/store/auth';
import { useDataStore } from '@/store/data';
import { cn, formatCompact } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-count-up';

export function ScientistDashboard() {
  const user = useAuthStore((s) => s.user)!;
  const reduce = useReducedMotion() ?? false;
  const wide = useMediaQuery('(min-width: 640px)');
  const { can } = useCan();
  const invalidate = useInvalidate();
  const pipeline = useApi(['pipeline'], api.getPipelineItems);
  const posts = useApi(['posts'], api.getPosts);
  const requests = useApi(['access'], api.getAccessRequests);
  const uploads = useDataStore((s) => s.uploads);
  const patches = useDataStore((s) => s.patches);

  // Recompute when uploads/patches change (allItems() is memoised on those references).
  const mine = useMemo<ArchiveItem[]>(
    () => allItems().filter((i) => i.ownerId === user.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user.id, uploads, patches, pipeline.data],
  );
  const myPosts = (posts.data ?? []).filter((p) => p.createdBy === user.name);
  const myReq = (requests.data ?? []).filter((r) => findItem(r.itemId)?.ownerId === user.id);
  const expeditions = Array.from(new Set(mine.map((i) => i.expeditionId).filter(Boolean) as string[]))
    .map((id) => findItem(id) as Expedition | undefined)
    .filter((e): e is Expedition => !!e);
  const views = mine.reduce((a, i) => a + i.views, 0);
  const downloads = mine.reduce((a, i) => a + i.downloads, 0);
  const published = mine.filter((i) => i.status === 'published').length;
  const top = [...mine].sort((a, b) => b.views - a.views).slice(0, 6);
  // Shorter bar labels on phones so the bars keep most of the width.
  const maxLabel = wide ? 26 : 14;
  const chartRows = top.map((i) => ({ name: i.title.length > maxLabel ? `${i.title.slice(0, maxLabel - 1).trimEnd()}…` : i.title, full: i.title, views: i.views, downloads: i.downloads }));
  const byType = Object.entries(
    mine.reduce<Record<string, number>>((acc, i) => ((acc[i.type] = (acc[i.type] ?? 0) + i.views), acc), {}),
  ).sort((a, b) => b[1] - a[1]);
  const bestRate = [...mine].filter((i) => i.views >= 50).sort((a, b) => b.downloads / b.views - a.downloads / a.views)[0];

  const decide = async (id: string, status: 'approved' | 'declined') => {
    await api.decideAccess(id, status);
    toast.success(status === 'approved' ? 'Access granted — the requester can now download' : 'Request declined');
    invalidate([['access'], ['audit']]);
  };

  return (
    <>
      <WelcomePanel
        eyebrow="Scientist workspace"
        name={user.name.split(' ').slice(0, 2).join(' ')}
        subtitle={`${user.org} · your uploads, approvals, access requests and impact.`}
        links={[
          ...(can('upload') ? [{ href: '/dashboard/scientist/publish', label: 'Publish to Data', icon: Database }] : []),
          ...(can('use_studio') ? [{ href: '/studio', label: 'Upload draft', icon: PenSquare }, { href: '/studio/drafts', label: 'My drafts', icon: FilePen }] : []),
          { href: '/studio/data', label: 'Published to Data', icon: FolderOpen },
        ]}
        searchPlaceholder="Search datasets, reports and publications…"
        tip="Tip: publish a file to the Data catalogue and it is live straight away."
      />
      <div className="space-y-6">
        <EmbargoNotice />
        <section aria-labelledby="impact" className="space-y-4">
          <h2 id="impact" className="sr-only">My impact</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {pipeline.isPending ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />) : (
              <>
                <Kpi label="My items" value={mine.length} icon={BookOpen} tone="sky" note={`${published} published · ${mine.length - published} in progress`} />
                <Kpi label="Views" value={views} icon={Eye} tone="blue" delta={9} note="vs last month" />
                <Kpi label="Downloads" value={downloads} icon={Download} tone="teal" delta={4} note={`${views ? Math.round((downloads / views) * 100) : 0}% of views`} />
                <Kpi label="Citations (demo)" value={Math.round(downloads / 18)} icon={Quote} tone="violet" note="estimated from downloads" />
              </>
            )}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section aria-labelledby="reach" className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 id="reach" className="flex items-center gap-2 font-semibold"><TrendingUp className="h-4 w-4 text-primary" aria-hidden /> Top items by reach</h3>
                  <p className="text-xs text-muted-foreground">Views and downloads for your six most-viewed items</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#2F5D8C]" /> Views</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#94A3B8]" /> Downloads</span>
                </div>
              </div>
              {chartRows.length ? (
                <BarRanked data={chartRows} label="Views and downloads of my top six items" height={Math.max(220, chartRows.length * 52)} animate={!reduce} labelWidth={wide ? 168 : 96} />
              ) : (
                <EmptyState title="No items yet" description="Publish to Data to start tracking reach." />
              )}
            </section>

            <section aria-labelledby="mix" className="flex flex-col rounded-xl border bg-card p-5 shadow-sm">
              <h3 id="mix" className="font-semibold">Reach by content type</h3>
              <p className="text-xs text-muted-foreground">Share of your total views</p>
              <ul className="mt-4 space-y-3">
                {byType.map(([type, v], i) => {
                  const pct = views ? Math.round((v / views) * 100) : 0;
                  return (
                    <li key={type}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLORS[i % TYPE_COLORS.length] }} aria-hidden />{CONTENT_TYPE_LABELS[type as ArchiveItem['type']].plural}</span>
                        <span className="tabular-nums text-muted-foreground">{pct}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: TYPE_COLORS[i % TYPE_COLORS.length] }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
              {bestRate && (
                <div className="mt-auto pt-5">
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"><Trophy className="h-3.5 w-3.5 text-primary" aria-hidden /> Best download rate</p>
                    <Link href={itemHref(bestRate)} className="mt-1 line-clamp-2 text-sm font-medium hover:text-primary hover:underline">{bestRate.title}</Link>
                    <p className="text-xs text-muted-foreground">{Math.round((bestRate.downloads / bestRate.views) * 100)}% of viewers downloaded it</p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </section>

        {mine.length > 0 && <Snapshot items={mine} />}

        <Panel id="uploads" icon={FolderOpen} title="My uploads" description="Everything you own in the archive, with metadata completeness.">
          {pipeline.isPending ? <TableSkeleton rows={5} /> : (
            <DataTable
              caption="My uploads"
              rowKey={(i) => i.id}
              rows={mine}
              pageSize={8}
              columns={[
                { key: 'title', header: 'Title', sortValue: (i) => i.title, cell: (i) => <Link href={itemHref(i)} className="font-medium hover:text-primary hover:underline">{i.title}</Link> },
                { key: 'type', header: 'Type', sortValue: (i) => i.type, cell: (i) => CONTENT_TYPE_LABELS[i.type].singular, className: 'hidden md:table-cell' },
                { key: 'status', header: 'Status', sortValue: (i) => i.status, cell: (i) => <StatusBadge status={i.status} /> },
                { key: 'access', header: 'Access / embargo', cell: (i) => <div className="space-y-1"><AccessBadge level={i.accessLevel} />{i.embargoUntil && <div className="text-xs"><EmbargoCountdown until={i.embargoUntil} /></div>}</div> },
                {
                  key: 'q', header: 'Completeness', sortValue: (i) => metadataQuality(i).score,
                  cell: (i) => { const q = metadataQuality(i); return <div className="w-28"><Progress value={q.score} aria-label={`Metadata completeness ${q.score}%`} indicatorClassName={q.score >= 80 ? 'bg-success' : 'bg-polar-amber'} /><span className="text-xs text-muted-foreground">{q.score}%</span></div>; },
                },
              ]}
            />
          )}
        </Panel>

        <Panel id="tracker" icon={ListChecks} title="Approval tracker" description="Post drafts and uploads waiting on a content manager or admin.">
          {posts.isPending ? <TableSkeleton rows={3} /> : myPosts.length + mine.filter((i) => i.status !== 'published').length === 0 ? (
            <EmptyState title="Nothing in the pipeline" description="Upload an item or draft a post to see its progress here." />
          ) : (
            <ul className="space-y-3">
              {mine.filter((i) => i.status !== 'published').map((i) => (
                <li key={i.id} className="rounded-lg border bg-card p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">Upload</Badge>
                    <span className="font-medium">{i.title}</span>
                    <span className="ml-auto">
                      <SubmitUploadButton item={i} />
                    </span>
                  </div>
                  <StatusStepper status={i.status} />
                </li>
              ))}
              {myPosts.map((p) => (
                <li key={p.id} className="rounded-lg border bg-card p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">Post</Badge>
                    <span className="font-medium">{p.title}</span>
                    {(p.status === 'draft' || p.status === 'changes_requested') && (
                      <Button size="sm" variant="outline" className="ml-auto" asChild><Link href={`/studio?post=${p.id}`}>Continue draft</Link></Button>
                    )}
                  </div>
                  <StatusStepper status={p.status} />
                  {p.comments.length > 0 && (
                    <p className="mt-2 rounded-md bg-muted/60 p-2 text-sm"><strong>{p.comments[p.comments.length - 1].author}:</strong> {p.comments[p.comments.length - 1].text}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel id="requests" icon={KeyRound} title="Access requests for my restricted data" description="Approve or decline requests to download your restricted files." className="scroll-mt-28">
          {requests.isPending ? <TableSkeleton rows={3} /> : myReq.length === 0 ? <EmptyState title="No access requests" /> : (
            <ul className="space-y-3">
              {myReq.map((r) => (
                <li key={r.id} className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row md:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{r.requesterName} <span className="text-sm font-normal text-muted-foreground">· {r.institution}</span></p>
                    <p className="text-sm text-muted-foreground">{r.itemTitle}</p>
                    <p className="mt-1 text-sm">“{r.purpose}”</p>
                  </div>
                  {r.status === 'pending' ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="success" onClick={() => decide(r.id, 'approved')}><Check /> Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => decide(r.id, 'declined')}><X /> Decline</Button>
                    </div>
                  ) : (
                    <Badge variant={r.status === 'approved' ? 'success' : 'destructive'} className="capitalize">{r.status}</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel id="exps" icon={Ship} title="My expeditions & team" description="Expeditions your items were collected on.">
          <div className="grid gap-3 md:grid-cols-2">
            {expeditions.map((e) => (
              <div key={e.id} className="rounded-lg border bg-card p-4">
                <Link href={`/expeditions/${e.id}`} className="font-medium hover:text-primary hover:underline">{e.name}</Link>
                <p className="text-xs text-muted-foreground">{e.startDate} → {e.endDate} · {e.teamSize} members</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {e.team.slice(0, 4).map((m, i) => <li key={i} className="rounded-full bg-muted px-2 py-0.5 text-xs">{m.name} · {m.role}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

/** Restrained blue-slate scale: shades of one hue rather than a rainbow. */
const TYPE_COLORS = ['#1E3A5F', '#2F5D8C', '#4A7FB0', '#7AA3C8', '#64748B', '#94A3B8'];

const TONES = {
  sky: 'bg-primary/10 text-primary',
  blue: 'bg-primary/10 text-primary',
  teal: 'bg-primary/10 text-primary',
  violet: 'bg-primary/10 text-primary',
} as const;

/** Headline metric card for the scientist overview. */
function Kpi({ label, value, icon: Icon, tone, delta, note }: { label: string; value: number; icon: LucideIcon; tone: keyof typeof TONES; delta?: number; note?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', TONES[tone])}><Icon className="h-4 w-4" aria-hidden /></span>
        {typeof delta === 'number' && (
          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums', delta >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')}>
            {delta >= 0 ? '+' : '−'}{Math.abs(delta)}%
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight" aria-label={`${value} ${label}`}>{formatCompact(value)}</p>
      <p className="text-sm font-medium">{label}</p>
      {note && <p className="mt-0.5 truncate text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

/** Section card with an icon, title and one-line description. */
function Panel({ id, icon: Icon, title, description, className, children }: { id: string; icon: LucideIcon; title: string; description?: string; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className={cn('rounded-xl border bg-card p-5 shadow-sm', className)}>
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><Icon className="h-4 w-4" aria-hidden /></span>
        <div>
          <h2 id={`${id}-h`} className="font-semibold">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/** Completeness ring (0–100) in the brand blue. */
function Ring({ value, size = 92 }: { value: number; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={9} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--primary))" strokeWidth={9} strokeLinecap="round" strokeDasharray={`${(value / 100) * c} ${c}`} />
    </svg>
  );
}

/** Pipeline stages in shades of one hue, darkest = furthest along. */
const PIPE: { status: ArchiveItem['status']; label: string; shade: number }[] = [
  { status: 'published', label: 'Published', shade: 1 },
  { status: 'in_review', label: 'In review', shade: 0.65 },
  { status: 'changes_requested', label: 'Changes requested', shade: 0.45 },
  { status: 'draft', label: 'Draft', shade: 0.25 },
];

/** Three quiet cards: metadata health, where items stand, and the regional footprint. */
function Snapshot({ items }: { items: ArchiveItem[] }) {
  const scored = items.map((i) => ({ i, s: metadataQuality(i).score })).sort((a, b) => a.s - b.s);
  const avg = Math.round(scored.reduce((n, x) => n + x.s, 0) / scored.length);
  const ready = scored.filter((x) => x.s >= 80).length;
  const attention = scored.filter((x) => x.s < 80).slice(0, 3);
  const regions = Object.entries(items.reduce<Record<string, number>>((a, i) => ((a[i.region] = (a[i.region] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1]);
  const maxRegion = Math.max(1, ...regions.map(([, n]) => n));
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel id="health" icon={ShieldCheck} title="Metadata health" description="Complete records are easier to find and cite">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Ring value={avg} />
            <span className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-semibold tabular-nums">{avg}%</span>
              <span className="text-[10px] text-muted-foreground">average</span>
            </span>
          </div>
          <div className="text-sm">
            <p><span className="font-semibold tabular-nums">{ready}</span> of {items.length} items complete</p>
            <p className="text-xs text-muted-foreground">80% or more of fields filled</p>
          </div>
        </div>
        {attention.length > 0 && (
          <ul className="mt-4 space-y-1.5 border-t pt-3">
            {attention.map(({ i, s }) => (
              <li key={i.id} className="flex items-center gap-2 text-sm">
                <span className="w-10 shrink-0 rounded border px-1.5 py-0.5 text-center text-[10px] font-semibold tabular-nums text-muted-foreground">{s}%</span>
                <Link href={itemHref(i)} className="line-clamp-1 flex-1 hover:text-primary hover:underline">{i.title}</Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel id="pipe" icon={ListChecks} title="Where your items stand" description="From draft to published">
        <div className="flex h-3 gap-px overflow-hidden rounded-full bg-muted" aria-hidden>
          {PIPE.map((p) => {
            const n = items.filter((i) => i.status === p.status).length;
            return n ? <span key={p.status} className="bg-primary" style={{ width: `${(n / items.length) * 100}%`, opacity: p.shade }} /> : null;
          })}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2">
          {PIPE.map((p) => (
            <div key={p.status} className="flex flex-col-reverse rounded-lg border px-3 py-2">
              <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="h-2 w-2 rounded-full bg-primary" style={{ opacity: p.shade }} aria-hidden />{p.label}</dt>
              <dd className="text-lg font-semibold tabular-nums">{items.filter((i) => i.status === p.status).length}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel id="regions" icon={Globe2} title="Regional footprint" description="Items by region of study">
        <ul className="space-y-3">
          {regions.map(([r, n]) => (
            <li key={r}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>{REGION_META[r as ArchiveItem['region']].label}</span>
                <span className="tabular-nums text-muted-foreground">{n}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div className="h-full rounded-full bg-primary/75" style={{ width: `${(n / maxRegion) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
