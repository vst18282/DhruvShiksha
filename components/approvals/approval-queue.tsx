'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, FlaskConical, MessageSquare, RotateCcw, Upload, XCircle } from 'lucide-react';
import type { ArchiveItem, SocialPost, Status } from '@/types';
import { AiBadge, EmptyState, StatusBadge } from '@/components/common';
import { ItemCard } from '@/components/archive/item-card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ListRowSkeleton } from '@/components/skeletons';
import { useApi, useInvalidate } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { useAuthStore } from '@/store/auth';
import { useCan } from '@/lib/permissions';
import { CONTENT_TYPE_LABELS, LANGUAGES, PLATFORM_META, STATUS_META } from '@/lib/constants';
import { metadataQuality } from '@/lib/quality';
import { findRef } from '@/lib/archive';
import { PlatformIcon } from '@/components/studio/platform-icon';
import { cn } from '@/lib/utils';

type Entry = { kind: 'post'; post: SocialPost } | { kind: 'item'; item: ArchiveItem };

const keyOf = (e: Entry) => (e.kind === 'post' ? e.post.id : e.item.id);
const statusOf = (e: Entry) => (e.kind === 'post' ? e.post.status : e.item.status);
const titleOf = (e: Entry) => (e.kind === 'post' ? e.post.title : e.item.title);
const SCIENCE_MARK = '✔ Science accuracy verified';
export const isScienceVerified = (p: SocialPost) => p.comments.some((c) => c.text.startsWith(SCIENCE_MARK));

/**
 * Approval queue with side-by-side preview. `mode="queue"` shows items awaiting review;
 * `mode="oversight"` (admin) shows the whole pipeline with status filter and override.
 */
export function ApprovalQueue({ mode = 'queue' }: { mode?: 'queue' | 'oversight' }) {
  const user = useAuthStore((s) => s.user);
  const invalidate = useInvalidate();
  const posts = useApi(['posts'], api.getPosts);
  const items = useApi(['pipeline'], api.getPipelineItems);
  const [filter, setFilter] = useState<Status | 'all' | 'pending'>(mode === 'queue' ? 'pending' : 'all');
  const [selected, setSelected] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const entries: Entry[] = useMemo(() => {
    const list: Entry[] = [...(posts.data ?? []).map((p) => ({ kind: 'post' as const, post: p })), ...(items.data ?? []).map((i) => ({ kind: 'item' as const, item: i }))];
    return list.filter((e) => {
      const s = statusOf(e);
      if (filter === 'pending') return s === 'in_review';
      if (filter === 'all') return true;
      return s === filter;
    });
  }, [posts.data, items.data, filter]);

  const current = entries.find((e) => keyOf(e) === selected) ?? entries[0];
  const role = user?.role ?? null;
  const perms = useCan();
  const canApprove = perms.canFully('approve_publish');
  const scienceOnly = perms.grant('approve_publish') === 'science';
  // When the workflow requires it, posts need a scientist's science review before approval.
  const needsScience = !!current && current.kind === 'post' && perms.scienceReviewRequired && !isScienceVerified(current.post);

  const act = async (e: Entry, status: Status, label: string) => {
    setBusy(label);
    if (e.kind === 'post') await api.transitionPost(e.post.id, status, comment || undefined);
    else await api.patchItem(e.item.id, { status, updatedAt: new Date().toISOString() });
    setBusy(null);
    setComment('');
    toast.success(`${label}: ${titleOf(e)}`);
    invalidate([['posts'], ['pipeline'], ['item', keyOf(e)], ['feed'], ['audit'], ['search']]);
  };
  const scienceOk = async (e: Entry) => {
    if (e.kind !== 'post') return;
    setBusy('science');
    await api.transitionPost(e.post.id, e.post.status, `${SCIENCE_MARK}${comment ? ` — ${comment}` : ''}`);
    setBusy(null);
    setComment('');
    toast.success('Science review recorded');
    invalidate([['posts']]);
  };

  const loading = posts.isPending || items.isPending;

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <div className="space-y-3">
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger aria-label="Status filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Awaiting review</SelectItem>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(STATUS_META) as Status[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ul className="max-h-[70vh] space-y-2 overflow-y-auto pr-1" aria-label="Queue">
          {loading && Array.from({ length: 4 }).map((_, i) => <li key={i}><ListRowSkeleton /></li>)}
          {!loading && entries.length === 0 && (
            <li>
              <EmptyState title="Queue is clear" description="Nothing is waiting for review with this filter." />
            </li>
          )}
          {entries.map((e) => {
            const k = keyOf(e);
            const active = current && keyOf(current) === k;
            return (
              <li key={k}>
                <button
                  type="button"
                  onClick={() => setSelected(k)}
                  aria-pressed={active}
                  className={cn('w-full rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/50', active && 'border-primary ring-1 ring-primary')}
                >
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary">{e.kind === 'post' ? (e.post.outputType === 'social' ? 'Social post' : e.post.outputType) : `Upload · ${CONTENT_TYPE_LABELS[e.item.type].singular}`}</Badge>
                    <StatusBadge status={statusOf(e)} />
                  </div>
                  <p className="line-clamp-2 text-sm font-medium">{titleOf(e)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {e.kind === 'post' ? `by ${e.post.createdBy} · ${e.post.platforms.map((p) => PLATFORM_META[p].label).join(', ')}` : `by ${e.item.authors.join(', ')}`}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="min-w-0">
        {!current ? (
          !loading && <EmptyState title="Select an item to preview" />
        ) : (
          <div className="space-y-4 rounded-lg border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">{titleOf(current)}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusBadge status={statusOf(current)} />
                  {current.kind === 'post' && current.post.aiGenerated && <AiBadge />}
                </div>
              </div>
              {current.kind === 'post' && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/studio?post=${current.post.id}`}>Open in Studio</Link>
                </Button>
              )}
            </div>

            {current.kind === 'post' ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-md border bg-background p-4">
                  <p className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {current.post.platforms.map((p) => (
                      <span key={p} className="inline-flex items-center gap-1">
                        <PlatformIcon id={p} className="h-3.5 w-3.5" /> {PLATFORM_META[p].label}
                      </span>
                    ))}
                    · {LANGUAGES.find((l) => l.code === current.post.language)?.label}
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-6">{current.post.text}</p>
                  <p className="mt-2 text-sm text-primary">{current.post.hashtags.join(' ')}</p>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="mb-1 font-medium">Sources</p>
                    <ul className="space-y-1">
                      {current.post.sources.map((s) => {
                        const it = findRef(s);
                        return (
                          <li key={s.id}>
                            {it ? (
                              <Link href={CONTENT_TYPE_LABELS[it.type].href(it.slug)} className="text-primary hover:underline">
                                {it.title}
                              </Link>
                            ) : (
                              s.id
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  {current.post.scheduledAt && <p>Scheduled: {new Date(current.post.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>}
                  <div>
                    <p className="mb-1 flex items-center gap-1 font-medium">
                      <MessageSquare className="h-4 w-4" aria-hidden /> Review comments
                    </p>
                    {current.post.comments.length === 0 ? (
                      <p className="text-muted-foreground">No comments yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {current.post.comments.map((c) => (
                          <li key={c.id} className="rounded-md bg-muted/60 p-2">
                            <p className="text-xs font-medium">
                              {c.author} <span className="text-muted-foreground">· {new Date(c.at).toLocaleDateString('en-IN')}</span>
                            </p>
                            <p>{c.text}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <ItemCard item={current.item} showStatus />
                <div className="space-y-2 text-sm">
                  {(() => {
                    const q = metadataQuality(current.item);
                    return (
                      <>
                        <p className="flex items-center gap-2 font-medium">
                          <Upload className="h-4 w-4" aria-hidden /> Metadata completeness: <span className={cn(q.score >= 80 ? 'text-success' : 'text-polar-amber')}>{q.score}%</span>
                        </p>
                        {q.missing.length > 0 && <p className="text-muted-foreground">Missing: {q.missing.join(', ')}</p>}
                      </>
                    );
                  })()}
                  <p>Access: {current.item.accessLevel}{current.item.embargoUntil ? ` (until ${current.item.embargoUntil})` : ''}</p>
                  <p>Licence: {current.item.licence}</p>
                  <p>Credit: {current.item.credit}</p>
                  <Link href={CONTENT_TYPE_LABELS[current.item.type].href(current.item.slug)} className="text-primary hover:underline">
                    Open full preview →
                  </Link>
                </div>
              </div>
            )}

            <div className="space-y-2 border-t pt-4">
              <label htmlFor="rev-comment" className="text-sm font-medium">
                Comment (optional)
              </label>
              <Textarea id="rev-comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Leave a note for the author…" rows={2} />
              <div className="flex flex-wrap gap-2">
                {canApprove && (
                  <>
                    <Button
                      variant="success"
                      loading={busy === 'Approved'}
                      disabled={needsScience}
                      title={needsScience ? 'A scientist must mark this post science-accurate first' : undefined}
                      onClick={() => act(current, current.kind === 'post' ? 'approved' : 'published', 'Approved')}
                    >
                      <CheckCircle2 /> {current.kind === 'post' ? 'Approve' : 'Approve & publish'}
                    </Button>
                    <Button variant="outline" loading={busy === 'Changes requested'} onClick={() => act(current, 'changes_requested', 'Changes requested')}>
                      <RotateCcw /> Request changes
                    </Button>
                    <Button variant="destructive" loading={busy === 'Rejected'} onClick={() => act(current, 'rejected', 'Rejected')}>
                      <XCircle /> Reject
                    </Button>
                  </>
                )}
                {scienceOnly && current.kind === 'post' && (
                  <Button variant="secondary" loading={busy === 'science'} onClick={() => scienceOk(current)}>
                    <FlaskConical /> Mark science-accurate
                  </Button>
                )}
                {mode === 'oversight' && role === 'admin' && (
                  <Select onValueChange={(v) => act(current, v as Status, `Override → ${STATUS_META[v as Status].label}`)}>
                    <SelectTrigger className="w-48" aria-label="Override status">
                      <SelectValue placeholder="Override status…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_META) as Status[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_META[s].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {!canApprove && !scienceOnly && <p className="text-sm text-muted-foreground">Your role can view but not approve items.</p>}
                {canApprove && needsScience && (
                  <p className="w-full text-sm text-polar-amber" role="status">
                    Science review required: a scientist must mark this post science-accurate before it can be approved.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
