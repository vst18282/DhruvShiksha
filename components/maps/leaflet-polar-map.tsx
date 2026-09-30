'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AttributionControl, GeoJSON, MapContainer, Marker, Polyline, ScaleControl, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L, { type CRS, type LatLngExpression } from 'leaflet';
import 'proj4leaflet';
import { Minus, Plus, RotateCcw, WifiOff, X } from 'lucide-react';
import type { FeatureCollection, Geometry, Polygon } from 'geojson';
import type { MapRendererProps } from '@/components/maps/polar-map-feature';
import type { PolarPoint, PolarProjection } from '@/types/polar-map';
import { POLAR_ARCS, POLAR_POINT_BY_ID, POLAR_POINTS, POLAR_TRACKS } from '@/data/polar-map';
import { getLand } from '@/lib/geo';
import { arcCoordinates, isPointVisible, POINT_TYPE_META, PROJECTION_META, seaIceFeatures } from '@/lib/polar-map';
import { MapHoverCard } from '@/components/maps/map-point-card';
import { MapLegend } from '@/components/maps/map-legend';
import { Button } from '@/components/ui/button';
import { usePolarMapStore } from '@/store/polar-map';
import { useUiStore } from '@/store/ui';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

const SOUTH_DEF = '+proj=stere +lat_0=-90 +lat_ts=-71 +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs';
const NORTH_DEF = '+proj=stere +lat_0=90 +lat_ts=70 +lon_0=-45 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs';

/**
 * NASA GIBS polar tile matrix ("500m" set): 512 px tiles, 8192 m/px at level 0, five levels,
 * origin at the top-left of a ±4,194,304 m square. One extra coarser step (16384 m/px) sits in
 * front so the whole ice sheet fits a phone screen; the tile layer compensates with zoomOffset -1.
 */
const POLAR_RESOLUTIONS = [16384, 8192, 4096, 2048, 1024, 512, 256, 128];
const POLAR_EXTENT = 4194304;

function polarCrs(code: 'EPSG:3031' | 'EPSG:3413', definition: string): CRS {
  return new L.Proj.CRS(code, definition, {
    resolutions: POLAR_RESOLUTIONS,
    origin: [-POLAR_EXTENT, POLAR_EXTENT],
    bounds: L.bounds([-POLAR_EXTENT, -POLAR_EXTENT], [POLAR_EXTENT, POLAR_EXTENT]),
  });
}

const CRS_BY_PROJECTION: Record<PolarProjection, CRS> = {
  south: polarCrs('EPSG:3031', SOUTH_DEF),
  north: polarCrs('EPSG:3413', NORTH_DEF),
  himalaya: L.CRS.EPSG3857,
  world: L.CRS.EPSG3857,
};

const VIEW_SETTINGS: Record<PolarProjection, { center: LatLngExpression; zoom: number; minZoom: number; maxZoom: number }> = {
  south: { center: [-90, 0], zoom: 0.5, minZoom: 0, maxZoom: 7 },
  north: { center: [90, -45], zoom: 1, minZoom: 0, maxZoom: 7 },
  himalaya: { center: [31.4, 78.2], zoom: 5.25, minZoom: 3, maxZoom: 13 },
  world: { center: [13, 35], zoom: 1.5, minZoom: 1, maxZoom: 10 },
};

/** Phones get half a zoom level less so coastal stations (e.g. Bharati) stay on screen. */
function viewFor(projection: PolarProjection) {
  const view = VIEW_SETTINGS[projection];
  const compact = typeof window !== 'undefined' && window.innerWidth < 640;
  return compact ? { ...view, zoom: Math.max(view.minZoom, view.zoom - 0.5) } : view;
}

type GlobalBasemap = 'street' | 'satellite' | 'terrain' | 'outline';
type PolarBasemap = 'imagery' | 'outline';
type Basemap = GlobalBasemap | PolarBasemap;

const GLOBAL_BASEMAPS: Record<Exclude<GlobalBasemap, 'outline'>, { label: string; url: string; attribution: string; maxNativeZoom: number; subdomains?: string }> = {
  street: {
    label: 'Street',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    maxNativeZoom: 19,
  },
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagery &copy; <a href="https://www.esri.com" target="_blank" rel="noreferrer">Esri</a>, Maxar, Earthstar Geographics',
    maxNativeZoom: 18,
  },
  terrain: {
    label: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors, SRTM · style &copy; <a href="https://opentopomap.org" target="_blank" rel="noreferrer">OpenTopoMap</a> (CC-BY-SA)',
    maxNativeZoom: 17,
  },
};

const GIBS_ATTRIBUTION = 'Imagery: <a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noreferrer">NASA GIBS</a> · Blue Marble shaded relief &amp; bathymetry';
const OUTLINE_ATTRIBUTION = 'Coastline: <a href="https://www.naturalearthdata.com" target="_blank" rel="noreferrer">Natural Earth</a> (bundled, offline)';

function gibsUrl(projection: 'south' | 'north') {
  return `https://gibs.earthdata.nasa.gov/wmts/${projection === 'south' ? 'epsg3031' : 'epsg3413'}/best/BlueMarble_ShadedRelief_Bathymetry/default/500m/{z}/{y}/{x}.jpeg`;
}

const BASEMAP_LABEL: Record<Basemap, string> = { street: 'Street', satellite: 'Satellite', terrain: 'Terrain', imagery: 'Satellite', outline: 'Outline' };

function isPolar(projection: PolarProjection): projection is 'south' | 'north' {
  return projection === 'south' || projection === 'north';
}

function pointAllowed(point: PolarPoint, projection: PolarProjection) {
  if (projection === 'south') return point.coordinates.lat < -55;
  if (projection === 'north') return point.coordinates.lat > 58;
  if (projection === 'himalaya') return point.region === 'himalaya' || point.region === 'india';
  return true;
}

/** Points whose label would sit on top of a close neighbour draw their label to the left. */
const LEFT_LABEL = new Set<string>(['dakshin-gangotri']);

function pointIcon(point: PolarPoint, selected: boolean) {
  const color = point.type === 'headquarters' ? '#F59E0B' : point.type === 'historic' ? '#94A3B8' : point.type === 'field-site' ? '#2DD4BF' : point.region === 'arctic' ? '#8B5CF6' : '#5BB5E8';
  const active = point.status === 'active' ? ' polar-marker--active' : '';
  const chosen = selected ? ' polar-marker--selected' : '';
  const left = LEFT_LABEL.has(point.id);
  return L.divIcon({
    className: 'polar-div-icon',
    iconSize: [160, 34],
    // The left-hand label is lifted 12 px so it clears its neighbour's symbol at low zoom.
    iconAnchor: left ? [143, 29] : [17, 17],
    tooltipAnchor: left ? [-150, 0] : [26, 0],
    html: `<span class="polar-marker-wrap${left ? ' polar-marker-wrap--left' : ''}"><span class="polar-marker polar-marker--${point.type}${active}${chosen}" style="--marker-color:${color}"><span class="polar-marker__symbol">${POINT_TYPE_META[point.type].symbol}</span><span class="polar-marker__label">${point.name.replace(' Station', '')}</span></span></span>`,
  });
}

function MapEvents({ onEmptyClick, onCoords }: { onEmptyClick: () => void; onCoords: (coords: string) => void }) {
  useMapEvents({
    click: () => onEmptyClick(),
    mousemove: (e) => onCoords(`${e.latlng.lat.toFixed(2)}°, ${e.latlng.lng.toFixed(2)}°`),
    mouseout: () => onCoords('Move over the map'),
  });
  return null;
}

function ResizeSync() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false, debounceMoveend: true }));
    observer.observe(el);
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function CameraSync({ selectedId, zoomRequest, projection }: { selectedId: MapRendererProps['selectedId']; zoomRequest: number; projection: PolarProjection }) {
  const map = useMap();
  const previous = useRef<{ center: L.LatLng; zoom: number } | null>(null);
  const last = useRef<MapRendererProps['selectedId']>(null);
  const reduce = useReducedMotion();
  const low = useUiStore((s) => s.lowBandwidth);

  useEffect(() => {
    const point = selectedId ? POLAR_POINT_BY_ID[selectedId] : null;
    if (point && pointAllowed(point, projection)) {
      if (!last.current) previous.current = { center: map.getCenter(), zoom: map.getZoom() };
      const zoom = projection === 'world' ? 4 : projection === 'himalaya' ? 8 : 3.5;
      map.flyTo([point.coordinates.lat, point.coordinates.lng], zoom, { animate: !reduce && !low, duration: 1.15, easeLinearity: 0.2 });
      window.setTimeout(() => {
        if (window.innerWidth >= 1024) map.panBy([-150, 0], { animate: !reduce && !low, duration: 0.45 });
      }, reduce || low ? 0 : 800);
    } else if (!point && last.current && previous.current) {
      map.flyTo(previous.current.center, previous.current.zoom, { animate: !reduce && !low, duration: 0.8 });
      previous.current = null;
    }
    last.current = selectedId;
  }, [map, selectedId, projection, zoomRequest, reduce, low]);
  return null;
}

function MapButtons({ projection }: { projection: PolarProjection }) {
  const map = useMap();
  const reset = () => { const v = viewFor(projection); map.flyTo(v.center, v.zoom, { duration: 0.7 }); };
  return (
    <div className="absolute right-3 top-16 z-[600] flex flex-col overflow-hidden rounded-lg border bg-card shadow-lg">
      <Button variant="ghost" size="icon" className="rounded-none" onClick={() => map.zoomIn(0.5)} aria-label="Zoom in"><Plus /></Button>
      <Button variant="ghost" size="icon" className="rounded-none border-y" onClick={() => map.zoomOut(0.5)} aria-label="Zoom out"><Minus /></Button>
      <Button variant="ghost" size="icon" className="rounded-none" onClick={reset} aria-label="Reset map view"><RotateCcw /></Button>
    </div>
  );
}

/** Latitude rings / meridians drawn as vectors so they line up in every projection, tiles or not. */
function Graticule({ projection, dark }: { projection: PolarProjection; dark: boolean }) {
  const { lines, labels } = useMemo(() => {
    const lines: [number, number][][] = [];
    const labels: { at: [number, number]; text: string }[] = [];
    const lngRange = (step: number) => Array.from({ length: Math.round(360 / step) + 1 }, (_, i) => -180 + i * step);
    if (isPolar(projection)) {
      const sign = projection === 'south' ? -1 : 1;
      const labelLng = projection === 'south' ? -135 : 135;
      [50, 60, 70, 80].forEach((abs) => {
        const lat = sign * abs;
        lines.push(lngRange(2).map((lng) => [lat, lng]));
        labels.push({ at: [lat, labelLng], text: `${abs}°${sign < 0 ? 'S' : 'N'}` });
      });
      for (let lng = -180; lng < 180; lng += 30) lines.push([[sign * 89.99, lng], [sign * 45, lng]]);
      [0, 90, 180, -90].forEach((lng) => labels.push({ at: [sign * 47, lng], text: lng === 0 ? '0°' : lng === 180 ? '180°' : `${Math.abs(lng)}°${lng > 0 ? 'E' : 'W'}` }));
    } else {
      const step = projection === 'himalaya' ? 5 : 30;
      for (let lat = -60; lat <= 80; lat += projection === 'himalaya' ? 5 : 20) lines.push(lngRange(step).map((lng) => [lat, lng]));
      for (let lng = -180; lng <= 180; lng += step) lines.push([[-80, lng], [84, lng]]);
    }
    return { lines, labels };
  }, [projection]);
  const color = dark ? '#E2E8F0' : '#334155';
  return (
    <>
      {lines.map((line, i) => <Polyline key={i} positions={line} interactive={false} pathOptions={{ color, weight: 0.8, opacity: dark ? 0.45 : 0.35, dashArray: '2 5' }} />)}
      {labels.map((label) => (
        <Marker key={label.text} position={label.at} interactive={false} keyboard={false} icon={L.divIcon({ className: 'polar-grid-label', iconSize: [44, 16], iconAnchor: [22, 8], html: `<span>${label.text}</span>` })} />
      ))}
    </>
  );
}

function BasemapSwitch({ options, value, onChange, grid, onGrid }: { options: Basemap[]; value: Basemap; onChange: (b: Basemap) => void; grid: boolean; onGrid: (v: boolean) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-card/95 p-1 shadow-lg backdrop-blur" role="group" aria-label="Basemap">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={cn('rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', value === option ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
        >
          {BASEMAP_LABEL[option]}
        </button>
      ))}
      <span className="mx-0.5 h-4 w-px bg-border" aria-hidden />
      <button type="button" aria-pressed={grid} onClick={() => onGrid(!grid)} className={cn('rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', grid ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
        Grid
      </button>
    </div>
  );
}

function LeafletScene({ projection, selectedId, zoomRequest, onSelect, onEmptyClick }: MapRendererProps & { projection: PolarProjection }) {
  const year = usePolarMapStore((s) => s.year);
  const layers = usePolarMapStore((s) => s.layers);
  const low = useUiStore((s) => s.lowBandwidth);
  const [coords, setCoords] = useState('Move over the map');
  // Low-bandwidth mode starts on the bundled coastline; tiles stay one click away.
  const [globalBase, setGlobalBase] = useState<GlobalBasemap>(low ? 'outline' : 'street');
  const [polarBase, setPolarBase] = useState<PolarBasemap>(low ? 'outline' : 'imagery');
  const [grid, setGrid] = useState(true);
  const [tileNotice, setTileNotice] = useState<string | null>(null);
  const tileStats = useRef({ loaded: 0, failed: 0 });
  const hoverCapable = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches, []);
  const coast = useMemo(() => getLand() as FeatureCollection<Geometry>, []);
  const ice = useMemo(() => {
    const all = seaIceFeatures(year);
    if (projection === 'south') return { ...all, features: all.features.filter((f) => f.properties?.hemisphere === 'south') };
    if (projection === 'north') return { ...all, features: all.features.filter((f) => f.properties?.hemisphere === 'north') };
    return all;
  }, [projection, year]);
  const points = POLAR_POINTS.filter((p) => isPointVisible(p, year) && pointAllowed(p, projection));
  const tracks = POLAR_TRACKS.filter((track) => track.year <= year);
  const view = viewFor(projection);
  const polar = isPolar(projection);
  const basemap: Basemap = polar ? polarBase : globalBase;
  const options: Basemap[] = polar ? ['imagery', 'outline'] : ['street', 'satellite', 'terrain', 'outline'];
  const darkBase = basemap !== 'street' && basemap !== 'terrain';

  useEffect(() => { tileStats.current = { loaded: 0, failed: 0 }; }, [basemap, projection]);

  const chooseBasemap = (next: Basemap) => {
    setTileNotice(null);
    if (polar) setPolarBase(next as PolarBasemap);
    else setGlobalBase(next as GlobalBasemap);
  };

  // If a tile server is unreachable (offline, blocked network), fall back to the bundled coastline.
  const tileEvents = {
    tileload: () => { tileStats.current.loaded += 1; },
    tileerror: () => {
      tileStats.current.failed += 1;
      if (tileStats.current.failed >= 4 && tileStats.current.loaded === 0) {
        setTileNotice(`${BASEMAP_LABEL[basemap]} tiles could not be reached, so the bundled offline coastline is shown instead.`);
        if (polar) setPolarBase('outline');
        else setGlobalBase('outline');
      }
    },
  };

  const globalTiles = !polar && basemap !== 'outline' ? GLOBAL_BASEMAPS[basemap as Exclude<GlobalBasemap, 'outline'>] : null;
  const attribution = basemap === 'outline' ? OUTLINE_ATTRIBUTION : polar ? GIBS_ATTRIBUTION : globalTiles?.attribution ?? '';
  const sourceText = basemap === 'outline'
    ? 'Basemap: bundled Natural Earth coastline (works offline).'
    : polar
      ? 'Basemap: NASA GIBS Blue Marble in polar stereographic projection.'
      : basemap === 'street' ? 'Basemap: OpenStreetMap.' : basemap === 'satellite' ? 'Basemap: Esri World Imagery.' : 'Basemap: OpenTopoMap (contours & relief).';
  const legendExtra = polar
    ? [
        `This is a polar view: the ${projection === 'south' ? 'South' : 'North'} Pole is at the centre and lines of longitude radiate outwards like spokes.`,
        'Dotted rings mark 50°–80° latitude; distance from the centre equals distance from the pole.',
        projection === 'south' ? 'White is the Antarctic ice sheet; blue shading is ocean depth.' : 'Svalbard (Himadri) sits north of Norway; Greenland is to the left.',
      ]
    : projection === 'himalaya'
      ? ['Switch to Terrain to see contour lines and valleys around the Chandra basin.', 'Dotted grid lines are every 5° of latitude and longitude.']
      : ['Dashed arcs show NCPOR Goa coordinating each station.', 'Use the projection buttons above for true polar views without stretching.'];

  return (
    <div className="relative h-full min-h-[560px] animate-in fade-in duration-300">
      <MapContainer
        key={projection}
        crs={CRS_BY_PROJECTION[projection]}
        center={view.center}
        zoom={view.zoom}
        minZoom={view.minZoom}
        maxZoom={view.maxZoom}
        zoomSnap={0.25}
        zoomDelta={0.5}
        wheelPxPerZoomLevel={90}
        wheelDebounceTime={30}
        inertia
        inertiaDeceleration={2600}
        easeLinearity={0.2}
        zoomControl={false}
        attributionControl={false}
        className="polar-leaflet h-full min-h-[560px] w-full outline-none"
        // Inline so it wins over leaflet.css. Polar imagery covers a square, so the surround matches
        // the deep-ocean tone at the GIBS tile edge instead of Leaflet's grey.
        style={{ background: darkBase ? (polar && basemap === 'imagery' ? 'radial-gradient(circle at 50% 50%, #0d2a4d 0%, #0a1f3a 60%, #071629 100%)' : '#08213d') : '#dfe7ee' }}
      >
        <AttributionControl position="bottomright" prefix='<a href="https://leafletjs.com" target="_blank" rel="noreferrer">Leaflet</a>' />
        <ScaleControl position="bottomleft" imperial={false} maxWidth={120} />
        <ResizeSync />
        <MapEvents onEmptyClick={onEmptyClick} onCoords={setCoords} />
        <CameraSync selectedId={selectedId} zoomRequest={zoomRequest} projection={projection} />
        <MapButtons projection={projection} />

        {globalTiles && (
          <TileLayer
            key={`${projection}-${basemap}`}
            url={globalTiles.url}
            attribution={attribution}
            subdomains={globalTiles.subdomains ?? 'abc'}
            maxNativeZoom={globalTiles.maxNativeZoom}
            maxZoom={view.maxZoom}
            eventHandlers={tileEvents}
          />
        )}
        {polar && basemap === 'imagery' && (
          <TileLayer
            key={`${projection}-imagery`}
            url={gibsUrl(projection)}
            attribution={attribution}
            tileSize={512}
            zoomOffset={-1}
            minNativeZoom={1}
            maxNativeZoom={5}
            maxZoom={view.maxZoom}
            noWrap
            eventHandlers={tileEvents}
          />
        )}
        {basemap === 'outline' && (
          <GeoJSON
            key={`coast-${projection}`}
            data={coast}
            interactive={false}
            attribution={attribution}
            style={() => ({
              color: '#9ED7F4',
              weight: 0.8,
              opacity: 0.9,
              fillColor: '#DCEFF8',
              // Natural Earth rings close at ±180°. A restrained polar fill avoids the classic
              // inverted-cap artifact while preserving the coastline; regional/world views fill land.
              fillOpacity: polar ? 0.1 : 0.92,
              fillRule: 'evenodd',
            })}
          />
        )}

        {grid && <Graticule projection={projection} dark={darkBase} />}
        {layers.seaIce && <GeoJSON key={`ice-${projection}-${year}`} data={ice as FeatureCollection<Polygon>} interactive={false} style={() => ({ stroke: false, fillColor: darkBase ? '#CDEFFF' : '#7AA3C8', fillOpacity: darkBase ? 0.28 : 0.22 })} />}
        {/* The edge is a separate line so the polygon's closing segments through the pole never show. */}
        {layers.seaIce && (ice as FeatureCollection<Polygon>).features.map((feature) => (
          <Polyline
            key={`ice-edge-${projection}-${year}-${feature.properties?.hemisphere}`}
            positions={feature.geometry.coordinates[0].filter(([, lat]) => Math.abs(lat) < 89).map(([lng, lat]) => [lat, lng] as [number, number])}
            interactive={false}
            pathOptions={{ color: darkBase ? '#DBF4FF' : '#2F5D8C', weight: 1.2, dashArray: '5 5' }}
          />
        ))}
        {layers.arcs && projection === 'world' && POLAR_ARCS.map((arc) => <Polyline key={arc.id} positions={arcCoordinates(arc.from, arc.to).map(([lng, lat]) => [lat, lng])} pathOptions={{ color: arc.color, weight: 2, opacity: 0.8, dashArray: '4 7' }} interactive={false} />)}
        {layers.tracks && tracks.map((track) => <Polyline key={track.id} positions={track.coordinates.map(([lng, lat]) => [lat, lng])} pathOptions={{ color: track.color, weight: track.year === year ? 3.5 : 2, opacity: track.year === year ? 0.95 : 0.6, dashArray: track.year === year ? undefined : '5 5' }} interactive={false} />)}
        {layers.points && points.map((point) => {
          const selected = selectedId === point.id;
          return (
            <Marker
              key={point.id}
              position={[point.coordinates.lat, point.coordinates.lng]}
              icon={pointIcon(point, selected)}
              keyboard
              zIndexOffset={selected ? 1000 : 0}
              bubblingMouseEvents={false}
              eventHandlers={{
                click: () => onSelect(point),
                keypress: (e) => { if ((e.originalEvent as KeyboardEvent).key === 'Enter') onSelect(point); },
              }}
              title={`${point.name} — ${POINT_TYPE_META[point.type].label}`}
              alt={`${POINT_TYPE_META[point.type].symbol} ${point.name}`}
            >
              {hoverCapable && <Tooltip direction="auto" offset={[8, 0]} opacity={1} className="polar-map-tooltip"><MapHoverCard point={point} /></Tooltip>}
            </Marker>
          );
        })}
      </MapContainer>

      <div className="pointer-events-none absolute left-3 top-3 z-[650] flex max-w-[calc(100%-5.5rem)] flex-col items-start gap-2">
        <div className="pointer-events-auto"><BasemapSwitch options={options} value={basemap} onChange={chooseBasemap} grid={grid} onGrid={setGrid} /></div>
        <MapLegend mode="2d" year={year} source={sourceText} extra={legendExtra} />
      </div>
      {tileNotice && (
        <div role="status" className="absolute left-1/2 top-16 z-[660] flex w-[min(92%,420px)] -translate-x-1/2 items-start gap-2 rounded-lg border bg-card px-3 py-2 text-xs shadow-lg">
          <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="flex-1">{tileNotice}</span>
          <button type="button" onClick={() => setTileNotice(null)} aria-label="Dismiss notice" className="rounded p-0.5 hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-3 left-3 z-[600] rounded-lg bg-polar-navy/85 px-2 py-1 font-mono text-[11px] text-white backdrop-blur">{coords}</div>
      <div className="pointer-events-none absolute bottom-9 right-3 z-[600] rounded-lg bg-polar-navy/85 px-2 py-1 text-[11px] text-white backdrop-blur">{PROJECTION_META[projection].label} · {BASEMAP_LABEL[basemap]} · {year}</div>
    </div>
  );
}

export function LeafletPolarMap(props: MapRendererProps) {
  const projection = usePolarMapStore((s) => s.projection);
  return <LeafletScene {...props} projection={projection} />;
}
