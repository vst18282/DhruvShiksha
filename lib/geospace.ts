/**
 * SIMULATED space-weather feed (demo). A bounded random walk with occasional
 * "CME arrivals" drives solar wind, IMF Bz, derived Kp, storm level, X-ray class
 * and ground magnetometer deviations at three demo stations.
 */
export interface SwSample {
  t: number;
  speed: number;
  density: number;
  bz: number;
  kp: number;
  xray: number; // log10 W/m²
  mag: { bharati: number; maitri: number; himadri: number };
}

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function kpFrom(speed: number, bz: number, density: number) {
  return clamp(Math.round(((speed - 320) / 110 + Math.max(0, -bz) / 3.2 + density / 18) * 3) / 3, 0, 9);
}

export function stormLevel(kp: number): { g: number; label: string } {
  const g = kp >= 9 ? 5 : kp >= 8 ? 4 : kp >= 7 ? 3 : kp >= 6 ? 2 : kp >= 5 ? 1 : 0;
  return { g, label: g ? `G${g}` : 'G0' };
}

export function xrayClass(logFlux: number): string {
  const letters = ['A', 'B', 'C', 'M', 'X'];
  const idx = clamp(Math.floor(logFlux + 8), 0, 4);
  const mant = Math.pow(10, logFlux - (idx - 8));
  return `${letters[idx]}${mant.toFixed(1)}`;
}

export function auroraProbability(kp: number) {
  return Math.round(clamp(12 + kp * 10, 0, 98));
}

export function nextSample(prev: SwSample, rand: () => number = Math.random, cme = false): SwSample {
  let speed = prev.speed + (rand() - 0.5) * 30 + (380 - prev.speed) * 0.02;
  let bz = prev.bz + (rand() - 0.5) * 2.2 + (0 - prev.bz) * 0.05;
  let density = prev.density + (rand() - 0.5) * 1.2 + (5 - prev.density) * 0.04;
  let xray = prev.xray + (rand() - 0.5) * 0.18 + (-6.4 - prev.xray) * 0.03;
  if (cme) {
    speed += 250 + rand() * 180;
    bz -= 10 + rand() * 8;
    density += 12;
  }
  if (rand() < 0.01) xray += 1.3 + rand();
  speed = clamp(speed, 280, 900);
  bz = clamp(bz, -25, 12);
  density = clamp(density, 0.5, 40);
  xray = clamp(xray, -8.3, -3.2);
  const kp = kpFrom(speed, bz, density);
  const base = -Math.pow(kp, 1.6) * 14;
  const noise = () => (rand() - 0.5) * 18;
  return {
    t: prev.t + 3000,
    speed: Math.round(speed),
    density: Math.round(density * 10) / 10,
    bz: Math.round(bz * 10) / 10,
    kp,
    xray,
    mag: { bharati: Math.round(base * 1.1 + noise()), maitri: Math.round(base * 0.95 + noise()), himadri: Math.round(base * 1.2 + noise()) },
  };
}

export function seedHistory(n = 600, now = Date.now()): SwSample[] {
  let s: SwSample = { t: now - n * 3000, speed: 390, density: 5, bz: -1, kp: 2, xray: -6.3, mag: { bharati: -10, maitri: -8, himadri: -12 } };
  const out: SwSample[] = [];
  for (let i = 0; i < n; i++) {
    s = nextSample(s, Math.random, i === Math.floor(n * 0.55));
    out.push(s);
  }
  return out;
}

export function impactsFor(g: number) {
  return {
    gps: g >= 3 ? 'Positioning errors of several metres; precision GNSS (surveying, aviation) degraded.' : g >= 1 ? 'Minor GNSS scintillation near the poles; small positioning errors possible.' : 'Normal GPS accuracy.',
    radio: g >= 3 ? 'HF radio blackouts on polar routes; flights may reroute away from the poles.' : g >= 1 ? 'Intermittent HF radio fade at high latitudes.' : 'HF radio propagation normal.',
    power: g >= 4 ? 'Voltage control problems possible; grid operators may take protective action.' : g >= 2 ? 'High-latitude power systems may see voltage alarms.' : 'No significant grid impact expected.',
  };
}
