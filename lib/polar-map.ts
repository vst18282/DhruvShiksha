import type { Feature, FeatureCollection, Geometry, LineString, Polygon } from 'geojson';
import type { PolarPoint, PolarPointId, PolarProjection } from '@/types/polar-map';
import { POLAR_POINT_BY_ID, POLAR_POINTS } from '@/data/polar-map';

export const PROJECTION_META: Record<PolarProjection, { label: string; center: [number, number]; zoom: number }> = {
  south: { label: 'South Pole', center: [-89, 30], zoom: 1 },
  north: { label: 'North Pole', center: [89, 0], zoom: 1 },
  himalaya: { label: 'Himalaya', center: [31.6, 78.2], zoom: 5 },
  world: { label: 'World', center: [12, 30], zoom: 1 },
};

export const POINT_TYPE_META = {
  station: { label: 'Research station', symbol: '●' },
  headquarters: { label: 'Headquarters', symbol: '◆' },
  historic: { label: 'Historic station', symbol: '■' },
  'field-site': { label: 'Field site', symbol: '▲' },
} as const;

export const STATUS_LABEL = { active: 'Active', historic: 'Historic', seasonal: 'Seasonal' } as const;

export function projectionForPoint(point: PolarPoint): PolarProjection {
  if (point.region === 'antarctica') return 'south';
  if (point.region === 'arctic') return 'north';
  if (point.region === 'himalaya') return 'himalaya';
  return 'world';
}

/** A closed illustrative ice edge; split into safe rings so no segment crosses the antimeridian. */
export function seaIceFeatures(year: number): FeatureCollection<Polygon> {
  const age = year - 2008;
  const ring = (south: boolean): [number, number][] => {
    const outer: [number, number][] = [];
    for (let lon = -180; lon <= 180; lon += 4) {
      const wave = Math.sin((lon * Math.PI) / 35) * 1.4 + Math.cos((lon * Math.PI) / 19) * 0.7;
      const lat = south ? -61.8 - Math.sin(age * 0.72) * 0.8 + wave : 72.8 + age * 0.11 + wave;
      outer.push([lon, lat]);
    }
    const pole = south ? -89.8 : 89.8;
    return south ? [...outer, [180, pole], [-180, pole], outer[0]] : [...outer.reverse(), [-180, pole], [180, pole], outer[0]];
  };
  return {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: { hemisphere: 'south', demo: true }, geometry: { type: 'Polygon', coordinates: [ring(true)] } },
      { type: 'Feature', properties: { hemisphere: 'north', demo: true }, geometry: { type: 'Polygon', coordinates: [ring(false)] } },
    ],
  };
}

/** Quadratic great-circle-like arc in lon/lat space, unwrapped to avoid a line across the map. */
export function arcCoordinates(fromId: PolarPointId, toId: PolarPointId, steps = 48): [number, number][] {
  const a = POLAR_POINT_BY_ID[fromId].coordinates;
  const b = POLAR_POINT_BY_ID[toId].coordinates;
  let endLng = b.lng;
  while (endLng - a.lng > 180) endLng -= 360;
  while (endLng - a.lng < -180) endLng += 360;
  const lift = Math.min(28, Math.hypot(endLng - a.lng, b.lat - a.lat) * 0.15);
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const lng = a.lng + (endLng - a.lng) * t;
    const lat = a.lat + (b.lat - a.lat) * t + Math.sin(Math.PI * t) * lift;
    return [((lng + 540) % 360) - 180, Math.max(-89, Math.min(89, lat))];
  });
}

export function arcFeature(fromId: PolarPointId, toId: PolarPointId): Feature<LineString> {
  return { type: 'Feature', properties: { fromId, toId }, geometry: { type: 'LineString', coordinates: arcCoordinates(fromId, toId) } };
}

export function isPointVisible(point: PolarPoint, year: number) {
  // Headquarters and historic context remain visible; research sites enter the timeline when established.
  return point.type === 'headquarters' || point.type === 'historic' || point.established <= year;
}

export function pointSearch(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return POLAR_POINTS;
  return POLAR_POINTS.filter((p) => `${p.name} ${p.tagline} ${p.region} ${p.type}`.toLowerCase().includes(q));
}

/** Narrow the bundled Natural Earth land to plain geometry; country boundaries are never requested. */
export function coastlineOnly(land: FeatureCollection<Geometry>) {
  return land;
}
