import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

/*
 * Decorative background for the Expeditions page: an icy gradient with soft glows, topographic
 * contours, Arctic and Antarctic map insets, faint dashed expedition routes with small markers
 * and a snow-capped ridge along the bottom.
 *
 * Purely visual. It is painted behind the page with a negative z-index inside the page's existing
 * `relative` wrapper, so it adds no stacking context that could change how the progress bar, the
 * sticky filter bar or the hover notes layer. It ignores the pointer, is hidden from assistive
 * technology, and is dropped in high-contrast mode, forced colours and print. The scene is
 * viewport-sized and sticky (just under the 6rem site header), so it holds still while the long
 * timeline scrolls over it.
 */

type Pt = readonly [number, number];
type Seg = readonly [Pt, Pt, Pt, Pt];

/** One decimal place keeps the generated path data short. */
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Smooth Catmull-Rom curve through the points, written as cubic Bézier path data. */
function spline(pts: readonly Pt[], closed: boolean): string {
  const n = pts.length;
  const at = (i: number) => pts[closed ? (i + n) % n : Math.min(n - 1, Math.max(0, i))];
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    d += `C${r1(p1[0] + (p2[0] - p0[0]) / 6)} ${r1(p1[1] + (p2[1] - p0[1]) / 6)} ${r1(p2[0] - (p3[0] - p1[0]) / 6)} ${r1(p2[1] - (p3[1] - p1[1]) / 6)} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return closed ? `${d}Z` : d;
}

/* ------------------------------------------------------------------ Polar map insets */

/** Polar projection for the insets: 6 units per degree from the pole, so latitude 60° sits at r = 180. */
function polar([lon, lat]: Pt, north: boolean): Pt {
  const r = (90 - Math.abs(lat)) * 6;
  const a = (lon * Math.PI) / 180;
  // Arctic: 0° at the bottom, east runs anticlockwise. Antarctic: 0° at the top, east runs clockwise.
  return [r * Math.sin(a), north ? r * Math.cos(a) : -r * Math.cos(a)];
}

/* Simplified coastlines as [longitude °E, latitude °N]; west and south are negative. */
const ANTARCTICA: Pt[] = [
  [0, -70], [8, -70.2], [15, -70], [22, -70.4], [30, -69.6], [36, -69.4], [40, -68.8], [45, -67.8], [50, -66.6], [55, -66.2],
  [60, -67.2], [65, -67.8], [69, -69.8], [72, -70.4], [76, -69.2], [80, -67.8], [86, -66.9], [92, -66.4], [98, -66.2], [104, -65.9],
  [110, -66.3], [116, -66.8], [122, -66.4], [128, -66.2], [134, -66.3], [140, -66.6], [146, -67.6], [152, -68.6], [158, -69.6],
  [163, -70.6], [167, -71.6], [170, -71.8],
  // Victoria Land, the Ross Ice Shelf front and Marie Byrd Land
  [168, -73.5], [165, -75.5], [163, -77.2], [166, -78], [172, -78.2], [180, -78.4], [-172, -78.4], [-164, -78.2], [-158, -77.4],
  [-155, -76.6], [-150, -75.6], [-143, -75], [-136, -74.4], [-128, -73.9], [-120, -73.7], [-112, -74.3], [-104, -74.8], [-100, -74.6],
  [-96, -73.2], [-90, -72.6], [-84, -73], [-78, -73.2],
  // Antarctic Peninsula, out to its tip and back down the Weddell Sea side
  [-74, -71.5], [-71, -69.8], [-68, -67.8], [-66, -66.2], [-63.5, -64.8], [-60, -63.6], [-57, -63.3], [-58, -64.4], [-60, -66],
  [-62, -68], [-62, -70.2], [-61, -72.4], [-60, -74.4], [-56, -75.6], [-49, -77.2], [-42, -78], [-36, -77.8], [-30, -76.2],
  [-26, -75.2], [-20, -73.6], [-14, -72.2], [-8, -71], [-3, -70.4],
];
const GREENLAND: Pt[] = [
  [-43.9, 59.8], [-48, 61], [-51, 63], [-52, 64.2], [-53.5, 66], [-53, 68], [-51, 69.5], [-54, 70.5], [-55.5, 72], [-57, 74],
  [-60, 75.5], [-68, 76.5], [-71, 77.5], [-72.5, 78.5], [-67, 80], [-62, 81], [-55, 82], [-45, 82.5], [-35, 83.5], [-25, 83],
  [-20, 82], [-15, 81.5], [-13, 80.5], [-18, 79], [-18.5, 77.5], [-19, 76], [-20, 74.5], [-22, 73], [-22, 71.5], [-23, 70],
  [-25, 69], [-29, 68.3], [-33, 67.5], [-36, 66], [-40, 65], [-41, 63.5], [-42, 62], [-43, 60.5],
];
const ELLESMERE: Pt[] = [[-63, 82.4], [-70, 83], [-80, 82.8], [-90, 81.5], [-93, 79.5], [-90, 77.5], [-84, 76.3], [-79, 76.5], [-78, 78.5], [-73.5, 79.8], [-68.5, 81.2]];
const BAFFIN: Pt[] = [
  [-61.5, 66.7], [-63.5, 64.5], [-66, 62.3], [-70, 62.8], [-73.5, 64.5], [-76, 66.5], [-80, 69], [-84.5, 70.4], [-88.5, 73.2],
  [-84, 73.8], [-78, 73.3], [-73, 71.6], [-68.5, 70.3], [-65, 68.5],
];
const SVALBARD: Pt[] = [[10.8, 79.6], [11.5, 78.9], [13, 78.2], [14.5, 77.5], [16.5, 76.6], [17.8, 77], [19, 77.8], [21.5, 78.3], [23, 78.9], [26.5, 79.3], [27.5, 80.1], [22, 80.4], [18, 80], [14, 79.8]];
const ICELAND: Pt[] = [[-24, 65.5], [-22, 66.4], [-18, 66.2], [-14.5, 66], [-13.5, 65.1], [-15, 64.3], [-18.8, 63.4], [-22.5, 63.8]];
/** Mainland coasts that run off the edge of the inset, drawn as open lines. */
const EURASIA: Pt[] = [
  [5, 60.5], [7, 63], [12, 65.5], [14, 67.5], [17, 69], [20, 70], [25.8, 71.1], [30, 70.2], [33, 69.3], [38, 68.5], [41, 67.3],
  [44, 66.5], [50, 68], [55, 68.3], [60, 69.5], [66, 70.5], [70, 73], [73, 72.5], [80, 73.5], [90, 75.5], [100, 77], [104, 77.7],
  [112, 74], [125, 73], [135, 71.5], [150, 71.5], [160, 69.8], [170, 69.9], [180, 69], [-175, 67.2], [-170, 66],
];
const NORTH_AMERICA: Pt[] = [
  [-168, 65.6], [-166, 68.4], [-162, 70.2], [-156.5, 71.3], [-150, 70.4], [-143, 70.1], [-136, 69.3], [-128, 70.1], [-120, 69.3],
  [-110, 68.2], [-100, 67.8], [-94, 69], [-88, 68.5], [-82, 67.5],
];

type PolarMap = { lands: string[]; coasts: string[]; stations: Pt[] };
const project = (coast: readonly Pt[], north: boolean, closed: boolean) => spline(coast.map((p) => polar(p, north)), closed);

const ARCTIC_MAP: PolarMap = {
  lands: [GREENLAND, ELLESMERE, BAFFIN, SVALBARD, ICELAND].map((c) => project(c, true, true)),
  coasts: [EURASIA, NORTH_AMERICA].map((c) => project(c, true, false)),
  stations: [polar([11.93, 78.92], true)], // Himadri, Ny-Ålesund
};
const ANTARCTIC_MAP: PolarMap = {
  lands: [project(ANTARCTICA, false, true)],
  coasts: [],
  stations: [polar([11.73, -70.77], false), polar([76.19, -69.41], false)], // Maitri, Bharati
};

/** Meridians every 30°, stopping short of the pole (the set is symmetric, so it serves both insets). */
const MERIDIANS = Array.from({ length: 12 }, (_, i) => {
  const a = (i * Math.PI) / 6;
  return `M${r1(Math.sin(a) * 14)} ${r1(Math.cos(a) * 14)}L${r1(Math.sin(a) * 186)} ${r1(Math.cos(a) * 186)}`;
}).join('');

function PolarInset({ map, accent, className, style }: { map: PolarMap; accent: string; className: string; style: CSSProperties }) {
  return (
    <svg viewBox="-200 -200 400 400" className={cn('absolute h-auto -translate-x-1/2 -translate-y-1/2', className)} style={style} aria-hidden focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="0.8">
        <circle r="190" strokeOpacity="0.32" />
        <circle r="180" strokeOpacity="0.22" />
        <circle r="120" strokeOpacity="0.22" />
        <circle r="60" strokeOpacity="0.22" />
        {/* Arctic / Antarctic Circle, 66.56° */}
        <circle r="140.6" strokeOpacity="0.4" strokeDasharray="2 5" />
        <path d={MERIDIANS} strokeOpacity="0.16" />
      </g>
      <g fill="currentColor" fillOpacity="0.07" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.1" strokeLinejoin="round">
        {map.lands.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <g fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.1" strokeLinecap="round">
        {map.coasts.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      {/* India's research stations */}
      <g className={accent}>
        {map.stations.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="7" fill="none" stroke="currentColor" strokeOpacity="0.5" />
            <circle cx={x} cy={y} r="2.8" fill="currentColor" />
          </g>
        ))}
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ Topographic contours */

/** Nested, gently irregular loops around a summit: a stylised contour map. */
function contourSet(count: number, seed: number): string[] {
  return Array.from({ length: count }, (_, k) => {
    const r = 18 + k * 19;
    const pts = Array.from({ length: 36 }, (_, i): Pt => {
      const t = (i / 36) * Math.PI * 2;
      const w = 1 + 0.1 * Math.sin(3 * t + seed + k * 0.18) + 0.06 * Math.sin(5 * t + seed * 2.1 - k * 0.12) + 0.035 * Math.sin(9 * t + seed * 0.7 + k * 0.3);
      // The loops drift a little with height, like a slope that is steeper on one side.
      return [Math.cos(t) * r * w + k * 3.4, Math.sin(t) * r * w * 0.8 + k * 1.8];
    });
    return spline(pts, true);
  });
}
const CONTOURS_NE = contourSet(11, 0.6);
const CONTOURS_SE = contourSet(9, 2.4);

function Contours({ paths, className, style }: { paths: string[]; className: string; style: CSSProperties }) {
  return (
    <svg viewBox="-240 -200 540 440" className={cn('absolute h-auto -translate-x-1/2 -translate-y-1/2', className)} style={style} aria-hidden focusable="false">
      <g fill="none" stroke="currentColor">
        {paths.map((d, k) => (
          // Every fifth line is a heavier index contour, as on a survey map.
          <path key={k} d={d} strokeWidth={k % 5 === 4 ? 1.3 : 0.8} strokeOpacity={k % 5 === 4 ? 0.6 : 0.36} />
        ))}
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ Expedition routes */

/* Scene positions are percentages of the backdrop, so the routes stretch with the viewport. */
const NORTH_POLE: Pt = [18, 26];
const SOUTH_POLE: Pt = [13, 67];
const HOME: Pt = [88, 72];

const ARCTIC = 'stroke-[#8B5CF6] dark:stroke-[#a78bfa]';
const ANTARCTIC = 'stroke-[#3B82C4] dark:stroke-[#5BB5E8]';

/** Both voyages leave the same home port: one north to the Arctic inset, one south to the Antarctic. */
const ROUTES: { stroke: string; segs: Seg[]; marks: [number, number][] }[] = [
  { stroke: ARCTIC, segs: [[NORTH_POLE, [34, 38], [52, 26], [66, 40]], [[66, 40], [78, 52], [84, 62], HOME]], marks: [[0, 0.3]] },
  { stroke: ANTARCTIC, segs: [[SOUTH_POLE, [26, 82], [44, 72], [60, 78]], [[60, 78], [72, 82.5], [82, 80], HOME]], marks: [[0, 0.45]] },
];
const POLE_TO_POLE: Seg = [NORTH_POLE, [30, 38], [28, 56], SOUTH_POLE];

const segPath = (segs: readonly Seg[]) => segs.map(([a, b, c, d], i) => `${i ? '' : `M${a[0]} ${a[1]}`}C${b[0]} ${b[1]} ${c[0]} ${c[1]} ${d[0]} ${d[1]}`).join('');
function bezier([a, b, c, d]: Seg, t: number): Pt {
  const u = 1 - t;
  const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return [r1(k[0] * a[0] + k[1] * b[0] + k[2] * c[0] + k[3] * d[0]), r1(k[0] * a[1] + k[1] * b[1] + k[2] * c[1] + k[3] * d[1])];
}

function Marker({ at, stroke, halo = false }: { at: Pt; stroke: string; halo?: boolean }) {
  const cx = `${at[0]}%`;
  const cy = `${at[1]}%`;
  return (
    <g className={stroke} fill="none">
      {halo && <circle cx={cx} cy={cy} r="16" strokeOpacity="0.14" />}
      <circle cx={cx} cy={cy} r="8.5" strokeOpacity="0.32" />
      <circle cx={cx} cy={cy} r="3.2" strokeWidth="1.6" className="fill-white dark:fill-[#0b1f3a]" />
    </g>
  );
}

function Routes() {
  return (
    <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden focusable="false">
      {/* Route lines live in a stretched 100 × 100 box; strokes and dashes stay screen-sized. */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" overflow="visible">
        <defs>
          <linearGradient id="expeditions-backdrop-pole-route" gradientUnits="userSpaceOnUse" x1={NORTH_POLE[0]} y1={NORTH_POLE[1]} x2={SOUTH_POLE[0]} y2={SOUTH_POLE[1]}>
            <stop offset="0" className="[stop-color:#8B5CF6] dark:[stop-color:#a78bfa]" />
            <stop offset="1" className="[stop-color:#3B82C4] dark:[stop-color:#5BB5E8]" />
          </linearGradient>
        </defs>
        <g fill="none" strokeLinecap="round">
          {ROUTES.map((r) => (
            <g key={r.stroke} className={r.stroke}>
              <path d={segPath(r.segs)} strokeWidth="8" strokeOpacity="0.07" vectorEffect="non-scaling-stroke" />
              <path d={segPath(r.segs)} strokeWidth="1.6" strokeOpacity="0.6" strokeDasharray="6 9" vectorEffect="non-scaling-stroke" />
            </g>
          ))}
          <path d={segPath([POLE_TO_POLE])} stroke="url(#expeditions-backdrop-pole-route)" strokeWidth="1.4" strokeOpacity="0.55" strokeDasharray="1 7" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
      {ROUTES.flatMap((r) => r.marks.map(([s, t]) => <Marker key={`${r.stroke}-${s}-${t}`} at={bezier(r.segs[s], t)} stroke={r.stroke} />))}
      <Marker at={NORTH_POLE} stroke={ARCTIC} halo />
      <Marker at={SOUTH_POLE} stroke={ANTARCTIC} halo />
      <Marker at={HOME} stroke={ANTARCTIC} />
      <g className={ARCTIC} fill="none">
        <circle cx={`${HOME[0]}%`} cy={`${HOME[1]}%`} r="15" strokeOpacity="0.22" strokeDasharray="2 4" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ Snow-capped ridge */

const MW = 1600;
const MH = 300;
type Peak = { x: number; top: number; w: number };
const MAIN_BASE = 214;
const FAR_BASE = 222;
/** The tall summits sit towards the sides; the middle stays low behind the timeline. */
const MAIN_PEAKS: Peak[] = [
  { x: 140, top: 132, w: 150 }, { x: 330, top: 108, w: 190 }, { x: 530, top: 152, w: 150 }, { x: 770, top: 180, w: 140 },
  { x: 900, top: 172, w: 130 }, { x: 1090, top: 146, w: 170 }, { x: 1280, top: 110, w: 200 }, { x: 1470, top: 134, w: 160 },
];
const FAR_PEAKS: Peak[] = [
  { x: 40, top: 170, w: 110 }, { x: 235, top: 158, w: 130 }, { x: 430, top: 150, w: 150 }, { x: 640, top: 162, w: 140 },
  { x: 830, top: 154, w: 150 }, { x: 1010, top: 164, w: 130 }, { x: 1185, top: 150, w: 150 }, { x: 1385, top: 160, w: 140 },
  { x: 1575, top: 168, w: 110 },
];

function ridgeY(x: number, peaks: readonly Peak[], base: number): number {
  let y = base;
  for (const p of peaks) {
    const d = Math.abs(x - p.x) / p.w;
    if (d < 1) y = Math.min(y, p.top + (base - p.top) * d ** 0.85);
  }
  // A little deterministic roughness, so the ridgelines read as rock rather than ruled lines.
  return y + 2.2 * Math.sin(x * 0.11) + 1.2 * Math.sin(x * 0.043 + 1.3) + 0.6 * Math.sin(x * 0.37 + 0.5);
}

function ridgePath(peaks: readonly Peak[], base: number): string {
  let d = `M0 ${MH}`;
  for (let x = 0; x <= MW; x += 8) d += `L${x} ${r1(ridgeY(x, peaks, base))}`;
  return `${d}L${MW} ${MH}Z`;
}

/** Snow on each summit: the ridgeline above a ragged snow line that reaches down the gullies. */
function snowCaps(peaks: readonly Peak[], base: number): string[] {
  return peaks.map((p) => {
    const line = (x: number) => p.top + (base - p.top) * 0.3 + 4 * Math.sin(x * 0.21 + p.x);
    const above = (x: number) => ridgeY(x, peaks, base) < line(x);
    let xl = p.x;
    let xr = p.x;
    while (xl > p.x - p.w && above(xl - 2)) xl -= 2;
    while (xr < p.x + p.w && above(xr + 2)) xr += 2;
    let d = `M${xl} ${r1(ridgeY(xl, peaks, base))}`;
    for (let x = xl + 3; x < xr; x += 3) d += `L${x} ${r1(ridgeY(x, peaks, base))}`;
    d += `L${xr} ${r1(ridgeY(xr, peaks, base))}`;
    for (let x = xr - 5, i = 0; x > xl; x -= 5, i++) d += `L${x} ${r1(line(x) + (i % 3 === 1 ? 7 : i % 3 === 2 ? 2 : -1))}`;
    return `${d}Z`;
  });
}

/** The shaded east face of each summit, for a little relief. */
function shadowFaces(peaks: readonly Peak[], base: number): string[] {
  return peaks.map((p) => {
    const xr = p.x + Math.round(p.w * 0.55);
    let d = `M${p.x} ${r1(ridgeY(p.x, peaks, base))}`;
    for (let x = p.x + 4; x <= xr; x += 4) d += `L${x} ${r1(ridgeY(x, peaks, base))}`;
    return `${d}L${r1(p.x + p.w * 0.14)} ${r1(p.top + (base - p.top) * 1.05)}Z`;
  });
}

const FAR_RIDGE = ridgePath(FAR_PEAKS, FAR_BASE);
const MAIN_RIDGE = ridgePath(MAIN_PEAKS, MAIN_BASE);
const SHADOWS = shadowFaces(MAIN_PEAKS, MAIN_BASE);
const SNOW = snowCaps(MAIN_PEAKS, MAIN_BASE);

function Mountains() {
  return (
    <>
      {/* `slice` keeps the peaks in proportion: wide screens crop the sky, phones show the middle of the range. */}
      <svg viewBox={`0 0 ${MW} ${MH}`} preserveAspectRatio="xMidYMax slice" className="absolute inset-x-0 bottom-0 h-[clamp(110px,13vw,400px)] w-full opacity-90 dark:opacity-100" aria-hidden focusable="false">
        <defs>
          {/* Each shaded face fades out downwards, so the relief has no hard lower edge. */}
          <linearGradient id="expeditions-backdrop-shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopOpacity="0.55" className="[stop-color:#b4c9e2] dark:[stop-color:#06152a]" />
            <stop offset="1" stopOpacity="0" className="[stop-color:#b4c9e2] dark:[stop-color:#06152a]" />
          </linearGradient>
        </defs>
        <path d={FAR_RIDGE} className="fill-[#e0eaf5] dark:fill-[#0c2039]" />
        <path d={MAIN_RIDGE} className="fill-[#d4e2f0] dark:fill-[#0f2643]" />
        <g fill="url(#expeditions-backdrop-shade)">
          {SHADOWS.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        <g className="fill-white opacity-95 dark:fill-[#d6e8ff] dark:opacity-[0.13]">
          {SNOW.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      </svg>
      {/* Valley mist over the foot of the range */}
      <div className="absolute inset-x-0 bottom-0 h-[clamp(40px,5vw,140px)] bg-gradient-to-t from-[#eef5fc] to-transparent dark:from-[#0a1d34]" />
    </>
  );
}

/* ------------------------------------------------------------------ Scene */

/** Decorations fade towards the middle so the river and cards keep a calm, clean centre. */
const CLEAN_CENTRE = 'linear-gradient(90deg, #000 0%, #000 10%, rgba(0,0,0,0.32) 30%, rgba(0,0,0,0.12) 50%, rgba(0,0,0,0.32) 70%, #000 90%, #000 100%)';

export function ExpeditionsBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 select-none overflow-clip print:hidden forced-colors:hidden [.hc_&]:hidden">
      <div className="sticky top-24 h-[calc(100svh-6rem)] overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#eef5fc_58%,#e7f0fa_100%)] dark:bg-[linear-gradient(180deg,#071322_0%,#091a2e_60%,#0b1f36_100%)]">
        {/* Atmospheric glows */}
        <div className="absolute -left-[12%] -top-[10%] h-[70%] w-[60%] bg-[radial-gradient(closest-side,rgba(147,197,253,0.42),transparent)] dark:bg-[radial-gradient(closest-side,rgba(59,130,246,0.12),transparent)]" />
        <div className="absolute -right-[14%] top-[18%] h-[70%] w-[50%] bg-[radial-gradient(closest-side,rgba(196,181,253,0.3),transparent)] dark:bg-[radial-gradient(closest-side,rgba(139,92,246,0.1),transparent)]" />
        <div className="absolute left-[28%] top-[30%] h-[50%] w-[44%] bg-[radial-gradient(closest-side,rgba(255,255,255,0.75),transparent)] dark:hidden" />
        <div className="absolute -bottom-[12%] -left-[10%] -right-[10%] h-[55%] bg-[radial-gradient(closest-side,rgba(255,255,255,0.95),transparent)] dark:bg-[radial-gradient(closest-side,rgba(91,181,232,0.07),transparent)]" />

        <div className="absolute inset-0" style={{ maskImage: CLEAN_CENTRE, WebkitMaskImage: CLEAN_CENTRE }}>
          <Contours paths={CONTOURS_NE} className="w-[clamp(240px,30vw,520px)] text-[#3B82C4] opacity-45 dark:text-sky-300 dark:opacity-30" style={{ left: '86%', top: '20%' }} />
          <Contours paths={CONTOURS_SE} className="w-[clamp(220px,26vw,460px)] text-[#6d5bd0] opacity-35 dark:text-violet-300 dark:opacity-25" style={{ left: '90%', top: '74%' }} />
          <PolarInset
            map={ARCTIC_MAP}
            accent="text-[#8B5CF6] dark:text-[#a78bfa]"
            className="w-[clamp(220px,24vw,440px)] text-[#4a78ad] opacity-70 dark:text-[#8db8e8] dark:opacity-50"
            style={{ left: `${NORTH_POLE[0]}%`, top: `${NORTH_POLE[1]}%` }}
          />
          <PolarInset
            map={ANTARCTIC_MAP}
            accent="text-[#3B82C4] dark:text-[#5BB5E8]"
            className="w-[clamp(250px,28vw,500px)] text-[#4a78ad] opacity-70 dark:text-[#8db8e8] dark:opacity-50"
            style={{ left: `${SOUTH_POLE[0]}%`, top: `${SOUTH_POLE[1]}%` }}
          />
          <Routes />
        </div>

        <Mountains />
      </div>
    </div>
  );
}
