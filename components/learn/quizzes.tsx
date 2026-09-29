'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import { Award, CheckCircle2, ChevronRight, RotateCcw, Trophy, XCircle } from 'lucide-react';
import type { Quiz } from '@/types';
import { Breadcrumbs, EmptyState, SectionHeader } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/misc';
import { CardGridSkeleton, DetailPageSkeleton } from '@/components/skeletons';
import { useApi } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { useUserStore } from '@/store/user';
import { useAuthStore } from '@/store/auth';
import { useHydrated } from '@/store/hydration';
import { cn } from '@/lib/utils';

export function QuizList() {
  const { data, isPending } = useApi(['quizzes'], api.getQuizzes);
  const hydrated = useHydrated();
  const results = useUserStore((s) => s.quizResults);
  const badges = useUserStore((s) => s.badges);
  return (
    <div className="container py-8">
      <Breadcrumbs items={[{ label: 'Learn', href: '/learn' }, { label: 'Quizzes' }]} />
      <SectionHeader as="h1" eyebrow="Learn" title="Quizzes" description="Five questions each. Score 3 or more to earn the badge." />
      {isPending ? <CardGridSkeleton count={5} /> : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(data ?? []).map((q) => {
            const r = hydrated ? results[q.id] : undefined;
            const has = hydrated && badges.includes(q.badge);
            return (
              <article key={q.id} className="relative flex flex-col rounded-lg border bg-card p-5 focus-within:ring-2 focus-within:ring-ring">
                <div className="mb-2 flex items-center justify-between"><Badge variant="secondary">{q.level}</Badge>{has && <Badge variant="aurora"><Award /> {q.badge}</Badge>}</div>
                <h2 className="text-lg font-semibold"><Link href={`/learn/quizzes/${q.id}`} className="after:absolute after:inset-0">{q.title}</Link></h2>
                <p className="text-sm text-muted-foreground">{q.description}</p>
                <p className="mt-auto pt-4 text-sm">{r ? <>Best score <strong>{r.score}/{r.total}</strong></> : `${q.questions.length} questions · earn “${q.badge}”`}</p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Runner({ quiz }: { quiz: Quiz }) {
  const reduce = useReducedMotion();
  const user = useAuthStore((s) => s.user);
  const record = useUserStore((s) => s.recordQuiz);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const q = quiz.questions[i];
  const answered = picked !== null;

  const next = () => {
    if (i + 1 >= quiz.questions.length) {
      setDone(true);
      if (user) {
        record(quiz.id, score, quiz.questions.length, quiz.badge);
        if (score / quiz.questions.length >= 0.6) toast.success(`Badge earned: ${quiz.badge} 🏅`);
      }
      return;
    }
    setI(i + 1);
    setPicked(null);
  };

  if (done) {
    const pass = score / quiz.questions.length >= 0.6;
    return (
      <div className="mx-auto max-w-xl rounded-lg border bg-card p-8 text-center" role="status" aria-live="polite">
        <Trophy className={cn('mx-auto h-14 w-14', pass ? 'text-polar-amber' : 'text-muted-foreground')} aria-hidden />
        <h2 className="mt-3 text-2xl font-semibold">You scored {score}/{quiz.questions.length}</h2>
        <p className="mt-1 text-muted-foreground">{pass ? `Great job! You earned the “${quiz.badge}” badge.` : 'Nice try — have another go to earn the badge.'}</p>
        {!user && <p className="mt-2 text-sm">Log in as a student to save scores and badges. <Link className="text-primary underline" href="/login">Log in</Link></p>}
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="outline" onClick={() => { setI(0); setPicked(null); setScore(0); setDone(false); }}><RotateCcw /> Try again</Button>
          <Button asChild><Link href="/learn/quizzes">More quizzes</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center gap-3">
        <Progress value={(i / quiz.questions.length) * 100} aria-label={`Question ${i + 1} of ${quiz.questions.length}`} />
        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{i + 1}/{quiz.questions.length}</span>
      </div>
      <motion.fieldset key={q.id} initial={reduce ? false : { opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="rounded-lg border bg-card p-6">
        <legend className="sr-only">Question {i + 1}</legend>
        <h2 className="text-xl font-semibold">{q.q}</h2>
        <div className="mt-5 grid gap-2" role="radiogroup" aria-label="Answer options">
          {q.options.map((o, idx) => {
            const correct = idx === q.answer;
            const chosen = picked === idx;
            return (
              <button
                key={o}
                type="button"
                role="radio"
                aria-checked={chosen}
                disabled={answered}
                onClick={() => {
                  setPicked(idx);
                  if (correct) setScore((s) => s + 1);
                }}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/60 disabled:cursor-default',
                  answered && correct && 'border-success bg-success/10',
                  answered && chosen && !correct && 'border-destructive bg-destructive/10',
                )}
              >
                <span>{o}</span>
                {answered && correct && <CheckCircle2 className="h-5 w-5 text-success" aria-label="Correct answer" />}
                {answered && chosen && !correct && <XCircle className="h-5 w-5 text-destructive" aria-label="Your answer (incorrect)" />}
              </button>
            );
          })}
        </div>
        {answered && (
          <div className="mt-4 rounded-md bg-accent p-3 text-sm text-accent-foreground" role="status" aria-live="polite">
            <strong>{picked === q.answer ? 'Correct! ' : 'Not quite. '}</strong>
            {q.explain}
          </div>
        )}
        <div className="mt-5 flex justify-end">
          <Button onClick={next} disabled={!answered}>{i + 1 >= quiz.questions.length ? 'See results' : 'Next'} <ChevronRight /></Button>
        </div>
      </motion.fieldset>
    </div>
  );
}

export function QuizPlayer({ id }: { id: string }) {
  const { data, isPending } = useApi(['quiz', id], () => api.getQuiz(id).then((x) => x ?? null));
  if (isPending) return <DetailPageSkeleton />;
  if (!data) return <div className="container py-12"><EmptyState title="Quiz not found" action={<Button asChild><Link href="/learn/quizzes">All quizzes</Link></Button>} /></div>;
  return (
    <div className="container py-8">
      <Breadcrumbs items={[{ label: 'Learn', href: '/learn' }, { label: 'Quizzes', href: '/learn/quizzes' }, { label: data.title }]} />
      <SectionHeader as="h1" eyebrow={data.level} title={data.title} description={`${data.description} Badge: ${data.badge}.`} />
      <Runner quiz={data} />
    </div>
  );
}
