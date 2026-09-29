'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Flag, MessageSquareWarning, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { Audience, SocialPost } from '@/types';
import { DataTable, type Column } from '@/components/common/client';
import { EmptyState } from '@/components/common';
import { VisibilityControl } from '@/components/common/visibility-control';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/misc';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TableSkeleton } from '@/components/skeletons';
import { useApi, useInvalidate } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { publishedItems, itemHref } from '@/lib/archive';
import { CONTENT_TYPE_LABELS } from '@/lib/constants';
import { engagementKey, healthScore, reasonLabel, type Engagement } from '@/lib/engagement';
import { visibilityLabel } from '@/lib/visibility';
import { combineEngagement, useEngagementStore } from '@/store/engagement';
import { useDataStore } from '@/store/data';
import { useCan } from '@/lib/permissions';
import { cn } from '@/lib/utils';

interface HealthRow {
  key: string;
  kind: 'item' | 'post';
  id: string;
  title: string;
  typeLabel: string;
  href?: string;
  visibleTo?: Audience[];
  e: Engagement;
  score: number;
  openReports: number;
  negReviews: number;
  toFix: number;
}

/** Rating ≤ 2 counts as a negative review that needs attention. */
const isNegative = (rating: number) => rating <= 2;

export function scoreTone(score: number) {
  return score >= 75 ? 'text-success' : score >= 55 ? 'text-polar-amber' : 'text-destructive';
}

/**
 * Content health: score from likes vs dislikes (Bayesian average, see lib/engagement),
 * "To fix" from open reports and negative reviews. Covers archive items and published posts.
 */
export function HealthTab() {
  const posts = useApi(['posts'], api.getPosts);
  const reactions = useEngagementStore((s) => s.reactions);
  const reports = useEngagementStore((s) => s.reports);
  const resolved = useEngagementStore((s) => s.resolved);
  const resolve = useEngagementStore((s) => s.resolve);
  const patches = useDataStore((s) => s.patches);
  const uploads = useDataStore((s) => s.uploads);
  const invalidate = useInvalidate();
  const { can } = useCan();
  const [kind, setKind] = useState<'all' | 'item' | 'post'>('all');
  const [issuesOnly, setIssuesOnly] = useState(true);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const rows = useMemo<HealthRow[]>(() => {
    const s = { reactions, reports, resolved };
    const build = (key: string, base: Omit<HealthRow, 'e' | 'score' | 'openReports' | 'negReviews' | 'toFix' | 'key'>): HealthRow => {
      const e = combineEngagement(key, s);
      const openReports = e.reports.filter((r) => r.status === 'open').length;
      const negReviews = e.reviews.filter((r) => isNegative(r.rating) && !resolved.includes(r.id)).length;
      return { ...base, key, e, score: healthScore(e.likes, e.dislikes), openReports, negReviews, toFix: openReports + negReviews };
    };
    const items = publishedItems().map((i) => build(engagementKey(i.type, i.id), { kind: 'item', id: i.id, title: i.title, typeLabel: CONTENT_TYPE_LABELS[i.type].singular, href: itemHref(i), visibleTo: i.visibleTo }));
    const ps = (posts.data ?? []).filter((p) => p.status === 'published').map((p: SocialPost) => build(engagementKey('post', p.id), { kind: 'post', id: p.id, title: p.title, typeLabel: 'Post', href: `/updates#${p.id}`, visibleTo: p.visibleTo }));
    return [...items, ...ps];
    // publishedItems() is memoised on patches/uploads
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts.data, reactions, reports, resolved, patches, uploads]);

  const shown = rows.filter((r) => (kind === 'all' || r.kind === kind) && (!issuesOnly || r.toFix > 0 || r.score < 55)).sort((a, b) => b.toFix - a.toFix || a.score - b.score);
  const open = rows.find((r) => r.key === openKey) ?? null;
  const totals = { fix: rows.reduce((n, r) => n + r.toFix, 0), low: rows.filter((r) => r.score < 55).length, avg: rows.length ? Math.round(rows.reduce((n, r) => n + r.score, 0) / rows.length) : 0 };

  const setVisibility = async (r: HealthRow, v: Audience[] | undefined) => {
    if (r.kind === 'item') await api.patchItem(r.id, { visibleTo: v, updatedAt: new Date().toISOString() });
    else await api.setPostVisibility(r.id, v);
    invalidate([['posts'], ['feed'], ['audit'], ['item', r.id]]);
    toast.success(`Visibility: ${visibilityLabel(v)}`, { description: r.title });
  };

  const cols: Column<HealthRow>[] = [
    { key: 'score', header: 'Score', sortValue: (r) => r.score, cell: (r) => <span className={cn('text-base font-semibold tabular-nums', scoreTone(r.score))}>{r.score}</span> },
    {
      key: 'title',
      header: 'Content',
      sortValue: (r) => r.title,
      cell: (r) => (
        <div className="min-w-0">
          <p className="line-clamp-1 font-medium">{r.title}</p>
          <p className="text-xs text-muted-foreground">
            {r.typeLabel}
            {r.visibleTo ? ` · ${visibilityLabel(r.visibleTo)}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'votes',
      header: 'Likes / dislikes',
      sortValue: (r) => r.e.likes - r.e.dislikes,
      className: 'hidden md:table-cell',
      cell: (r) => (
        <span className="inline-flex items-center gap-3 tabular-nums">
          <span className="inline-flex items-center gap-1">
            <ThumbsUp className="h-3.5 w-3.5 text-success" aria-label="Likes" /> {r.e.likes}
          </span>
          <span className="inline-flex items-center gap-1">
            <ThumbsDown className="h-3.5 w-3.5 text-destructive" aria-label="Dislikes" /> {r.e.dislikes}
          </span>
        </span>
      ),
    },
    {
      key: 'fix',
      header: 'To fix',
      sortValue: (r) => r.toFix,
      cell: (r) =>
        r.toFix === 0 ? (
          <span className="text-xs text-muted-foreground">Nothing open</span>
        ) : (
          <span className="flex flex-wrap gap-1">
            {r.openReports > 0 && (
              <Badge variant="destructive" className="gap-1">
                <Flag className="h-3 w-3" aria-hidden /> {r.openReports} report{r.openReports > 1 ? 's' : ''}
              </Badge>
            )}
            {r.negReviews > 0 && (
              <Badge variant="warning" className="gap-1">
                <MessageSquareWarning className="h-3 w-3" aria-hidden /> {r.negReviews} review{r.negReviews > 1 ? 's' : ''}
              </Badge>
            )}
          </span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Average score</p>
          <p className={cn('text-2xl font-semibold tabular-nums', scoreTone(totals.avg))}>{totals.avg}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Open issues (reports + negative reviews)</p>
          <p className="text-2xl font-semibold tabular-nums">{totals.fix}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Low score (&lt; 55)</p>
          <p className="text-2xl font-semibold tabular-nums">{totals.low}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Score = likes vs dislikes, pulled toward 50 when there are few votes so one dislike can’t sink an item. “To fix” counts open reports and reviews rated 1–2 stars. Demo engagement numbers plus reactions made in this browser.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
          <SelectTrigger className="w-44" aria-label="Content kind">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Archive items & posts</SelectItem>
            <SelectItem value="item">Archive items</SelectItem>
            <SelectItem value="post">Published posts</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch id="h-issues" checked={issuesOnly} onCheckedChange={setIssuesOnly} />
          <Label htmlFor="h-issues">Only items needing attention</Label>
        </div>
        <span className="text-xs text-muted-foreground">{shown.length} shown</span>
      </div>
      {posts.isPending ? (
        <TableSkeleton />
      ) : shown.length === 0 ? (
        <EmptyState title="Everything looks healthy" description="No open reports or negative reviews with this filter." />
      ) : (
        <DataTable caption="Content health" rowKey={(r) => r.key} rows={shown} columns={cols} onRowClick={(r) => setOpenKey(r.key)} rowLabel={(r) => `Open health details for ${r.title}`} />
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpenKey(null)}>
        {open && (
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="pr-6">{open.title}</DialogTitle>
              <DialogDescription>
                {open.typeLabel} · score <span className={cn('font-semibold', scoreTone(open.score))}>{open.score}</span> · {open.e.likes} likes · {open.e.dislikes} dislikes
              </DialogDescription>
            </DialogHeader>
            <section aria-labelledby="h-rep" className="space-y-2">
              <h3 id="h-rep" className="text-sm font-semibold">
                Reports
              </h3>
              {open.e.reports.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reports.</p>
              ) : (
                <ul className="space-y-2">
                  {open.e.reports.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 rounded-md border p-3 text-sm">
                      <div>
                        <p className="font-medium">{reasonLabel(r.reason)}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.by} · {new Date(r.at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                        </p>
                        {r.note && <p className="mt-1">{r.note}</p>}
                      </div>
                      {r.status === 'open' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            resolve(r.id);
                            toast.success('Report marked as resolved');
                          }}
                        >
                          <CheckCircle2 /> Resolve
                        </Button>
                      ) : (
                        <Badge variant="success">Resolved</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section aria-labelledby="h-rev" className="space-y-2">
              <h3 id="h-rev" className="text-sm font-semibold">
                Reviews
              </h3>
              {open.e.reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reviews.</p>
              ) : (
                <ul className="space-y-2">
                  {open.e.reviews.map((r) => {
                    const neg = isNegative(r.rating);
                    const done = resolved.includes(r.id);
                    return (
                      <li key={r.id} className={cn('flex flex-wrap items-start justify-between gap-2 rounded-md border p-3 text-sm', neg && !done && 'border-polar-amber/50')}>
                        <div>
                          <p>
                            <span aria-label={`${r.rating} out of 5 stars`}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span> <span className="text-xs text-muted-foreground">{r.by}</span>
                          </p>
                          <p className="mt-1">{r.text}</p>
                        </div>
                        {neg &&
                          (done ? (
                            <Badge variant="success">Addressed</Badge>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => resolve(r.id)}>
                              <CheckCircle2 /> Mark addressed
                            </Button>
                          ))}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
            {can('set_visibility') && (
              <div className="rounded-md border p-3">
                <VisibilityControl id="h-vis" value={open.visibleTo} onChange={(v) => setVisibility(open, v)} />
              </div>
            )}
            {open.href && (
              <Button variant="outline" asChild>
                <Link href={open.href}>Open {open.kind === 'post' ? 'in Updates feed' : 'item page'}</Link>
              </Button>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
