'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { AlertTriangle, Moon, Rotate3d, Sun } from 'lucide-react';
import type { StationSlug } from '@/types';
import { GlobeSkeleton, MapSkeleton } from '@/components/skeletons';
import { StationPanel } from './station-panel';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/misc';
import { useUiStore } from '@/store/ui';
import { STATIONS } from '@/data/stations';

const Globe3D = dynamic(() => import('./globe-3d'), { ssr: false, loading: () => <GlobeSkeleton className="aspect-auto h-full" /> });
const PolarMap2D = dynamic(() => import('./polar-map-2d').then((m) => m.PolarMap2D), { ssr: false, loading: () => <MapSkeleton /> });

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

const FLY: { label: string; lat: number; lon: number }[] = [
  { label: 'Antarctica', lat: -72, lon: 40 },
  { label: 'Arctic', lat: 78, lon: 12 },
  { label: 'Himalaya', lat: 32, lon: 78 },
  { label: 'Goa (HQ)', lat: 15.4, lon: 73.8 },
];

export function GlobeView() {
  const low = useUiStore((s) => s.lowBandwidth);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [night, setNight] = useState(false);
  const [tracks, setTracks] = useState(true);
  const [arcs, setArcs] = useState(true);
  const [fly, setFly] = useState<{ lat: number; lon: number } | null>(null);
  const [selected, setSelected] = useState<StationSlug | null>(null);
  useEffect(() => setWebgl(hasWebGL()), []);

  if (webgl === null) return <GlobeSkeleton className="aspect-[16/10]" />;
  if (low || !webgl) {
    return (
      <div className="space-y-3">
        <p role="status" className="flex items-center gap-2 rounded-md border border-polar-amber/40 bg-polar-amber/10 px-3 py-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-polar-amber" aria-hidden />
          {low ? 'Low-bandwidth mode is on, so the 3D globe is replaced by the 2D map.' : 'WebGL is not available in this browser — showing the 2D map instead.'}
        </p>
        <PolarMap2D initialView="world" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Fly to">
          {FLY.map((f) => (
            <Button key={f.label} size="sm" variant="outline" onClick={() => setFly({ lat: f.lat, lon: f.lon })}>
              Fly to {f.label}
            </Button>
          ))}
        </div>
        <div className="relative h-[min(70vh,620px)] overflow-hidden rounded-lg border bg-polar-navy">
          <Globe3D autoRotate={autoRotate} night={night} showTracks={tracks} showArcs={arcs} fly={fly} onFlown={() => setFly(null)} onSelect={setSelected} />
          <p className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/40 px-2 py-1 text-[11px] text-white">Drag to rotate · scroll to zoom · click a station</p>
        </div>
        <div className="grid gap-2 rounded-lg border bg-card p-3 sm:grid-cols-4">
          <div className="flex items-center justify-between gap-2"><Label htmlFor="g-rot" className="flex items-center gap-1 font-normal"><Rotate3d className="h-4 w-4" aria-hidden /> Auto-rotate</Label><Switch id="g-rot" checked={autoRotate} onCheckedChange={setAutoRotate} /></div>
          <div className="flex items-center justify-between gap-2"><Label htmlFor="g-night" className="flex items-center gap-1 font-normal">{night ? <Moon className="h-4 w-4" aria-hidden /> : <Sun className="h-4 w-4" aria-hidden />} Night</Label><Switch id="g-night" checked={night} onCheckedChange={setNight} /></div>
          <div className="flex items-center justify-between gap-2"><Label htmlFor="g-tr" className="font-normal">Tracks</Label><Switch id="g-tr" checked={tracks} onCheckedChange={setTracks} /></div>
          <div className="flex items-center justify-between gap-2"><Label htmlFor="g-arc" className="font-normal">Arcs from Goa</Label><Switch id="g-arc" checked={arcs} onCheckedChange={setArcs} /></div>
        </div>
        <ul className="flex flex-wrap gap-2" aria-label="Stations (keyboard alternative)">
          {STATIONS.map((s) => (
            <li key={s.slug}><Button size="sm" variant="secondary" onClick={() => { setSelected(s.slug); setFly({ lat: s.lat, lon: s.lon }); }}>{s.name}</Button></li>
          ))}
        </ul>
      </div>
      <div className="h-[460px]">
        {selected ? <StationPanel slug={selected} onClose={() => setSelected(null)} /> : <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Hover a pulsing marker for a tooltip; click it (or a station button) for details.</div>}
      </div>
    </div>
  );
}
