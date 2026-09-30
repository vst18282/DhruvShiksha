'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useReducedMotion } from 'framer-motion';
import { Compass, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import type { PolarPoint, PolarPointId, PolarProjection } from '@/types/polar-map';
import { POLAR_POINT_BY_ID, POLAR_POINTS } from '@/data/polar-map';
import { MapPointCard } from '@/components/maps/map-point-card';
import { AccessiblePointList, LayerMenu, MapModeSwitch, MapTimeline, PointSearch, ProjectionSwitch } from '@/components/maps/map-controls';
import { PageHero, HeroChip } from '@/components/common/page-hero';
import { GlobeSkeleton, MapSkeleton } from '@/components/skeletons';
import { Button } from '@/components/ui/button';
import { usePolarMapStore } from '@/store/polar-map';
import { useUiStore } from '@/store/ui';
import { useHydrated } from '@/store/hydration';
import { projectionForPoint } from '@/lib/polar-map';
import { cn } from '@/lib/utils';

export interface MapRendererProps {
  selectedId: PolarPointId | null;
  zoomRequest: number;
  onSelect: (point: PolarPoint) => void;
  onEmptyClick: () => void;
}

const LeafletMap = dynamic(() => import('./leaflet-polar-map').then((m) => m.LeafletPolarMap), { ssr: false, loading: () => <MapSkeleton className="h-full min-h-[520px] aspect-auto" /> });
const GlobeMap = dynamic(() => import('./react-globe-map').then((m) => m.ReactGlobeMap), { ssr: false, loading: () => <GlobeSkeleton className="h-full min-h-[520px] aspect-auto" /> });

/** Complete shared shell for the two renderer routes. */
export function PolarMapFeature({ mode }: { mode: '2d' | '3d' }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const hydrated = useHydrated();
  const reduce = useReducedMotion();
  const low = useUiStore((s) => s.lowBandwidth);
  const { projection, year, layers, selectedId, setProjection, setYear, setLayer, setSelected, reset } = usePolarMapStore();
  const [playing, setPlaying] = useState(false);
  const [zoomRequest, setZoomRequest] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(62);
  const shell = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; height: number } | null>(null);
  const selected = selectedId ? POLAR_POINT_BY_ID[selectedId] : null;
  const shouldReduce = !!reduce || low;

  // Deep link -> shared store. Invalid ids are ignored; persisted selection survives route switches.
  useEffect(() => {
    if (!hydrated) return;
    const id = params.get('point') as PolarPointId | null;
    if (id && POLAR_POINT_BY_ID[id]) {
      if (mode === '2d') setProjection(projectionForPoint(POLAR_POINT_BY_ID[id]));
      setSelected(id);
    }
  }, [hydrated, mode, params, setProjection, setSelected]);

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === shell.current);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      // Let an open Radix popover (layers/search menu) consume Escape before the point panel.
      if (document.querySelector('[data-radix-popper-content-wrapper] [data-state="open"]')) return;
      closePoint();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // closePoint is stable enough for the current selection and pathname.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, pathname]);

  useEffect(() => {
    if (shouldReduce) setPlaying(false);
  }, [shouldReduce]);

  const writePoint = useCallback((id: PolarPointId | null) => {
    const next = id ? `${pathname}?point=${id}` : pathname;
    router.replace(next, { scroll: false });
  }, [pathname, router]);

  const choosePoint = useCallback((point: PolarPoint) => {
    setSelected(point.id);
    writePoint(point.id);
    setZoomRequest((n) => n + 1);
  }, [setSelected, writePoint]);

  const closePoint = useCallback(() => {
    setSelected(null);
    writePoint(null);
  }, [setSelected, writePoint]);

  const setProjectionSmooth = (next: PolarProjection) => {
    if (next === projection) return;
    setProjection(next);
  };

  const full = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await shell.current?.requestFullscreen();
    } catch {
      // Browser or embed policy can deny fullscreen; the rest of the map remains usable.
    }
  };

  const renderer = mode === '2d' ? <LeafletMap selectedId={selectedId} zoomRequest={zoomRequest} onSelect={choosePoint} onEmptyClick={closePoint} /> : <GlobeMap selectedId={selectedId} zoomRequest={zoomRequest} onSelect={choosePoint} onEmptyClick={closePoint} />;
  const visibleCount = useMemo(() => POLAR_POINTS.filter((p) => p.type === 'historic' || p.type === 'headquarters' || p.established <= year).length, [year]);

  return (
    <div>
      <PageHero
        eyebrow="Interactive atlas · illustrative demo"
        title="Polar map"
        script={mode === '2d' ? '2D' : '3D'}
        description={mode === '2d'
          ? 'Explore India’s polar stations, field sites and demo expedition routes on OpenStreetMap, satellite and terrain basemaps, with true polar views from NASA imagery. A bundled coastline outline keeps working offline.'
          : 'Spin a NASA Blue Marble Earth to see where India works in Antarctica, the Arctic and the Himalaya. The legend on the globe explains every marker, line and ring.'}
        image={mode === '2d' ? 'sea-ice-satellite' : 'earth-ocean'}
        action={<MapModeSwitch mode={mode} />}
        meta={<div className="flex flex-wrap gap-2"><HeroChip>{visibleCount} visible points</HeroChip><HeroChip>{year} timeline</HeroChip><HeroChip>{mode === '2d' ? 'OpenStreetMap · NASA GIBS' : 'NASA Blue Marble imagery'}</HeroChip></div>}
      />

      <div className="container py-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {mode === '2d' && <ProjectionSwitch value={projection} onChange={setProjectionSmooth} />}
          <PointSearch onChoose={(point) => { if (mode === '2d') setProjection(projectionForPoint(point)); choosePoint(point); }} />
          <LayerMenu layers={layers} onChange={setLayer} />
          <Button variant="outline" className="bg-card/95 shadow-sm" onClick={() => { reset(); setPlaying(false); router.replace(pathname, { scroll: false }); }}><RotateCcw /> Reset</Button>
        </div>

        <div ref={shell} className="relative overflow-hidden rounded-2xl bg-background shadow-xl ring-1 ring-border">
          <div className="absolute right-3 top-3 z-[700] flex gap-2">
            <Button size="icon" variant="secondary" className="shadow-md" onClick={full} aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>{fullscreen ? <Minimize2 /> : <Maximize2 />}</Button>
          </div>

          <div className={cn('grid min-h-[560px] transition-[grid-template-columns] duration-500 ease-out motion-reduce:transition-none', selected ? 'lg:grid-cols-[minmax(0,1fr)_390px]' : 'lg:grid-cols-[minmax(0,1fr)_0px]')}>
            <div className="relative min-w-0 overflow-hidden bg-polar-navy">{renderer}</div>
            <aside
              aria-label="Selected map point"
              className={cn(
                'fixed inset-x-0 bottom-0 z-[750] overflow-hidden rounded-t-2xl border-t bg-background shadow-2xl transition-transform duration-300 lg:relative lg:inset-auto lg:z-auto lg:h-full lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none lg:transition-opacity',
                selected ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0 lg:translate-y-0',
              )}
              style={{ height: `min(${sheetHeight}vh, 560px)` }}
            >
              {selected && (
                <>
                  <button
                    type="button"
                    className="absolute inset-x-0 top-0 z-10 h-6 cursor-ns-resize touch-none lg:hidden"
                    aria-label="Resize details sheet"
                    onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { y: e.clientY, height: sheetHeight }; }}
                    onPointerMove={(e) => { if (drag.current) setSheetHeight(Math.max(38, Math.min(82, drag.current.height + ((drag.current.y - e.clientY) / window.innerHeight) * 100))); }}
                    onPointerUp={() => { drag.current = null; }}
                  ><span className="mx-auto mt-2 block h-1 w-12 rounded-full bg-muted-foreground/35" /></button>
                  <MapPointCard point={selected} onClose={closePoint} onZoom={() => setZoomRequest((n) => n + 1)} mobile />
                </>
              )}
            </aside>
          </div>

          <div className="relative z-[760] border-t bg-background p-2">
            <MapTimeline year={year} playing={playing} onYear={setYear} onPlaying={setPlaying} reduceMotion={shouldReduce} />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <p><Compass className="mr-1 inline h-3.5 w-3.5" aria-hidden /> {mode === '2d' ? 'Basemaps: OpenStreetMap contributors, Esri, OpenTopoMap and NASA GIBS (internet needed; Outline works offline)' : 'Globe imagery: NASA Blue Marble / Black Marble'} · points and tracks are approximate demo data.</p>
          <p>{mode === '2d' ? 'Scroll to zoom · drag to pan · use +/− or arrow keys' : 'Drag to rotate · scroll to zoom · select a point for details'}</p>
        </div>
        <div className="mt-4"><AccessiblePointList selected={selectedId} onChoose={(point) => { if (mode === '2d') setProjection(projectionForPoint(point)); choosePoint(point); }} /></div>
      </div>
    </div>
  );
}
