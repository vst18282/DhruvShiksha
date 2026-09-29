/**
 * Procedural "satellite" rasters for the demo Earth-observation tool. No tiles, no network:
 * a land mask is rendered from the bundled TopoJSON and each pixel's value is computed from
 * latitude/longitude, season and year using simple, documented demo formulas.
 */
import { geoMercator, geoPath, geoStereographic, type GeoProjection } from 'd3-geo';
import { getLand } from '@/lib/geo';

export type SatRegion = 'antarctica' | 'arctic' | 'himalaya' | 'southern_ocean';
export type SatLayer = 'true_colour' | 'sea_ice' | 'sst' | 'albedo' | 'glacier';

export const LAYER_INFO: Record<SatLayer, { label: string; sensor: string; resolution: string; unit: string }> = {
  true_colour: { label: 'True colour', sensor: 'MODIS Terra (demo)', resolution: '250 m (demo)', unit: '' },
  sea_ice: { label: 'Sea-ice concentration', sensor: 'AMSR2 passive microwave (demo)', resolution: '6.25 km (demo)', unit: '%' },
  sst: { label: 'Sea-surface temperature', sensor: 'MODIS Aqua SST (demo)', resolution: '4 km (demo)', unit: '°C' },
  albedo: { label: 'Albedo', sensor: 'MODIS MCD43 (demo)', resolution: '500 m (demo)', unit: '' },
  glacier: { label: 'Glacier extent', sensor: 'Sentinel-2 MSI (demo)', resolution: '10 m (demo)', unit: 'ice fraction' },
};

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function projFor(region: SatRegion, size: number): GeoProjection {
  switch (region) {
    case 'arctic':
      return geoStereographic().rotate([0, -90]).clipAngle(32).scale(size / 1.15).translate([size / 2, size / 2]);
    case 'himalaya':
      return geoMercator().center([80, 31.5]).scale(size * 5.2).translate([size / 2, size / 2]);
    case 'southern_ocean':
      return geoStereographic().rotate([-60, 90]).clipAngle(55).scale(size / 2.1).translate([size / 2, size / 2]);
    default:
      return geoStereographic().rotate([0, 90]).clipAngle(35).scale(size / 1.25).translate([size / 2, size / 2]);
  }
}

function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x: number, y: number) => 0.6 * vnoise(x, y) + 0.3 * vnoise(x * 2.1, y * 2.1) + 0.1 * vnoise(x * 4.3, y * 4.3);

interface Grid {
  lat: Float32Array;
  lon: Float32Array;
  land: Uint8Array;
  inside: Uint8Array;
}
const gridCache = new Map<string, Grid>();

function grid(region: SatRegion, size: number): Grid {
  const key = `${region}-${size}`;
  const hit = gridCache.get(key);
  if (hit) return hit;
  const proj = projFor(region, size);
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  geoPath(proj, ctx)(getLand());
  ctx.fill();
  const mask = ctx.getImageData(0, 0, size, size).data;
  const n = size * size;
  const g: Grid = { lat: new Float32Array(n), lon: new Float32Array(n), land: new Uint8Array(n), inside: new Uint8Array(n) };
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const ll = proj.invert?.([x + 0.5, y + 0.5]);
      if (ll && !isNaN(ll[0])) {
        g.lon[i] = ll[0];
        g.lat[i] = ll[1];
        g.inside[i] = 1;
      }
      g.land[i] = mask[i * 4] > 128 ? 1 : 0;
    }
  gridCache.set(key, g);
  return g;
}

/** Demo sea-ice edge latitude (absolute degrees) by hemisphere, longitude, year, month. */
export function iceEdge(south: boolean, lon: number, year: number, month: number) {
  const wob = Math.sin((lon * 3 * Math.PI) / 180) * 1.6 + Math.cos((lon * 5 * Math.PI) / 180) * 0.9;
  if (south) {
    const season = Math.cos((2 * Math.PI * (month - 8)) / 12); // max Sep
    return 64.5 - 4.5 * season + wob + (year >= 2023 ? 1.2 : 0);
  }
  const season = Math.cos((2 * Math.PI * (month - 2)) / 12); // max Mar
  return 76 - 6 * season + wob * 0.7 + (year - 2015) * 0.12;
}

export function glacierFrac(lon: number, lat: number, year: number, month: number) {
  const centres = [[77.5, 32.3, 0.35], [77.9, 32.6, 0.25], [79.1, 30.9, 0.3], [81.5, 30.4, 0.2], [77.2, 35.3, 0.45], [78.5, 31.2, 0.22]];
  const shrink = 1 - 0.013 * (year - 2015);
  const snow = month >= 10 || month <= 3 ? 0.08 : 0;
  let v = 0;
  for (const [cx, cy, r] of centres) {
    const d = Math.hypot(lon - cx, (lat - cy) * 1.2);
    v = Math.max(v, 1 - d / (r * shrink + snow));
  }
  return Math.max(0, Math.min(1, v + (fbm(lon * 3, lat * 3) - 0.5) * 0.35));
}

export interface RasterResult {
  values: Float32Array;
  inside: Uint8Array;
}

/** Render one frame into an ImageData and return raw values for AOI statistics. */
export function renderRaster(img: ImageData, region: SatRegion, layer: SatLayer, year: number, month: number): RasterResult {
  const size = img.width;
  const g = grid(region, size);
  const px = img.data;
  const values = new Float32Array(size * size);
  const south = region !== 'arctic' && region !== 'himalaya';
  for (let i = 0; i < size * size; i++) {
    const o = i * 4;
    if (!g.inside[i]) {
      px[o] = 11; px[o + 1] = 31; px[o + 2] = 58; px[o + 3] = 255;
      values[i] = NaN;
      continue;
    }
    const lat = g.lat[i], lon = g.lon[i], land = g.land[i] === 1;
    const alat = Math.abs(lat);
    const n = fbm(lon / 8 + year * 0.3, lat / 4 + month * 0.2);
    const edge = region === 'himalaya' ? 99 : iceEdge(south, lon, year, month);
    const conc = !land && alat > edge - 1 ? Math.max(0, Math.min(1, (alat - edge + 1) / 3 + (n - 0.5) * 0.5)) : 0;
    const iceSheet = land && (south ? lat < -60 : lat > 60 && lon > -75 && lon < -10);
    const sst = land ? NaN : conc > 0.15 ? -1.8 : 29 - alat * 0.5 + Math.cos((2 * Math.PI * (month - (south ? 1 : 7))) / 12) * 2 + (year - 2015) * 0.03 + (n - 0.5) * 1.5;
    const gl = region === 'himalaya' && land ? glacierFrac(lon, lat, year, month) : 0;
    let r = 0, gg = 0, b = 0, v = 0;
    switch (layer) {
      case 'sea_ice': {
        v = land ? NaN : conc * 100;
        if (land) { r = 90; gg = 100; b = 110; }
        else { const t = conc; r = 20 + 230 * t; gg = 50 + 200 * t; b = 110 + 145 * t; }
        break;
      }
      case 'sst': {
        v = sst;
        if (land) { r = 80; gg = 85; b = 95; }
        else { const t = Math.max(0, Math.min(1, (sst + 2) / 32)); r = 255 * Math.min(1, t * 1.6); gg = 255 * (1 - Math.abs(t - 0.5) * 1.6); b = 255 * Math.max(0, 1 - t * 1.6); }
        break;
      }
      case 'albedo': {
        v = land ? (iceSheet ? 0.82 + n * 0.06 : region === 'himalaya' ? 0.25 + gl * 0.55 : 0.2 + n * 0.1) : 0.06 + conc * 0.6;
        const t = v; r = gg = b = 30 + 225 * t;
        break;
      }
      case 'glacier': {
        v = gl;
        if (!land) { r = 20; gg = 50; b = 100; }
        else if (gl > 0.35) { r = 190 + 60 * gl; gg = 230; b = 255; }
        else { r = 120 + n * 40; gg = 110 + n * 30; b = 95; }
        break;
      }
      default: {
        v = NaN;
        if (land) {
          if (iceSheet || (region === 'himalaya' && (gl > 0.35 || n > 0.72))) { r = 240; gg = 245; b = 250; }
          else { r = 120 + n * 60; gg = 105 + n * 50; b = 80 + n * 20; }
        } else if (conc > 0.15) { r = 225 + conc * 30; gg = 235 + conc * 20; b = 245; }
        else { r = 20 + n * 15; gg = 60 + n * 20; b = 110 + n * 30; }
      }
    }
    px[o] = r; px[o + 1] = gg; px[o + 2] = b; px[o + 3] = 255;
    values[i] = v;
  }
  return { values, inside: g.inside };
}

/* ------------------------------- Chart series ------------------------------- */

export function seaIceSeries() {
  const years = [2015, 2019, 2023, 2025];
  const cycle = MONTHS.map((m, i) => {
    const row: Record<string, string | number> = { month: m };
    years.forEach((y) => {
      row[`ant${y}`] = Math.round((11 + 7.5 * Math.cos((2 * Math.PI * (i - 8)) / 12) - (y >= 2023 ? 1.3 : 0) + Math.sin(y) * 0.2) * 10) / 10;
      row[`arc${y}`] = Math.round((10.5 + 4.5 * Math.cos((2 * Math.PI * (i - 2)) / 12) - (y - 2015) * 0.07) * 10) / 10;
    });
    return row;
  });
  const trend = Array.from({ length: 22 }, (_, i) => {
    const y = 2004 + i;
    return { year: y, arcticSep: Math.round((6.1 - i * 0.07 + Math.sin(i * 1.7) * 0.35) * 100) / 100, antarcticFeb: Math.round((3.1 + Math.sin(i) * 0.3 - (y >= 2022 ? 0.9 : 0)) * 100) / 100 };
  });
  const mean = trend.reduce((a, r) => a + r.arcticSep, 0) / trend.length;
  const anomaly = trend.map((r) => ({ year: r.year, anomaly: Math.round((r.arcticSep - mean) * 100) / 100 }));
  const glacier = Array.from({ length: 11 }, (_, i) => ({ year: 2015 + i, area: Math.round((15.4 - i * 0.12 - Math.sin(i) * 0.03) * 100) / 100 }));
  return { cycle, trend, anomaly, glacier, years };
}
