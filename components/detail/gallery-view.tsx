'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Captions, ChevronLeft, ChevronRight, Download, Film, Headphones, Images, Pause, Play, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { Discipline, MediaItem, StationSlug } from '@/types';
import { PolarImage } from '@/components/common/polar-image';
import { EmptyState } from '@/components/common';
import { HeroChip, PageHero } from '@/components/common/page-hero';
import { SoundGallery } from './sound-gallery';
import { Skeleton } from '@/components/skeletons';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/misc';
import { useApi } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { CONTENT_TYPE_LABELS, DISCIPLINE_LABELS, STATION_NAMES } from '@/lib/constants';
import { EXPEDITIONS } from '@/data/expeditions';
import { findItem, itemHref } from '@/lib/archive';
import { IMAGE_LIBRARY } from '@/lib/images';
import { downloadItem } from '@/lib/downloads';
import { ReactionBar } from '@/components/engagement/reaction-bar';
import { useRegisterPageContext } from '@/store/page-context';
import { useUiStore } from '@/store/ui';
import { cn, formatCompact, hashString } from '@/lib/utils';

/** Simulated video player: poster + timer-driven progress, chapters and live captions (demo). */
function FakeVideo({ v }: { v: MediaItem }) {
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [cc, setCc] = useState(true);
  const dur = v.durationSec ?? 180;
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => setT((x) => (x + 1 >= dur ? (setPlaying(false), dur) : x + 1)), 250);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, dur]);
  const sentences = (v.transcript ?? '').split(/(?<=[.!?\]])\s+/).filter(Boolean);
  const caption = sentences[Math.min(sentences.length - 1, Math.floor((t / dur) * sentences.length))] ?? '';
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return (
    <div>
      <div className="relative overflow-hidden rounded-lg bg-black">
        <PolarImage variant={v.art} seed={v.id} alt={v.altText} className={cn('aspect-video transition-opacity', playing && 'opacity-80')} />
        {!playing && (
          <button type="button" onClick={() => setPlaying(true)} className="absolute inset-0 flex items-center justify-center" aria-label="Play video (simulated)">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 text-white">
              <Play className="h-7 w-7" />
            </span>
          </button>
        )}
        {cc && caption && (
          <p className="absolute inset-x-6 bottom-12 rounded bg-black/75 px-3 py-1.5 text-center text-sm text-white" aria-live="polite">
            {caption}
          </p>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/80 to-transparent px-3 py-2 text-white">
          <button type="button" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <Progress value={(t / dur) * 100} className="h-1.5 flex-1 bg-white/30" indicatorClassName="bg-polar-teal" aria-label="Playback position" />
          <span className="text-xs tabular-nums">
            {fmt(t)} / {fmt(dur)}
          </span>
          <button type="button" onClick={() => setCc(!cc)} aria-pressed={cc} aria-label="Toggle captions">
            <Captions className={cn('h-4 w-4', !cc && 'opacity-50')} />
          </button>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Simulated player — no real video file is loaded in this demo.</p>
      {v.chapters && (
        <div className="mt-3">
          <p className="mb-1 text-sm font-semibold">Chapters</p>
          <ol className="flex flex-wrap gap-2">
            {v.chapters.map((c) => (
              <li key={c.t}>
                <Button size="sm" variant={t >= c.t ? 'secondary' : 'outline'} onClick={() => setT(c.t)}>
                  {fmt(c.t)} · {c.title}
                </Button>
              </li>
            ))}
          </ol>
        </div>
      )}
      <details className="mt-3 rounded-md border bg-muted/30 p-3 text-sm">
        <summary className="cursor-pointer font-medium">Transcript</summary>
        <p className="mt-2 leading-6 text-muted-foreground">{v.transcript}</p>
      </details>
    </div>
  );
}

/**
 * Where this photo or video came from. Media ids carry their topic (`photo-<topic>-1`,
 * `video-<topic>`, `photo-station-<slug>-1`), so the post it illustrates can be resolved directly.
 */
function originalPost(m: MediaItem): { href: string; label: string } | null {
  const station = m.id.match(/^photo-station-([a-z]+)-\d+$/);
  if (station) return { href: `/stations/${station[1]}`, label: `${STATION_NAMES[station[1] as StationSlug]} station page` };
  const topic = m.id.replace(/^(photo|video)-/, '').replace(/-\d+$/, '');
  for (const prefix of ['blog', 'rep', 'ds'] as const) {
    const it = findItem(`${prefix}-${topic}`);
    if (it) return { href: itemHref(it), label: `${CONTENT_TYPE_LABELS[it.type].singular}: ${it.title}` };
  }
  if (m.expeditionId) {
    const e = findItem(m.expeditionId);
    if (e) return { href: itemHref(e), label: `Expedition: ${e.title}` };
  }
  return null;
}

/**
 * Tile shapes for the masonry. The item id (not its stored dimensions) picks the crop, so the wall
 * looks hand-laid rather than sorted — and stays identical between server and client renders.
 */
const TILE_SHAPES = ['aspect-[4/5]', 'aspect-square', 'aspect-[16/11]', 'aspect-[3/4]', 'aspect-[5/4]', 'aspect-[2/3]', 'aspect-[4/3]', 'aspect-[9/13]'];
const tileShape = (m: MediaItem) => TILE_SHAPES[hashString(`${m.id}-${m.type}`) % TILE_SHAPES.length];

/**
 * Showcase: a compact sliding frame with the slide written large in script beside it, so the two
 * together fill the row. Advances every 3 s and pauses on hover, focus and reduced motion.
 */
function Showcase({ items, onOpen }: { items: MediaItem[]; onOpen: (id: string) => void }) {
  const reduce = useReducedMotion();
  const low = useUiStore((s) => s.lowBandwidth);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = items.length;
  useEffect(() => {
    if (reduce || low || paused || n < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % n), 3000);
    return () => clearInterval(t);
  }, [reduce, low, paused, n]);
  if (!n) return null;
  const go = (i: number) => setIndex(((i % n) + n) % n);
  const current = items[index];
  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured media"
      className="group relative mb-10 grid items-center gap-6 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1fr)] lg:gap-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-polar-navy shadow-xl">
        <div className="flex transition-transform duration-700 ease-out motion-reduce:transition-none" style={{ transform: `translateX(-${index * 100}%)` }}>
          {items.map((m, i) => (
            <div key={m.id} className="relative w-full shrink-0 basis-full" aria-hidden={i !== index}>
              <PolarImage variant={m.art} seed={m.id} alt={m.altText} priority={i === 0} className="aspect-[4/3] w-full sm:aspect-[3/2]" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" aria-hidden />
              {i === 0 && (
                <Badge variant="aurora" className="absolute left-3 top-3 text-white">
                  <Sparkles /> Photo of the day
                </Badge>
              )}
              {m.type === 'video' && (
                <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/55 text-white ring-2 ring-white/60">
                    <Play className="ml-0.5 h-6 w-6 fill-current" />
                  </span>
                </span>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => go(index - 1)}
          aria-label="Previous slide"
          className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur transition-opacity hover:bg-black/65 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => go(index + 1)}
          aria-label="Next slide"
          className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur transition-opacity hover:bg-black/65 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5" role="group" aria-label="Choose slide">
          {items.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => go(i)}
              aria-label={`Slide ${i + 1}: ${m.title}`}
              aria-current={i === index}
              className={cn('h-1.5 rounded-full bg-white/50 transition-all hover:bg-white/80', i === index ? 'w-6 bg-white' : 'w-1.5')}
            />
          ))}
        </div>
      </div>

      {/* The words beside the frame: cursive title, caption and a way in. */}
      <motion.div
        key={current.id}
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="min-w-0"
      >
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">
          <span className="h-px w-8 bg-primary/50" aria-hidden />
          {current.type === 'video' ? 'Featured film' : 'Featured photograph'}
        </p>
        <h2 className="mt-2.5 font-script text-[40px] leading-[1.06] text-foreground sm:text-5xl xl:text-6xl">{current.title}</h2>
        <p className="mt-4 max-w-xl text-[15px] leading-7 text-muted-foreground">{current.caption}</p>
        <p className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{DISCIPLINE_LABELS[current.discipline]}</span>
          <span aria-hidden>·</span>
          <span>{current.year}</span>
          <span aria-hidden>·</span>
          <span>{formatCompact(current.views)} views</span>
          <span aria-hidden>·</span>
          <span>{current.credit}</span>
        </p>
        <Button className="mt-6" onClick={() => onOpen(current.id)}>
          {current.type === 'video' ? <Play /> : <Images />} {current.type === 'video' ? 'Watch the film' : 'Open the photograph'}
        </Button>
      </motion.div>
    </section>
  );
}

function Lightbox({ items, index, onIndex, onClose }: { items: MediaItem[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const m = items[index];
  useRegisterPageContext(m ? { type: m.type, id: m.id, title: m.title } : null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') onIndex((index + 1) % items.length);
      if (e.key === 'ArrowLeft') onIndex((index - 1 + items.length) % items.length);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [index, items.length, onIndex]);
  if (!m) return null;
  const post = originalPost(m);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[94vh] max-w-6xl gap-3 overflow-y-auto p-4 sm:p-6">
        <DialogTitle className="pr-8 text-lg sm:text-xl">{m.title}</DialogTitle>
        <DialogDescription className="sr-only">{m.altText}</DialogDescription>
        {/* The image fills the pop-up width; portrait shots are capped by height so nothing is cropped. */}
        {m.type === 'video' ? (
          <FakeVideo v={m} />
        ) : (
          <div className="overflow-hidden rounded-xl bg-black/90">
            <PolarImage variant={m.art} seed={m.id} alt={m.altText} className="max-h-[62vh] min-h-[220px] w-full" />
          </div>
        )}

        <div className="grid gap-4 text-sm md:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <p className="text-[15px]">{m.caption}</p>
            <p className="text-muted-foreground">{m.summary}</p>
            <p className="text-xs text-muted-foreground">
              {m.credit} · Licence {m.licence} · {m.year} · {formatCompact(m.views)} views
            </p>
            <p className="text-xs text-muted-foreground">
              <strong>Alt text:</strong> {m.altText}
            </p>
            {post && (
              <Link href={post.href} className="inline-flex items-center gap-1.5 pt-1 font-medium text-primary hover:underline">
                Open the original post <span className="text-muted-foreground">({post.label})</span> <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            )}
            <ReactionBar type={m.type} id={m.id} title={m.title} size="xs" className="pt-1" />
          </div>
          <div className="flex items-start gap-2">
            <Button variant="outline" size="icon" onClick={() => onIndex((index - 1 + items.length) % items.length)} aria-label="Previous">
              <ChevronLeft />
            </Button>
            <Button variant="outline" size="icon" onClick={() => onIndex((index + 1) % items.length)} aria-label="Next">
              <ChevronRight />
            </Button>
            <Button
              onClick={() => {
                if (downloadItem(m, { id: m.id, name: `${m.slug}.${m.type === 'video' ? 'mp4' : 'jpg'}`, kind: m.type === 'video' ? 'video' : 'image', sizeKb: 2400 })) toast.success('Download started (demo placeholder)');
              }}
            >
              <Download /> Download
            </Button>
          </div>
        </div>
        <p className="text-right text-xs text-muted-foreground">
          {index + 1} / {items.length} · Use ← → keys
        </p>
      </DialogContent>
    </Dialog>
  );
}

export function GalleryView() {
  const { data, isPending } = useApi(['media'], api.getMedia);
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const low = useUiStore((s) => s.lowBandwidth);
  const [kind, setKind] = useState<'all' | 'photo' | 'video'>('all');
  const [exp, setExp] = useState('all');
  const [year, setYear] = useState('all');
  const [subject, setSubject] = useState<Discipline | 'all'>('all');
  const items = useMemo(
    () =>
      (data ?? []).filter(
        (m) => (kind === 'all' || m.type === kind) && (exp === 'all' || m.expeditionId === exp) && (year === 'all' || String(m.year) === year) && (subject === 'all' || m.discipline === subject),
      ),
    [data, kind, exp, year, subject],
  );
  const openId = sp.get('item');
  const openIndex = openId ? items.findIndex((m) => m.id === openId) : -1;
  const setOpen = (id: string | null) => router.replace(id ? `${pathname}?item=${id}` : pathname, { scroll: false });
  const years = Array.from(new Set((data ?? []).map((m) => m.year))).sort((a, b) => b - a);
  const counts = { photo: (data ?? []).filter((m) => m.type === 'photo').length, video: (data ?? []).filter((m) => m.type === 'video').length };

  /** Slides: photo of the day first, then the most-viewed photos and videos. */
  const slides = useMemo(() => {
    const all = data ?? [];
    const potd = all.filter((m) => m.type === 'photo')[new Date().getDate() % 40];
    const rest = [...all].sort((a, b) => b.views - a.views).filter((m) => m.id !== potd?.id);
    return [...(potd ? [potd] : []), ...rest.filter((m) => m.type === 'photo').slice(0, 4), ...rest.filter((m) => m.type === 'video').slice(0, 2)];
  }, [data]);

  return (
    <div className="relative isolate">
      {/* Page background: a polar photo, blurred behind a veil. Bright ice in light mode and the
          aurora at night in dark mode, so body text keeps its contrast either way. */}
      {!low && (
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          {/* Sticky, not fixed: the photo holds still while the page scrolls but stops at the footer. */}
          <div className="sticky top-0 h-screen overflow-hidden">
            <img src={IMAGE_LIBRARY['fast-ice'].src} alt="" className="h-full w-full object-cover opacity-90 blur-[2px] contrast-[0.9] dark:hidden" />
            <img src={IMAGE_LIBRARY['aurora-iceberg'].src} alt="" className="hidden h-full w-full object-cover opacity-70 blur-[2px] dark:block" />
            {/* The veil uses element opacity: theme colours are bare hsl(var(--x)), so `bg-background/84` would do nothing. */}
            <div className="absolute inset-0 bg-background opacity-[0.84] dark:opacity-[0.66]" />
          </div>
        </div>
      )}

      <PageHero
        eyebrow="Media"
        title="The polar"
        script="gallery"
        description="Photographs, films and sounds from expeditions and stations. The records are fictional; the photographs are freely licensed images that illustrate each subject (see image credits on the About page)."
        image="iceberg-sculpted"
        meta={
          <ul className="flex flex-wrap items-center gap-2">
            <li>
              <HeroChip>
                <Images className="h-3.5 w-3.5" aria-hidden /> {isPending ? '—' : counts.photo} photographs
              </HeroChip>
            </li>
            <li>
              <HeroChip>
                <Film className="h-3.5 w-3.5" aria-hidden /> {isPending ? '—' : counts.video} films
              </HeroChip>
            </li>
            <li>
              <a href="#sounds" className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                <HeroChip className="transition-colors hover:bg-white/20">
                  <Headphones className="h-3.5 w-3.5" aria-hidden /> 8 soundscapes
                </HeroChip>
              </a>
            </li>
          </ul>
        }
      />

      <div className="container py-8">
        {isPending ? <Skeleton className="mb-10 aspect-[16/9] w-full rounded-2xl lg:aspect-[21/9]" /> : <Showcase items={slides} onOpen={setOpen} />}

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
            <SelectTrigger aria-label="Media type"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Photos & videos</SelectItem>
              <SelectItem value="photo">Photos</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={exp} onValueChange={setExp}>
            <SelectTrigger aria-label="Expedition"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All expeditions</SelectItem>
              {EXPEDITIONS.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.number} ({e.year})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger aria-label="Year"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All years</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={subject} onValueChange={(v) => setSubject(v as Discipline | 'all')}>
            <SelectTrigger aria-label="Subject"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {(Object.keys(DISCIPLINE_LABELS) as Discipline[]).map((d) => (
                <SelectItem key={d} value={d}>{DISCIPLINE_LABELS[d]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isPending ? (
          <div className="columns-2 gap-4 md:columns-3 lg:columns-4 lg:gap-5">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="mb-4 w-full break-inside-avoid lg:mb-5" style={{ height: 140 + (i % 3) * 60 }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="No media matches these filters" />
        ) : (
          <ul className="columns-2 gap-4 md:columns-3 lg:columns-4 lg:gap-5">
            {items.map((m) => (
              <li key={m.id} className="mb-4 break-inside-avoid lg:mb-5">
                <button
                  type="button"
                  onClick={() => setOpen(m.id)}
                  className="group relative block w-full overflow-hidden rounded-xl border bg-card text-left shadow-sm ring-offset-background transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transform-none"
                  aria-label={`Open ${m.title}`}
                >
                  <PolarImage variant={m.art} seed={m.id} alt={m.altText} className={cn('w-full transition-transform duration-500 group-hover:scale-[1.06] motion-reduce:transform-none', tileShape(m))}>
                    {m.type === 'video' && (
                      <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white ring-2 ring-white/60 transition-transform group-hover:scale-110">
                          <Play className="ml-0.5 h-5 w-5 fill-current" />
                        </span>
                      </span>
                    )}
                  </PolarImage>
                  {/* Type and year read at a glance; the caption slides up on hover. */}
                  <span className="pointer-events-none absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                    {m.type === 'video' ? <Film className="h-3 w-3" aria-hidden /> : <Images className="h-3 w-3" aria-hidden />}
                    {m.type === 'video' && m.durationSec ? `${Math.round(m.durationSec / 60)} min` : m.year}
                  </span>
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-1.5 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-2.5 pt-8 text-xs font-medium leading-snug text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 motion-reduce:transition-none">
                    {m.title}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <SoundGallery />
      </div>

      {openIndex >= 0 && <Lightbox items={items} index={openIndex} onIndex={(i) => setOpen(items[i].id)} onClose={() => setOpen(null)} />}
    </div>
  );
}
