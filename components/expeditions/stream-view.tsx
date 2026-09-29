'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import { Search, Waves } from 'lucide-react';
import type { Expedition, Region } from '@/types';
import { ExpeditionCard } from './expedition-card';
import { MiniMap } from '@/components/maps/mini-map';
import { EmptyState } from '@/components/common';
import { HeroChip, PageHero } from '@/components/common/page-hero';
import { Skeleton, StatSkeleton } from '@/components/skeletons';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/misc';
import { useApi } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { REGION_META } from '@/lib/constants';
import { STATIONS } from '@/data/stations';
import { useUiStore } from '@/store/ui';
import { normalize } from '@/lib/search/text';
import { cn, formatNumber } from '@/lib/utils';

const DECADES = [
  { id: 'all', label: 'All years' },
  { id: '2000', label: '2008–09' },
  { id: '2010', label: '2010s' },
  { id: '2020', label: '2020s' },
];

/** One meandering segment of the river between two year milestones. */
function RiverSegment({ dir, animate, color }: { dir: 1 | -1; animate: boolean; color: string }) {
  const a = 22 * dir;
  const gid = `river-${useId().replace(/:/g, '')}`;
  return (
    <svg className="pointer-events-none absolute inset-0 hidden h-full w-full md:block" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5BB5E8" />
          <stop offset="1" stopColor={color} />
        </linearGradient>
      </defs>
      <path d={`M50 0 C ${50 + a} 30, ${50 + a} 70, 50 100`} stroke={`url(#${gid})`} strokeWidth="14" strokeOpacity="0.18" fill="none" vectorEffect="non-scaling-stroke" />
      <path
        d={`M50 0 C ${50 + a} 30, ${50 + a} 70, 50 100`}
        stroke={`url(#${gid})`}
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        strokeDasharray={animate ? '10 14' : undefined}
        className={animate ? 'motion-decor [animation:river-flow_3s_linear_infinite]' : undefined}
      />
    </svg>
  );
}

/**
 * Description panel that fills the empty half of the river when a card is hovered or focused.
 * Always rendered (just faded out) so the zig-zag never shifts, and inert to the pointer.
 */
function HoverNote({ e, open, side }: { e: Expedition; open: boolean; side: 'left' | 'right' }) {
  const color = REGION_META[e.region].color;
  const span = `${new Date(e.startDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} – ${new Date(e.endDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`;
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none relative overflow-hidden rounded-2xl border bg-card/75 p-5 shadow-lg backdrop-blur-sm transition-all duration-300 ease-out motion-reduce:transition-none',
        open ? 'translate-x-0 opacity-100' : cn('opacity-0', side === 'right' ? 'translate-x-4' : '-translate-x-4'),
      )}
      style={{ borderColor: `${color}55` }}
    >
      <span className="absolute inset-x-6 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} aria-hidden />
      <span className="absolute -bottom-10 -right-6 h-28 w-28 rounded-full blur-2xl" style={{ background: `${color}22` }} aria-hidden />
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color }}>
        {e.number} · {REGION_META[e.region].label}
      </p>
      <p className="mt-1 font-script text-[26px] leading-tight text-foreground">{e.name}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{e.summary}</p>
      {e.highlights.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-sm">
          {e.highlights.slice(0, 2).map((h) => (
            <li key={h} className="flex gap-2">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
              <span className="leading-6">{h}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 border-t pt-2.5 text-xs text-muted-foreground">
        {span} · Led by {e.leader} · {e.teamSize} members
      </p>
    </div>
  );
}

/**
 * One year on the river. Every expedition gets its own row and the rows alternate sides, so the
 * cards zig-zag down the timeline (`startIndex` keeps the pattern running across years).
 */
function YearBlock({
  year,
  list,
  index,
  startIndex,
  story,
  animate,
  onVisible,
  onHover,
  hovered,
}: {
  year: number;
  list: Expedition[];
  index: number;
  startIndex: number;
  story: boolean;
  animate: boolean;
  onVisible: (y: number) => void;
  onHover: (e: Expedition | null) => void;
  hovered: string | null;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([en]) => en.isIntersecting && onVisible(year), { rootMargin: '-45% 0px -45% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [year, onVisible]);
  const dir: 1 | -1 = index % 2 === 0 ? 1 : -1;
  const color = REGION_META[list[0]?.region ?? 'antarctica'].color;
  return (
    <section ref={ref} id={`year-${year}`} aria-labelledby={`yl-${year}`} className="relative scroll-mt-32">
      <RiverSegment dir={dir} animate={animate} color={color} />
      {/* Mobile rail */}
      <div className="absolute bottom-0 left-4 top-0 w-1 rounded bg-gradient-to-b from-polar-ice to-polar-teal md:hidden" aria-hidden />
      <div className="relative py-8 pl-12 md:pl-0">
        <motion.h2
          id={`yl-${year}`}
          initial={animate ? { scale: 0.8, opacity: 0 } : false}
          whileInView={animate ? { scale: 1, opacity: 1 } : undefined}
          viewport={{ once: true }}
          className="absolute -left-0.5 top-8 z-10 flex h-10 min-w-10 items-center justify-center rounded-full border-4 border-background bg-polar-navy px-2 text-xs font-bold text-white shadow md:left-1/2 md:h-14 md:min-w-[88px] md:-translate-x-1/2 md:text-lg"
          style={{ boxShadow: `0 0 0 3px ${color}55` }}
        >
          {year}
        </motion.h2>
        <div className="space-y-4 md:space-y-6">
          {list.map((e, i) => {
            const left = (startIndex + i) % 2 === 0;
            return (
              <div key={e.id} className="md:grid md:grid-cols-[1fr_140px_1fr] md:items-center md:gap-6">
                {/* Explicit columns (not `order`) so the card really sits left or right of the river. */}
                <div className={cn('md:row-start-1', left ? 'md:col-start-1' : 'md:col-start-3')}>
                  <ExpeditionCard e={e} compact={!story} onHover={onHover} active={hovered === e.id} />
                </div>
                {/* The facing half of the row is empty, so the hover note goes there. */}
                <div className={cn('hidden md:row-start-1 md:block', left ? 'md:col-start-3' : 'md:col-start-1')}>
                  <HoverNote e={e} open={hovered === e.id} side={left ? 'right' : 'left'} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function StreamView() {
  const { data, isPending } = useApi(['expeditions'], api.getExpeditions);
  const reduce = useReducedMotion();
  const low = useUiStore((s) => s.lowBandwidth);
  const plain = !!reduce || low;
  const [regions, setRegions] = useState<Region[]>([]);
  const [decade, setDecade] = useState('all');
  const [mode, setMode] = useState<'story' | 'compact'>('story');
  const [q, setQ] = useState('');
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const [hovered, setHovered] = useState<Expedition | null>(null);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  const filtered = useMemo(() => {
    const nq = normalize(q);
    return (data ?? []).filter(
      (e) =>
        (!regions.length || regions.includes(e.region)) &&
        (decade === 'all' || (decade === '2000' ? e.year < 2010 : String(Math.floor(e.year / 10) * 10) === decade)) &&
        (!nq || normalize(`${e.name} ${e.number} ${e.summary} ${e.tags.join(' ')} ${e.leader}`).includes(nq)),
    );
  }, [data, regions, decade, q]);

  const byYear = useMemo(() => {
    const m = new Map<number, Expedition[]>();
    filtered.forEach((e) => m.set(e.year, [...(m.get(e.year) ?? []), e]));
    return Array.from(m.entries()).sort((a, b) => a[0] - b[0]);
  }, [filtered]);

  /** Running card count per year, so the left/right zig-zag continues across year blocks. */
  const cardOffsets = useMemo(() => {
    let n = 0;
    return byYear.map(([, list]) => {
      const start = n;
      n += list.length;
      return start;
    });
  }, [byYear]);

  const all = data ?? [];
  const participants = all.reduce((a, e) => a + e.teamSize, 0);
  const years = new Set(all.map((e) => e.year));

  return (
    <div className="relative">
      <style>{`@keyframes river-flow { to { stroke-dashoffset: -48; } }`}</style>
      {!plain && <motion.div className="fixed left-0 right-0 top-0 z-50 h-1 origin-left bg-gradient-to-r from-polar-ice via-polar-teal to-polar-violet" style={{ scaleX: progress }} aria-hidden />}
      <PageHero
        eyebrow="Year-wise stream"
        title="The expedition"
        script="river"
        description="Every Antarctic, Arctic, Himalayan and ocean expedition flows along one timeline, 2008 to 2025. Hover a card to read what it set out to do and see where it went; open it for the full hub."
        image="sea-ice-mountains"
        action={
          <div className="flex flex-wrap gap-2">
            <HeroChip>
              <Waves className="h-3.5 w-3.5" aria-hidden /> 2008 → 2025
            </HeroChip>
            <HeroChip>{isPending ? '—' : `${all.length} expeditions`}</HeroChip>
          </div>
        }
      />

      <div className="container py-8">
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Summary">
          {isPending ? (
            Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
          ) : (
            [
              { l: 'Expeditions', v: all.length },
              { l: 'Years covered', v: years.size },
              { l: 'Participants', v: formatNumber(participants) },
              { l: 'Stations', v: STATIONS.length },
            ].map((s) => (
              <div key={s.l} className="rounded-lg border bg-gradient-to-br from-card to-secondary/40 p-4">
                <p className="text-2xl font-semibold tabular-nums">{s.v}</p>
                <p className="text-sm text-muted-foreground">{s.l}</p>
              </div>
            ))
          )}
        </div>

        <div className="sticky top-[6.5rem] z-20 mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-background/90 p-2 backdrop-blur">
          <div role="group" aria-label="Filter by region" className="flex flex-wrap gap-1">
            {(Object.keys(REGION_META) as Region[]).map((r) => {
              const on = regions.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setRegions(on ? regions.filter((x) => x !== r) : [...regions, r])}
                  className={cn('rounded-full border px-2.5 py-1 text-xs font-medium transition-colors', on ? REGION_META[r].badge : 'hover:bg-muted')}
                >
                  <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: REGION_META[r].color }} aria-hidden />
                  {REGION_META[r].label}
                </button>
              );
            })}
          </div>
          <ToggleGroup type="single" value={decade} onValueChange={(v) => v && setDecade(v)} aria-label="Decade" className="ml-auto">
            {DECADES.map((d) => (
              <ToggleGroupItem key={d.id} value={d.id} className="text-xs">
                {d.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <ToggleGroup type="single" value={mode} onValueChange={(v) => v && setMode(v as 'story' | 'compact')} aria-label="View mode">
            <ToggleGroupItem value="story" className="text-xs">Story</ToggleGroupItem>
            <ToggleGroupItem value="compact" className="text-xs">Compact</ToggleGroupItem>
          </ToggleGroup>
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search expeditions…" aria-label="Search within expeditions" className="h-9 pl-8" />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
          <div>
            {isPending ? (
              <div className="space-y-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-56 w-full" />
                ))}
              </div>
            ) : byYear.length === 0 ? (
              <EmptyState icon={<Waves className="h-6 w-6" />} title="No expeditions match" description="Clear a region or decade filter to see the full stream." />
            ) : plain ? (
              <ol className="relative space-y-6 border-l-4 border-polar-ice/40 pl-6">
                {byYear.map(([y, list]) => (
                  <li key={y} id={`year-${y}`} className="scroll-mt-32">
                    <h2 className="mb-2 text-lg font-bold">{y}</h2>
                    <div className="grid gap-3 sm:grid-cols-2">{list.map((e) => <ExpeditionCard key={e.id} e={e} compact />)}</div>
                  </li>
                ))}
              </ol>
            ) : (
              <div>
                {byYear.map(([y, list], i) => (
                  <YearBlock key={y} year={y} list={list} index={i} startIndex={cardOffsets[i]} story={mode === 'story'} animate={!plain} onVisible={setActiveYear} onHover={setHovered} hovered={hovered?.id ?? null} />
                ))}
              </div>
            )}
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-44 space-y-4">
              <nav aria-label="Jump to year" className="rounded-lg border bg-card p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Jump to year</p>
                <ol className="grid grid-cols-3 gap-1">
                  {byYear.map(([y, list]) => (
                    <li key={y}>
                      <a
                        href={`#year-${y}`}
                        aria-current={activeYear === y ? 'true' : undefined}
                        className={cn('flex items-center justify-center gap-1 rounded-md px-2 py-1 text-xs tabular-nums transition-colors hover:bg-muted', activeYear === y && 'bg-primary text-primary-foreground hover:bg-primary')}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: REGION_META[list[0].region].color }} aria-hidden />
                        {y}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
              <div className="rounded-lg border bg-card p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{hovered ? hovered.number : 'Hover an expedition'}</p>
                <MiniMap
                  label={hovered ? `Route of ${hovered.name}` : 'Globe with India’s stations'}
                  center={hovered ? hovered.track[hovered.track.length - 1] : [60, -10]}
                  track={hovered?.track}
                  points={
                    hovered
                      ? [{ lon: hovered.track[hovered.track.length - 1][0], lat: hovered.track[hovered.track.length - 1][1], label: hovered.station ? hovered.station[0].toUpperCase() + hovered.station.slice(1) : 'Survey', color: REGION_META[hovered.region].color }]
                      : STATIONS.map((s) => ({ lon: s.lon, lat: s.lat, label: s.name, color: REGION_META[s.region].color }))
                  }
                />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
