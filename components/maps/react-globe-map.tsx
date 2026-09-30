'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import * as THREE from 'three';
import { AlertTriangle, Loader2, Minus, Plus, RotateCcw } from 'lucide-react';
import type { Geometry } from 'geojson';
import type { MapRendererProps } from '@/components/maps/polar-map-feature';
import type { PolarArc, PolarPoint, PolarTrack } from '@/types/polar-map';
import { POLAR_ARCS, POLAR_POINT_BY_ID, POLAR_POINTS, POLAR_TRACKS } from '@/data/polar-map';
import { getLand } from '@/lib/geo';
import { isPointVisible, POINT_TYPE_META, seaIceFeatures } from '@/lib/polar-map';
import { MapHoverCard } from '@/components/maps/map-point-card';
import { MapLegend } from '@/components/maps/map-legend';
import { Button } from '@/components/ui/button';
import { GlobeSkeleton } from '@/components/skeletons';
import { usePolarMapStore } from '@/store/polar-map';
import { useUiStore } from '@/store/ui';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlobePoint extends PolarPoint { lat: number; lng: number; color: string }
interface GlobeArc extends PolarArc { startLat: number; startLng: number; endLat: number; endLng: number }
interface GlobePath { id: string; kind: 'track' | 'circle'; color: string; stroke: number; dashed: boolean; animate: boolean; points: { lat: number; lng: number }[] }
interface GlobePolygon { kind: 'land' | 'ice'; geometry: Geometry }
interface CircleLabel { id: string; kind: 'circle-label'; text: string; lat: number; lng: number }
type HtmlDatum = (GlobePoint & { kind: 'point' }) | CircleLabel;

type Surface = 'satellite' | 'night' | 'outline';
const SURFACES: { id: Surface; label: string; hint: string }[] = [
  { id: 'satellite', label: 'Satellite', hint: 'NASA Blue Marble daytime imagery with terrain relief' },
  { id: 'night', label: 'Night lights', hint: 'NASA Black Marble city lights at night' },
  { id: 'outline', label: 'Outline', hint: 'Bundled coastline only (lightest)' },
];
const TEXTURES: Record<Exclude<Surface, 'outline'>, string> = {
  satellite: '/images/globe/earth-blue-marble.jpg',
  night: '/images/globe/earth-night.jpg',
};
const BUMP_TEXTURE = '/images/globe/earth-topology.png';

/** Reference circles that explain where the polar regions begin. */
const KEY_CIRCLES = [
  { id: 'equator', label: 'Equator', lat: 0, color: 'rgba(226,232,240,0.75)', dashed: false },
  { id: 'cancer', label: 'Tropic of Cancer', lat: 23.44, color: 'rgba(183,145,58,0.7)', dashed: true },
  { id: 'capricorn', label: 'Tropic of Capricorn', lat: -23.44, color: 'rgba(183,145,58,0.7)', dashed: true },
  { id: 'arctic-circle', label: 'Arctic Circle', lat: 66.56, color: 'rgba(122,163,200,0.95)', dashed: false },
  { id: 'antarctic-circle', label: 'Antarctic Circle', lat: -66.56, color: 'rgba(122,163,200,0.95)', dashed: false },
];

function hasWebGL() {
  try { const canvas = document.createElement('canvas'); return !!(canvas.getContext('webgl2') || canvas.getContext('webgl')); } catch { return false; }
}

function pointColor(point: PolarPoint) {
  if (point.type === 'headquarters') return '#F59E0B';
  if (point.type === 'historic') return '#94A3B8';
  if (point.type === 'field-site') return '#2DD4BF';
  return point.region === 'arctic' ? '#8B5CF6' : '#5BB5E8';
}

const HOME_POV = { lat: -25, lng: 45, altitude: 2.35 };
const FLY = [
  { label: 'Antarctica', lat: -76, lng: 35, altitude: 1.85 },
  { label: 'Arctic', lat: 80, lng: 15, altitude: 1.85 },
  { label: 'Himalaya', lat: 31.5, lng: 78, altitude: 1.7 },
  { label: 'India', lat: 20, lng: 77, altitude: 1.7 },
];

/** Labels that would overlap a close neighbour are drawn to the left of their pin. */
const LEFT_LABEL = new Set<string>(['dakshin-gangotri']);

export function ReactGlobeMap({ selectedId, zoomRequest, onSelect, onEmptyClick }: MapRendererProps) {
  const globe = useRef<GlobeMethods>();
  const wrap = useRef<HTMLDivElement>(null);
  const hoverEl = useRef<HTMLDivElement>(null);
  const markerEls = useRef(new Map<string, HTMLElement>());
  const selectedIdRef = useRef(selectedId);
  const previousPov = useRef<{ lat: number; lng: number; altitude: number } | null>(null);
  const idleTimer = useRef<number | null>(null);
  const textures = useRef(new Map<string, THREE.Texture>());
  const [size, setSize] = useState({ width: 900, height: 560 });
  const [ready, setReady] = useState(false);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [hovered, setHovered] = useState<GlobePoint | null>(null);
  const [interacting, setInteracting] = useState(false);
  const [pov, setPov] = useState({ lat: 0, lng: 0, altitude: 2.5 });
  const [surface, setSurface] = useState<Surface>('satellite');
  const [textureState, setTextureState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [grid, setGrid] = useState(true);
  const [spin, setSpin] = useState(true);
  const year = usePolarMapStore((s) => s.year);
  const layers = usePolarMapStore((s) => s.layers);
  const low = useUiStore((s) => s.lowBandwidth);
  const reduce = useReducedMotion();
  const canHover = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches, []);

  useEffect(() => setWebgl(hasWebGL()), []);
  useEffect(() => {
    const element = wrap.current;
    if (!element) return;
    let timer = 0;
    const measure = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const rect = element.getBoundingClientRect();
        setSize({ width: Math.max(320, Math.round(rect.width)), height: Math.max(520, Math.round(rect.height)) });
      }, 120);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => { observer.disconnect(); window.clearTimeout(timer); };
  }, [webgl]);

  const points = useMemo<GlobePoint[]>(() => POLAR_POINTS.filter((point) => layers.points && isPointVisible(point, year)).map((point) => ({ ...point, lat: point.coordinates.lat, lng: point.coordinates.lng, color: pointColor(point) })), [layers.points, year]);
  const arcs = useMemo<GlobeArc[]>(() => layers.arcs ? POLAR_ARCS.map((arc) => { const a = POLAR_POINT_BY_ID[arc.from].coordinates; const b = POLAR_POINT_BY_ID[arc.to].coordinates; return { ...arc, startLat: a.lat, startLng: a.lng, endLat: b.lat, endLng: b.lng }; }) : [], [layers.arcs]);
  const paths = useMemo<GlobePath[]>(() => {
    const tracks: GlobePath[] = layers.tracks
      ? POLAR_TRACKS.filter((track: PolarTrack) => track.year <= year).map((track) => ({
          id: track.id,
          kind: 'track',
          color: track.color,
          stroke: track.year === year ? 0.6 : 0.35,
          dashed: track.year !== year,
          animate: track.year === year,
          points: track.coordinates.map(([lng, lat]) => ({ lat, lng })),
        }))
      : [];
    const circles: GlobePath[] = grid
      ? KEY_CIRCLES.map((c) => ({ id: c.id, kind: 'circle', color: c.color, stroke: 0.22, dashed: c.dashed, animate: false, points: Array.from({ length: 121 }, (_, i) => ({ lat: c.lat, lng: -180 + i * 3 })) }))
      : [];
    // The ice edge is drawn as its own line: the polygon's closing segments through the pole
    // would otherwise show as a stray stroke from the pole outwards.
    const iceEdges: GlobePath[] = layers.seaIce
      ? seaIceFeatures(year).features.map((feature) => ({
          id: `ice-${feature.properties?.hemisphere}`,
          kind: 'circle',
          color: 'rgba(241,250,255,0.9)',
          stroke: 0.25,
          dashed: true,
          animate: false,
          points: feature.geometry.coordinates[0].filter(([, lat]) => Math.abs(lat) < 89).map(([lng, lat]) => ({ lat, lng })),
        }))
      : [];
    return [...circles, ...iceEdges, ...tracks];
  }, [layers.tracks, layers.seaIce, year, grid]);
  const polygons = useMemo<GlobePolygon[]>(() => {
    const land = surface === 'outline' ? getLand().features.map((feature) => ({ kind: 'land' as const, geometry: feature.geometry })) : [];
    const ice = layers.seaIce ? seaIceFeatures(year).features.map((feature) => ({ kind: 'ice' as const, geometry: feature.geometry })) : [];
    return [...land, ...ice];
  }, [layers.seaIce, year, surface]);
  const htmlData = useMemo<HtmlDatum[]>(() => [
    ...points.map((p) => ({ ...p, kind: 'point' as const })),
    ...(grid ? KEY_CIRCLES.map((c) => ({ id: `label-${c.id}`, kind: 'circle-label' as const, text: c.label, lat: c.lat, lng: -32 })) : []),
  ], [points, grid]);
  const material = useMemo(() => new THREE.MeshPhongMaterial({ color: '#0A3158', shininess: 8, emissive: new THREE.Color('#031426'), emissiveIntensity: 0.32 }), []);

  // Own the globe material: swap NASA textures in and out without remounting the WebGL scene.
  useEffect(() => {
    if (surface === 'outline') {
      material.map = null;
      material.bumpMap = null;
      material.color = new THREE.Color('#0A3158');
      material.emissive = new THREE.Color('#031426');
      material.emissiveIntensity = 0.32;
      material.shininess = 8;
      material.needsUpdate = true;
      setTextureState('idle');
      return;
    }
    let cancelled = false;
    const load = (url: string) => new Promise<THREE.Texture>((resolve, reject) => {
      const cached = textures.current.get(url);
      if (cached) return resolve(cached);
      new THREE.TextureLoader().load(url, (texture) => { texture.colorSpace = THREE.SRGBColorSpace; textures.current.set(url, texture); resolve(texture); }, undefined, reject);
    });
    setTextureState('loading');
    Promise.all([load(TEXTURES[surface]), surface === 'satellite' ? load(BUMP_TEXTURE) : Promise.resolve(null)])
      .then(([map, bump]) => {
        if (cancelled) return;
        material.map = map;
        material.bumpMap = bump;
        material.bumpScale = 6;
        material.color = new THREE.Color('#ffffff');
        material.emissive = new THREE.Color(surface === 'night' ? '#1a1a1a' : '#000000');
        material.emissiveIntensity = surface === 'night' ? 1 : 0;
        material.shininess = surface === 'night' ? 2 : 10;
        material.needsUpdate = true;
        setTextureState('idle');
      })
      .catch(() => { if (!cancelled) { setTextureState('error'); setSurface('outline'); } });
    return () => { cancelled = true; };
  }, [surface, material]);

  // Lift the default ambient light for imagery so oceans and ice read clearly, not murky.
  useEffect(() => {
    if (!ready || !globe.current) return;
    globe.current.lights().forEach((light) => {
      if ((light as THREE.AmbientLight).isAmbientLight) light.intensity = Math.PI * (surface === 'outline' ? 1 : 1.4);
    });
  }, [ready, surface]);

  const fly = useCallback((lat: number, lng: number, altitude = 1.6, ms = 1100) => {
    globe.current?.pointOfView({ lat, lng, altitude }, reduce || low ? 0 : ms);
  }, [reduce, low]);

  const zoomBy = (factor: number) => {
    const current = globe.current?.pointOfView();
    if (!current) return;
    globe.current?.pointOfView({ ...current, altitude: Math.min(5, Math.max(0.3, current.altitude * factor)) }, reduce || low ? 0 : 450);
  };

  useEffect(() => {
    if (!ready) return;
    const point = selectedId ? POLAR_POINT_BY_ID[selectedId] : null;
    if (point) {
      if (!previousPov.current) previousPov.current = globe.current?.pointOfView() ?? null;
      fly(point.coordinates.lat, point.coordinates.lng, 1.45);
    } else if (previousPov.current) {
      globe.current?.pointOfView(previousPov.current, reduce || low ? 0 : 850);
      previousPov.current = null;
    }
  }, [selectedId, zoomRequest, ready, fly, reduce, low, size.width]);

  // Listen once per globe instance. Interaction state must not recreate these listeners between
  // OrbitControls' start/end events, or the end event would be lost.
  useEffect(() => {
    if (!ready || !globe.current) return;
    const controls = globe.current.controls();
    const start = () => { setInteracting(true); if (idleTimer.current) window.clearTimeout(idleTimer.current); };
    const end = () => { idleTimer.current = window.setTimeout(() => setInteracting(false), 5000); };
    controls.addEventListener('start', start);
    controls.addEventListener('end', end);
    return () => { controls.removeEventListener('start', start); controls.removeEventListener('end', end); if (idleTimer.current) window.clearTimeout(idleTimer.current); };
  }, [ready, size.width]);

  // Auto-rotation pauses while interacting or selected, and resumes five seconds after interaction.
  useEffect(() => {
    if (!ready || !globe.current) return;
    const controls = globe.current.controls();
    controls.autoRotate = spin && !reduce && !low && !selectedId && !interacting;
    controls.autoRotateSpeed = 0.35;
  }, [ready, reduce, low, selectedId, interacting, spin, size.width]);

  // Project the hovered point each frame and update only a DOM transform (no React mouse-move renders).
  useEffect(() => {
    if (!hovered || !ready || !canHover) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const loop = () => {
      const api = globe.current;
      const el = hoverEl.current;
      if (api && el) {
        const screen = api.getScreenCoords(hovered.lat, hovered.lng, 0.03);
        const cart = api.getCoords(hovered.lat, hovered.lng, 0.03);
        const camera = api.camera();
        const normal = new THREE.Vector3(cart.x, cart.y, cart.z).normalize();
        const facing = normal.dot(camera.position.clone().normalize()) > 0.08;
        x += (screen.x - x) * 0.24;
        y += (screen.y - y) * 0.24;
        const flip = screen.x > size.width - 300;
        el.style.opacity = facing ? '1' : '0';
        el.style.transform = `translate3d(${Math.round(x)}px,${Math.round(y)}px,0) translate(${flip ? '-105%' : '18px'},-50%)`;
      }
      frame = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(frame);
  }, [hovered, ready, canHover, size.width]);

  /** HTML pins stay legible on any surface (white ice, dark ocean, city lights). */
  const htmlElement = useCallback((d: object) => {
    const datum = d as HtmlDatum;
    // The globe positions `root` by overwriting its transform, so offsets live on an inner node.
    const root = document.createElement('div');
    const inner = document.createElement('div');
    root.append(inner);
    if (datum.kind === 'circle-label') {
      inner.className = 'globe-circle-label';
      inner.textContent = datum.text;
      return root;
    }
    const point = datum as GlobePoint;
    const left = LEFT_LABEL.has(point.id);
    inner.className = `globe-pin${left ? ' globe-pin--left' : ''}`;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `polar-marker polar-marker--${point.type}${point.status === 'active' ? ' polar-marker--active' : ''}${selectedIdRef.current === point.id ? ' polar-marker--selected' : ''}`;
    button.style.setProperty('--marker-color', point.color);
    button.setAttribute('aria-label', `${point.name}, ${POINT_TYPE_META[point.type].label}. Press Enter for details`);
    button.innerHTML = `<span class="polar-marker__symbol" aria-hidden="true">${POINT_TYPE_META[point.type].symbol}</span><span class="polar-marker__label">${point.name.replace(' Station', '')}</span>`;
    button.addEventListener('click', (event) => { event.stopPropagation(); onSelect(point); });
    button.addEventListener('pointerdown', (event) => event.stopPropagation());
    if (canHover) {
      button.addEventListener('mouseenter', () => setHovered(point));
      button.addEventListener('mouseleave', () => setHovered(null));
    }
    button.addEventListener('focus', () => setHovered(point));
    button.addEventListener('blur', () => setHovered(null));
    const stem = document.createElement('span');
    stem.className = 'globe-pin__stem';
    stem.style.background = point.color;
    inner.append(button, stem);
    markerEls.current.set(point.id, button);
    return root;
  }, [canHover, onSelect]);

  // Selection highlight is a class toggle, so the pins are not rebuilt on every click.
  useEffect(() => {
    selectedIdRef.current = selectedId;
    markerEls.current.forEach((el, id) => el.classList.toggle('polar-marker--selected', id === selectedId));
  }, [selectedId, htmlData]);

  useEffect(() => () => { material.dispose(); textures.current.forEach((t) => t.dispose()); }, [material]);

  if (webgl === null) return <GlobeSkeleton className="h-full min-h-[560px] aspect-auto" />;
  if (!webgl || low) return (
    <div className="flex min-h-[560px] items-center justify-center bg-polar-navy p-6 text-white">
      <div className="max-w-md rounded-2xl border border-white/20 bg-white/10 p-6 text-center backdrop-blur">
        <AlertTriangle className="mx-auto h-8 w-8 text-polar-amber" aria-hidden /><h2 className="mt-3 text-lg font-semibold">3D globe unavailable</h2>
        <p className="mt-2 text-sm text-white/75">{low ? 'Low-bandwidth mode disables WebGL and heavy animation.' : 'WebGL is unavailable in this browser.'} The 2D map remains fully available.</p>
        <Button asChild className="mt-4 bg-white text-polar-navy hover:bg-white/90"><Link href="/tools/polar-map/2d">Open the 2D map</Link></Button>
      </div>
    </div>
  );

  const surfaceLabel = SURFACES.find((s) => s.id === surface)?.label ?? '';
  const legendExtra = [
    'Drag to spin the Earth, scroll or pinch to zoom. It turns slowly on its own when idle.',
    'Each label sits on a coloured spike at the exact location; the selected spike rises higher.',
    'Labels on the far side hide automatically. Use “Fly to” or the station strip below to reach them.',
    'Light-blue rings are the Arctic and Antarctic Circles, where the polar regions begin.',
    surface === 'night' ? 'Night lights shows city lights; the polar regions are almost dark because so few people live there.' : 'Dashed arcs from Goa show NCPOR coordinating every station.',
  ];

  return (
    <div ref={wrap} className="relative h-full min-h-[560px] overflow-hidden bg-[#020914]">
      <Globe
        ref={globe}
        width={size.width}
        height={size.height}
        backgroundColor="#020914"
        globeMaterial={material}
        showGlobe
        showGraticules={grid}
        showAtmosphere
        atmosphereColor="#7AA3C8"
        atmosphereAltitude={0.18}
        polygonsData={polygons}
        polygonGeoJsonGeometry={(d) => (d as GlobePolygon).geometry as never}
        polygonCapColor={(d) => (d as GlobePolygon).kind === 'ice' ? 'rgba(219,244,255,0.38)' : '#DCEFF8'}
        polygonSideColor={(d) => (d as GlobePolygon).kind === 'ice' ? 'rgba(219,244,255,0.08)' : 'rgba(92,181,232,0.25)'}
        polygonStrokeColor={(d) => (d as GlobePolygon).kind === 'ice' ? 'rgba(0,0,0,0)' : '#8FCDEC'}
        polygonAltitude={(d) => (d as GlobePolygon).kind === 'ice' ? 0.012 : 0.006}
        polygonsTransitionDuration={0}
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointRadius={(d) => { const p = d as GlobePoint; return p.type === 'headquarters' ? 0.4 : 0.32; }}
        pointAltitude={(d) => selectedId === (d as GlobePoint).id ? 0.12 : 0.05}
        pointResolution={20}
        pointsTransitionDuration={reduce ? 0 : 450}
        onPointHover={(point) => canHover && setHovered((point as GlobePoint | null))}
        onPointClick={(point) => onSelect(point as GlobePoint)}
        htmlElementsData={htmlData}
        htmlLat="lat"
        htmlLng="lng"
        htmlAltitude={(d) => (d as HtmlDatum).kind === 'point' ? (selectedId === (d as GlobePoint).id ? 0.12 : 0.05) : 0.01}
        htmlElement={htmlElement}
        htmlTransitionDuration={reduce ? 0 : 450}
        ringsData={!reduce && layers.points ? points.filter((p) => p.status === 'active') : []}
        ringLat="lat"
        ringLng="lng"
        ringColor={(d: object) => [(d as GlobePoint).color, 'rgba(255,255,255,0)']}
        ringMaxRadius={2.6}
        ringPropagationSpeed={0.7}
        ringRepeatPeriod={1900}
        ringAltitude={0.004}
        arcsData={arcs}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor="color"
        arcAltitudeAutoScale={0.32}
        arcStroke={0.35}
        arcDashLength={0.35}
        arcDashGap={0.12}
        arcDashAnimateTime={reduce ? 0 : 2800}
        arcsTransitionDuration={reduce ? 0 : 500}
        pathsData={paths}
        pathPoints="points"
        pathPointLat="lat"
        pathPointLng="lng"
        pathPointAlt={0.004}
        pathColor="color"
        pathStroke={(d) => (d as GlobePath).stroke}
        pathDashLength={(d) => { const p = d as GlobePath; return p.kind === 'circle' ? (p.dashed ? 0.01 : 1) : p.dashed ? 0.04 : 0.7; }}
        pathDashGap={(d) => { const p = d as GlobePath; return p.kind === 'circle' ? (p.dashed ? 0.008 : 0) : p.dashed ? 0.03 : 0.08; }}
        pathDashAnimateTime={(d) => (reduce || !(d as GlobePath).animate ? 0 : 4500)}
        pathTransitionDuration={0}
        onGlobeReady={() => { setReady(true); globe.current?.pointOfView(HOME_POV, 0); }}
        onGlobeClick={() => onEmptyClick()}
        onZoom={(next) => setPov(next)}
      />

      <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-5.5rem)] flex-col items-start gap-2">
        <div className="pointer-events-auto flex flex-wrap gap-1.5" role="group" aria-label="Fly to region">
          {FLY.map((target) => <Button key={target.label} size="sm" variant="secondary" className="h-8 bg-card/90 text-xs shadow backdrop-blur" onClick={() => fly(target.lat, target.lng, target.altitude)}>Fly to {target.label}</Button>)}
        </div>
        <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-lg border bg-card/95 p-1 shadow-lg backdrop-blur" role="group" aria-label="Globe surface">
          {SURFACES.map((option) => (
            <button key={option.id} type="button" title={option.hint} aria-pressed={surface === option.id} onClick={() => setSurface(option.id)} className={cn('rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', surface === option.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>{option.label}</button>
          ))}
          <span className="mx-0.5 h-4 w-px bg-border" aria-hidden />
          <button type="button" aria-pressed={grid} onClick={() => setGrid((v) => !v)} className={cn('rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', grid ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>Grid</button>
          <button type="button" aria-pressed={spin} disabled={!!reduce} onClick={() => setSpin((v) => !v)} className={cn('rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50', spin && !reduce ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>Auto-rotate</button>
        </div>
        <MapLegend mode="3d" year={year} source={surface === 'outline' ? 'Surface: bundled Natural Earth coastline.' : surface === 'night' ? 'Surface: NASA Black Marble (city lights), public domain.' : 'Surface: NASA Blue Marble with relief shading, public domain.'} extra={legendExtra} />
      </div>

      <div className="absolute right-3 top-16 z-10 flex flex-col overflow-hidden rounded-lg border bg-card shadow-lg">
        <Button variant="ghost" size="icon" className="rounded-none" onClick={() => zoomBy(0.7)} aria-label="Zoom in"><Plus /></Button>
        <Button variant="ghost" size="icon" className="rounded-none border-y" onClick={() => zoomBy(1.4)} aria-label="Zoom out"><Minus /></Button>
        <Button variant="ghost" size="icon" className="rounded-none" onClick={() => { previousPov.current = null; globe.current?.pointOfView(HOME_POV, reduce || low ? 0 : 800); }} aria-label="Reset globe view"><RotateCcw /></Button>
      </div>

      {(textureState === 'loading' || textureState === 'error') && (
        <div role="status" className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-2 rounded-lg border bg-card/95 px-3 py-1.5 text-xs shadow">
          {textureState === 'loading' ? <><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Loading Earth imagery…</> : 'Imagery could not load, showing the outline globe.'}
        </div>
      )}

      <div className="absolute bottom-11 left-1/2 z-10 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 gap-1 overflow-x-auto rounded-lg border border-white/15 bg-polar-navy/80 p-1 shadow backdrop-blur no-scrollbar" role="group" aria-label="Stations on the globe (keyboard alternative)">
        {points.map((point) => (
          <button
            key={point.id}
            type="button"
            className={cn('flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded px-2 text-[11px] font-medium text-white hover:bg-white/15 focus-visible:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70', selectedId === point.id && 'bg-white/20')}
            aria-label={`${point.name}: focus for preview, press Enter for details`}
            onFocus={() => setHovered(point)}
            onBlur={() => setHovered(null)}
            onClick={() => onSelect(point)}
          >
            <span style={{ color: point.color }} aria-hidden>{POINT_TYPE_META[point.type].symbol}</span>
            {point.name.replace(' Station', '')}
          </button>
        ))}
      </div>
      <div ref={hoverEl} className="pointer-events-none absolute left-0 top-0 z-20 opacity-0 will-change-transform" aria-hidden>{hovered && <MapHoverCard point={hovered} />}</div>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-polar-navy/85 px-2 py-1 font-mono text-[11px] text-white backdrop-blur">View {pov.lat.toFixed(1)}°, {pov.lng.toFixed(1)}° · altitude {pov.altitude.toFixed(2)}</div>
      <div className="pointer-events-none absolute bottom-3 right-3 rounded-lg bg-polar-navy/85 px-2 py-1 text-[11px] text-white backdrop-blur">{surfaceLabel} · {year} · demo data</div>
    </div>
  );
}
