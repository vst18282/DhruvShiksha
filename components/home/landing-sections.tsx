'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useInView, useMotionValue, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowRight, ArrowUpRight, BookOpen, Camera, Clock, Database, FileText, Lightbulb, MapPin, Quote, Ship, Users } from 'lucide-react';
import type { Blog, Expedition, GlossaryTerm, MediaItem } from '@/types';
import { PolarImage } from '@/components/common/polar-image';
import { RegionBadge } from '@/components/common';
import { MiniMap } from '@/components/maps/mini-map';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/skeletons';
import { useCountUp } from '@/hooks/use-count-up';
import { itemHref } from '@/lib/archive';
import { IMAGE_LIBRARY } from '@/lib/images';
import { REGION_META } from '@/lib/constants';
import { STATIONS } from '@/data/stations';
import { useUiStore } from '@/store/ui';
import { cn } from '@/lib/utils';

/* ----------------------------------------------------------------------------------------------
 * Shared pieces
 * -------------------------------------------------------------------------------------------- */

function useStill() {
  const reduce = useReducedMotion();
  const low = useUiStore((s) => s.lowBandwidth);
  return !!reduce || low;
}

/** Fades content up as it scrolls into view. Static under reduced motion / low bandwidth. */
function Reveal({ children, className, delay = 0, y = 24, as = 'div' }: { children: React.ReactNode; className?: string; delay?: number; y?: number; as?: 'div' | 'li' }) {
  const still = useStill();
  // min-w-0: reveal wrappers are grid/flex items; without it wide content (chip rows) overflows on phones.
  className = cn('min-w-0', className);
  if (still) return as === 'li' ? <li className={className}>{children}</li> : <div className={className}>{children}</div>;
  const props = {
    className,
    initial: { opacity: 0, y },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] as const },
  };
  return as === 'li' ? <motion.li {...props}>{children}</motion.li> : <motion.div {...props}>{children}</motion.div>;
}

/** Section heading with the cursive accent used across the portal. */
function SectionTitle({ id, eyebrow, title, accent, description, action, dark }: { id: string; eyebrow: string; title: string; accent: string; description?: string; action?: React.ReactNode; dark?: boolean }) {
  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <Reveal className="max-w-2xl">
        <p className={cn('flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.32em]', dark ? 'text-[#9DBAD6]' : 'text-primary')}>
          <span className={cn('h-px w-8', dark ? 'bg-[#9DBAD6]/60' : 'bg-primary/50')} aria-hidden />
          {eyebrow}
        </p>
        <h2 id={id} className="mt-3 text-balance text-3xl font-bold leading-[1.1] tracking-tight md:text-[2.6rem]">
          {title} <span className={cn('font-script text-[1.15em] font-normal', dark ? 'text-[#BFD3E6]' : 'text-primary')}>{accent}</span>
        </h2>
        {description && <p className={cn('mt-3 max-w-xl text-[15px] leading-7', dark ? 'text-white/70' : 'text-muted-foreground')}>{description}</p>}
      </Reveal>
      {action && <Reveal delay={0.1} className="shrink-0">{action}</Reveal>}
    </div>
  );
}

/** Soft topographic contour lines, used as a quiet texture on dark bands. */
function Contours({ className }: { className?: string }) {
  const lines = Array.from({ length: 11 }, (_, i) => {
    const y = 20 + i * 26;
    return `M-40 ${y} C 160 ${y - 46 + i * 4}, 360 ${y + 54}, 600 ${y - 8} S 980 ${y + 36}, 1240 ${y - 24}`;
  });
  return (
    <svg viewBox="0 0 1200 300" preserveAspectRatio="none" className={className} aria-hidden>
      {lines.map((d) => <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
    </svg>
  );
}

const formatCoord = (lat: number, lon: number) => `${Math.abs(lat).toFixed(1)}°${lat < 0 ? 'S' : 'N'} · ${Math.abs(lon).toFixed(1)}°${lon < 0 ? 'W' : 'E'}`;

/* ----------------------------------------------------------------------------------------------
 * 1. Archive at a glance — dark band with count-up figures and a slow research-theme ticker
 * -------------------------------------------------------------------------------------------- */

type Stats = { expeditions: number; reports: number; datasets: number; photos: number; publications: number };

const THEMES = [
  'Ice-sheet dynamics', 'Sea-ice extent', 'Southern Ocean', 'Himalayan cryosphere', 'Arctic aerosols', 'Ice-core palaeoclimate',
  'Krill & food webs', 'Space weather', 'Permafrost', 'Glacial lakes', 'Ocean warming', 'Polar logistics',
];

function Counter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: '-40px' });
  const v = useCountUp(seen ? value : 0, 1400);
  return <span ref={ref}>{v.toLocaleString('en-IN')}</span>;
}

export function ArchiveBand({ stats }: { stats?: Stats }) {
  const still = useStill();
  const items = [
    { key: 'expeditions', label: 'Expeditions', icon: Ship },
    { key: 'reports', label: 'Reports', icon: FileText },
    { key: 'datasets', label: 'Datasets', icon: Database },
    { key: 'photos', label: 'Photos', icon: Camera },
    { key: 'publications', label: 'Publications', icon: BookOpen },
  ] as const;

  return (
    <section aria-labelledby="lp-archive" className="relative isolate overflow-hidden bg-polar-navy py-16 text-white md:py-20">
      <Contours className="absolute inset-0 -z-10 h-full w-full text-white/[0.06]" />
      <div className="motion-decor animate-aurora absolute -top-40 left-[15%] -z-10 h-80 w-[65%] rounded-full bg-[#2F5D8C]/35 blur-3xl" aria-hidden />

      <div className="container">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.55fr)] lg:items-end">
          <Reveal>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#9DBAD6]">
              <span className="h-px w-8 bg-[#9DBAD6]/60" aria-hidden /> The archive at a glance
            </p>
            <h2 id="lp-archive" className="mt-3 text-balance text-3xl font-bold leading-[1.1] tracking-tight md:text-[2.6rem]">
              Decades of polar science, <span className="font-script text-[1.15em] font-normal text-[#BFD3E6]">in one place</span>
            </h2>
            <p className="mt-3 max-w-md text-[15px] leading-7 text-white/70">Expedition logs, peer-reviewed papers, open datasets and field photography from Antarctica, the Arctic, the Himalaya and the Southern Ocean.</p>
          </Reveal>

          <Reveal delay={0.1}>
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-5">
              {items.map(({ key, label, icon: Icon }) => (
                <div key={key} className="group flex flex-col-reverse gap-1 bg-polar-navy/95 p-5 transition-colors last:col-span-2 hover:bg-[#10284a] sm:last:col-span-1">
                  <dt className="flex items-center gap-1.5 text-xs text-white/60">
                    <Icon className="h-3.5 w-3.5 text-[#7AA3C8] transition-transform group-hover:-translate-y-0.5" aria-hidden /> {label}
                  </dt>
                  <dd className="text-3xl font-semibold tabular-nums tracking-tight md:text-4xl" aria-label={stats ? `${stats[key]} ${label}` : `Loading ${label}`}>
                    {stats ? <Counter value={stats[key]} /> : <span className="inline-block h-8 w-14 animate-pulse rounded bg-white/10" />}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        <div className={cn('landing-marquee-wrap relative mt-12 overflow-hidden border-y border-white/10 py-4', !still && '[mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]')} aria-label="Research themes">
          <div className={cn('flex', still ? 'flex-wrap justify-center gap-y-2' : 'landing-marquee w-max')}>
            {(still ? THEMES : [...THEMES, ...THEMES]).map((theme, i) => {
              const copy = i >= THEMES.length;
              return (
                <Link
                  key={`${theme}-${i}`}
                  href={`/explore?q=${encodeURIComponent(theme)}`}
                  aria-hidden={copy || undefined}
                  tabIndex={copy ? -1 : undefined}
                  className="inline-flex shrink-0 items-center gap-3 px-5 text-sm text-white/65 transition-colors hover:text-white"
                >
                  <span className="h-1 w-1 rounded-full bg-[#7AA3C8]" aria-hidden /> {theme}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------------------------
 * 2. Featured expedition (cinematic, parallax) + interactive year-wise stream
 * -------------------------------------------------------------------------------------------- */

function FeaturedExpedition({ exp }: { exp: Expedition }) {
  const still = useStill();
  const ref = useRef<HTMLElement>(null);
  const y = useMotionValue('0%');

  // Gentle parallax: the photo drifts from -7% to +7% while the card crosses the viewport.
  useEffect(() => {
    if (still) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)));
      y.set(`${(-7 + progress * 14).toFixed(2)}%`);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(frame); };
  }, [still, y]);

  return (
    <article ref={ref} className="group relative isolate flex min-h-[520px] flex-col justify-end overflow-hidden rounded-2xl bg-neutral-900 text-white shadow-xl ring-1 ring-black/5">
      <motion.div style={still ? undefined : { y }} className="absolute inset-x-0 -bottom-[8%] -top-[8%] -z-20">
        <PolarImage variant={exp.art} seed={exp.id} alt={`Photo illustrating ${exp.name}`} className="h-full w-full transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]" />
      </motion.div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/45 to-black/5" aria-hidden />
      <div className="absolute inset-x-0 top-0 -z-10 h-28 bg-gradient-to-b from-black/45 to-transparent" aria-hidden />

      <div className="absolute left-5 right-5 top-5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="rounded-full border border-white/25 bg-black/30 px-3 py-1 font-medium uppercase tracking-[0.2em] backdrop-blur-sm">Featured expedition</span>
        <span className="rounded-full border border-white/25 bg-black/30 px-3 py-1 font-mono backdrop-blur-sm">{exp.number}</span>
      </div>

      <div className="p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <RegionBadge region={exp.region} className="border-white/30 bg-white/15 text-white dark:text-white" />
          <span className="text-sm text-white/75">{exp.startDate} → {exp.endDate}</span>
        </div>
        <h3 className="mt-3 max-w-xl text-balance text-3xl font-semibold leading-tight tracking-tight md:text-4xl">{exp.name}</h3>

        <ul className="mt-5 grid max-w-2xl gap-2 sm:grid-cols-2">
          {exp.highlights.slice(0, 4).map((h) => (
            <li key={h} className="flex gap-2 rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-sm leading-snug text-white/90 backdrop-blur-md">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#D9C27A]" aria-hidden /> {h}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/75">
            <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" aria-hidden /> {exp.teamSize} members</span>
            <span>Led by {exp.leader}</span>
            {exp.vessel && <span className="inline-flex items-center gap-1.5"><Ship className="h-4 w-4" aria-hidden /> {exp.vessel}</span>}
          </p>
          <Button asChild size="lg" className="bg-white text-neutral-900 hover:bg-white/90">
            <Link href={`/expeditions/${exp.id}`}>Open expedition hub <ArrowUpRight /></Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

/** Catmull-Rom → cubic Bézier, so the "river" passes smoothly through every year. */
function smoothPath(points: [number, number][]) {
  if (points.length < 2) return '';
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

function ExpeditionStream({ expeditions }: { expeditions: Expedition[] }) {
  const still = useStill();
  const byYear = useMemo(() => {
    const map = new Map<number, Expedition[]>();
    expeditions.forEach((e) => map.set(e.year, [...(map.get(e.year) ?? []), e]));
    return map;
  }, [expeditions]);
  const years = useMemo(() => {
    const known = [...byYear.keys()];
    const min = known.length ? Math.min(...known) : 2008;
    const max = known.length ? Math.max(...known) : 2025;
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }, [byYear]);
  const latest = [...years].reverse().find((y) => byYear.has(y)) ?? years[years.length - 1];
  const [selected, setSelected] = useState<number>(latest);
  const year = byYear.has(selected) ? selected : latest;
  const list = byYear.get(year) ?? [];

  const W = 600, H = 150, PAD = 22;
  const pts = years.map((_, i) => [PAD + (i * (W - PAD * 2)) / Math.max(1, years.length - 1), 70 + Math.sin(i * 0.85) * 30] as [number, number]);
  const river = smoothPath(pts);

  return (
    <div className="flex flex-col rounded-2xl border bg-card p-6 shadow-sm md:p-7">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">Year-wise stream</p>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight">{years.length} years, one <span className="font-script text-[1.2em] font-normal text-primary">river of discovery</span></h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Choose a year to see which expeditions set out. Dot size shows how many.</p>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" role="img" aria-label={`Timeline of expeditions from ${years[0]} to ${years[years.length - 1]}`}>
        <defs>
          <linearGradient id="lp-river" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#7AA3C8" />
            <stop offset="1" stopColor="#1E3A5F" />
          </linearGradient>
        </defs>
        <path d={river} fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" className="text-muted/70" />
        {still ? (
          <path d={river} fill="none" stroke="url(#lp-river)" strokeWidth="3" strokeLinecap="round" />
        ) : (
          <motion.path d={river} fill="none" stroke="url(#lp-river)" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.8, ease: 'easeInOut' }} />
        )}
        {years.map((y, i) => {
          const [x, cy] = pts[i];
          const items = byYear.get(y) ?? [];
          const on = y === year;
          const r = items.length ? Math.min(10, 4.5 + items.length * 1.6) : 2.5;
          const color = items.length ? REGION_META[items[0].region].color : 'hsl(var(--muted-foreground))';
          const dot = (
            <g key={y} className={items.length ? 'cursor-pointer' : undefined} onClick={() => items.length && setSelected(y)}>
              {on && <circle cx={x} cy={cy} r={r + 6} fill="none" stroke={color} strokeWidth="1.5" opacity="0.55" />}
              <circle cx={x} cy={cy} r={r} fill={items.length ? color : 'hsl(var(--card))'} stroke={items.length ? 'hsl(var(--card))' : color} strokeWidth="2" />
              {(i % 3 === 0 || on || i === years.length - 1) && (
                <text x={x} y={cy + r + 16} fontSize="10.5" textAnchor="middle" className={on ? 'fill-foreground font-semibold' : 'fill-muted-foreground'}>{y}</text>
              )}
            </g>
          );
          return still ? dot : (
            <motion.g key={y} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.07, duration: 0.3 }}>{dot}</motion.g>
          );
        })}
      </svg>

      <div className="no-scrollbar -mx-1 mt-2 flex gap-1 overflow-x-auto px-1 pb-1" role="group" aria-label="Choose a year">
        {years.filter((y) => byYear.has(y)).map((y) => (
          <button
            key={y}
            type="button"
            aria-pressed={y === year}
            onClick={() => setSelected(y)}
            className={cn('shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', y === year ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
          >
            {y}
          </button>
        ))}
      </div>

      <ul className="mt-4 space-y-2" aria-live="polite">
        {list.slice(0, 3).map((e) => (
          <li key={e.id}>
            <Link href={`/expeditions/${e.id}`} className="group flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/60">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: REGION_META[e.region].color }} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{e.name}</span>
                <span className="block text-xs text-muted-foreground">{e.number} · {REGION_META[e.region].label} · {e.teamSize} members</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      <Button variant="outline" className="mt-5 w-fit" asChild>
        <Link href="/expeditions">Explore the full stream <ArrowRight /></Link>
      </Button>
    </div>
  );
}

export function ExpeditionSection({ featured, expeditions, pending }: { featured?: Expedition; expeditions?: Expedition[]; pending: boolean }) {
  return (
    <section aria-labelledby="lp-expeditions" className="py-20 md:py-24">
      <div className="container">
        <SectionTitle id="lp-expeditions" eyebrow="From the field" title="Follow an" accent="expedition" description="Every voyage south, north and up into the mountains, with its team, route, daily log and science highlights." />
        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {pending || !featured ? <Skeleton className="h-[520px] w-full rounded-2xl" /> : <Reveal className="[&>article]:h-full"><FeaturedExpedition exp={featured} /></Reveal>}
          {pending || !expeditions ? <Skeleton className="h-[520px] w-full rounded-2xl" /> : <Reveal delay={0.12} className="[&>div]:h-full"><ExpeditionStream expeditions={expeditions} /></Reveal>}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------------------------
 * 3. Stories — editorial layout: one lead story and a reading list
 * -------------------------------------------------------------------------------------------- */

export function StoriesSection({ blogs, pending }: { blogs: Blog[]; pending: boolean }) {
  const [lead, ...rest] = blogs;
  return (
    <section aria-labelledby="lp-stories" className="border-t bg-card/60 py-20 md:py-24">
      <div className="container">
        <SectionTitle
          id="lp-stories"
          eyebrow="Stories"
          title="Notes from the"
          accent="field"
          description="Plain-language stories from scientists on the ice, many with Expert, General and Class 8 versions."
          action={<Button variant="outline" asChild><Link href="/blog">All stories <ArrowRight /></Link></Button>}
        />

        {pending || !lead ? (
          <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <Skeleton className="aspect-[16/11] w-full rounded-2xl" />
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <Reveal>
              <article className="group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl bg-neutral-900 text-white shadow-lg sm:aspect-[16/11]">
                <PolarImage variant={lead.art} seed={lead.id} alt="" decorative className="absolute inset-0 -z-20 transition-transform duration-[1200ms] ease-out group-hover:scale-[1.05]" />
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/40 to-transparent" aria-hidden />
                <div className="p-6 md:p-8">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-white px-2.5 py-0.5 font-semibold text-neutral-900">Lead story</span>
                    <RegionBadge region={lead.region} className="border-white/30 bg-white/15 text-white dark:text-white" />
                  </div>
                  <h3 className="mt-3 max-w-xl text-balance text-2xl font-semibold leading-tight md:text-3xl">
                    <Link href={itemHref(lead)} className="after:absolute after:inset-0 focus:outline-none focus-visible:underline">{lead.title}</Link>
                  </h3>
                  <p className="mt-2 line-clamp-2 max-w-xl text-sm leading-6 text-white/80">{lead.summary}</p>
                  <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/70">
                    {lead.authors[0] && <span>By {lead.authors[0]}</span>}
                    <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden /> {lead.readingMinutes} min read</span>
                    <span>{lead.year}</span>
                  </p>
                </div>
              </article>
            </Reveal>

            <ol className="flex flex-col gap-3">
              {rest.slice(0, 4).map((b, i) => (
                <Reveal as="li" key={b.id} delay={0.08 * (i + 1)} y={16} className="group relative flex items-center gap-4 rounded-xl border bg-card p-3 transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring">
                    <span className="w-6 shrink-0 text-center font-mono text-xs text-muted-foreground">{String(i + 2).padStart(2, '0')}</span>
                    <PolarImage variant={b.art} seed={b.id} alt="" decorative className="h-20 w-28 shrink-0 rounded-lg [&_img]:transition-transform [&_img]:duration-700 group-hover:[&_img]:scale-110" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: REGION_META[b.region].color }}>{REGION_META[b.region].label}</p>
                      <h3 className="mt-0.5 line-clamp-2 font-semibold leading-snug">
                        <Link href={itemHref(b)} className="after:absolute after:inset-0 focus:outline-none">{b.title}</Link>
                      </h3>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" aria-hidden /> {b.readingMinutes} min · {b.year}</p>
                    </div>
                    <ArrowUpRight className="hidden h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 sm:block" aria-hidden />
                </Reveal>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------------------------
 * 4. Stations — globe beside photographic station cards
 * -------------------------------------------------------------------------------------------- */

export function StationsSection() {
  return (
    <section aria-labelledby="lp-stations" className="py-20 md:py-24">
      <div className="container">
        <SectionTitle
          id="lp-stations"
          eyebrow="Research stations"
          title="Where India"
          accent="works"
          description="Year-round bases in Antarctica and the Arctic, and a high-altitude field station in the Himalaya."
          action={<Button variant="outline" asChild><Link href="/tools/polar-map/2d">Open the polar map <ArrowRight /></Link></Button>}
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)]">
          <Reveal>
            <div className="relative isolate flex h-full flex-col overflow-hidden rounded-2xl bg-polar-navy p-6 text-white shadow-lg">
              <Contours className="absolute inset-0 -z-10 h-full w-full text-white/[0.05]" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9DBAD6]">Pole to pole</p>
              <p className="mt-2 text-lg font-semibold">{STATIONS.length} stations across three polar regions</p>
              <MiniMap
                className="mx-auto my-6 w-full max-w-[300px] rounded-full shadow-[0_0_70px_rgba(122,163,200,0.28)] ring-1 ring-white/15"
                center={[45, -20]}
                label="Globe showing India’s polar stations: Maitri, Bharati, Himadri and Himansh"
                points={STATIONS.map((s) => ({ lon: s.lon, lat: s.lat, label: s.name, color: REGION_META[s.region].color }))}
              />
              <ul className="mt-auto grid grid-cols-2 gap-2 text-xs">
                {STATIONS.map((s) => (
                  <li key={s.slug} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: REGION_META[s.region].color }} aria-hidden />
                    <span className="font-medium">{s.name}</span>
                    <span className="ml-auto text-white/55">{s.established}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2">
            {STATIONS.map((s, i) => (
              <Reveal key={s.slug} delay={0.08 * i} y={18}>
                <article className="group relative isolate flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-2xl bg-neutral-900 text-white shadow-md ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus-within:ring-2 focus-within:ring-ring">
                  <PolarImage variant={s.art} seed={s.slug} alt="" decorative className="absolute inset-0 -z-20 transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]" />
                  <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/30 to-transparent" aria-hidden />
                  <span className="absolute inset-x-0 top-0 h-1" style={{ background: REGION_META[s.region].color }} aria-hidden />
                  <span className="absolute right-3 top-3 rounded-full border border-white/25 bg-black/30 px-2.5 py-0.5 text-[11px] backdrop-blur-sm">Est. {s.established}</span>
                  <div className="p-5">
                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/70">{REGION_META[s.region].label}</p>
                    <h3 className="mt-1 text-xl font-semibold">
                      <Link href={`/stations/${s.slug}`} className="after:absolute after:inset-0 focus:outline-none">{s.name}</Link>
                    </h3>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-white/75"><MapPin className="h-3.5 w-3.5" aria-hidden /> {s.location.split(',')[0]} · {formatCoord(s.lat, s.lon)}</p>
                    <p className="mt-2 flex max-h-0 items-center gap-1 overflow-hidden text-sm font-medium opacity-0 transition-all duration-300 group-hover:max-h-6 group-hover:opacity-100 group-focus-within:max-h-6 group-focus-within:opacity-100">
                      Visit station <ArrowRight className="h-4 w-4" aria-hidden />
                    </p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------------------------
 * 5. Today — photo, fact and word of the day
 * -------------------------------------------------------------------------------------------- */

export function TodaySection({ photo, fact, term, pending }: { photo?: MediaItem; fact: string; term: GlossaryTerm; pending: boolean }) {
  return (
    <section aria-labelledby="lp-today" className="border-t bg-muted/30 py-20 md:py-24">
      <div className="container">
        <SectionTitle id="lp-today" eyebrow="Daily" title="Today on" accent="DhruvShiksha" description="A new photograph, finding and word from the archive every day." />

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            {pending || !photo ? (
              <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
            ) : (
              <figure className="group relative isolate flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-2xl bg-neutral-900 text-white shadow-lg sm:aspect-[16/9]">
                <PolarImage variant={photo.art} seed={photo.id} alt={photo.altText} className="absolute inset-0 -z-20 transition-transform duration-[1400ms] ease-out group-hover:scale-[1.04]" />
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/20 to-transparent" aria-hidden />
                <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/30 px-3 py-1 text-xs font-medium backdrop-blur-sm"><Camera className="h-3.5 w-3.5" aria-hidden /> Photo of the day</span>
                <figcaption className="flex flex-wrap items-end justify-between gap-3 p-5 md:p-6">
                  <span className="max-w-xl">
                    <span className="block text-lg font-semibold leading-snug md:text-xl">{photo.caption}</span>
                    <span className="mt-1 block text-xs text-white/65">{photo.credit}</span>
                  </span>
                  <Link href={`/gallery?item=${photo.id}`} className="inline-flex items-center gap-1 rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-neutral-900 transition-colors hover:bg-white/90">
                    Open in gallery <ArrowUpRight className="h-4 w-4" aria-hidden />
                  </Link>
                </figcaption>
              </figure>
            )}
          </Reveal>

          <div className="flex flex-col gap-6">
            <Reveal delay={0.1} className="flex-1">
              <div className="relative isolate h-full overflow-hidden rounded-2xl bg-polar-navy p-6 text-white shadow-md">
                <Quote className="absolute bottom-3 right-4 -z-10 h-16 w-16 text-white/[0.07]" aria-hidden />
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9DBAD6]">Fact of the day</p>
                <p className="mt-3 text-lg font-medium leading-relaxed">{fact}</p>
                <p className="mt-3 text-xs text-white/55">Demo finding from the archive.</p>
              </div>
            </Reveal>
            <Reveal delay={0.18} className="flex-1">
              <div className="group h-full rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">Word of the day</p>
                <p className="mt-2 font-script text-3xl text-primary">{term.term}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{term.simple}</p>
                <Link href={`/learn/glossary#${term.id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  Open the glossary <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------------------------
 * 6. Newsletter — photographic navy panel
 * -------------------------------------------------------------------------------------------- */

export function NewsletterSection() {
  const low = useUiStore((s) => s.lowBandwidth);
  const [email, setEmail] = useState('');
  return (
    <section aria-labelledby="lp-newsletter" className="py-20 md:py-24">
      <div className="container">
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-3xl bg-polar-navy px-6 py-12 text-white shadow-xl md:px-12 md:py-16">
            {!low && <img src={IMAGE_LIBRARY['aurora-arc'].src} alt="" aria-hidden loading="lazy" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-45" />}
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-polar-navy via-polar-navy/85 to-polar-navy/35" aria-hidden />
            <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <div>
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#9DBAD6]"><span className="h-px w-8 bg-[#9DBAD6]/60" aria-hidden /> Newsletter</p>
                <h2 id="lp-newsletter" className="mt-3 text-balance text-3xl font-bold leading-[1.1] tracking-tight md:text-[2.6rem]">
                  Polar stories, <span className="font-script text-[1.15em] font-normal text-[#BFD3E6]">every month</span>
                </h2>
                <p className="mt-3 max-w-md text-[15px] leading-7 text-white/75">A short (demo) digest for students, teachers and science fans: new expeditions, stories and datasets.</p>
              </div>
              <form
                className="w-full"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error('Please enter a valid email');
                  toast.success('Subscribed (demo)', { description: 'No email will actually be sent.' });
                  setEmail('');
                }}
              >
                <label htmlFor="nl-email" className="sr-only">Email address</label>
                <div className="flex flex-col gap-2 rounded-2xl border border-white/15 bg-white/10 p-2 backdrop-blur-md sm:flex-row">
                  <Input id="nl-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-11 border-0 bg-transparent text-white placeholder:text-white/50 focus-visible:ring-white/40" />
                  <Button type="submit" size="lg" className="h-11 shrink-0 bg-white text-neutral-900 hover:bg-white/90">Subscribe <ArrowRight /></Button>
                </div>
                <p className="mt-3 text-xs text-white/55">Monthly · No spam · Unsubscribe any time. Demo only, nothing is sent.</p>
              </form>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
