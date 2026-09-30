'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Award, BookOpen, Bookmark, CheckCircle2, Compass, Download, Flame, FolderOpen, Hourglass, Images, Lock, MessageCircleQuestion, Newspaper, Sparkles, Star, Trophy, type LucideIcon } from 'lucide-react';
import type { ArchiveItem, Blog, ContentType } from '@/types';
import { DashHeader } from './shell';
import { WelcomePanel } from './welcome-panel';
import { useTabParam } from './use-tab';
import { TYPE_ICON } from './researcher-ui';
import { EmptyState } from '@/components/common';
import { ItemCard } from '@/components/archive/item-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CardGridSkeleton } from '@/components/skeletons';
import { useApi } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { findItem, findRef, publishedItems } from '@/lib/archive';
import { LEARNING_PATHS, QUIZZES } from '@/data/learn';
import { useUserStore } from '@/store/user';
import { useAuthStore } from '@/store/auth';
import { CONTENT_TYPE_LABELS } from '@/lib/constants';
import { cn, initials } from '@/lib/utils';

/*
 * One restrained palette throughout: the brand blue (primary) on white cards, with muted greys.
 * Accents come from weight and shade, not from extra colours.
 */

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

function stepInfo(id: string) {
  const q = QUIZZES.find((x) => x.id === id);
  if (q) return { label: `Quiz: ${q.title}`, href: `/learn/quizzes/${q.id}`, quiz: true };
  const it = findItem(id);
  return { label: it?.title ?? id, href: it ? `/blog/${it.slug}` : '/learn', quiz: false };
}

function Stat({ label, value, icon: Icon, note, href }: { label: string; value: string | number; icon: LucideIcon; note?: string; href?: string }) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" aria-hidden /></span>
        {href && <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />}
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="text-sm font-medium">{label}</p>
      {note && <p className="mt-0.5 truncate text-xs text-muted-foreground">{note}</p>}
    </>
  );
  const cls = 'group block rounded-xl border bg-card p-4 shadow-sm';
  return href ? <Link href={href} className={cn(cls, 'transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring')}>{body}</Link> : <div className={cls}>{body}</div>;
}

function Card({ id, title, icon: Icon, subtitle, action, className, children }: { id: string; title: string; icon: LucideIcon; subtitle?: string; action?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className={cn('flex min-w-0 flex-col rounded-xl border bg-card shadow-sm', className)}>
      <div className="flex items-start justify-between gap-3 border-b px-5 py-3.5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><Icon className="h-4 w-4" aria-hidden /></span>
          <div className="min-w-0">
            <h2 id={id} className="font-semibold">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="flex-1 p-5">{children}</div>
    </section>
  );
}

const More = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline">{children} <ArrowRight className="h-3 w-3" aria-hidden /></Link>
);

function TypeIcon({ type, className }: { type: ContentType; className?: string }) {
  const Icon = TYPE_ICON[type];
  return <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary', className)} aria-hidden><Icon className="h-4 w-4" /></span>;
}

function Ring({ value, size = 56 }: { value: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--primary))" strokeWidth={6} strokeLinecap="round" strokeDasharray={`${value * c} ${c}`} />
    </svg>
  );
}

/* --------------------------------- overview -------------------------------- */

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
  const quizzesTaken = Object.keys(quizResults).length;
  const xp = completedSteps.length * 10 + quizzesTaken * 25 + badges.length * 50;
  const level = Math.floor(xp / 100) + 1;
  const week = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d; });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Learning streak" value={`${streakDays.length} days`} icon={Flame} note="Come back tomorrow to keep it" />
        <Stat label="Quizzes taken" value={`${quizzesTaken}/${QUIZZES.length}`} icon={Trophy} href="/learn/quizzes" />
        <Stat label="Badges" value={`${badges.length}/${allBadges.length}`} icon={Award} />
        <Stat label="Steps completed" value={completedSteps.length} icon={CheckCircle2} href="/learn" />
      </div>

      <section aria-labelledby="level" className="grid gap-5 rounded-xl border bg-card p-5 shadow-sm md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <span className="text-[10px] font-medium uppercase tracking-wider opacity-80">Level</span>
            <span className="text-2xl font-bold leading-none">{level}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="level" className="font-semibold">Polar explorer</h2>
            <p className="text-xs text-muted-foreground">{xp} XP · {100 - (xp % 100)} XP to level {level + 1}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={xp % 100} aria-label="Progress to next level">
              <div className="h-full rounded-full bg-primary" style={{ width: `${xp % 100}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Steps +10 · quizzes +25 · badges +50</p>
          </div>
        </div>
        <div className="md:border-l md:pl-5">
          <p className="mb-2 text-sm font-medium">This week</p>
          <ol className="grid grid-cols-7 gap-1.5" aria-label="Learning activity, last 7 days">
            {week.map((d) => {
              const on = streakDays.includes(dayKey(d));
              return (
                <li key={dayKey(d)} className="flex flex-col items-center gap-1">
                  <span className={cn('flex h-8 w-8 items-center justify-center rounded-full border text-xs tabular-nums', on ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground')}>{d.getDate()}</span>
                  <span className="text-[10px] text-muted-foreground">{d.toLocaleDateString('en-IN', { weekday: 'narrow' })}</span>
                  <span className="sr-only">{on ? 'learned' : 'no activity'}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <Card id="paths" title="Learning paths" icon={Compass} subtitle="Short reads and quizzes for every class" action={<More href="/learn">All paths</More>}>
        <div className="grid gap-4 md:grid-cols-2">
          {LEARNING_PATHS.map((p) => {
            const done = p.steps.filter((s) => completedSteps.includes(s)).length;
            const first = p.steps.find((s) => !completedSteps.includes(s));
            return (
              <article key={p.id} className="rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Ring value={done / p.steps.length} />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums">{Math.round((done / p.steps.length) * 100)}%</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{p.title}</h3><Badge variant="secondary">{p.level}</Badge></div>
                    <p className="text-sm text-muted-foreground">{p.description}</p>
                  </div>
                </div>
                <ol className="mt-3 flex items-center gap-1" aria-label={`${done} of ${p.steps.length} steps done`}>
                  {p.steps.map((s) => <li key={s} className={cn('h-1.5 flex-1 rounded-full', completedSteps.includes(s) ? 'bg-primary' : 'bg-muted')} title={stepInfo(s).label} />)}
                </ol>
                <div className="mt-3 flex items-center justify-between gap-2 text-sm">
                  <span className="text-xs text-muted-foreground">{done} of {p.steps.length} steps</span>
                  {first ? <Link href={stepInfo(first).href} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">Continue <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link> : <span className="flex items-center gap-1 text-xs font-medium"><CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden /> Complete</span>}
                </div>
              </article>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card id="badges" title="Badges" icon={Award} subtitle="Pass a quiz to earn its badge">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {allBadges.map((b) => {
              const has = badges.includes(b);
              return (
                <li key={b} className={cn('flex flex-col items-center rounded-lg border p-3 text-center', !has && 'border-dashed')}>
                  <span className={cn('flex h-11 w-11 items-center justify-center rounded-full', has ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                    {has ? <Award className="h-5 w-5" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
                  </span>
                  <span className={cn('mt-2 text-xs font-medium leading-tight', !has && 'text-muted-foreground')}>{b}</span>
                  <span className="sr-only">{has ? '(earned)' : '(locked)'}</span>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card id="scores" title="Quiz scores" icon={Star} subtitle="Your best result on each quiz" action={<More href="/learn/quizzes">Quizzes</More>}>
          {quizzesTaken === 0 ? (
            <EmptyState title="No quizzes yet" action={<Button size="sm" asChild><Link href="/learn/quizzes">Take your first quiz</Link></Button>} />
          ) : (
            <ul className="space-y-3">
              {Object.entries(quizResults).map(([id, r]) => (
                <li key={id}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{QUIZZES.find((q) => q.id === id)?.title}</span>
                    <span className="tabular-nums text-muted-foreground">{r.score}/{r.total}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden><div className="h-full rounded-full bg-primary" style={{ width: `${(r.score / r.total) * 100}%` }} /></div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{r.at}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section aria-labelledby="rec">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="rec" className="text-lg font-semibold">Recommended for you</h2>
          <More href="/blog">All stories</More>
        </div>
        <div className="grid gap-4 md:grid-cols-3">{recommended.map((i) => <ItemCard key={i.id} item={i} compact />)}</div>
      </section>
    </div>
  );
}

/* --------------------------------- bookmarks ------------------------------- */

function Bookmarks() {
  const { bookmarks, collections } = useUserStore();
  const items = bookmarks.map((b) => findRef(b)).filter((x): x is ArchiveItem => !!x);
  const types = Array.from(new Set(items.map((i) => i.type)));
  const [type, setType] = useState<ContentType | 'all'>('all');
  const shown = items.filter((i) => type === 'all' || i.type === type);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Bookmarks" value={items.length} icon={Bookmark} />
        <Stat label="Collections" value={collections.length} icon={FolderOpen} />
        <Stat label="Kinds of content" value={types.length} icon={Sparkles} note="Stories, reports, photos…" />
      </div>

      {items.length === 0 ? (
        <EmptyState icon={<Bookmark className="h-6 w-6" />} title="No bookmarks yet" description="Tap Bookmark on any article, report or dataset to keep it here." action={<Button asChild><Link href="/blog">Browse articles</Link></Button>} />
      ) : (
        <Card id="bm" title="Saved for later" icon={Bookmark} subtitle={`${shown.length} item${shown.length === 1 ? '' : 's'}`}>
          {types.length > 1 && (
            <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Filter by type">
              {(['all', ...types] as (ContentType | 'all')[]).map((t) => (
                <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)} className={cn('rounded-full border px-3 py-1 text-xs transition-colors hover:bg-muted', type === t && 'border-primary bg-primary text-primary-foreground hover:bg-primary')}>
                  {t === 'all' ? `All · ${items.length}` : `${CONTENT_TYPE_LABELS[t].plural} · ${items.filter((i) => i.type === t).length}`}
                </button>
              ))}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{shown.map((i) => <ItemCard key={i.id} item={i} compact />)}</div>
        </Card>
      )}

      {collections.length > 0 && (
        <Card id="cols" title="Your collections" icon={FolderOpen} subtitle="Groups of saved items">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((c) => {
              const its = c.items.map(findRef).filter((x): x is ArchiveItem => !!x);
              return (
                <li key={c.id} className="rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-primary"><FolderOpen className="h-4 w-4" aria-hidden /></span>
                    <div className="min-w-0"><p className="truncate font-semibold">{c.name}</p><p className="text-xs text-muted-foreground">{its.length} item{its.length === 1 ? '' : 's'}</p></div>
                  </div>
                  <ul className="mt-3 space-y-1.5 border-t pt-3">
                    {its.slice(0, 3).map((it) => (
                      <li key={it.id} className="flex items-center gap-2 text-sm">
                        <TypeIcon type={it.type} className="h-6 w-6" />
                        <Link href={CONTENT_TYPE_LABELS[it.type].href(it.slug)} className="line-clamp-1 hover:text-primary hover:underline">{it.title}</Link>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { href: '/blog', label: 'Stories', text: 'Read about life on the ice', icon: Newspaper },
          { href: '/gallery', label: 'Gallery', text: 'Photos and films from the poles', icon: Images },
          { href: '/learn/glossary', label: 'Glossary', text: 'Polar words made simple', icon: BookOpen },
        ].map((l) => (
          <Link key={l.href} href={l.href} className="group flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><l.icon className="h-5 w-5" aria-hidden /></span>
            <span className="min-w-0 flex-1"><span className="block font-medium group-hover:text-primary">{l.label}</span><span className="block truncate text-xs text-muted-foreground">{l.text}</span></span>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------- ask a scientist ----------------------------- */

const PROMPTS = ['How old is the oldest ice?', 'Why do penguins not freeze?', 'What causes the aurora?', 'How do scientists live in Antarctica?'];

function Ask() {
  const user = useAuthStore((s) => s.user)!;
  const { data, isPending } = useApi(['questions'], api.getQuestions);
  const mine = (data ?? []).filter((q) => q.userId === user.id || q.askedBy === user.name);
  const others = (data ?? []).filter((q) => q.status === 'answered' && !mine.includes(q)).slice(0, 3);
  return (
    <div className="space-y-6">
      <section aria-labelledby="ask-hero" className="flex flex-col gap-5 rounded-xl border bg-card p-5 shadow-sm md:flex-row md:items-center">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><MessageCircleQuestion className="h-6 w-6" aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <h2 id="ask-hero" className="text-lg font-semibold">Curious about the <span className="font-script text-[1.25em] font-normal text-primary">poles?</span></h2>
          <p className="text-sm text-muted-foreground">Real (demo) scientists read every question. A few ideas to get you started:</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {PROMPTS.map((p) => <li key={p} className="rounded-full border px-3 py-1 text-xs text-muted-foreground">{p}</li>)}
          </ul>
        </div>
        <Button asChild className="shrink-0"><Link href="/learn/ask-a-scientist"><MessageCircleQuestion /> Ask a question</Link></Button>
      </section>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Questions asked" value={mine.length} icon={MessageCircleQuestion} />
        <Stat label="Answered" value={mine.filter((q) => q.status === 'answered').length} icon={CheckCircle2} />
        <Stat label="Waiting" value={mine.filter((q) => q.status === 'pending').length} icon={Hourglass} note="Usually a few days (demo)" />
      </div>

      <Card id="my-q" title="My questions" icon={MessageCircleQuestion} subtitle="Your questions and the scientists' answers">
        {isPending ? <CardGridSkeleton count={2} /> : mine.length === 0 ? (
          <EmptyState title="You haven’t asked anything yet" description="Pick an idea above or ask your own." />
        ) : (
          <ul className="space-y-5">
            {mine.map((q) => (
              <li key={q.id} className="space-y-2">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold" aria-hidden>{initials(user.name)}</span>
                  <div className="min-w-0 flex-1 rounded-xl rounded-tl-sm border bg-muted/30 px-4 py-3">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge variant={q.status === 'answered' ? 'secondary' : q.status === 'rejected' ? 'destructive' : 'outline'} className="capitalize">{q.status}</Badge>
                      <span className="text-[11px] text-muted-foreground">{q.createdAt}</span>
                    </div>
                    <p className="font-medium">{q.question}</p>
                  </div>
                </div>
                {q.answer ? (
                  <div className="flex items-start gap-3 pl-8 sm:pl-12">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground" aria-hidden>{initials(q.answeredBy ?? 'Scientist')}</span>
                    <div className="min-w-0 flex-1 rounded-xl rounded-tl-sm border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
                      <p className="mb-1 text-xs font-semibold text-primary">{q.answeredBy}</p>
                      <p className="leading-6">{q.answer}</p>
                    </div>
                  </div>
                ) : q.status === 'pending' ? (
                  <p className="flex items-center gap-1.5 pl-12 text-xs text-muted-foreground"><Hourglass className="h-3.5 w-3.5" aria-hidden /> A scientist will answer soon.</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {others.length > 0 && (
        <Card id="others" title="Answered for other students" icon={Sparkles} subtitle="Questions you might wonder about too">
          <ul className="grid gap-3 md:grid-cols-3">
            {others.map((q) => (
              <li key={q.id} className="flex flex-col rounded-lg border p-4">
                <p className="font-medium leading-snug">{q.question}</p>
                <p className="mt-2 line-clamp-4 text-sm text-muted-foreground">{q.answer}</p>
                <p className="mt-auto pt-3 text-[11px] font-medium text-primary">{q.answeredBy}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/* --------------------------------- downloads ------------------------------- */

function ResourcesStrip() {
  return (
    <section aria-labelledby="res" className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary"><Download className="h-5 w-5" aria-hidden /></span>
      <div className="min-w-0 flex-1">
        <h2 id="res" className="font-semibold">More to download</h2>
        <p className="text-sm text-muted-foreground">Worksheets, posters and lesson plans for your class.</p>
      </div>
      <Button asChild variant="outline"><Link href="/learn/resources">Learning resources <ArrowRight /></Link></Button>
    </section>
  );
}

function Downloads() {
  const { downloads } = useUserStore();
  if (!downloads.length) {
    return (
      <div className="space-y-6">
        <EmptyState icon={<Download className="h-6 w-6" />} title="No downloads yet" description="Worksheets, reports and datasets you download will be listed here." action={<Button asChild><Link href="/learn/resources">Learning resources</Link></Button>} />
        <ResourcesStrip />
      </div>
    );
  }
  const week = downloads.filter((d) => Date.now() - new Date(d.at).getTime() < 7 * 86_400_000).length;
  const kinds = new Set(downloads.map((d) => d.ref.type)).size;
  const groups = downloads.reduce<{ key: string; label: string; list: typeof downloads }[]>((acc, d) => {
    const dt = new Date(d.at);
    const key = dt.toDateString();
    const label = key === new Date().toDateString() ? 'Today' : dt.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
    const g = acc.find((x) => x.key === key);
    if (g) g.list.push(d); else acc.push({ key, label, list: [d] });
    return acc;
  }, []);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Downloads" value={downloads.length} icon={Download} />
        <Stat label="This week" value={week} icon={Flame} />
        <Stat label="Kinds of file" value={kinds} icon={Sparkles} />
      </div>
      <Card id="dl" title="Your downloads" icon={Download} subtitle="Everything you have saved to your device">
        <ol className="space-y-5">
          {groups.map((g) => (
            <li key={g.key}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</p>
              <ul className="divide-y rounded-lg border">
                {g.list.map((d, i) => {
                  const it = findItem(d.ref.id);
                  const t = (CONTENT_TYPE_LABELS[d.ref.type] ? d.ref.type : 'report') as ContentType;
                  return (
                    <li key={`${d.ref.id}-${i}`} className="flex items-center gap-3 p-3">
                      <TypeIcon type={t} />
                      <span className="min-w-0 flex-1">
                        {it ? <Link href={CONTENT_TYPE_LABELS[it.type].href(it.slug)} className="line-clamp-1 text-sm font-medium hover:text-primary hover:underline">{d.title}</Link> : <span className="line-clamp-1 text-sm font-medium">{d.title}</span>}
                        <span className="text-[11px] text-muted-foreground">{CONTENT_TYPE_LABELS[t].singular} · {new Date(d.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                      {it && <Button size="sm" variant="ghost" asChild><Link href={CONTENT_TYPE_LABELS[it.type].href(it.slug)}>Open <ArrowRight /></Link></Button>}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      </Card>
      <ResourcesStrip />
    </div>
  );
}

/* --------------------------------- page ------------------------------------ */

const SECTION_TITLES: Record<string, { title: string; description: string }> = {
  bookmarks: { title: 'Bookmarks', description: 'Articles, reports and media you saved for later.' },
  ask: { title: 'Ask a scientist', description: 'Your questions to NCPOR scientists and their answers.' },
  downloads: { title: 'Downloads', description: 'Worksheets, reports and datasets you downloaded.' },
};

export function StudentDashboard() {
  const user = useAuthStore((s) => s.user)!;
  const [tab, setTab] = useTabParam('overview');
  const completedSteps = useUserStore((s) => s.completedSteps);
  const next = LEARNING_PATHS.map((p) => ({ p, step: p.steps.find((s) => !completedSteps.includes(s)) })).find((x) => x.step);
  const nextInfo = next?.step ? stepInfo(next.step) : null;
  const meta = SECTION_TITLES[tab];
  return (
    <>
      {meta ? (
        <DashHeader title={meta.title} description={meta.description} />
      ) : (
        <WelcomePanel
          eyebrow="Student dashboard"
          name={user.name.split(' ')[0]}
          subtitle={`${user.org} · your polar learning journey`}
          links={[
            { href: '/learn/quizzes', label: 'Take a quiz', icon: Trophy },
            { href: '/learn', label: 'Learning paths', icon: Compass },
            { href: '/learn/glossary', label: 'Glossary', icon: BookOpen },
            { href: '/learn/ask-a-scientist', label: 'Ask a scientist', icon: MessageCircleQuestion },
          ]}
          aside={
            <div className="rounded-xl border bg-background/80 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-primary">Next up</p>
              {next && nextInfo ? (
                <>
                  <p className="mt-2 text-lg font-semibold leading-snug">{nextInfo.label}</p>
                  <p className="text-sm text-muted-foreground">From {next.p.title} · {next.p.level}</p>
                  <Button asChild className="mt-4"><Link href={nextInfo.href}>{nextInfo.quiz ? <Trophy /> : <BookOpen />} {nextInfo.quiz ? 'Take the quiz' : 'Start reading'} <ArrowRight /></Link></Button>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Every learning path is complete. Try a new quiz or ask a scientist something.</p>
              )}
            </div>
          }
        />
      )}
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
