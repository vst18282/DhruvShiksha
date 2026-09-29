'use client';

import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, Copy, Download, ExternalLink, Eye, SearchX, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { ChatAnswer, ChatMessage } from '@/lib/chat/types';
import { FileCard } from '@/components/common';
import { Button } from '@/components/ui/button';
import { findItem } from '@/lib/archive';
import { downloadItem } from '@/lib/downloads';
import { CONTENT_TYPE_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';

function answerText(a: ChatAnswer) {
  return [a.summary, ...a.facts.map((f) => `• ${f}`), a.citations.length ? `Sources: ${a.citations.map((c) => c.title).join('; ')}` : ''].filter(Boolean).join('\n');
}

export function AnswerCard({
  msg,
  onFollowUp,
  onFeedback,
}: {
  msg: ChatMessage;
  onFollowUp: (q: string) => void;
  onFeedback: (f: 'up' | 'down') => void;
}) {
  const a = msg.answer!;
  const [relOpen, setRelOpen] = useState(false);
  return (
    <div className="space-y-3 rounded-lg border bg-card p-3 text-sm">
      {!a.found && (
        <p className="flex items-center gap-2 font-medium text-muted-foreground">
          <SearchX className="h-4 w-4" aria-hidden /> Not found in {a.scope === 'page' ? 'this page' : 'the archive'}
        </p>
      )}
      <p className="leading-6">{a.summary}</p>
      {a.facts.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Key facts</p>
          <ul className="space-y-1">
            {a.facts.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden /> <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {a.citations.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Sources">
          {a.citations.map((c, i) => (
            <Link key={c.ref.id} href={c.href} className="inline-flex max-w-full items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs hover:border-primary hover:text-primary">
              <span className="font-semibold">[{i + 1}]</span> <span className="truncate">{c.title}</span>
            </Link>
          ))}
        </div>
      )}
      {a.attachments.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attachments</p>
          {a.attachments.map((at) => (
            <FileCard
              key={at.file.id}
              file={at.file}
              className="p-2"
              actions={
                <>
                  <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                    <Link href={at.href} aria-label={`View details of ${at.itemTitle}`}>
                      <Eye />
                    </Link>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label={`Download ${at.file.name}`}
                    onClick={() => {
                      const it = findItem(at.itemId);
                      if (it && downloadItem(it, at.file)) toast.success('Download started (demo)');
                    }}
                  >
                    <Download />
                  </Button>
                </>
              }
            />
          ))}
        </div>
      )}
      {a.primaryHref && (
        <Link href={a.primaryHref} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          Open page <ExternalLink className="h-3 w-3" aria-hidden />
        </Link>
      )}
      {a.related.length > 0 && (
        <div className="border-t pt-2 [@media(max-height:640px)]:hidden">
          <button type="button" onClick={() => setRelOpen(!relOpen)} aria-expanded={relOpen} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
            Related ({a.related.length}) <ChevronDown className={cn('h-3 w-3 transition-transform', relOpen && 'rotate-180')} aria-hidden />
          </button>
          {relOpen && (
            <ul className="mt-1.5 space-y-1">
              {a.related.slice(0, 3).map((r) => (
                <li key={r.ref.id}>
                  <Link href={r.href} className="flex items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-muted">
                    <span className="rounded bg-secondary px-1 text-[10px]">{CONTENT_TYPE_LABELS[r.type].singular}</span>
                    <span className="line-clamp-1">{r.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {a.followUps.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Suggested follow-up questions">
          {a.followUps.map((f) => (
            <button key={f} type="button" onClick={() => onFollowUp(f)} className="rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground hover:bg-accent/70">
              {f}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1 border-t pt-2">
        <Button size="icon" variant="ghost" className={cn('h-7 w-7', msg.feedback === 'up' && 'text-success')} aria-pressed={msg.feedback === 'up'} aria-label="Helpful" onClick={() => onFeedback('up')}>
          <ThumbsUp />
        </Button>
        <Button size="icon" variant="ghost" className={cn('h-7 w-7', msg.feedback === 'down' && 'text-destructive')} aria-pressed={msg.feedback === 'down'} aria-label="Not helpful" onClick={() => onFeedback('down')}>
          <ThumbsDown />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          aria-label="Copy answer"
          onClick={async () => {
            await navigator.clipboard?.writeText(answerText(a));
            toast.success('Answer copied');
          }}
        >
          <Copy />
        </Button>
        <span className="ml-auto text-[10px] text-muted-foreground">Answered from archive only</span>
      </div>
    </div>
  );
}
