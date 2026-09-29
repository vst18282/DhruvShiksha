'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { Flag, Layers } from 'lucide-react';
import { ToolLayout } from './tool-layout';
import { ChartSkeleton, GlobeSkeleton } from '@/components/skeletons';
import { Slider, Switch } from '@/components/ui/misc';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CORES, LAYER_COLORS, formatAge, layerMeaning, proxiesAt, proxySeries, slicesAround, type LayerKind, type Slice } from '@/lib/ice-core';
import { useUiStore } from '@/store/ui';
import { cn } from '@/lib/utils';

const Scene = dynamic(() => import('./ice-core-scene'), { ssr: false, loading: () => <GlobeSkeleton className="aspect-auto h-full rounded-none" /> });
const Charts = dynamic(() => import('./ice-core-charts'), { ssr: false, loading: () => <ChartSkeleton height={280} /> });

function depthForAge(core: (typeof CORES)[number], age: number) {
  let lo = 0;
  let hi = core.maxDepth;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (core.ageAt(mid) < age) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** 2D fallback for low bandwidth / no WebGL: stacked layers SVG. */
function CoreSvg({ slices, onPick, selected }: { slices: Slice[]; onPick: (i: number) => void; selected: number | null }) {
  const h = 360 / slices.length;
  return (
    <svg viewBox="0 0 240 380" className="mx-auto h-[380px]" role="group" aria-label="Ice core layers (2D view)">
      {slices.map((s, i) => (
        <g key={i}>
          <rect
            x="70"
            y={10 + i * h}
            width="100"
            height={h - 0.5}
            fill={selected === i ? '#F59E0B' : LAYER_COLORS[s.kind]}
            opacity={s.kind === 'annual' ? s.shade : 1}
            tabIndex={0}
            role="button"
            aria-label={`Layer at ${s.depth.toFixed(1)} metres: ${s.kind}`}
            onClick={() => onPick(i)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onPick(i)}
            className="cursor-pointer focus:outline-none"
          />
          {i % 6 === 0 && <text x="64" y={10 + i * h + h} fontSize="9" textAnchor="end" fill="currentColor">{s.depth.toFixed(0)} m</text>}
          {s.event && <text x="176" y={10 + i * h + h} fontSize="9" fill="#F59E0B">⚑ ash</text>}
        </g>
      ))}
    </svg>
  );
}

export function IceCoreTool() {
  const low = useUiStore((s) => s.lowBandwidth);
  const [webgl, setWebgl] = useState(true);
  useEffect(() => {
    try {
      const c = document.createElement('canvas');
      setWebgl(!!(c.getContext('webgl2') || c.getContext('webgl')));
    } catch {
      setWebgl(false);
    }
  }, []);
  const [coreId, setCoreId] = useState('dome');
  const core = CORES.find((c) => c.id === coreId)!;
  const [depth, setDepth] = useState(400);
  const [visible, setVisible] = useState<Record<LayerKind, boolean>>({ annual: true, dust: true, ash: true, bubbles: true });
  const [cutaway, setCutaway] = useState(false);
  const [explode, setExplode] = useState(false);
  const [compare, setCompare] = useState(false);
  const [sel, setSel] = useState<{ stack: number; index: number } | null>(null);

  useEffect(() => {
    setDepth((d) => Math.min(d, core.maxDepth));
    setSel(null);
    if (core.id !== 'dome') setCompare(false);
  }, [core]);

  const series = useMemo(() => proxySeries(core), [core]);
  const p = proxiesAt(core, depth);
  const stacks = useMemo(() => {
    if (compare && core.id === 'dome') {
      return [
        { label: 'Holocene (~5 ka)', slices: slicesAround(core, depthForAge(core, 5000)) },
        { label: 'Last Glacial (~20 ka)', slices: slicesAround(core, depthForAge(core, 20000)) },
      ];
    }
    return [{ slices: slicesAround(core, depth) }];
  }, [core, depth, compare]);
  const selSlice = sel ? stacks[sel.stack]?.slices[sel.index] : null;
  const selProxy = selSlice ? proxiesAt(core, selSlice.depth) : null;
  const use3d = webgl && !low;

  return (
    <ToolLayout
      title="Ice Core Stratigraphy"
      intro="Drill down through a 3D ice core. Each layer is a snapshot of past climate — deeper means older."
      howTo={[
        'Choose a core from the segment library.',
        'Drag the depth slider — the age readout and proxy charts follow.',
        'Rotate the core with your mouse; click any layer for details.',
        'Toggle layer types, cut-away view and explode view; try “Compare Holocene vs Last Glacial”.',
        'Use the annotations to jump to demo volcanic layers.',
      ]}
      science={{
        expert: 'Snow densifies into firn and then ice at ~50–120 m, trapping air in bubbles that later form clathrates. Stable water isotope ratios (δ18O, δD) record condensation temperature; CO₂ and CH₄ in trapped air track greenhouse forcing; dust flux rises in cold, dry, windy glacials. Age models combine layer counting near the surface with flow modelling and tie-points (volcanic horizons, ¹⁰Be) at depth. All values here come from a simplified demo model.',
        general: 'Every year, snow piles up on the ice sheet and gets squeezed into ice. Scientists drill out a long tube — an ice core — and read it from top to bottom like a history book. Heavier oxygen in the ice means warmer times; bubbles hold old air with its CO₂ and methane; brown dust bands show cold, windy ice ages.',
        class8: 'An ice core is like a giant frozen diary. The top pages are from this year and the bottom pages are super old. Warm times, ice ages and even volcanoes leave clues in the ice! (These numbers are pretend, for learning.)',
      }}
      glossary={['ice-core', 'annual-layer', 'delta-18o', 'palaeoclimate']}
      related={[
        { label: 'Report: Shallow ice core from coastal DML', href: '/reports/rep-ice-core-dml' },
        { label: 'Blog: How old is the ice?', href: '/blog/blog-ice-core-dml' },
        { label: 'Quiz: Ice cores and past climate', href: '/learn/quizzes/quiz-ice-cores' },
      ]}
      aside={
        <>
          <div className="rounded-lg border bg-card p-4">
            <p className="mb-2 text-sm font-semibold">Core segment library</p>
            <div className="space-y-2">
              {CORES.map((c) => (
                <button key={c.id} type="button" onClick={() => setCoreId(c.id)} aria-pressed={coreId === c.id} className={cn('w-full rounded-md border p-2 text-left text-sm', coreId === c.id && 'border-primary bg-primary/5')}>
                  <span className="font-medium">{c.name}</span>
                  <span className="block text-xs text-muted-foreground">{c.site} · {c.maxDepth.toLocaleString('en-IN')} m</span>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4" aria-live="polite">
            <p className="mb-2 text-sm font-semibold">Selected layer</p>
            {selSlice && selProxy ? (
              <div className="space-y-2 text-sm">
                <p><Badge variant="secondary" className="capitalize">{selSlice.kind}</Badge> at <strong>{selSlice.depth.toFixed(1)} m</strong></p>
                <p>Approx. age: <strong>{formatAge(selProxy.age)}</strong></p>
                <p className="text-muted-foreground">{layerMeaning(selSlice.kind)}</p>
                {selSlice.event && <p className="text-polar-amber">⚑ {selSlice.event}</p>}
                <p className="text-xs text-muted-foreground">Sample notes (demo): δ18O {selProxy.d18o}‰ · CO₂ {selProxy.co2} ppm · dust {selProxy.dust} ng/g.</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Click a layer in the core.</p>
            )}
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Flag className="h-4 w-4 text-polar-amber" aria-hidden /> Annotations</p>
            <ul className="space-y-1 text-sm">
              {core.events.map((e) => (
                <li key={e.depth}><button type="button" className="text-left text-primary hover:underline" onClick={() => { setCompare(false); setDepth(e.depth); }}>{e.depth} m — {e.label}</button></li>
              ))}
            </ul>
          </div>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative h-[460px] overflow-hidden rounded-lg border bg-polar-navy">
            {use3d ? (
              <Scene stacks={stacks} cutaway={cutaway} explode={explode} visible={visible} selected={sel} onPick={(s, i) => setSel({ stack: s, index: i })} />
            ) : (
              <div className="flex h-full items-center justify-center bg-card text-foreground">
                <CoreSvg slices={stacks[0].slices} selected={sel?.index ?? null} onPick={(i) => setSel({ stack: 0, index: i })} />
              </div>
            )}
            {!use3d && <p className="absolute left-2 top-2 rounded bg-polar-amber/90 px-2 py-0.5 text-xs text-polar-navy">2D fallback {low ? '(low-bandwidth mode)' : '(no WebGL)'}</p>}
          </div>
          <div className="space-y-3 rounded-lg border bg-card p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Depth</p>
              <p className="text-3xl font-semibold tabular-nums">{Math.round(depth).toLocaleString('en-IN')} m</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Age (demo model)</p>
              <p className="text-2xl font-semibold">{formatAge(p.age)}</p>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div><dt className="text-muted-foreground">δ18O</dt><dd className="font-semibold">{p.d18o}‰</dd></div>
              <div><dt className="text-muted-foreground">CO₂</dt><dd className="font-semibold">{p.co2} ppm</dd></div>
              <div><dt className="text-muted-foreground">CH₄</dt><dd className="font-semibold">{p.ch4} ppb</dd></div>
              <div><dt className="text-muted-foreground">Dust</dt><dd className="font-semibold">{p.dust}</dd></div>
            </dl>
            <fieldset className="space-y-1.5 border-t pt-3">
              <legend className="mb-1 flex items-center gap-1 text-xs font-semibold"><Layers className="h-3.5 w-3.5" aria-hidden /> Layer types</legend>
              {(Object.keys(visible) as LayerKind[]).map((k) => (
                <label key={k} className="flex items-center justify-between gap-2 text-xs capitalize">
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border" style={{ background: LAYER_COLORS[k] }} aria-hidden />{k}</span>
                  <Switch checked={visible[k]} onCheckedChange={(v) => setVisible({ ...visible, [k]: v })} aria-label={`Show ${k} layers`} className="scale-75" />
                </label>
              ))}
            </fieldset>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <Label id="depth-l" className="mb-1 block">Depth: 0 – {core.maxDepth.toLocaleString('en-IN')} m</Label>
          <Slider min={0} max={core.maxDepth} step={core.maxDepth > 1000 ? 5 : 0.5} value={[depth]} onValueChange={(v) => { setDepth(v[0]); setCompare(false); }} aria-labelledby="depth-l" thumbLabels={['Depth in metres']} />
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2"><Switch checked={cutaway} onCheckedChange={setCutaway} aria-label="Cut-away view" /> Cut-away</label>
            <label className="flex items-center gap-2"><Switch checked={explode} onCheckedChange={setExplode} aria-label="Explode view" /> Explode / split</label>
            <Button size="sm" variant={compare ? 'default' : 'outline'} disabled={core.id !== 'dome'} onClick={() => setCompare(!compare)} aria-pressed={compare}>
              Compare Holocene vs Last Glacial
            </Button>
            {core.id !== 'dome' && <span className="text-xs text-muted-foreground">(comparison needs the deep dome core)</span>}
          </div>
        </div>
        <Charts data={series} depth={depth} />
      </div>
    </ToolLayout>
  );
}
