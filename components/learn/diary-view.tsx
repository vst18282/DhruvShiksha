'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Lightbulb, MapPin } from 'lucide-react';
import { DIARIES } from '@/data/learn';
import { Breadcrumbs, EmptyState } from '@/components/common';
import { PolarImage } from '@/components/common/polar-image';
import { MiniMap } from '@/components/maps/mini-map';
import { Button } from '@/components/ui/button';
import { findItem } from '@/lib/archive';
import { useUiStore } from '@/store/ui';
import { useRegisterPageContext } from '@/store/page-context';
import type { Expedition } from '@/types';
import { cn } from '@/lib/utils';

/** Virtual Expedition Diary — scrollytelling: a sticky visual changes as day entries scroll by. */
export function DiaryView({ id }: { id: string }) {
  const entries = DIARIES[id];
  const exp = findItem(id) as Expedition | undefined;
  const reduce = useReducedMotion();
  const low = useUiStore((s) => s.lowBandwidth);
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);
  useRegisterPageContext(exp ? { type: 'expedition', id: exp.id, title: exp.title } : null);

  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setActive(Number((e.target as HTMLElement).dataset.idx))),
      { rootMargin: '-45% 0px -45% 0px' },
    );
    refs.current.forEach((r) => r && io.observe(r));
    return () => io.disconnect();
  }, [entries]);

  if (!entries) return <div className="container py-12"><EmptyState title="No diary for this expedition yet" action={<Button asChild><Link href="/learn">Back to Learn</Link></Button>} /></div>;
  const cur = entries[active];
  const trackIdx = exp ? Math.min(exp.track.length - 1, Math.round((active / Math.max(1, entries.length - 1)) * (exp.track.length - 1))) : 0;

  return (
    <div className="container py-8">
      <Breadcrumbs items={[{ label: 'Learn', href: '/learn' }, { label: 'Expedition diary' }, { label: exp?.number ?? id }]} />
      <h1 className="text-3xl font-semibold md:text-4xl">Virtual expedition diary</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Follow {exp ? <Link href={`/expeditions/${exp.id}`} className="text-primary hover:underline">{exp.name}</Link> : 'the expedition'} day by day. Scroll to travel. (A demo diary written for students.)
      </p>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="order-2 space-y-[40vh] pb-[30vh] lg:order-1">
          {entries.map((e, i) => (
            <article
              key={e.day}
              ref={(el) => {
                refs.current[i] = el;
              }}
              data-idx={i}
              aria-current={i === active ? 'step' : undefined}
              className={cn('rounded-lg border bg-card p-6 transition-opacity', i === active ? 'opacity-100 shadow-md' : 'opacity-50')}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Day {e.day} · {new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <h2 className="mt-1 text-2xl font-semibold">{e.title}</h2>
              <p className="mt-3 text-lg leading-8">{e.text}</p>
              <p className="mt-4 flex gap-2 rounded-md bg-accent p-3 text-sm text-accent-foreground"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {e.fact}</p>
              {low && <PolarImage variant={e.art} seed={`${id}-${e.day}`} alt={`Illustration: ${e.title}`} className="mt-4 hidden aspect-video rounded-md" />}
            </article>
          ))}
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="font-semibold">You reached the end of the diary!</p>
            <div className="mt-3 flex justify-center gap-2">
              <Button asChild><Link href="/learn/quizzes">Take a quiz</Link></Button>
              {exp && <Button variant="outline" asChild><Link href={`/expeditions/${exp.id}`}>Explore the expedition</Link></Button>}
            </div>
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <div className="sticky top-28 space-y-3">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg border">
              <AnimatePresence mode="popLayout">
                <motion.div key={active} initial={reduce ? false : { opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={reduce ? undefined : { opacity: 0 }} transition={{ duration: 0.6 }} className="absolute inset-0">
                  <PolarImage variant={cur.art} seed={`${id}-${cur.day}`} alt={`Illustration for day ${cur.day}: ${cur.title}`} className="h-full w-full" />
                </motion.div>
              </AnimatePresence>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
                <p className="text-sm font-semibold">Day {cur.day}: {cur.title}</p>
              </div>
            </div>
            <div className="hidden gap-3 sm:flex">
              {exp && (
                <div className="w-40 shrink-0 rounded-lg border bg-card p-2">
                  <MiniMap track={exp.track} center={exp.track[trackIdx]} points={[{ lon: exp.track[trackIdx][0], lat: exp.track[trackIdx][1], label: 'We are here' }]} label={`Map showing position on day ${cur.day}`} />
                </div>
              )}
              <ol className="flex flex-1 flex-wrap content-start gap-1" aria-label="Diary days">
                {entries.map((e, i) => (
                  <li key={e.day}>
                    <button type="button" onClick={() => refs.current[i]?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })} className={cn('rounded-full border px-2 py-0.5 text-xs', i === active ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted')} aria-label={`Go to day ${e.day}`}>
                      {e.day}
                    </button>
                  </li>
                ))}
              </ol>
            </div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" aria-hidden /> Position is approximate along the expedition route (demo).</p>
          </div>
        </div>
      </div>
    </div>
  );
}
