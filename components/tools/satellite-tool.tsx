'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Image as ImageIcon, Pause, Play, Satellite, SquareDashed } from 'lucide-react';
import { toast } from 'sonner';
import { ToolLayout } from './tool-layout';
import { AreaTrend, BarSimple, ChartCard, LineMulti } from '@/components/charts/lazy';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider, Switch } from '@/components/ui/misc';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/skeletons';
import { LAYER_INFO, MONTHS, renderRaster, seaIceSeries, type SatLayer, type SatRegion } from '@/lib/satellite';
import { downloadTextFile, toCsv } from '@/lib/utils';

const SIZE = 300;
const REGIONS: { id: SatRegion; label: string; layers: SatLayer[] }[] = [
  { id: 'antarctica', label: 'Antarctica', layers: ['true_colour', 'sea_ice', 'sst', 'albedo'] },
  { id: 'arctic', label: 'Arctic', layers: ['true_colour', 'sea_ice', 'sst', 'albedo'] },
  { id: 'himalaya', label: 'Himalaya', layers: ['true_colour', 'glacier', 'albedo'] },
  { id: 'southern_ocean', label: 'Southern Ocean', layers: ['true_colour', 'sea_ice', 'sst'] },
];
const FIRST_YEAR = 2015;

function useRaster(region: SatRegion, layer: SatLayer, year: number, month: number) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [vals, setVals] = useState<Float32Array | null>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d')!;
    const img = ctx.createImageData(SIZE, SIZE);
    const r = renderRaster(img, region, layer, year, month);
    ctx.putImageData(img, 0, 0);
    setVals(r.values);
  }, [region, layer, year, month]);
  return { ref, vals };
}

async function svgToPng(container: HTMLElement | null, name: string) {
  const svg = container?.querySelector('svg.recharts-surface');
  if (!svg) return toast.error('Chart not ready yet');
  const xml = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = img.width * 2;
    c.height = img.height * 2;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = `${name}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

export function SatelliteTool() {
  const [region, setRegion] = useState<SatRegion>('antarctica');
  const [layer, setLayer] = useState<SatLayer>('sea_ice');
  const [frame, setFrame] = useState((2025 - FIRST_YEAR) * 12 + 8);
  const [playing, setPlaying] = useState(false);
  const [compare, setCompare] = useState(true);
  const [swipe, setSwipe] = useState(50);
  const [beforeYear, setBeforeYear] = useState(2015);
  const [aoi, setAoi] = useState<{ x: number; y: number; w: number; h: number } | null>({ x: 110, y: 40, w: 90, h: 70 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const chartRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const year = FIRST_YEAR + Math.floor(frame / 12);
  const month = frame % 12;
  const layers = REGIONS.find((r) => r.id === region)!.layers;
  useEffect(() => {
    if (!layers.includes(layer)) setLayer(layers[0]);
  }, [layers, layer]);
  const after = useRaster(region, layer, year, month);
  const before = useRaster(region, layer, beforeYear, month);
  const series = useMemo(() => seaIceSeries(), []);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setFrame((f) => (f >= (2025 - FIRST_YEAR) * 12 + 11 ? 0 : f + 1)), 450);
    return () => clearInterval(t);
  }, [playing]);

  const stats = useMemo(() => {
    const v = after.vals;
    if (!v || !aoi) return null;
    let sum = 0, n = 0, min = Infinity, max = -Infinity;
    for (let y = Math.max(0, aoi.y); y < Math.min(SIZE, aoi.y + aoi.h); y++)
      for (let x = Math.max(0, aoi.x); x < Math.min(SIZE, aoi.x + aoi.w); x++) {
        const val = v[y * SIZE + x];
        if (!isNaN(val)) { sum += val; n++; min = Math.min(min, val); max = Math.max(max, val); }
      }
    return n ? { mean: sum / n, min, max, n } : { mean: NaN, min: NaN, max: NaN, n: 0 };
  }, [after.vals, aoi]);

  const toPx = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: Math.round(((e.clientX - r.left) / r.width) * SIZE), y: Math.round(((e.clientY - r.top) / r.height) * SIZE) };
  };
  const info = LAYER_INFO[layer];
  const fmt = (x: number) => (isNaN(x) ? '—' : layer === 'sea_ice' ? `${x.toFixed(0)}%` : layer === 'sst' ? `${x.toFixed(1)} °C` : x.toFixed(2));

  return (
    <ToolLayout
      title="Satellite & Ice Data"
      intro="Compare demo satellite layers for sea ice, ocean temperature, albedo and Himalayan glaciers — month by month, year by year."
      howTo={[
        'Choose a region and a layer (true colour, sea ice, SST, albedo, glacier extent).',
        'Move the time slider or press Play to animate monthly frames.',
        'Drag the swipe handle to compare with an earlier year.',
        'Drag on the image to draw an area of interest — statistics update instantly.',
        'Download any chart as PNG or its data as CSV.',
      ]}
      science={{
        expert: 'Passive-microwave radiometers (e.g. AMSR2) retrieve sea-ice concentration from brightness temperatures at 18–89 GHz; extent is the area with ≥15% concentration. SST comes from thermal-infrared split-window algorithms; albedo from BRDF-corrected multi-angle reflectances; glacier outlines from band ratios (e.g. NDSI) on optical imagery. All rasters here are procedurally generated from simple formulas on a real land mask.',
        general: 'Satellites circle the Earth every day, measuring how much of the ocean is frozen, how warm the sea is, and how bright the surface is. Comparing the same month in different years shows how sea ice and glaciers are changing.',
        class8: 'Satellites are like cameras in space that take pictures of the poles every day. White means ice, blue means open water. By comparing old and new pictures, scientists can see ice shrinking. (These pictures are made up for learning.)',
      }}
      glossary={['sea-ice-extent', 'passive-microwave', 'albedo', 'sst']}
      related={[{ label: 'Blog: How satellites watch the ice', href: '/blog/blog-satellites-watch-ice' }, { label: 'Dataset: Antarctic sea-ice extent', href: '/data/ds-antarctic-sea-ice-extent' }, { label: 'Dataset: Arctic summer sea ice', href: '/data/ds-arctic-sea-ice' }, { label: 'Dataset: Chandra basin glacier retreat', href: '/data/ds-chandra-glacier' }]}
      aside={
        <>
          <div className="rounded-lg border bg-card p-4 text-sm">
            <p className="mb-2 font-semibold">Image metadata</p>
            <dl className="grid grid-cols-[90px_1fr] gap-1 text-xs">
              <dt className="text-muted-foreground">Layer</dt><dd>{info.label}</dd>
              <dt className="text-muted-foreground">Sensor</dt><dd>{info.sensor}</dd>
              <dt className="text-muted-foreground">Resolution</dt><dd>{info.resolution}</dd>
              <dt className="text-muted-foreground">Date</dt><dd>{MONTHS[month]} {year} (monthly composite, demo)</dd>
              <dt className="text-muted-foreground">Region</dt><dd>{REGIONS.find((r) => r.id === region)?.label}</dd>
            </dl>
          </div>
          <div className="rounded-lg border bg-card p-4 text-sm" aria-live="polite">
            <p className="mb-2 flex items-center gap-1.5 font-semibold"><SquareDashed className="h-4 w-4 text-polar-amber" aria-hidden /> Area of interest</p>
            {stats && stats.n > 0 && info.unit !== '' ? (
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div><dt className="text-muted-foreground">Mean</dt><dd className="text-lg font-semibold">{fmt(stats.mean)}</dd></div>
                <div><dt className="text-muted-foreground">Pixels</dt><dd className="text-lg font-semibold">{stats.n}</dd></div>
                <div><dt className="text-muted-foreground">Min</dt><dd>{fmt(stats.min)}</dd></div>
                <div><dt className="text-muted-foreground">Max</dt><dd>{fmt(stats.max)}</dd></div>
              </dl>
            ) : (
              <p className="text-xs text-muted-foreground">{info.unit === '' && layer === 'true_colour' ? 'Choose a data layer (not true colour) to compute statistics.' : 'Draw a box over valid pixels to compute statistics.'}</p>
            )}
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => setAoi(null)}>Clear box</Button>
          </div>
          <div className="space-y-2 rounded-lg border bg-card p-4">
            <p className="text-sm font-semibold">Data sources (demo)</p>
            {[
              ['Sentinel-1 SAR', 'Ice motion & leads · 40 m'],
              ['MODIS Terra/Aqua', 'True colour, SST, albedo · 250 m–4 km'],
              ['AMSR2', 'Sea-ice concentration · 6.25 km'],
              ['Sentinel-2 / Landsat-8', 'Glacier outlines · 10–30 m'],
            ].map(([t, d]) => (
              <div key={t} className="flex gap-2 rounded-md border p-2 text-xs"><Satellite className="h-4 w-4 shrink-0 text-primary" aria-hidden /><span><strong>{t}</strong><br /><span className="text-muted-foreground">{d} — demo label</span></span></div>
            ))}
          </div>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1"><Label htmlFor="sat-r">Region</Label>
            <Select value={region} onValueChange={(v) => setRegion(v as SatRegion)}><SelectTrigger id="sat-r" className="w-44"><SelectValue /></SelectTrigger><SelectContent>{REGIONS.map((r) => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-1"><Label htmlFor="sat-l">Layer</Label>
            <Select value={layer} onValueChange={(v) => setLayer(v as SatLayer)}><SelectTrigger id="sat-l" className="w-56"><SelectValue /></SelectTrigger><SelectContent>{layers.map((l) => <SelectItem key={l} value={l}>{LAYER_INFO[l].label}</SelectItem>)}</SelectContent></Select>
          </div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={compare} onCheckedChange={setCompare} aria-label="Before/after comparison" /> Before / after</label>
          {compare && (
            <div className="space-y-1"><Label htmlFor="sat-b">Before year</Label>
              <Select value={String(beforeYear)} onValueChange={(v) => setBeforeYear(Number(v))}><SelectTrigger id="sat-b" className="w-28"><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: 11 }, (_, i) => FIRST_YEAR + i).map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select>
            </div>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div
            className="relative mx-auto aspect-square w-full max-w-[560px] cursor-crosshair touch-none overflow-hidden rounded-lg border bg-polar-navy"
            onPointerDown={(e) => { const p = toPx(e); drag.current = p; setAoi({ x: p.x, y: p.y, w: 1, h: 1 }); (e.target as Element).setPointerCapture?.(e.pointerId); }}
            onPointerMove={(e) => { if (!drag.current) return; const p = toPx(e); const s = drag.current; setAoi({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) }); }}
            onPointerUp={() => (drag.current = null)}
            role="img"
            aria-label={`${info.label} for ${REGIONS.find((r) => r.id === region)?.label}, ${MONTHS[month]} ${year}${compare ? `, compared with ${beforeYear}` : ''} (procedural demo image)`}
          >
            <canvas ref={after.ref} width={SIZE} height={SIZE} className="absolute inset-0 h-full w-full" />
            <canvas ref={before.ref} width={SIZE} height={SIZE} className={compare ? 'absolute inset-0 h-full w-full' : 'hidden'} style={{ clipPath: `inset(0 ${100 - swipe}% 0 0)` }} />
            {compare && (
              <>
                <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${swipe}%` }} aria-hidden />
                <span className="pointer-events-none absolute left-2 top-2 rounded bg-black/50 px-1.5 py-0.5 text-[11px] text-white">{MONTHS[month]} {beforeYear}</span>
                <span className="pointer-events-none absolute right-2 top-2 rounded bg-black/50 px-1.5 py-0.5 text-[11px] text-white">{MONTHS[month]} {year}</span>
              </>
            )}
            {aoi && aoi.w > 2 && (
              <div className="pointer-events-none absolute border-2 border-dashed border-polar-amber bg-polar-amber/10" style={{ left: `${(aoi.x / SIZE) * 100}%`, top: `${(aoi.y / SIZE) * 100}%`, width: `${(aoi.w / SIZE) * 100}%`, height: `${(aoi.h / SIZE) * 100}%` }} aria-hidden />
            )}
            {!after.vals && <Skeleton className="absolute inset-0" />}
          </div>
          <div className="flex flex-row items-center gap-2 text-[11px] lg:flex-col" aria-label="Colour scale">
            <div className="h-3 w-40 rounded lg:h-40 lg:w-3" style={{ background: layer === 'sst' ? 'linear-gradient(to top, #0040ff, #ffff00, #ff2000)' : layer === 'sea_ice' ? 'linear-gradient(to top, #14326e, #fafaff)' : layer === 'glacier' ? 'linear-gradient(to top, #7a6e5f, #d9f0ff)' : 'linear-gradient(to top, #1e1e1e, #ffffff)' }} />
            <span>{layer === 'sst' ? '−2 → 30 °C' : layer === 'sea_ice' ? '0 → 100%' : layer === 'glacier' ? 'rock → ice' : layer === 'albedo' ? '0 → 1' : 'true colour'}</span>
          </div>
        </div>
        {compare && (
          <div className="mx-auto max-w-[560px]">
            <Label id="swipe-l" className="text-xs">Swipe: before ← → after</Label>
            <Slider min={0} max={100} step={1} value={[swipe]} onValueChange={(v) => setSwipe(v[0])} aria-labelledby="swipe-l" />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
          <Button size="sm" variant="outline" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause animation' : 'Play monthly frames'}>{playing ? <Pause /> : <Play />} {playing ? 'Pause' : 'Play'}</Button>
          <div className="min-w-[200px] flex-1"><Slider min={0} max={(2025 - FIRST_YEAR) * 12 + 11} step={1} value={[frame]} onValueChange={(v) => setFrame(v[0])} aria-label="Month and year" /></div>
          <span className="w-20 text-sm font-semibold tabular-nums">{MONTHS[month]} {year}</span>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {[
            { id: 'cycle', title: 'Sea-ice extent — annual cycle (million km², demo)', data: series.cycle, csv: series.cycle, el: <LineMulti data={series.cycle} x="month" ys={series.years.flatMap((y, i) => [{ key: `ant${y}`, name: `Antarctic ${y}`, color: ['#93c5fd', '#60a5fa', '#3b82f6', '#1d4ed8'][i] }, { key: `arc${y}`, name: `Arctic ${y}`, color: ['#ddd6fe', '#c4b5fd', '#a78bfa', '#7c3aed'][i], dashed: true }])} label="Monthly sea-ice extent for selected years" height={260} /> },
            { id: 'trend', title: 'Multi-year trend — minimum extent (million km², demo)', data: series.trend, csv: series.trend, el: <LineMulti data={series.trend} x="year" ys={[{ key: 'arcticSep', name: 'Arctic September', color: '#8B5CF6' }, { key: 'antarcticFeb', name: 'Antarctic February', color: '#3B82C4' }]} label="Minimum sea-ice extent by year" height={260} /> },
            { id: 'anomaly', title: 'Arctic September anomaly vs 2004–2025 mean (demo)', data: series.anomaly, csv: series.anomaly, el: <BarSimple data={series.anomaly} x="year" ys={[{ key: 'anomaly', name: 'Anomaly', color: '#ef4444' }]} label="Arctic sea-ice anomaly bars" height={240} /> },
            { id: 'glacier', title: 'Glacier area — demo Chandra basin (km²)', data: series.glacier, csv: series.glacier, el: <AreaTrend data={series.glacier} x="year" ys={[{ key: 'area', name: 'Area', color: '#2DD4BF' }]} label="Glacier area change" height={240} /> },
          ].map((c) => (
            <div key={c.id} ref={(el) => { chartRefs.current[c.id] = el; }}>
              <ChartCard
                title={c.title}
                action={
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={`Download ${c.title} as PNG`} onClick={() => svgToPng(chartRefs.current[c.id], `polarverse-${c.id}`)}><ImageIcon /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={`Download ${c.title} data as CSV`} onClick={() => { downloadTextFile(`polarverse-${c.id}.csv`, toCsv(c.csv), 'text/csv'); toast.success('CSV downloaded'); }}><Download /></Button>
                  </div>
                }
              >
                {c.el}
              </ChartCard>
            </div>
          ))}
        </div>
      </div>
    </ToolLayout>
  );
}
