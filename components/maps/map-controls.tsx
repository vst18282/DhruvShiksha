'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Layers3, Pause, Play, Search } from 'lucide-react';
import type { PolarLayer, PolarPoint, PolarPointId, PolarProjection } from '@/types/polar-map';
import { usePolarMapStore, type PolarLayers } from '@/store/polar-map';
import { POLAR_POINTS } from '@/data/polar-map';
import { MAP_VIEWS } from '@/lib/nav';
import { PROJECTION_META, pointSearch } from '@/lib/polar-map';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider, Switch, ToggleGroup, ToggleGroupItem } from '@/components/ui/misc';
import { cn } from '@/lib/utils';

export function MapModeSwitch({ mode }: { mode: '2d' | '3d' }) {
  const selectedId = usePolarMapStore((s) => s.selectedId);
  return (
    <nav aria-label="Map mode" className="inline-flex rounded-xl border bg-card/95 p-1 shadow-sm backdrop-blur">
      {MAP_VIEWS.map((view) => {
        const href = selectedId ? `${view.href}?point=${selectedId}` : view.href;
        return (
          <Link
            key={view.id}
            href={href}
            aria-current={mode === view.id ? 'page' : undefined}
            className={cn('rounded-lg px-4 py-2 text-sm font-medium transition-colors', mode === view.id ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
          >
            {view.title}
          </Link>
        );
      })}
    </nav>
  );
}

export function ProjectionSwitch({ value, onChange }: { value: PolarProjection; onChange: (value: PolarProjection) => void }) {
  return (
    <ToggleGroup type="single" value={value} onValueChange={(v) => v && onChange(v as PolarProjection)} aria-label="Projection" className="no-scrollbar max-w-full justify-start overflow-x-auto rounded-xl border bg-card/95 p-1 shadow-sm backdrop-blur">
      {(Object.entries(PROJECTION_META) as [PolarProjection, (typeof PROJECTION_META)[PolarProjection]][]).map(([id, meta]) => (
        <ToggleGroupItem key={id} value={id} className="whitespace-nowrap px-3 text-xs">{meta.label}</ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function PointSearch({ onChoose }: { onChoose: (point: PolarPoint) => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const results = useMemo(() => pointSearch(query).slice(0, 6), [query]);
  return (
    <div className="relative min-w-0 flex-1 sm:max-w-xs">
      <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        placeholder="Find a station…"
        aria-label="Find a station or field site"
        role="combobox"
        aria-expanded={open && !!query}
        className="bg-card/95 pl-9 shadow-sm backdrop-blur"
      />
      {open && query && (
        <ul role="listbox" className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-xl border bg-popover p-1 shadow-xl">
          {results.map((point) => (
            <li key={point.id} role="option" aria-selected="false">
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChoose(point); setQuery(''); setOpen(false); }} className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-muted">
                <span><span className="block text-sm font-medium">{point.name}</span><span className="block text-xs text-muted-foreground">{point.tagline}</span></span>
                <span className="text-[10px] uppercase text-muted-foreground">{point.type}</span>
              </button>
            </li>
          ))}
          {!results.length && <li className="px-3 py-2 text-sm text-muted-foreground">No matching point</li>}
        </ul>
      )}
    </div>
  );
}

const LAYER_LABELS: Record<PolarLayer, string> = { points: 'Stations & sites', tracks: 'Expedition tracks', seaIce: 'Sea ice (demo)', arcs: 'Arcs from Goa' };
export function LayerMenu({ layers, onChange }: { layers: PolarLayers; onChange: (layer: PolarLayer, visible: boolean) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild><Button variant="outline" className="bg-card/95 shadow-sm backdrop-blur"><Layers3 /> Layers <ChevronDown /></Button></PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <p className="mb-3 text-sm font-semibold">Map layers</p>
        <div className="space-y-3">{(Object.keys(LAYER_LABELS) as PolarLayer[]).map((layer) => <div key={layer} className="flex items-center justify-between gap-3"><Label htmlFor={`map-layer-${layer}`} className="font-normal">{LAYER_LABELS[layer]}</Label><Switch id={`map-layer-${layer}`} checked={layers[layer]} onCheckedChange={(v) => onChange(layer, v)} /></div>)}</div>
        <p className="mt-3 border-t pt-2 text-[10px] text-muted-foreground">Sea ice and tracks are illustrative demo layers.</p>
      </PopoverContent>
    </Popover>
  );
}

export function MapTimeline({ year, playing, onYear, onPlaying, reduceMotion }: { year: number; playing: boolean; onYear: (year: number) => void; onPlaying: (playing: boolean) => void; reduceMotion: boolean }) {
  useEffect(() => {
    if (!playing || reduceMotion) return;
    const timer = window.setInterval(() => onYear(year >= 2025 ? 2008 : year + 1), 900);
    return () => window.clearInterval(timer);
  }, [playing, reduceMotion, year, onYear]);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card/95 px-3 py-2 shadow-sm backdrop-blur">
      <Button size="sm" variant="ghost" onClick={() => onPlaying(!playing)} disabled={reduceMotion} aria-label={playing ? 'Pause map timeline' : 'Play map timeline'}>{playing ? <Pause /> : <Play />}{playing ? 'Pause' : 'Play'}</Button>
      <div className="min-w-44 flex-1"><Slider min={2008} max={2025} step={1} value={[year]} onValueChange={(v) => onYear(v[0])} aria-label="Map year" /></div>
      <output className="w-10 text-sm font-semibold tabular-nums">{year}</output>
      <Badge variant="warning">Demo data</Badge>
    </div>
  );
}

export function AccessiblePointList({ selected, onChoose }: { selected: PolarPointId | null; onChoose: (point: PolarPoint) => void }) {
  return (
    <details className="rounded-xl border bg-card p-4">
      <summary className="cursor-pointer font-semibold">Table of points — accessible map alternative</summary>
      <p className="mt-1 text-xs text-muted-foreground">Choose a row to open the same details shown by a visual marker.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Demo stations, field sites and headquarters shown on the Polar Map</caption>
          <thead><tr className="border-b text-left"><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Type</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Latitude</th><th className="py-2 pr-4">Longitude</th><th className="py-2"><span className="sr-only">Action</span></th></tr></thead>
          <tbody>{POLAR_POINTS.map((point) => <tr key={point.id} className={cn('border-b last:border-0', selected === point.id && 'bg-primary/5')}><th scope="row" className="py-2 pr-4 text-left font-medium">{point.name}</th><td className="py-2 pr-4 capitalize">{point.type.replace('-', ' ')}</td><td className="py-2 pr-4 capitalize">{point.status}</td><td className="py-2 pr-4 font-mono">{point.coordinates.lat.toFixed(2)}</td><td className="py-2 pr-4 font-mono">{point.coordinates.lng.toFixed(2)}</td><td className="py-2"><Button size="sm" variant="ghost" onClick={() => onChoose(point)}>Show</Button></td></tr>)}</tbody>
        </table>
      </div>
    </details>
  );
}
