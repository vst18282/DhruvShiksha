'use client';

import Link from 'next/link';
import { BookHeart, BookOpen, Briefcase, CheckCircle2, Circle, Download, MessageCircleQuestion, Trophy } from 'lucide-react';
import { SectionHeader } from '@/components/common';
import { PolarImage } from '@/components/common/polar-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/misc';
import { LEARNING_PATHS, QUIZZES, DIARIES } from '@/data/learn';
import { findItem } from '@/lib/archive';
import { useUserStore } from '@/store/user';
import { useAuthStore } from '@/store/auth';
import { useHydrated } from '@/store/hydration';
import { toast } from 'sonner';

const SECTIONS = [
  { href: '/learn/glossary', title: 'Glossary', text: 'Polar words explained simply — A to Z.', icon: BookOpen },
  { href: '/learn/quizzes', title: 'Quizzes', text: 'Test yourself and earn badges.', icon: Trophy },
  { href: '/learn/diary/isea-39', title: 'Virtual expedition diary', text: 'Sail to Antarctica, day by day.', icon: BookHeart },
  { href: '/learn/resources', title: 'Teaching resources', text: 'Worksheets, posters and lesson plans.', icon: Download },
  { href: '/learn/ask-a-scientist', title: 'Ask a scientist', text: 'Send your question to the experts.', icon: MessageCircleQuestion },
  { href: '/learn/careers', title: 'Careers', text: 'How to become a polar scientist.', icon: Briefcase },
];

function stepInfo(id: string) {
  const q = QUIZZES.find((x) => x.id === id);
  if (q) return { label: `Quiz: ${q.title}`, href: `/learn/quizzes/${q.id}` };
  const it = findItem(id);
  return { label: it?.title ?? id, href: it ? `/blog/${it.slug}` : '#' };
}

export function LearnHub() {
  const hydrated = useHydrated();
  const user = useAuthStore((s) => s.user);
  const { completedSteps, completeStep } = useUserStore();
  return (
    <div>
      <section className="relative overflow-hidden bg-polar-navy text-white">
        <PolarImage variant="penguin" seed="learn-hero" alt="" decorative className="absolute inset-0 h-full w-full opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-r from-polar-navy via-polar-navy/80 to-transparent" />
        <div className="container relative py-16">
          <Badge variant="aurora" className="mb-3 text-white">Smart Education</Badge>
          <h1 className="max-w-2xl text-4xl font-bold">Learn the poles</h1>
          <p className="mt-3 max-w-xl text-white/80">Learning paths for every class, a glossary, quizzes with badges, a virtual expedition diary and real (demo) scientists to answer your questions.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="aurora" asChild><Link href="/learn/quizzes">Take a quiz</Link></Button>
            <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" asChild><Link href="/learn/diary/isea-39">Start the diary</Link></Button>
          </div>
        </div>
      </section>

      <div className="container space-y-14 py-12">
        <section aria-labelledby="paths">
          <SectionHeader id="paths" eyebrow="Learning paths" title="Pick your level" description="Each path mixes short reads and quizzes. Tick steps as you go — progress is saved on your dashboard." />
          <div className="grid gap-5 md:grid-cols-2">
            {LEARNING_PATHS.map((p) => {
              const done = hydrated ? p.steps.filter((s) => completedSteps.includes(s)).length : 0;
              return (
                <article key={p.id} id={p.id} className="scroll-mt-28 rounded-lg border bg-card p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold">{p.title}</h3>
                    <Badge variant="secondary">{p.level}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{p.description}</p>
                  <Progress value={(done / p.steps.length) * 100} className="mt-3" aria-label={`${p.title} progress: ${done} of ${p.steps.length}`} />
                  <ol className="mt-4 space-y-2">
                    {p.steps.map((s, i) => {
                      const info = stepInfo(s);
                      const ok = hydrated && completedSteps.includes(s);
                      return (
                        <li key={s} className="flex items-center gap-2 text-sm">
                          <button
                            type="button"
                            onClick={() => {
                              if (!user) return toast.info('Log in as a student to save progress');
                              completeStep(s);
                              toast.success('Step completed!');
                            }}
                            aria-label={ok ? `${info.label} completed` : `Mark ${info.label} as done`}
                            aria-pressed={ok}
                            className="shrink-0"
                          >
                            {ok ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                          </button>
                          <span className="text-xs text-muted-foreground">{i + 1}.</span>
                          <Link href={info.href} className="line-clamp-1 hover:text-primary hover:underline">{info.label}</Link>
                        </li>
                      );
                    })}
                  </ol>
                </article>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="explore-learn">
          <SectionHeader id="explore-learn" eyebrow="Explore" title="More ways to learn" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SECTIONS.map((s) => (
              <Link key={s.href} href={s.href} className="group flex gap-4 rounded-lg border bg-card p-5 transition-shadow hover:shadow-md">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-polar-teal/20 to-polar-violet/20 text-primary"><s.icon className="h-6 w-6" aria-hidden /></span>
                <span><span className="block font-semibold group-hover:text-primary">{s.title}</span><span className="text-sm text-muted-foreground">{s.text}</span></span>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="diaries">
          <SectionHeader id="diaries" eyebrow="Virtual expedition diaries" title="Travel with a real (demo) expedition" />
          <div className="grid gap-4 md:grid-cols-2">
            {Object.keys(DIARIES).map((id) => {
              const e = findItem(id);
              return (
                <Link key={id} href={`/learn/diary/${id}`} className="group overflow-hidden rounded-lg border bg-card">
                  <PolarImage variant={e?.art ?? 'ship'} seed={`diary-${id}`} alt="" decorative className="aspect-[16/6]" />
                  <div className="p-4"><p className="font-semibold group-hover:text-primary">{e?.title ?? id}</p><p className="text-sm text-muted-foreground">{DIARIES[id].length} diary entries</p></div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
