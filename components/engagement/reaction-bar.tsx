'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Flag, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem, Tooltip } from '@/components/ui/misc';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { REPORT_REASONS, engagementKey, type ReportReason } from '@/lib/engagement';
import { audit } from '@/lib/mock-api';
import { combineEngagement, useEngagementStore } from '@/store/engagement';
import { useAuthStore } from '@/store/auth';
import { useDataStore } from '@/store/data';
import { useHydrated } from '@/store/hydration';
import { cn, formatCompact } from '@/lib/utils';

/**
 * Like / dislike / report controls for public pages (archive items and posts). Counts are demo
 * numbers plus reactions made in this browser; signed-in users can react and report.
 * Admins can switch reactions or reporting off in System settings.
 */
export function ReactionBar({ type, id, title, className, size = 'sm' }: { type: string; id: string; title: string; className?: string; size?: 'sm' | 'xs' }) {
  const hydrated = useHydrated();
  const user = useAuthStore((s) => s.user);
  const enableReactions = useDataStore((s) => s.settings.enableReactions);
  const enableReporting = useDataStore((s) => s.settings.enableReporting);
  const reactions = useEngagementStore((s) => s.reactions);
  const reports = useEngagementStore((s) => s.reports);
  const resolved = useEngagementStore((s) => s.resolved);
  const react = useEngagementStore((s) => s.react);
  const submitReport = useEngagementStore((s) => s.report);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('incorrect');
  const [note, setNote] = useState('');

  const key = engagementKey(type, id);
  const e = useMemo(() => combineEngagement(key, { reactions, reports, resolved }), [key, reactions, reports, resolved]);
  if (!hydrated) return <div className={cn('h-9 w-56 rounded-md bg-muted/60', className)} aria-hidden />;
  if (!enableReactions && !enableReporting) return null;

  const mine = user ? reactions[user.id]?.[key] : undefined;
  const alreadyReported = !!user && reports.some((r) => r.key === key && r.by === user.name && !resolved.includes(r.id));
  const btn = size === 'xs' ? 'h-8 px-2.5 text-xs' : '';

  const onReact = (r: 'like' | 'dislike') => {
    if (!user) return toast.info('Log in to like or dislike', { action: { label: 'Log in', onClick: () => (window.location.href = '/login') } });
    react(user.id, key, r);
  };
  const send = () => {
    if (!user) return;
    if (reason === 'other' && note.trim().length < 5) return toast.error('Please describe the problem (5+ characters)');
    submitReport(key, reason, note.trim().slice(0, 500), user.name);
    audit('reported content', type, title, { itemId: id, details: `${REPORT_REASONS.find((x) => x.id === reason)?.label}${note.trim() ? `: ${note.trim().slice(0, 140)}` : ''}` });
    toast.success('Thanks, your report was sent to the content team');
    setOpen(false);
    setNote('');
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)} role="group" aria-label={`Feedback on ${title}`}>
      {enableReactions && (
        <div className="inline-flex overflow-hidden rounded-md border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn('rounded-none', btn, mine === 'like' && 'bg-success/15 text-success hover:bg-success/20')}
            aria-pressed={mine === 'like'}
            aria-label={`Like (${e.likes})`}
            onClick={() => onReact('like')}
          >
            <ThumbsUp className={cn(mine === 'like' && 'fill-current')} /> <span className="tabular-nums">{formatCompact(e.likes)}</span>
          </Button>
          <span className="w-px bg-border" aria-hidden />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn('rounded-none', btn, mine === 'dislike' && 'bg-destructive/10 text-destructive hover:bg-destructive/15')}
            aria-pressed={mine === 'dislike'}
            aria-label={`Dislike (${e.dislikes})`}
            onClick={() => onReact('dislike')}
          >
            <ThumbsDown className={cn(mine === 'dislike' && 'fill-current')} /> <span className="tabular-nums">{formatCompact(e.dislikes)}</span>
          </Button>
        </div>
      )}
      {enableReporting &&
        (user ? (
          <Button type="button" variant="ghost" size="sm" className={cn('text-muted-foreground', btn)} disabled={alreadyReported} onClick={() => setOpen(true)}>
            <Flag /> {alreadyReported ? 'Reported' : 'Report'}
          </Button>
        ) : (
          <Tooltip content="Log in to report a problem">
            <Button variant="ghost" size="sm" className={cn('text-muted-foreground', btn)} asChild>
              <Link href="/login">
                <Flag /> Report
              </Link>
            </Button>
          </Tooltip>
        ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report a problem</DialogTitle>
            <DialogDescription className="line-clamp-2">{title}</DialogDescription>
          </DialogHeader>
          <RadioGroup value={reason} onValueChange={(v) => setReason(v as ReportReason)} className="space-y-1.5" aria-label="Reason">
            {REPORT_REASONS.map((r) => (
              <label key={r.id} className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm hover:bg-muted/40">
                <RadioGroupItem value={r.id} /> {r.label}
              </label>
            ))}
          </RadioGroup>
          <div className="space-y-1">
            <Label htmlFor={`rp-note-${key}`}>Details {reason === 'other' ? '(required)' : '(optional)'}</Label>
            <Textarea id={`rp-note-${key}`} rows={3} maxLength={500} value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="What should the team fix?" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={send}>
              <Flag /> Send report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
