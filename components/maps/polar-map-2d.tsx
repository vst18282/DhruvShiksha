'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { geoDistance, geoGraticule10, geoMercator, geoNaturalEarth1, geoPath, geoStereographic, type GeoProjection } from 'd3-geo';
import type { Feature, Polygon } from 'geojson';
import { Maximize2, Minus, Pause, Play, Plus, RotateCcw, Search } from 'lucide-react';
import type { StationSlug } from '@/types';
import { getBorders, getLand } from '@/lib/geo';
import { STATIONS, NCPOR_HQ } from '@/data/stations';
import { EXPEDITIONS } from '@/data/expeditions';
import { REGION_META } from '@/lib/constants';
import { StationPanel } from './station-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider, Switch } from '@/components/ui/misc';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/misc';
import { Label } from '@/components/ui/label';
import { useUiStore } from '@/store/ui';
import { cn } from '@/lib/utils';

export type MapView = 'south' | 'north' | 'himalaya' | 'world';
type LayerKey = 'stations' | 'tracks' | 'seaice' | 'glaciers' | 'vessels';

const GLACIERS = [
  { name: 'Chhota Shigri (demo)', lon: 77.51, lat: 32.24 },
  { name: 'Batal (demo)', lon: 77.62, lat: 32.34 },
  { name: 'Samudra Tapu (demo)', lon: 77.55, lat: 32.5 },
  { name: 'Sutri Dhaka (demo)', lon: 77.56, lat: 32.39 },
  { name: 'Gangotri (demo)', lon: 79.08, lat: 30.93 },
  { name: 'Zemu (demo)', lon: 88.25, lat: 27.73 },
  { name: 'Siachen (demo)', lon: 77.1, lat: 35.45 },
  { name: 'Pindari (demo)', lon: 80.0, lat: 30.3 },
];

const PLACES = [
  ...STATIONS.map((s) => ({ name: `${s.name} station`, lon: s.lon, lat: s.lat, view: (s.region === 'arctic' ? 'north' : s.region === 'himalaya' ? 'himalaya' : 'south') as MapView })),
  { name: 'NCPOR Goa (HQ)', lon: NCPOR_HQ.lon, lat: NCPOR_HQ.lat, view: 'world' as MapView },
  { name: 'Cape Town', lon: 18.42, lat: -33.92, view: 'world' as MapView },
  { name: 'Mauritius', lon: 57.5, lat: -20.2, view: 'world' as MapView },
  { name: 'Ny-Ålesund, Svalbard', lon: 11.93, lat: 78.92, view: 'north' as MapView },
  { name: 'Chandra basin', lon: 77.5, lat: 32.4, view: 'himalaya' as MapView },
  { name: 'Prydz Bay', lon: 76, lat: -68.5, view: 'south' as MapView },
  { name: 'Schirmacher Oasis', lon: 11.6, lat: -70.75, view: 'south' as MapView },
];

function projectionFor(view: MapView, w: number, h: number): GeoProjection {
  const r = Math.min(w, h) * 0.48;
  switch (view) {
    case 'south':
      return geoStereographic().rotate([0, 90]).clipAngle(38).scale(r / (2 * Math.tan((38 * Math.PI) / 360))).translate([w / 2, h / 2]);
    case 'north':
      return geoStereographic().rotate([0, -90]).clipAngle(38).scale(r / (2 * Math.tan((38 * Math.PI) / 360))).translate([w / 2, h / 2]);
    case 'himalaya':
      return geoMercator().center([80, 31]).scale(w * 3.1).translate([w / 2, h / 2]);
    default:
      return geoNaturalEarth1().fitSize([w, h], { type: 'Sphere' });
  }
}

/** Demo sea-ice edge polygon (shrinks with year for the Arctic, fluctuates for Antarctica). */
function seaIcePolygon(view: MapView, year: number): Feature<Polygon> | null {
  if (view !== 'south' && view !== 'north') return null;
  const t = year - 2008;
  const pts: [number, number][] = [];
  for (let lon = -180; lon <= 180; lon += 5) {
    const wob = Math.sin((lon * 3 * Math.PI) / 180) * 2.2 + Math.cos((lon * 5 * Math.PI) / 180) * 1.1;
    const lat = view === 'south' ? -61 - (t > 14 ? 1.8 : 0) + Math.sin(t) * 0.6 + wob : 74 + t * 0.12 + wob * 0.8;
    pts.push([lon, lat]);
  }
  const pole = view === 'south' ? -89.9 : 89.9;
  const ring: [number, number][] = view === 'south' ? [...pts, [180, pole], [-180, pole], pts[0]] : [...pts.slice().reverse(), [-180, pole], [180, pole], pts[pts.length - 1]];
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } };
}

export function PolarMap2D({ initialView = 'south', compact }: { initialView?: MapView; compact?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const svgWrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(720);
  const [view, setView] = useState<MapView>(initialView);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({ stations: true, tracks: true, seaice: true, glaciers: true, vessels: true });
  const [year, setYear] = useState(2025);
  const [playing, setPlaying] = useState(false);
  const [k, setK] = useState(1);
  const [t, setT] = useState<[number, number]>([0, 0]);
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [selected, setSelected] = useState<StationSlug | null>(null);
  const [q, setQ] = useState('');
  const drag = useRef<{ x: number; y: number; t: [number, number] } | null>(null);
  const low = useUiStore((s) => s.lowBandwidth);
  const h = Math.round(Math.min(640, w * 0.72));

  useEffect(() => {
    const el = svgWrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(300, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const proj = useMemo(() => projectionFor(view, w, h), [view, w, h]);
  const path = useMemo(() => geoPath(proj), [proj]);
  const land = useMemo(() => path(getLand()) ?? '', [path]);
  const borders = useMemo(() => path(getBorders()) ?? '', [path]);
  const grat = useMemo(() => path(geoGraticule10()) ?? '', [path]);
  const sphere = useMemo(() => path({ type: 'Sphere' }) ?? '', [path]);
  const ice = useMemo(() => {
    const p = seaIcePolygon(view, year);
    return p ? path(p) ?? '' : '';
  }, [path, view, year]);

  const exps = EXPEDITIONS.filter((e) => e.year <= year);
  const vessels = EXPEDITIONS.filter((e) => e.year === year && e.vessel);
  const project = (lon: number, lat: number) => {
    if (view === 'south' && lat > -30) return null;
    if (view === 'north' && lat < 45) return null;
    return proj([lon, lat]);
  };

  // Play through years.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setYear((y) => (y >= 2025 ? (setPlaying(false), 2025) : y + 1)), 900);
    return () => clearInterval(id);
  }, [playing]);

  // Non-passive wheel zoom.
  useEffect(() => {
    const el = svgWrap.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setK((k0) => {
        const k1 = Math.min(8, Math.max(1, k0 * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
        setT(([tx, ty]) => [mx - ((mx - tx) * k1) / k0, my - ((my - ty) * k1) / k0]);
        return k1;
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const zoomBy = useCallback((f: number) => {
    setK((k0) => {
      const k1 = Math.min(8, Math.max(1, k0 * f));
      setT(([tx, ty]) => [w / 2 - ((w / 2 - tx) * k1) / k0, h / 2 - ((h / 2 - ty) * k1) / k0]);
      return k1;
    });
  }, [w, h]);
  const reset = () => {
    setK(1);
    setT([0, 0]);
  };
  const goTo = (p: (typeof PLACES)[number]) => {
    setView(p.view);
    const pr = projectionFor(p.view, w, h)([p.lon, p.lat]);
    if (!pr) return;
    const k1 = p.view === 'world' ? 2.5 : 2.2;
    setK(k1);
    setT([w / 2 - pr[0] * k1, h / 2 - pr[1] * k1]);
    setQ('');
    const st = STATIONS.find((s) => p.name.startsWith(s.name));
    if (st) setSelected(st.slug);
  };

  const scaleKm = useMemo(() => {
    const a = proj.invert?.([(w / 2 - t[0]) / k, (h / 2 - t[1]) / k]);
    const b = proj.invert?.([(w / 2 + 100 - t[0]) / k, (h / 2 - t[1]) / k]);
    if (!a || !b || isNaN(a[0]) || isNaN(b[0])) return null;
    return Math.round((geoDistance(a, b) * 6371) / 10) * 10;
  }, [proj, w, h, t, k]);

  const matches = q.trim() ? PLACES.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];
  const toggle = (l: LayerKey) => setLayers((s) => ({ ...s, [l]: !s[l] }));

  return (
    <div ref={wrap} className={cn('grid gap-4 bg-background', !compact && 'lg:grid-cols-[minmax(0,1fr)_280px]')}>
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup type="single" value={view} onValueChange={(v) => { if (v) { setView(v as MapView); reset(); } }} aria-label="Projection">
            <ToggleGroupItem value="south">South Polar</ToggleGroupItem>
            <ToggleGroupItem value="north">North Polar</ToggleGroupItem>
            <ToggleGroupItem value="himalaya">Third Pole</ToggleGroupItem>
            <ToggleGroupItem value="world">World</ToggleGroupItem>
          </ToggleGroup>
          <div className="relative ml-auto w-full sm:w-60">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a place or station…" aria-label="Search a place or station" className="h-9 pl-8" />
            {matches.length > 0 && (
              <ul className="absolute left-0 right-0 top-full z-20 mt-1 rounded-md border bg-popover p-1 shadow-md">
                {matches.map((m) => (
                  <li key={m.name}><button type="button" onClick={() => goTo(m)} className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted">{m.name}</button></li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div
          ref={svgWrap}
          tabIndex={0}
          role="application"
          aria-label={`Interactive ${view} map. Use arrow keys to pan and plus/minus to zoom. A table of points is available below.`}
          onKeyDown={(e) => {
            const step = 40;
            if (e.key === 'ArrowLeft') setT(([x, y]) => [x + step, y]);
            else if (e.key === 'ArrowRight') setT(([x, y]) => [x - step, y]);
            else if (e.key === 'ArrowUp') setT(([x, y]) => [x, y + step]);
            else if (e.key === 'ArrowDown') setT(([x, y]) => [x, y - step]);
            else if (e.key === '+' || e.key === '=') zoomBy(1.3);
            else if (e.key === '-') zoomBy(1 / 1.3);
            else return;
            e.preventDefault();
          }}
          onPointerDown={(e) => {
            (e.target as Element).setPointerCapture?.(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, t };
          }}
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ll = proj.invert?.([(e.clientX - rect.left - t[0]) / k, (e.clientY - rect.top - t[1]) / k]);
            setCoords(ll && !isNaN(ll[0]) ? [ll[0], ll[1]] : null);
            if (drag.current) setT([drag.current.t[0] + e.clientX - drag.current.x, drag.current.t[1] + e.clientY - drag.current.y]);
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerLeave={() => { drag.current = null; setCoords(null); }}
          className="relative cursor-grab touch-none overflow-hidden rounded-lg border bg-[#0B1F3A] active:cursor-grabbing"
          style={{ height: h }}
        >
          <svg width={w} height={h} className="block select-none" aria-hidden>
            <defs>
              <radialGradient id="ocean2d" cx="50%" cy="50%" r="60%">
                <stop offset="0" stopColor="#1d4f82" />
                <stop offset="1" stopColor="#0B1F3A" />
              </radialGradient>
            </defs>
            <g transform={`translate(${t[0]} ${t[1]}) scale(${k})`}>
              <path d={sphere} fill="url(#ocean2d)" />
              <path d={grat} fill="none" stroke="#5BB5E8" strokeOpacity={0.15} vectorEffect="non-scaling-stroke" />
              {layers.seaice && ice && <path d={ice} fill="#e8f4fd" fillOpacity={0.45} stroke="#bfe3fb" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" fillRule="evenodd" />}
              <path d={land} fill="#dbeaf6" stroke="#9fc3e0" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
              <path d={borders} fill="none" stroke="#9fb7cc" strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
              {layers.tracks &&
                exps.map((e) => {
                  const d = path({ type: 'LineString', coordinates: e.track }) ?? '';
                  return <path key={e.id} d={d} fill="none" stroke={REGION_META[e.region].color} strokeWidth={e.year === year ? 2.5 : 1.2} strokeOpacity={e.year === year ? 0.95 : 0.35} strokeDasharray={e.year === year ? undefined : '3 3'} vectorEffect="non-scaling-stroke" />;
                })}
              {layers.glaciers &&
                GLACIERS.map((g) => {
                  const p = project(g.lon, g.lat);
                  return p ? <polygon key={g.name} points={`${p[0]},${p[1] - 4 / k} ${p[0] + 3.5 / k},${p[1] + 3 / k} ${p[0] - 3.5 / k},${p[1] + 3 / k}`} fill="#5BB5E8" stroke="#fff" strokeWidth={0.8 / k} /> : null;
                })}
              {layers.vessels &&
                vessels.map((e) => {
                  const mid = e.track[Math.floor(e.track.length / 2)];
                  const p = project(mid[0], mid[1]);
                  return p ? (
                    <g key={e.id} transform={`translate(${p[0]} ${p[1]}) scale(${1 / k})`}>
                      <path d="M-8 0 h16 l-3 5 h-10 Z" fill="#ef4444" stroke="#fff" strokeWidth="1" />
                      <rect x="-3" y="-5" width="6" height="5" fill="#fff" />
                    </g>
                  ) : null;
                })}
              {layers.stations && (() => {
                const hq = project(NCPOR_HQ.lon, NCPOR_HQ.lat);
                return hq ? <circle cx={hq[0]} cy={hq[1]} r={4 / k} fill="#F59E0B" stroke="#fff" strokeWidth={1.2 / k} /> : null;
              })()}
            </g>
          </svg>
          {/* HTML pins for accessibility (focusable buttons) */}
          {layers.stations &&
            STATIONS.filter((s) => s.established <= year).map((s) => {
              const p = project(s.lon, s.lat);
              if (!p) return null;
              const x = p[0] * k + t[0];
              const y = p[1] * k + t[1];
              if (x < -20 || y < -20 || x > w + 20 || y > h + 20) return null;
              return (
                <button
                  key={s.slug}
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setSelected(s.slug)}
                  className="group absolute -translate-x-1/2 -translate-y-full focus-visible:outline-none"
                  style={{ left: x, top: y }}
                  aria-label={`${s.name} station — open details`}
                >
                  <span className={cn('flex flex-col items-center', selected === s.slug && 'scale-110')}>
                    <span className="mb-0.5 whitespace-nowrap rounded bg-polar-navy/85 px-1.5 py-0.5 text-[10px] font-semibold text-white group-hover:bg-primary group-focus-visible:ring-2 group-focus-visible:ring-white">{s.name}</span>
                    <svg width="18" height="22" viewBox="0 0 18 22" aria-hidden>
                      <path d="M9 21 C 9 21, 1 12, 1 8 a8 8 0 0 1 16 0 c0 4 -8 13 -8 13z" fill={REGION_META[s.region].color} stroke="#fff" strokeWidth="1.5" />
                      <circle cx="9" cy="8" r="3" fill="#fff" />
                    </svg>
                  </span>
                </button>
              );
            })}
          <div className="absolute right-2 top-2 flex flex-col gap-1">
            <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => zoomBy(1.3)} aria-label="Zoom in"><Plus /></Button>
            <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => zoomBy(1 / 1.3)} aria-label="Zoom out"><Minus /></Button>
            <Button size="icon" variant="secondary" className="h-8 w-8" onClick={reset} aria-label="Reset view"><RotateCcw /></Button>
            <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => wrap.current?.requestFullscreen?.()} aria-label="Fullscreen"><Maximize2 /></Button>
          </div>
          <div className="pointer-events-none absolute bottom-2 left-2 flex items-end gap-3 text-[11px] text-white">
            {scaleKm !== null && (
              <div aria-label={`Scale: 100 pixels is about ${scaleKm} kilometres`}>
                <div className="h-1.5 w-[100px] border-x-2 border-b-2 border-white" />
                <span>~{scaleKm.toLocaleString('en-IN')} km</span>
              </div>
            )}
            <span className="rounded bg-black/40 px-1.5 py-0.5 font-mono">{coords ? `${coords[1].toFixed(2)}°, ${coords[0].toFixed(2)}°` : 'lat, lon'}</span>
          </div>
          <div className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/40 px-2 py-1 text-[11px] text-white">Year {year}</div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
          <Button size="sm" variant="outline" onClick={() => { if (year >= 2025) setYear(2008); setPlaying(!playing); }} aria-label={playing ? 'Pause timeline' : 'Play timeline'}>
            {playing ? <Pause /> : <Play />} {playing ? 'Pause' : 'Play'}
          </Button>
          <div className="min-w-[200px] flex-1">
            <Slider min={2008} max={2025} step={1} value={[year]} onValueChange={(v) => setYear(v[0])} aria-label="Year" />
          </div>
          <span className="w-12 text-sm font-semibold tabular-nums">{year}</span>
        </div>
      </div>

      {!compact && (
        <div className="space-y-4">
          {selected ? (
            <div className="h-[420px]"><StationPanel slug={selected} onClose={() => setSelected(null)} /></div>
          ) : (
            <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Click a station pin to see its expeditions, reports, datasets and photos.</div>
          )}
          <fieldset className="space-y-2 rounded-lg border bg-card p-4">
            <legend className="px-1 text-sm font-semibold">Layers</legend>
            {([['stations', 'Stations & HQ'], ['tracks', 'Expedition tracks'], ['seaice', 'Sea-ice extent (demo)'], ['glaciers', 'Glaciers (Himalaya, demo)'], ['vessels', 'Research vessels']] as [LayerKey, string][]).map(([key, l]) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <Label htmlFor={`l-${key}`} className="font-normal">{l}</Label>
                <Switch id={`l-${key}`} checked={layers[key]} onCheckedChange={() => toggle(key)} />
              </div>
            ))}
          </fieldset>
          <div className="rounded-lg border bg-card p-4 text-xs">
            <p className="mb-2 text-sm font-semibold">Legend</p>
            <ul className="space-y-1.5">
              {Object.entries(REGION_META).map(([r, m]) => <li key={r} className="flex items-center gap-2"><span className="h-1 w-5 rounded" style={{ background: m.color }} aria-hidden />{m.label} track / station</li>)}
              <li className="flex items-center gap-2"><span className="h-3 w-5 rounded-sm border border-dashed border-sky-300 bg-sky-100/60" aria-hidden />Sea-ice extent (demo)</li>
              <li className="flex items-center gap-2"><span className="text-sky-400" aria-hidden>▲</span>Glacier (demo)</li>
              <li className="flex items-center gap-2"><span className="text-red-500" aria-hidden>⛴</span>Research vessel ({year})</li>
              <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-polar-amber" aria-hidden />NCPOR HQ, Goa</li>
            </ul>
            {low && <p className="mt-2 text-muted-foreground">Low-bandwidth mode: static vector map.</p>}
          </div>
        </div>
      )}

      <details className={cn('rounded-lg border bg-card p-4', !compact && 'lg:col-span-2')}>
        <summary className="cursor-pointer text-sm font-semibold">Table of points (accessible alternative)</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Stations, places and glaciers shown on the map</caption>
            <thead className="border-b text-left"><tr><th scope="col" className="py-1 pr-3">Name</th><th scope="col" className="py-1 pr-3">Type</th><th scope="col" className="py-1 pr-3">Latitude</th><th scope="col" className="py-1">Longitude</th></tr></thead>
            <tbody>
              {[...STATIONS.map((s) => ({ n: s.name, t: 'Station', lat: s.lat, lon: s.lon })), { n: 'NCPOR Goa', t: 'Headquarters', lat: NCPOR_HQ.lat, lon: NCPOR_HQ.lon }, ...GLACIERS.map((g) => ({ n: g.name, t: 'Glacier', lat: g.lat, lon: g.lon }))].map((p) => (
                <tr key={p.n} className="border-b last:border-0"><td className="py-1 pr-3">{p.n}</td><td className="py-1 pr-3">{p.t}</td><td className="py-1 pr-3 font-mono">{p.lat.toFixed(2)}</td><td className="py-1 font-mono">{p.lon.toFixed(2)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
