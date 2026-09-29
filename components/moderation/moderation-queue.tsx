'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';
import type { AskQuestion } from '@/types';
import { EmptyState } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/misc';
import { TableSkeleton } from '@/components/skeletons';
import { useApi, useInvalidate } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { useAuthStore } from '@/store/auth';

/** Ask-a-scientist moderation (content managers, per the “Moderate questions” permission). */
export function ModerationQueue() {
  const { data, isPending } = useApi(['questions'], api.getQuestions);
  const user = useAuthStore((s) => s.user);
  const invalidate = useInvalidate();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [view, setView] = useState<'pending' | 'done'>('pending');
  const list = (data ?? []).filter((q) => (view === 'pending' ? q.status === 'pending' : q.status !== 'pending'));

  const moderate = async (q: AskQuestion, status: AskQuestion['status']) => {
    const answer = answers[q.id]?.trim();
    if (status === 'answered' && (!answer || answer.length < 10)) return toast.error('Write an answer (10+ characters) before publishing');
    await api.moderateQuestion({ ...q, status, answer: status === 'answered' ? answer : undefined, answeredBy: status === 'answered' ? `${user?.name ?? 'NCPOR Outreach'} (demo)` : undefined });
    toast.success(status === 'answered' ? 'Answer published' : 'Question rejected');
    invalidate([['questions'], ['audit']]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Questions from students and visitors. Publish a scientist’s answer or reject off-topic questions.</p>
        <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as typeof view)} aria-label="Show">
          <ToggleGroupItem value="pending">Waiting ({(data ?? []).filter((q) => q.status === 'pending').length})</ToggleGroupItem>
          <ToggleGroupItem value="done">Handled</ToggleGroupItem>
        </ToggleGroup>
      </div>
      {isPending ? (
        <TableSkeleton rows={4} />
      ) : list.length === 0 ? (
        <EmptyState title={view === 'pending' ? 'Moderation queue is empty' : 'Nothing handled yet'} description="New ask-a-scientist questions will appear here." />
      ) : (
        <ul className="space-y-3">
          {list.map((q) => (
            <li key={q.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {q.askedBy} · {q.createdAt}
                </p>
                {q.status !== 'pending' && <Badge variant={q.status === 'answered' ? 'success' : 'muted'}>{q.status}</Badge>}
              </div>
              <p className="mt-1 font-medium">{q.question}</p>
              {q.status === 'pending' ? (
                <>
                  <Textarea className="mt-3" rows={2} placeholder="Write or paste a scientist’s answer…" value={answers[q.id] ?? ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} aria-label={`Answer for: ${q.question}`} />
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="success" onClick={() => moderate(q, 'answered')}>
                      <Check /> Publish answer
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => moderate(q, 'rejected')}>
                      <X /> Reject
                    </Button>
                  </div>
                </>
              ) : (
                q.answer && <p className="mt-2 rounded-md bg-muted/50 p-2 text-sm">{q.answer}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
