/**
 * DEMO ice-core age model and proxy generator (educational, not real data).
 * Proxies follow an idealised ~100 kyr glacial cycle so learners can see the pattern
 * of warm interglacials (high δ18O, CO₂, CH₄; low dust) and cold glacials.
 */
import { seededRandom } from '@/lib/utils';

export type LayerKind = 'annual' | 'dust' | 'ash' | 'bubbles';

export interface CoreDef {
  id: string;
  name: string;
  site: string;
  maxDepth: number;
  description: string;
  ageAt: (d: number) => number; // years before 2020
  events: { depth: number; label: string }[];
}

export const CORES: CoreDef[] = [
  {
    id: 'dome',
    name: 'Deep dome core (demo)',
    site: 'East Antarctic plateau (fictional site)',
    maxDepth: 3000,
    description: 'A deep core reaching roughly 800,000 years back — several glacial cycles.',
    ageAt: (d) => 12 * d + 0.09 * d * d,
    events: [
      { depth: 520, label: 'Demo volcanic ash layer (~30 ka)' },
      { depth: 1480, label: 'Demo tephra band (~215 ka)' },
      { depth: 2400, label: 'Demo ash cluster (~547 ka)' },
    ],
  },
  {
    id: 'dml',
    name: 'Coastal DML core (demo)',
    site: 'Near Maitri, Dronning Maud Land',
    maxDepth: 110,
    description: 'The shallow 110 m core from the archive: about 400 years of snowfall.',
    ageAt: (d) => d * 3.7,
    events: [{ depth: 75, label: 'Demo volcanic sulphate spike (~AD 1745)' }],
  },
  {
    id: 'himalaya',
    name: 'Himalayan glacier core (demo)',
    site: 'High-altitude glacier, western Himalaya (fictional)',
    maxDepth: 160,
    description: 'A mountain glacier core with strong dust bands from dry seasons.',
    ageAt: (d) => d * 9,
    events: [{ depth: 96, label: 'Demo dust-storm layer (~860 yr BP)' }],
  },
];

/** Warmth index 0 (full glacial) … 1 (interglacial). */
function warmth(age: number) {
  const c = Math.cos((2 * Math.PI * age) / 102_000);
  return Math.max(0, Math.min(1, 0.5 + 0.48 * c * Math.abs(c) ** 0.3 + (age < 11_700 ? 0.1 : 0)));
}

export interface ProxyPoint {
  depth: number;
  age: number;
  d18o: number;
  co2: number;
  ch4: number;
  dust: number;
}

export function proxiesAt(core: CoreDef, depth: number): ProxyPoint {
  const age = core.ageAt(depth);
  const r = seededRandom(Math.round(depth * 10) + core.id.length)();
  const w = warmth(age);
  const industrial = age < 170 ? (170 - age) / 170 : 0;
  return {
    depth,
    age: Math.round(age),
    d18o: Math.round((-57 + 7.5 * w + (r - 0.5) * 0.8 + (core.id === 'dml' ? 30 : core.id === 'himalaya' ? 44 : 0)) * 10) / 10,
    co2: Math.round(185 + 95 * w + industrial * 130 + (r - 0.5) * 6),
    ch4: Math.round(370 + 330 * w + industrial * 1100 + (r - 0.5) * 20),
    dust: Math.round((15 + 900 * (1 - w) ** 3 + (core.id === 'himalaya' ? 300 * r : 0)) * 10) / 10,
  };
}

export function proxySeries(core: CoreDef, n = 160): ProxyPoint[] {
  return Array.from({ length: n + 1 }, (_, i) => proxiesAt(core, (core.maxDepth * i) / n));
}

export interface Slice {
  depth: number;
  kind: LayerKind;
  shade: number;
  event?: string;
}

/** Slices shown in the 3D window around a depth. */
export function slicesAround(core: CoreDef, center: number, count = 36, window?: number): Slice[] {
  const win = window ?? Math.max(4, core.maxDepth / 150);
  const start = Math.max(0, Math.min(core.maxDepth - win, center - win / 2));
  return Array.from({ length: count }, (_, i) => {
    const depth = start + (win * i) / count;
    const p = proxiesAt(core, depth);
    const ev = core.events.find((e) => Math.abs(e.depth - depth) < win / count / 1.5 + 0.2);
    const r = seededRandom(Math.round(depth * 100))();
    const kind: LayerKind = ev ? 'ash' : p.dust > 300 && r > 0.5 ? 'dust' : depth < core.maxDepth * 0.33 && r > 0.72 ? 'bubbles' : 'annual';
    return { depth, kind, shade: i % 2 === 0 ? 0.92 : 0.78, event: ev?.label };
  });
}

export function formatAge(age: number): string {
  if (age < 2000) return `~AD ${Math.round(2020 - age)}`;
  if (age < 100_000) return `~${(age / 1000).toFixed(1)} ka`;
  return `~${Math.round(age / 1000)} ka`;
}

export function layerMeaning(kind: LayerKind): string {
  switch (kind) {
    case 'annual':
      return 'An annual layer: summer and winter snow differ in chemistry and density, so years can be counted like tree rings.';
    case 'dust':
      return 'A dust band: colder, drier, windier climates blow more dust onto the ice — typical of glacial periods.';
    case 'ash':
      return 'A volcanic ash / sulphate layer: a time marker that lets scientists match cores from different sites.';
    case 'bubbles':
      return 'Air bubbles: tiny pockets of ancient atmosphere used to measure past CO₂ and methane.';
  }
}

export const LAYER_COLORS: Record<LayerKind, string> = {
  annual: '#dbeefa',
  dust: '#b08a5a',
  ash: '#3b3f46',
  bubbles: '#f5faff',
};
