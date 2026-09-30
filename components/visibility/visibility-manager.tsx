'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Building2, Check, Eye, FileText, FlaskConical, Globe2, Lock, Megaphone, Search, SlidersHorizontal, UserCheck, X, type LucideIcon } from 'lucide-react';
import type { Audience } from '@/types';
import { DataTable } from '@/components/common/client';
import { VisibilityControl } from '@/components/common/visibility-control';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/misc';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TableSkeleton } from '@/components/skeletons';
import { useApi, useInvalidate } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { allItems } from '@/lib/archive';
import { CONTENT_TYPE_LABELS } from '@/lib/constants';
import { AUDIENCES, AUDIENCE_LABELS, VISIBILITY_PRESETS, normaliseVisibility, visibilityLabel } from '@/lib/visibility';
import { useDataStore } from '@/store/data';
import { cn } from '@/lib/utils';

interface Row {
  kind: 'item' | 'post';
  id: string;
  title: string;
  type: string;
  visibleTo?: Audience[];
}

type Bucket = 'all' | 'signed-in' | 'research' | 'staff' | 'custom';

/** Which preset (or "custom") a visibility list corresponds to. */
function bucketOf(v: Audience[] | undefined): Bucket {
  const n = normaliseVisibility(v);
  if (!n) return 'all';
  const p = VISIBILITY_PRESETS.find((x) => x.value && x.value.length === n.length && x.value.every((a) => n.includes(a)));
  return (p?.id as Bucket | undefined) ?? 'custom';
}

const BUCKETS: { id: Bucket; label: string; hint: string; icon: LucideIcon; tone: string }[] = [
  { id: 'all', label: 'Everyone', hint: 'Public, incl. visitors', icon: Globe2, tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' },
  { id: 'signed-in', label: 'Signed-in users', hint: 'Any account', icon: UserCheck, tone: 'bg-sky-500/10 text-sky-600 dark:text-sky-300' },
  { id: 'research', label: 'Research', hint: 'Researchers & scientists', icon: FlaskConical, tone: 'bg-violet-500/10 text-violet-600 dark:text-violet-300' },
  { id: 'staff', label: 'NCPOR staff', hint: 'Scientists & managers', icon: Building2, tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-300' },
  { id: 'custom', label: 'Custom', hint: 'Hand-picked roles', icon: SlidersHorizontal, tone: 'bg-rose-500/10 text-rose-600 dark:text-rose-300' },
];
const BUCKET = Object.fromEntries(BUCKETS.map((b) => [b.id, b])) as Record<Bucket, (typeof BUCKETS)[number]>;

/** Per-role visibility for published content and posts (content managers). */
export function VisibilityManager() {
  const posts = useApi(['posts'], api.getPosts);
  const patches = useDataStore((s) => s.patches);
  const uploads = useDataStore((s) => s.uploads);
  const invalidate = useInvalidate();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'all' | 'item' | 'post'>('all');
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [edit, setEdit] = useState<Row | null>(null);

  const rows = useMemo<Row[]>(() => {
    const items = allItems()
      .filter((i) => i.status === 'published')
      .map((i): Row => ({ kind: 'item', id: i.id, title: i.title, type: CONTENT_TYPE_LABELS[i.type].singular, visibleTo: i.visibleTo }));
    const ps = (posts.data ?? []).filter((p) => p.status === 'published').map((p): Row => ({ kind: 'post', id: p.id, title: p.title, type: 'Post', visibleTo: p.visibleTo }));
    return [...ps, ...items];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts.data, patches, uploads]);
  const inKind = rows.filter((r) => kind === 'all' || r.kind === kind);
  const counts = BUCKETS.reduce<Record<Bucket, number>>((acc, b) => ((acc[b.id] = inKind.filter((r) => bucketOf(r.visibleTo) === b.id).length), acc), { all: 0, 'signed-in': 0, research: 0, staff: 0, custom: 0 });
  const limited = inKind.length - counts.all;
  const shown = inKind.filter((r) => (!bucket || bucketOf(r.visibleTo) === bucket) && r.title.toLowerCase().includes(q.toLowerCase()));
  const current = edit ? rows.find((r) => r.id === edit.id) ?? edit : null;
  const currentSet = current ? normaliseVisibility(current.visibleTo) : undefined;

  const save = async (r: Row, v: Audience[] | undefined) => {
    if (r.kind === 'item') await api.patchItem(r.id, { visibleTo: v, updatedAt: new Date().toISOString() });
    else await api.setPostVisibility(r.id, v);
    invalidate([['posts'], ['feed'], ['audit'], ['item', r.id], ['search']]);
    toast.success(`Visible to: ${visibilityLabel(v)}`, { description: r.title });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border bg-gradient-to-br from-primary/5 via-card to-card p-5 shadow-sm sm:flex-row sm:items-center">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Eye className="h-5 w-5" aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{limited === 0 ? 'Everything is public' : `${limited} of ${inKind.length} limited to certain roles`}</p>
          <p className="text-sm text-muted-foreground">Content is visible to everyone by default. Limit an item or post to specific roles; content managers and admins always see all content.</p>
        </div>
        <div className="w-full shrink-0 sm:w-40" aria-hidden>
          <div className="flex h-2 overflow-hidden rounded-full bg-muted">
            <span className="bg-emerald-500" style={{ width: `${inKind.length ? (counts.all / inKind.length) * 100 : 0}%` }} />
            <span className="bg-amber-500" style={{ width: `${inKind.length ? (limited / inKind.length) * 100 : 0}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{inKind.length ? Math.round((counts.all / inKind.length) * 100) : 0}% public</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" role="group" aria-label="Filter by audience">
        {BUCKETS.map((b) => {
          const on = bucket === b.id;
          return (
            <button
              key={b.id}
              type="button"
              aria-pressed={on}
              onClick={() => setBucket(on ? null : b.id)}
              className={cn('flex items-start gap-3 rounded-xl border bg-card p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0', on && 'border-primary ring-1 ring-primary/40')}
            >
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', b.tone)}><b.icon className="h-4 w-4" aria-hidden /></span>
              <span className="min-w-0">
                <span className="block text-xl font-semibold tabular-nums leading-tight">{counts[b.id]}</span>
                <span className="block truncate text-xs font-medium">{b.label}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{b.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search published content…" aria-label="Search content" className="pl-9" />
        </div>
        <ToggleGroup type="single" value={kind} onValueChange={(v) => v && setKind(v as typeof kind)} aria-label="Content kind">
          <ToggleGroupItem value="all" className="text-xs">All</ToggleGroupItem>
          <ToggleGroupItem value="post" className="text-xs"><Megaphone /> Posts</ToggleGroupItem>
          <ToggleGroupItem value="item" className="text-xs"><FileText /> Archive items</ToggleGroupItem>
        </ToggleGroup>
        {bucket && (
          <Button variant="ghost" size="sm" onClick={() => setBucket(null)}><X /> {BUCKET[bucket].label}</Button>
        )}
      </div>

      {posts.isPending ? (
        <TableSkeleton />
      ) : (
        <DataTable
          caption="Content visibility"
          rowKey={(r) => `${r.kind}:${r.id}`}
          rows={shown}
          empty="Nothing matches these filters"
          onRowClick={setEdit}
          rowLabel={(r) => `Change who can see ${r.title}`}
          columns={[
            {
              key: 'title', header: 'Content', sortValue: (r) => r.title,
              cell: (r) => (
                <span className="flex items-center gap-3">
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', r.kind === 'post' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-300' : 'bg-secondary text-primary')}>
                    {r.kind === 'post' ? <Megaphone className="h-4 w-4" aria-hidden /> : <FileText className="h-4 w-4" aria-hidden />}
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-1 font-medium">{r.title}</span>
                    <span className="text-xs text-muted-foreground">{r.type}</span>
                  </span>
                </span>
              ),
            },
            {
              key: 'vis', header: 'Visible to', sortValue: (r) => visibilityLabel(r.visibleTo),
              cell: (r) => {
                const b = BUCKET[bucketOf(r.visibleTo)];
                return (
                  <span className={cn('inline-flex max-w-[16rem] items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', b.tone)}>
                    {b.id === 'all' ? <Globe2 className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                    <span className="truncate">{visibilityLabel(r.visibleTo)}</span>
                  </span>
                );
              },
            },
            {
              key: 'act',
              header: '',
              cell: (r) => (
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setEdit(r); }} aria-label={`Change visibility of ${r.title}`}>
                  <Eye /> Change
                </Button>
              ),
            },
          ]}
        />
      )}

      <Dialog open={!!current} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Who can see this?</DialogTitle>
            <DialogDescription className="line-clamp-2">{current?.title}</DialogDescription>
          </DialogHeader>
          {current && (
            <>
              <VisibilityControl key={current.id} id="vm-vis" value={current.visibleTo} onChange={(v) => save(current, v)} />
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Right now</p>
                <ul className="grid grid-cols-2 gap-1.5 text-sm">
                  {AUDIENCES.map((a) => {
                    const yes = !currentSet || currentSet.includes(a) || a === 'admin' || a === 'content_manager';
                    return (
                      <li key={a} className={cn('flex items-center gap-2 rounded-md border px-2 py-1.5', yes ? 'bg-success/5' : 'bg-muted/40 text-muted-foreground')}>
                        {yes ? <Check className="h-3.5 w-3.5 text-success" aria-hidden /> : <X className="h-3.5 w-3.5" aria-hidden />}
                        <span className="truncate">{AUDIENCE_LABELS[a].replace(' (not logged in)', '')}</span>
                        <span className="sr-only">{yes ? 'can see it' : 'cannot see it'}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
