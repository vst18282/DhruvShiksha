'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { GeoJSON, MapContainer, Marker, Polyline, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L, { type CRS, type LatLngExpression, type Map as LeafletMap } from 'leaflet';
import 'proj4leaflet';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import type { Feature, FeatureCollection, Geometry, Polygon } from 'geojson';
import type { MapRendererProps } from '@/components/maps/polar-map-feature';
import type { PolarPoint, PolarProjection } from '@/types/polar-map';
import { POLAR_ARCS, POLAR_POINT_BY_ID, POLAR_POINTS, POLAR_TRACKS } from '@/data/polar-map';
import { getLand } from '@/lib/geo';
import { arcCoordinates, isPointVisible, POINT_TYPE_META, PROJECTION_META, seaIceFeatures } from '@/lib/polar-map';
import { MapHoverCard } from '@/components/maps/map-point-card';
import { Button } from '@/components/ui/button';
import { usePolarMapStore } from '@/store/polar-map';
import { useUiStore } from '@/store/ui';
import { useReducedMotion } from 'framer-motion';

const SOUTH_DEF = '+proj=stere +lat_0=-90 +lat_ts=-71 +lon_0=0 +datum=WGS84 +units=m +no_defs';
const NORTH_DEF = '+proj=stere +lat_0=90 +lat_ts=70 +lon_0=-45 +datum=WGS84 +units=m +no_defs';
const RESOLUTIONS = [65536, 32768, 16384, 8192, 4096, 2048, 1024, 512, 256, 128, 64, 32];

function polarCrs(code: 'EPSG:3031' | 'EPSG:3413', definition: string): CRS {
  return new L.Proj.CRS(code, definition, {
    resolutions: RESOLUTIONS,
    origin: [-4194304, 4194304],
    bounds: L.bounds([-4194304, -4194304], [4194304, 4194304]),
  });
}

const CRS_BY_PROJECTION: Record<PolarProjection, CRS> = {
  south: polarCrs('EPSG:3031', SOUTH_DEF),
  north: polarCrs('EPSG:3413', NORTH_DEF),
  himalaya: L.CRS.EPSG3857,
  world: L.CRS.EPSG3857,
};

const VIEW_SETTINGS: Record<PolarProjection, { center: LatLngExpression; zoom: number; minZoom: number; maxZoom: number }> = {
  south: { center: [-89, 0], zoom: 1.75, minZoom: 0, maxZoom: 8 },
  north: { center: [89, -45], zoom: 1.75, minZoom: 0, maxZoom: 8 },
  himalaya: { center: [31.4, 78.2], zoom: 5.25, minZoom: 2, maxZoom: 10 },
  world: { center: [13, 35], zoom: 1.5, minZoom: 1, maxZoom: 8 },
};

function pointAllowed(point: PolarPoint, projection: PolarProjection) {
  if (projection === 'south') return point.coordinates.lat < -55;
  if (projection === 'north') return point.coordinates.lat > 58;
  if (projection === 'himalaya') return point.region === 'himalaya' || point.region === 'india';
  return true;
}

function pointIcon(point: PolarPoint, selected: boolean) {
  const color = point.type === 'headquarters' ? '#F59E0B' : point.type === 'historic' ? '#94A3B8' : point.type === 'field-site' ? '#2DD4BF' : point.region === 'arctic' ? '#8B5CF6' : '#5BB5E8';
  const active = point.status === 'active' ? ' polar-marker--active' : '';
  const chosen = selected ? ' polar-marker--selected' : '';
  return L.divIcon({
    className: 'polar-div-icon',
    iconSize: [160, 34],
    iconAnchor: [17, 17],
    tooltipAnchor: [26, 0],
    html: `<span class="polar-marker polar-marker--${point.type}${active}${chosen}" style="--marker-color:${color}"><span class="polar-marker__symbol">${POINT_TYPE_META[point.type].symbol}</span><span class="polar-marker__label">${point.name.replace(' Station', '')}</span></span>`,
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
      const zoom = projection === 'world' ? 3.5 : projection === 'himalaya' ? 7 : 3.25;
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
  const reset = () => { const v = VIEW_SETTINGS[projection]; map.flyTo(v.center, v.zoom, { duration: 0.7 }); };
  return (
    <div className="absolute right-3 top-16 z-[600] flex flex-col overflow-hidden rounded-lg border bg-card shadow-lg">
      <Button variant="ghost" size="icon" className="rounded-none" onClick={() => map.zoomIn(0.5)} aria-label="Zoom in"><Plus /></Button>
      <Button variant="ghost" size="icon" className="rounded-none border-y" onClick={() => map.zoomOut(0.5)} aria-label="Zoom out"><Minus /></Button>
      <Button variant="ghost" size="icon" className="rounded-none" onClick={reset} aria-label="Reset map view"><RotateCcw /></Button>
    </div>
  );
}

function LeafletScene({ projection, selectedId, zoomRequest, onSelect, onEmptyClick }: MapRendererProps & { projection: PolarProjection }) {
  const year = usePolarMapStore((s) => s.year);
  const layers = usePolarMapStore((s) => s.layers);
  const [coords, setCoords] = useState('Move over the map');
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
  const view = VIEW_SETTINGS[projection];

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
        className="h-full min-h-[560px] w-full bg-[#08213d] outline-none"
      >
        <ResizeSync />
        <MapEvents onEmptyClick={onEmptyClick} onCoords={setCoords} />
        <CameraSync selectedId={selectedId} zoomRequest={zoomRequest} projection={projection} />
        <MapButtons projection={projection} />
        <GeoJSON
          data={coast}
          interactive={false}
          style={() => ({
            color: '#9ED7F4',
            weight: 0.8,
            opacity: 0.9,
            fillColor: '#DCEFF8',
            // Natural Earth rings close at ±180°. A restrained polar fill avoids the classic
            // inverted-cap artifact while preserving the coastline; regional/world views fill land.
            fillOpacity: projection === 'south' || projection === 'north' ? 0.1 : 0.92,
            fillRule: 'evenodd',
          })}
        />
        {layers.seaIce && <GeoJSON key={`ice-${projection}-${year}`} data={ice as FeatureCollection<Polygon>} interactive={false} style={() => ({ color: '#DBF4FF', weight: 1, dashArray: '5 5', fillColor: '#CDEFFF', fillOpacity: 0.28 })} />}
        {layers.arcs && projection === 'world' && POLAR_ARCS.map((arc) => <Polyline key={arc.id} positions={arcCoordinates(arc.from, arc.to).map(([lng, lat]) => [lat, lng])} pathOptions={{ color: arc.color, weight: 1.6, opacity: 0.55, dashArray: '4 7' }} interactive={false} />)}
        {layers.tracks && tracks.map((track) => <Polyline key={track.id} positions={track.coordinates.map(([lng, lat]) => [lat, lng])} pathOptions={{ color: track.color, weight: track.year === year ? 3 : 1.5, opacity: track.year === year ? 0.95 : 0.42, dashArray: track.year === year ? undefined : '5 5' }} interactive={false} />)}
        {layers.points && points.map((point) => {
          const selected = selectedId === point.id;
          return (
            <Marker
              key={point.id}
              position={[point.coordinates.lat, point.coordinates.lng]}
              icon={pointIcon(point, selected)}
              keyboard
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
      <div className="pointer-events-none absolute bottom-3 left-3 z-[600] rounded-lg bg-polar-navy/80 px-2 py-1 font-mono text-[11px] text-white backdrop-blur">{coords}</div>
      <div className="pointer-events-none absolute bottom-3 right-3 z-[600] rounded-lg bg-polar-navy/80 px-2 py-1 text-[11px] text-white backdrop-blur">{PROJECTION_META[projection].label} · {year}</div>
    </div>
  );
}

export function LeafletPolarMap(props: MapRendererProps) {
  const projection = usePolarMapStore((s) => s.projection);
  return <LeafletScene {...props} projection={projection} />;
}
