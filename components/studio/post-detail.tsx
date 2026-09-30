'use client';

import Link from 'next/link';
import { CalendarClock, Clock, Globe2, User } from 'lucide-react';
import type { SocialAccount, SocialPost } from '@/types';
import { AiBadge, StatusBadge } from '@/components/common';
import { PlatformLabel } from './platform-icon';
import { Dialog, DialogContent, DialogDescription, DialogTitle, Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/dialog';
import { LANGUAGES } from '@/lib/constants';
import { findRef, itemHref } from '@/lib/archive';
import { visibilityLabel } from '@/lib/visibility';
import { formatCompact } from '@/lib/utils';

const ist = (iso: string) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' });

/** Short description: explicit field, else the first sentence of the post text. */
export function shortDescription(p: Pick<SocialPost, 'description' | 'text'>): string {
  if (p.description) return p.description;
  const first = (p.text.match(/^[\s\S]*?[.!?।](\s|$)/)?.[0] ?? p.text).trim();
  return first.length > 180 ? `${first.slice(0, 177)}…` : first;
}

/** Post details: platforms + accounts, date/time (IST), author, language, visibility, content, metrics, sources. */
function PostDetailBody({ post, accounts }: { post: SocialPost; accounts: SocialAccount[] }) {
  return (
    <>
      <dl className="space-y-3 rounded-lg border p-4 text-sm">
        <div>
          <dt className="mb-1 text-xs text-muted-foreground">Posted on</dt>
          <dd className="space-y-1.5">
            {post.platforms.length === 0 ? (
              <span>DhruvShiksha website ({post.outputType})</span>
            ) : (
              post.platforms.map((pl) => {
                const accs = accounts.filter((a) => post.accountIds.includes(a.id) && a.platform === pl);
                return (
                  <div key={pl} className="flex flex-wrap items-center gap-2">
                    <PlatformLabel id={pl} className="font-medium" />
                    {accs.length > 0 && <span className="text-xs text-muted-foreground">{accs.map((a) => a.handle).join(', ')}</span>}
                  </div>
                );
              })
            )}
          </dd>
        </div>
        <div className="flex items-start gap-2">
          {post.status === 'scheduled' ? <CalendarClock className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden /> : <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />}
          <div>
            <dt className="text-xs text-muted-foreground">{post.publishedAt ? 'Published' : post.scheduledAt ? 'Scheduled for' : 'Last updated'}</dt>
            <dd>{ist(post.publishedAt ?? post.scheduledAt ?? post.updatedAt)} IST</dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <User className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
          <div>
            <dt className="text-xs text-muted-foreground">Created by</dt>
            <dd>
              {post.createdBy} · {new Date(post.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
            </dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Globe2 className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
          <div>
            <dt className="text-xs text-muted-foreground">Language · visibility</dt>
            <dd>
              {LANGUAGES.find((l) => l.code === post.language)?.label ?? post.language} · {visibilityLabel(post.visibleTo)}
            </dd>
          </div>
        </div>
      </dl>

      <section aria-label="Post content" className="rounded-lg border bg-muted/30 p-4">
        <p lang={post.language} className="whitespace-pre-wrap text-sm leading-6">
          {post.text}
        </p>
        {post.hashtags.length > 0 && <p className="mt-2 text-sm text-primary">{post.hashtags.join(' ')}</p>}
      </section>

      {post.metrics && (
        <div className="grid grid-cols-4 gap-2 text-center">
          {(
            [
              ['Reach', post.metrics.reach],
              ['Impressions', post.metrics.impressions],
              ['Engagement', post.metrics.engagement],
              ['Clicks', post.metrics.clicks],
            ] as const
          ).map(([l, v]) => (
            <div key={l} className="rounded-md border p-2">
              <p className="font-semibold tabular-nums">{formatCompact(v)}</p>
              <p className="text-[11px] text-muted-foreground">{l}</p>
            </div>
          ))}
        </div>
      )}

      {post.sources.length > 0 && (
        <div className="text-sm">
          <p className="mb-1 font-medium">Sources</p>
          <ul className="space-y-1">
            {post.sources.map((s) => {
              const it = findRef(s);
              return (
                <li key={s.id}>
                  {it ? (
                    <Link href={itemHref(it)} className="text-primary hover:underline">
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
      )}
    </>
  );
}

function Heading({ post }: { post: SocialPost }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusBadge status={post.status} />
      {post.aiGenerated && <AiBadge label="AI-assisted" />}
    </div>
  );
}

interface Props {
  post: SocialPost | null;
  accounts: SocialAccount[];
  onClose: () => void;
  /** Extra actions (e.g. Open in Studio, Reschedule). */
  footer?: React.ReactNode;
}

/** Right-side panel variant (Activity queue). */
export function PostDetailSheet({ post, accounts, onClose, footer }: Props) {
  return (
    <Sheet open={!!post} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        {post && (
          <>
            <div className="space-y-2 pr-6">
              <Heading post={post} />
              <SheetTitle className="text-lg leading-snug">{post.title}</SheetTitle>
              <SheetDescription>{shortDescription(post)}</SheetDescription>
            </div>
            <PostDetailBody post={post} accounts={accounts} />
            {footer && <div className="flex flex-wrap gap-2">{footer}</div>}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Centered pop-up variant (calendar titles, drafts, top posts). */
export function PostDetailDialog({ post, accounts, onClose, footer }: Props) {
  return (
    <Dialog open={!!post} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        {post && (
          <>
            <div className="space-y-2 pr-6">
              <Heading post={post} />
              <DialogTitle className="text-lg leading-snug">{post.title}</DialogTitle>
              <DialogDescription>{shortDescription(post)}</DialogDescription>
            </div>
            <PostDetailBody post={post} accounts={accounts} />
            {footer && <div className="flex flex-wrap justify-end gap-2">{footer}</div>}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
