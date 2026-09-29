'use client';

import Link from 'next/link';
import { Award, BookOpen, Download, Flame, MessageCircleQuestion, Trophy } from 'lucide-react';
import type { ArchiveItem, Blog } from '@/types';
import { DashHeader } from './shell';
import { useTabParam } from './use-tab';
import { EmptyState } from '@/components/common';
import { ItemCard } from '@/components/archive/item-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/misc';
import { CardGridSkeleton } from '@/components/skeletons';
import { useApi } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { findItem, findRef, publishedItems } from '@/lib/archive';
import { LEARNING_PATHS, QUIZZES } from '@/data/learn';
import { useUserStore } from '@/store/user';
import { useAuthStore } from '@/store/auth';
import { CONTENT_TYPE_LABELS } from '@/lib/constants';

function Overview() {
  const { completedSteps, quizResults, badges, streakDays, recentlyViewed } = useUserStore();
  const allBadges = QUIZZES.map((q) => q.badge);
  const viewedTags = new Set(recentlyViewed.flatMap((v) => findRef(v.ref)?.tags ?? []));
  const recommended = publishedItems()
    .filter((i): i is Blog => i.type === 'blog' && !completedSteps.includes(i.id))
    .map((i) => ({ i, s: (i.versions.class8 ? 2 : 0) + i.tags.filter((t) => viewedTags.has(t)).length }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)
    .map((x) => x.i);
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-gradient-to-br from-polar-amber/15 to-transparent p-4"><Flame className="h-5 w-5 text-polar-amber" aria-hidden /><p className="mt-2 text-2xl font-semibold">{streakDays.length} days</p><p className="text-sm text-muted-foreground">Learning streak</p></div>
        <div className="rounded-lg border bg-card p-4"><Trophy className="h-5 w-5 text-primary" aria-hidden /><p className="mt-2 text-2xl font-semibold">{Object.keys(quizResults).length}/{QUIZZES.length}</p><p className="text-sm text-muted-foreground">Quizzes taken</p></div>
        <div className="rounded-lg border bg-card p-4"><Award className="h-5 w-5 text-polar-violet" aria-hidden /><p className="mt-2 text-2xl font-semibold">{badges.length}</p><p className="text-sm text-muted-foreground">Badges</p></div>
        <div className="rounded-lg border bg-card p-4"><BookOpen className="h-5 w-5 text-polar-teal" aria-hidden /><p className="mt-2 text-2xl font-semibold">{completedSteps.length}</p><p className="text-sm text-muted-foreground">Steps completed</p></div>
      </div>
      <section aria-labelledby="paths">
        <h2 id="paths" className="mb-3 text-lg font-semibold">Learning paths</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {LEARNING_PATHS.map((p) => {
            const done = p.steps.filter((s) => completedSteps.includes(s)).length;
            return (
              <div key={p.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between"><p className="font-semibold">{p.title}</p><Badge variant="secondary">{p.level}</Badge></div>
                <p className="text-sm text-muted-foreground">{p.description}</p>
                <Progress value={(done / p.steps.length) * 100} className="mt-3" aria-label={`${p.title} progress`} />
                <p className="mt-1 text-xs text-muted-foreground">{done} of {p.steps.length} steps</p>
                <Button size="sm" variant="link" className="px-0" asChild><Link href={`/learn#${p.id}`}>Continue →</Link></Button>
              </div>
            );
          })}
        </div>
      </section>
      <section aria-labelledby="badges">
        <h2 id="badges" className="mb-3 text-lg font-semibold">Badges</h2>
        <ul className="flex flex-wrap gap-3">
          {allBadges.map((b) => {
            const has = badges.includes(b);
            return (
              <li key={b} className={has ? 'rounded-full bg-gradient-to-r from-polar-teal to-polar-violet px-4 py-2 text-sm font-medium text-white' : 'rounded-full border border-dashed px-4 py-2 text-sm text-muted-foreground'}>
                <Award className="mr-1 inline h-4 w-4" aria-hidden /> {b} {!has && <span className="sr-only">(locked)</span>}
              </li>
            );
          })}
        </ul>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(quizResults).map(([id, r]) => (
            <div key={id} className="rounded-md border bg-card p-3 text-sm">
              <p className="font-medium">{QUIZZES.find((q) => q.id === id)?.title}</p>
              <p className="text-muted-foreground">Best score {r.score}/{r.total} · {r.at}</p>
            </div>
          ))}
        </div>
      </section>
      <section aria-labelledby="rec">
        <h2 id="rec" className="mb-3 text-lg font-semibold">Recommended for you</h2>
        <div className="grid gap-4 md:grid-cols-3">{recommended.map((i) => <ItemCard key={i.id} item={i} compact />)}</div>
      </section>
    </div>
  );
}

function Bookmarks() {
  const { bookmarks, collections } = useUserStore();
  const items = bookmarks.map((b) => findRef(b)).filter((x): x is ArchiveItem => !!x);
  return (
    <div className="space-y-6">
      {items.length === 0 ? <EmptyState title="No bookmarks yet" description="Tap Bookmark on any article, report or dataset." action={<Button asChild><Link href="/blog">Browse articles</Link></Button>} /> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((i) => <ItemCard key={i.id} item={i} compact />)}</div>}
      {collections.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">Collections</h2>
          <ul className="flex flex-wrap gap-2">{collections.map((c) => <li key={c.id}><Badge variant="secondary">{c.name} · {c.items.length}</Badge></li>)}</ul>
        </section>
      )}
    </div>
  );
}

function Ask() {
  const user = useAuthStore((s) => s.user)!;
  const { data, isPending } = useApi(['questions'], api.getQuestions);
  const mine = (data ?? []).filter((q) => q.userId === user.id || q.askedBy === user.name);
  return (
    <div className="space-y-4">
      <Button asChild><Link href="/learn/ask-a-scientist"><MessageCircleQuestion /> Ask a new question</Link></Button>
      {isPending ? <CardGridSkeleton count={2} /> : mine.length === 0 ? <EmptyState title="You haven’t asked anything yet" /> : (
        <ul className="space-y-3">
          {mine.map((q) => (
            <li key={q.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2"><Badge variant={q.status === 'answered' ? 'success' : q.status === 'rejected' ? 'destructive' : 'warning'} className="capitalize">{q.status}</Badge><span className="text-xs text-muted-foreground">{q.createdAt}</span></div>
              <p className="mt-1 font-medium">{q.question}</p>
              {q.answer && <p className="mt-2 rounded-md bg-accent p-3 text-sm text-accent-foreground"><strong>{q.answeredBy}:</strong> {q.answer}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Downloads() {
  const { downloads } = useUserStore();
  if (!downloads.length) return <EmptyState icon={<Download className="h-6 w-6" />} title="No downloads yet" description="Worksheets, reports and datasets you download will be listed here." action={<Button asChild><Link href="/learn/resources">Learning resources</Link></Button>} />;
  return (
    <ul className="divide-y rounded-lg border bg-card">
      {downloads.map((d, i) => {
        const it = findItem(d.ref.id);
        return (
          <li key={i} className="flex items-center gap-2 p-3 text-sm">
            <Badge variant="secondary">{CONTENT_TYPE_LABELS[d.ref.type]?.singular ?? 'File'}</Badge>
            {it ? <Link href={CONTENT_TYPE_LABELS[it.type].href(it.slug)} className="flex-1 hover:underline">{d.title}</Link> : <span className="flex-1">{d.title}</span>}
            <span className="text-xs text-muted-foreground">{new Date(d.at).toLocaleString('en-IN')}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function StudentDashboard() {
  const user = useAuthStore((s) => s.user)!;
  const [tab, setTab] = useTabParam('overview');
  return (
    <>
      <DashHeader title={`Hi ${user.name.split(' ')[0]}! 👋`} description="Your polar learning journey." actions={<Button variant="aurora" asChild><Link href="/learn/quizzes">Take a quiz</Link></Button>} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {[['overview', 'Progress'], ['bookmarks', 'Bookmarks'], ['ask', 'Ask a scientist'], ['downloads', 'Downloads']].map(([v, l]) => <TabsTrigger key={v} value={v}>{l}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="overview"><Overview /></TabsContent>
        <TabsContent value="bookmarks"><Bookmarks /></TabsContent>
        <TabsContent value="ask"><Ask /></TabsContent>
        <TabsContent value="downloads"><Downloads /></TabsContent>
      </Tabs>
    </>
  );
}
