'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { BookOpen, Check, Download, Eye, PenSquare, Quote, Upload, X } from 'lucide-react';
import type { ArchiveItem, Expedition } from '@/types';
import { DashHeader } from './shell';
import { StatusStepper } from './stepper';
import { AccessBadge, EmptyState, Stat, StatusBadge } from '@/components/common';
import { DataTable } from '@/components/common/client';
import { BarSimple, ChartCard } from '@/components/charts/lazy';
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
import { CONTENT_TYPE_LABELS } from '@/lib/constants';
import { metadataQuality } from '@/lib/quality';
import { useAuthStore } from '@/store/auth';
import { useDataStore } from '@/store/data';

export function ScientistDashboard() {
  const user = useAuthStore((s) => s.user)!;
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

  const decide = async (id: string, status: 'approved' | 'declined') => {
    await api.decideAccess(id, status);
    toast.success(status === 'approved' ? 'Access granted — the requester can now download' : 'Request declined');
    invalidate([['access'], ['audit']]);
  };

  return (
    <>
      <DashHeader
        title={`Welcome, ${user.name.split(' ').slice(0, 2).join(' ')}`}
        description="Your uploads, approvals, access requests and impact."
        actions={
          <>
            {can('upload') && (
              <Button asChild>
                <Link href="/upload"><Upload /> Upload new</Link>
              </Button>
            )}
            {can('use_studio') && (
              <Button variant="aurora" asChild>
                <Link href="/studio"><PenSquare /> Draft a post</Link>
              </Button>
            )}
          </>
        }
      />
      <div className="space-y-8">
        <EmbargoNotice />
        <section aria-labelledby="impact" className="space-y-4">
          <h2 id="impact" className="sr-only">My impact</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {pipeline.isPending ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />) : (
              <>
                <Stat label="My items" value={mine.length} icon={<BookOpen className="h-4 w-4" />} />
                <Stat label="Views" value={views} icon={<Eye className="h-4 w-4" />} delta={9} />
                <Stat label="Downloads" value={downloads} icon={<Download className="h-4 w-4" />} delta={4} />
                <Stat label="Citations (demo)" value={Math.round(downloads / 18)} icon={<Quote className="h-4 w-4" />} />
              </>
            )}
          </div>
          <ChartCard title="Views by item (top 6)">
            <BarSimple data={[...mine].sort((a, b) => b.views - a.views).slice(0, 6).map((i) => ({ name: i.title.slice(0, 22) + '…', views: i.views, downloads: i.downloads }))} x="name" ys={[{ key: 'views', name: 'Views' }, { key: 'downloads', name: 'Downloads' }]} label="Views and downloads of my top items" layout="vertical" height={260} />
          </ChartCard>
        </section>

        <section aria-labelledby="uploads">
          <h2 id="uploads" className="mb-3 text-lg font-semibold">My uploads</h2>
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
        </section>

        <section aria-labelledby="tracker">
          <h2 id="tracker" className="mb-3 text-lg font-semibold">Approval tracker</h2>
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
                      <Button size="sm" variant="outline" className="ml-auto" asChild><Link href={`/studio?post=${p.id}`}>Continue in Studio</Link></Button>
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
        </section>

        <section id="requests" aria-labelledby="req" className="scroll-mt-28">
          <h2 id="req" className="mb-3 text-lg font-semibold">Access requests for my restricted data</h2>
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
        </section>

        <section aria-labelledby="exps">
          <h2 id="exps" className="mb-3 text-lg font-semibold">My expeditions & team</h2>
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
        </section>
      </div>
    </>
  );
}
