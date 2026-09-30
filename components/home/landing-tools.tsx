'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, BookOpenCheck, Check, Cpu, Layers } from 'lucide-react';
import { ToolIcon } from '@/components/layout/tool-icon';
import { Button } from '@/components/ui/button';
import { TOOLS } from '@/lib/nav';
import { IMAGE_LIBRARY, type ImageId } from '@/lib/images';
import { useUiStore } from '@/store/ui';
import { cn } from '@/lib/utils';

/** Per-tool showcase content. Figures come from the tools themselves (demo models). */
const DETAIL: Record<string, { image: ImageId; lead: string; readouts: [string, string][]; features: string[] }> = {
  'ice-core': {
    image: 'ice-core-scientist',
    lead: 'Drill down through a 3D ice core. Each layer is a snapshot of past climate; deeper means older.',
    readouts: [['3,000 m', 'core depth'], ['~800 kyr', 'of climate'], ['3D', 'rotatable core']],
    features: ['Depth slider with live age and proxy charts', 'Cut-away and exploded views', 'Holocene vs Last Glacial comparison'],
  },
  sounds: {
    image: 'emperor-colony',
    lead: 'Listen to, and mix, the soundscapes of Antarctica and the Arctic, synthesised in your browser.',
    readouts: [['8', 'soundscapes'], ['Mixer', 'layer freely'], ['2', 'visualisers']],
    features: ['Wind, cracking ice, calving, seals and penguins', 'Preset scenes or your own mix', 'Waveform and spectrogram views'],
  },
  satellite: {
    image: 'sea-ice-satellite',
    lead: 'Compare satellite layers for sea ice, ocean temperature, albedo and Himalayan glaciers, month by month.',
    readouts: [['4', 'regions'], ['5', 'data layers'], ['Swipe', 'year vs year']],
    features: ['Animated monthly frames', 'Draw an area for instant statistics', 'Export charts as PNG or CSV'],
  },
  'climate-sandbox': {
    image: 'glacier-calving',
    lead: 'Change the warming path and see which tipping elements stay safe, become at risk, or tip.',
    readouts: [['7', 'tipping elements'], ['3', 'pathways'], ['A / B', 'scenario compare']],
    features: ['Tune peak warming and overshoot', 'Cascade diagram of knock-on effects', 'Challenge mode for classrooms'],
  },
  geospace: {
    image: 'aurora-arc',
    lead: 'A simulated space-weather dashboard: solar wind, the Kp index, storms and the aurora over both poles.',
    readouts: [['Kp 0–9', 'storm gauge'], ['3 s', 'live refresh'], ['2', 'aurora ovals']],
    features: ['Magnetometer chart with 5, 15 or 30 min window', 'Storm alerts and event log', 'What it means for GPS, radio and grids'],
  },
};

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Landing-page showcase for the five scientific tools: an instrument-style index on the left and a
 * large photographic panel for the selected tool on the right, with key readouts and features.
 * Photos keep their natural colour; a neutral shade sits only under the text.
 */
export function LandingTools() {
  const reduce = useReducedMotion();
  const low = useUiStore((s) => s.lowBandwidth);
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const tool = TOOLS[active];
  const d = DETAIL[tool.slug];
  const still = reduce || low;

  const onKey = (e: React.KeyboardEvent, i: number) => {
    const next = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? TOOLS.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const n = (next + TOOLS.length) % TOOLS.length;
    setActive(n);
    tabs.current[n]?.focus();
  };

  return (
    <section aria-labelledby="landing-tools" className="relative border-y bg-muted/30 py-20 md:py-24">
      <div className="container">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-primary">
              <span className="h-px w-8 bg-primary/50" aria-hidden />
              Scientific tools
            </p>
            <h2 id="landing-tools" className="mt-3 text-balance text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl">
              Polar science, <span className="font-script text-[1.15em] font-normal text-primary">hands-on</span>
            </h2>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-muted-foreground">
              Five interactive laboratories built on the archive. Read an ice core layer by layer, listen to the poles, compare
              satellite records, stress-test the climate and follow space weather as it happens.
            </p>
          </div>
          <dl className="grid shrink-0 grid-cols-3 divide-x rounded-xl border bg-card text-center shadow-sm">
            {[
              { v: '5', l: 'tools', icon: Layers },
              { v: '3', l: 'reading levels', icon: BookOpenCheck },
              { v: '0', l: 'installs needed', icon: Cpu },
            ].map((s) => (
              <div key={s.l} className="flex flex-col-reverse px-5 py-3">
                <dt className="text-[11px] text-muted-foreground">{s.l}</dt>
                <dd className="flex items-center justify-center gap-1.5 text-2xl font-semibold tabular-nums">
                  <s.icon className="h-4 w-4 text-primary" aria-hidden /> {s.v}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-12 overflow-hidden rounded-2xl border bg-card shadow-sm lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* Index of tools */}
          <div role="tablist" aria-label="Scientific tools" aria-orientation="vertical" className="flex flex-col divide-y lg:border-r">
            {TOOLS.map((t, i) => {
              const on = i === active;
              return (
                <button
                  key={t.slug}
                  ref={(el) => { tabs.current[i] = el; }}
                  id={`lt-tab-${t.slug}`}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-controls="lt-panel"
                  tabIndex={on ? 0 : -1}
                  onClick={() => setActive(i)}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onKeyDown={(e) => onKey(e, i)}
                  className={cn(
                    'group relative flex flex-1 items-center gap-4 px-5 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:px-6',
                    on ? 'bg-muted/60' : 'hover:bg-muted/30',
                  )}
                >
                  <span className={cn('absolute inset-y-0 left-0 w-[3px] transition-colors', on ? 'bg-primary' : 'bg-transparent')} aria-hidden />
                  <span className={cn('w-7 shrink-0 font-mono text-xs tabular-nums', on ? 'text-primary' : 'text-muted-foreground')}>{pad(i + 1)}</span>
                  <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors', on ? 'border-primary/30 bg-primary text-primary-foreground' : 'bg-background text-primary')}>
                    <ToolIcon name={t.icon} className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold tracking-tight">{t.title}</span>
                    <span className="block truncate text-sm text-muted-foreground">{t.description}</span>
                  </span>
                  <ArrowRight className={cn('h-4 w-4 shrink-0 transition-all', on ? 'translate-x-0 text-primary opacity-100' : '-translate-x-1 opacity-0 group-hover:opacity-60')} aria-hidden />
                </button>
              );
            })}
          </div>

          {/* Selected tool */}
          <div id="lt-panel" role="tabpanel" aria-labelledby={`lt-tab-${tool.slug}`} className="relative isolate min-h-[520px] overflow-hidden bg-neutral-900 text-white">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                key={tool.slug}
                className="absolute inset-0 -z-10"
                initial={still ? false : { opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={still ? undefined : { opacity: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                aria-hidden
              >
                {!low && <img src={IMAGE_LIBRARY[d.image].src} alt="" className="h-full w-full object-cover" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
                <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 to-transparent" />
              </motion.div>
            </AnimatePresence>

            <div className="flex h-full min-h-[520px] flex-col justify-between p-6 md:p-8">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="rounded-full border border-white/25 bg-black/25 px-3 py-1 font-mono tracking-wider backdrop-blur-sm">
                  TOOL {pad(active + 1)} / {pad(TOOLS.length)}
                </span>
                <span className="rounded-full border border-white/25 bg-black/25 px-3 py-1 backdrop-blur-sm">Simulated demo data</span>
              </div>

              <motion.div key={tool.slug} initial={still ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }}>
                <h3 className="text-3xl font-semibold tracking-tight md:text-4xl">{tool.title}</h3>
                <p className="mt-2 max-w-xl leading-7 text-white/85">{d.lead}</p>

                <dl className="mt-6 grid max-w-xl grid-cols-3 gap-2">
                  {d.readouts.map(([v, l]) => (
                    <div key={l} className="flex flex-col-reverse rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 backdrop-blur-md">
                      <dt className="mt-0.5 text-[11px] uppercase tracking-wide text-white/65">{l}</dt>
                      <dd className="text-lg font-semibold tabular-nums leading-tight md:text-xl">{v}</dd>
                    </div>
                  ))}
                </dl>

                <ul className="mt-5 grid max-w-xl gap-1.5 text-sm text-white/85 sm:grid-cols-1">
                  {d.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden /> {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Button asChild size="lg" className="bg-white text-neutral-900 hover:bg-white/90">
                    <Link href={tool.href}>
                      Open {tool.title} <ArrowUpRight />
                    </Link>
                  </Button>
                  <Link href="/tools" className="text-sm font-medium text-white/85 underline-offset-4 hover:text-white hover:underline">
                    All scientific tools
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">Every tool includes a step-by-step guide and a science explainer for Expert, General and Class 8 readers.</p>
      </div>
    </section>
  );
}
