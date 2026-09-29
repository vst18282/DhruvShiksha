'use client';

import { useId, useMemo } from 'react';
import { geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import { getLand } from '@/lib/geo';
import { cn } from '@/lib/utils';

export interface MiniMapPoint {
  lon: number;
  lat: number;
  label: string;
  color?: string;
}

/**
 * Small, static orthographic locator map (d3-geo + local TopoJSON).
 * Centre defaults to the mean of points; optional bbox is drawn as a highlighted extent.
 */
export function MiniMap({
  points = [],
  bbox,
  center,
  track,
  className,
  label,
}: {
  points?: MiniMapPoint[];
  bbox?: { minLon: number; minLat: number; maxLon: number; maxLat: number };
  center?: [number, number];
  track?: [number, number][];
  className?: string;
  label: string;
}) {
  const uid = useId().replace(/:/g, '');
  const size = 320;
  const { land, grat, sphere, pts, box, line } = useMemo(() => {
    const c: [number, number] =
      center ??
      (bbox
        ? [(bbox.minLon + bbox.maxLon) / 2, (bbox.minLat + bbox.maxLat) / 2]
        : points.length
          ? [points.reduce((a, p) => a + p.lon, 0) / points.length, points.reduce((a, p) => a + p.lat, 0) / points.length]
          : [78, 20]);
    const proj = geoOrthographic().rotate([-c[0], -c[1]]).translate([size / 2, size / 2]).scale(size / 2 - 6).clipAngle(90);
    const path = geoPath(proj);
    const boxGeo = bbox
      ? {
          type: 'Polygon' as const,
          coordinates: [[[bbox.minLon, bbox.minLat], [bbox.maxLon, bbox.minLat], [bbox.maxLon, bbox.maxLat], [bbox.minLon, bbox.maxLat], [bbox.minLon, bbox.minLat]]],
        }
      : null;
    return {
      land: path(getLand()) ?? '',
      grat: path(geoGraticule10()) ?? '',
      sphere: path({ type: 'Sphere' }) ?? '',
      pts: points.map((p) => ({ ...p, xy: proj([p.lon, p.lat]) })),
      box: boxGeo ? path(boxGeo) ?? '' : '',
      line: track ? path({ type: 'LineString', coordinates: track }) ?? '' : '',
    };
  }, [points, bbox, center, track]);

  return (
    <figure className={cn('relative', className)}>
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} className="h-auto w-full">
        <defs>
          <radialGradient id={`oc-${uid}`} cx="40%" cy="35%" r="70%">
            <stop offset="0" stopColor="#1d4f82" />
            <stop offset="1" stopColor="#0B1F3A" />
          </radialGradient>
        </defs>
        <path d={sphere} fill={`url(#oc-${uid})`} />
        <path d={grat} fill="none" stroke="#5BB5E8" strokeOpacity="0.15" strokeWidth="0.6" />
        <path d={land} fill="#e6f2fb" fillOpacity="0.92" stroke="#9fc3e0" strokeWidth="0.4" />
        {box && <path d={box} fill="#F59E0B" fillOpacity="0.35" stroke="#F59E0B" strokeWidth="1.5" />}
        {line && <path d={line} fill="none" stroke="#2DD4BF" strokeWidth="1.8" strokeDasharray="4 3" />}
        {pts.map(
          (p) =>
            p.xy && (
              <g key={p.label} transform={`translate(${p.xy[0]} ${p.xy[1]})`}>
                <circle r="9" fill={p.color ?? '#F59E0B'} opacity="0.25" className="motion-decor animate-pulse-ring" style={{ transformOrigin: 'center' }} />
                <circle r="4.5" fill={p.color ?? '#F59E0B'} stroke="#fff" strokeWidth="1.5" />
                <text x="8" y="4" fontSize="11" fontWeight="600" fill="#fff" stroke="#0B1F3A" strokeWidth="3" paintOrder="stroke">
                  {p.label}
                </text>
              </g>
            ),
        )}
      </svg>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}
