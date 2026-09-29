'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import * as THREE from 'three';
import { AlertTriangle } from 'lucide-react';
import type { Feature, Geometry } from 'geojson';
import type { MapRendererProps } from '@/components/maps/polar-map-feature';
import type { PolarArc, PolarPoint, PolarTrack } from '@/types/polar-map';
import { POLAR_ARCS, POLAR_POINT_BY_ID, POLAR_POINTS, POLAR_TRACKS } from '@/data/polar-map';
import { getLand } from '@/lib/geo';
import { isPointVisible, POINT_TYPE_META, seaIceFeatures } from '@/lib/polar-map';
import { MapHoverCard } from '@/components/maps/map-point-card';
import { Button } from '@/components/ui/button';
import { GlobeSkeleton } from '@/components/skeletons';
import { usePolarMapStore } from '@/store/polar-map';
import { useUiStore } from '@/store/ui';
import { useReducedMotion } from 'framer-motion';

interface GlobePoint extends PolarPoint { lat: number; lng: number; color: string }
interface GlobeArc extends PolarArc { startLat: number; startLng: number; endLat: number; endLng: number }
interface GlobeTrack extends PolarTrack { points: { lat: number; lng: number }[] }
interface GlobePolygon { kind: 'land' | 'ice'; geometry: Geometry }

function hasWebGL() {
  try { const canvas = document.createElement('canvas'); return !!(canvas.getContext('webgl2') || canvas.getContext('webgl')); } catch { return false; }
}

function pointColor(point: PolarPoint) {
  if (point.type === 'headquarters') return '#F59E0B';
  if (point.type === 'historic') return '#94A3B8';
  if (point.type === 'field-site') return '#2DD4BF';
  return point.region === 'arctic' ? '#8B5CF6' : '#5BB5E8';
}

const FLY = [
  { label: 'Antarctica', lat: -76, lng: 35, altitude: 1.85 },
  { label: 'Arctic', lat: 80, lng: 15, altitude: 1.85 },
  { label: 'Himalaya', lat: 31.5, lng: 78, altitude: 1.7 },
  { label: 'India', lat: 20, lng: 77, altitude: 1.7 },
];

export function ReactGlobeMap({ selectedId, zoomRequest, onSelect, onEmptyClick }: MapRendererProps) {
  const globe = useRef<GlobeMethods>();
  const wrap = useRef<HTMLDivElement>(null);
  const hoverEl = useRef<HTMLDivElement>(null);
  const previousPov = useRef<{ lat: number; lng: number; altitude: number } | null>(null);
  const idleTimer = useRef<number | null>(null);
  const [size, setSize] = useState({ width: 900, height: 560 });
  const [ready, setReady] = useState(false);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [hovered, setHovered] = useState<GlobePoint | null>(null);
  const [interacting, setInteracting] = useState(false);
  const [pov, setPov] = useState({ lat: 0, lng: 0, altitude: 2.5 });
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
  const tracks = useMemo<GlobeTrack[]>(() => layers.tracks ? POLAR_TRACKS.filter((track) => track.year <= year).map((track) => ({ ...track, points: track.coordinates.map(([lng, lat]) => ({ lat, lng })) })) : [], [layers.tracks, year]);
  const polygons = useMemo<GlobePolygon[]>(() => {
    const land = getLand().features.map((feature) => ({ kind: 'land' as const, geometry: feature.geometry }));
    const ice = layers.seaIce ? seaIceFeatures(year).features.map((feature) => ({ kind: 'ice' as const, geometry: feature.geometry })) : [];
    return [...land, ...ice];
  }, [layers.seaIce, year]);
  const material = useMemo(() => new THREE.MeshPhongMaterial({ color: '#0A3158', shininess: 8, emissive: new THREE.Color('#031426'), emissiveIntensity: 0.32 }), []);

  const fly = useCallback((lat: number, lng: number, altitude = 1.6, ms = 1100) => {
    globe.current?.pointOfView({ lat, lng, altitude }, reduce || low ? 0 : ms);
  }, [reduce, low]);

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
    controls.autoRotate = !reduce && !low && !selectedId && !interacting;
    controls.autoRotateSpeed = 0.35;
  }, [ready, reduce, low, selectedId, interacting, size.width]);

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

  useEffect(() => () => material.dispose(), [material]);

  if (webgl === null) return <GlobeSkeleton className="h-full min-h-[560px] aspect-auto" />;
  if (!webgl || low) return (
    <div className="flex min-h-[560px] items-center justify-center bg-polar-navy p-6 text-white">
      <div className="max-w-md rounded-2xl border border-white/20 bg-white/10 p-6 text-center backdrop-blur">
        <AlertTriangle className="mx-auto h-8 w-8 text-polar-amber" aria-hidden /><h2 className="mt-3 text-lg font-semibold">3D globe unavailable</h2>
        <p className="mt-2 text-sm text-white/75">{low ? 'Low-bandwidth mode disables WebGL and heavy animation.' : 'WebGL is unavailable in this browser.'} The offline 2D map remains fully available.</p>
        <Button asChild className="mt-4 bg-white text-polar-navy hover:bg-white/90"><Link href="/tools/polar-map/2d">Open the 2D map</Link></Button>
      </div>
    </div>
  );

  return (
    <div ref={wrap} className="relative h-full min-h-[560px] overflow-hidden bg-[#020914]">
      <Globe
        ref={globe}
        width={size.width}
        height={size.height}
        backgroundColor="#020914"
        globeMaterial={material}
        showGlobe
        showGraticules
        showAtmosphere
        atmosphereColor="#2DD4BF"
        atmosphereAltitude={0.16}
        polygonsData={polygons}
        polygonGeoJsonGeometry={(d) => (d as GlobePolygon).geometry as never}
        polygonCapColor={(d) => (d as GlobePolygon).kind === 'ice' ? 'rgba(219,244,255,0.42)' : '#DCEFF8'}
        polygonSideColor={(d) => (d as GlobePolygon).kind === 'ice' ? 'rgba(219,244,255,0.08)' : 'rgba(92,181,232,0.25)'}
        polygonStrokeColor={(d) => (d as GlobePolygon).kind === 'ice' ? '#DBF4FF' : '#8FCDEC'}
        polygonAltitude={(d) => (d as GlobePolygon).kind === 'ice' ? 0.012 : 0.006}
        polygonsTransitionDuration={0}
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointRadius={(d) => { const p = d as GlobePoint; return p.type === 'headquarters' ? 0.32 : p.type === 'historic' ? 0.24 : p.type === 'field-site' ? 0.28 : 0.22; }}
        pointAltitude={(d) => selectedId === (d as GlobePoint).id ? 0.08 : 0.035}
        pointResolution={20}
        pointsTransitionDuration={reduce ? 0 : 450}
        onPointHover={(point) => canHover && setHovered((point as GlobePoint | null))}
        onPointClick={(point) => onSelect(point as GlobePoint)}
        labelsData={points}
        labelLat="lat"
        labelLng="lng"
        labelText={(d) => `${POINT_TYPE_META[(d as GlobePoint).type].symbol} ${(d as GlobePoint).name}`}
        labelColor={() => '#F5FAFF'}
        labelAltitude={0.055}
        labelSize={0.62}
        labelIncludeDot={false}
        labelResolution={2}
        labelsTransitionDuration={reduce ? 0 : 350}
        onLabelHover={(point) => canHover && setHovered(point as GlobePoint | null)}
        onLabelClick={(point) => onSelect(point as GlobePoint)}
        ringsData={!reduce && layers.points ? points.filter((p) => p.status === 'active') : []}
        ringLat="lat"
        ringLng="lng"
        ringColor={(d: object) => [(d as GlobePoint).color, 'rgba(255,255,255,0)']}
        ringMaxRadius={2.2}
        ringPropagationSpeed={0.7}
        ringRepeatPeriod={1900}
        arcsData={arcs}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor="color"
        arcAltitudeAutoScale={0.32}
        arcStroke={0.25}
        arcDashLength={0.35}
        arcDashGap={0.12}
        arcDashAnimateTime={reduce ? 0 : 2800}
        arcsTransitionDuration={reduce ? 0 : 500}
        pathsData={tracks}
        pathPoints="points"
        pathPointLat="lat"
        pathPointLng="lng"
        pathColor="color"
        pathStroke={0.45}
        pathDashLength={0.7}
        pathDashGap={0.08}
        pathDashAnimateTime={reduce ? 0 : 4500}
        pathTransitionDuration={reduce ? 0 : 500}
        onGlobeReady={() => { setReady(true); globe.current?.pointOfView({ lat: -25, lng: 45, altitude: 2.35 }, 0); }}
        onGlobeClick={() => onEmptyClick()}
        onZoom={(next) => setPov(next)}
      />

      <div className="absolute left-3 top-3 z-10 flex max-w-[calc(100%-6rem)] flex-wrap gap-1.5" role="group" aria-label="Fly to region">
        {FLY.map((target) => <Button key={target.label} size="sm" variant="secondary" className="h-8 bg-card/85 text-xs shadow backdrop-blur" onClick={() => fly(target.lat, target.lng, target.altitude)}>Fly to {target.label}</Button>)}
      </div>
      <div className="absolute left-3 top-14 z-10 flex gap-1 rounded-lg border border-white/15 bg-polar-navy/65 p-1 shadow backdrop-blur" role="group" aria-label="Globe points (keyboard alternative)">
        {points.map((point) => (
          <button
            key={point.id}
            type="button"
            className="grid h-7 w-7 place-items-center rounded text-xs font-bold text-white hover:bg-white/15 focus-visible:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-polar-teal"
            style={{ color: point.color }}
            aria-label={`${point.name}: focus for preview, press Enter for details`}
            onFocus={() => setHovered(point)}
            onBlur={() => setHovered(null)}
            onClick={() => onSelect(point)}
          >
            {POINT_TYPE_META[point.type].symbol}
          </button>
        ))}
      </div>
      <div ref={hoverEl} className="pointer-events-none absolute left-0 top-0 z-20 opacity-0 will-change-transform" aria-hidden>{hovered && <MapHoverCard point={hovered} />}</div>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-polar-navy/80 px-2 py-1 font-mono text-[11px] text-white backdrop-blur">View {pov.lat.toFixed(1)}°, {pov.lng.toFixed(1)}° · altitude {pov.altitude.toFixed(2)}</div>
      <div className="pointer-events-none absolute bottom-3 right-3 rounded-lg bg-polar-navy/80 px-2 py-1 text-[11px] text-white backdrop-blur">Coastlines only · {year} · demo</div>
    </div>
  );
}
