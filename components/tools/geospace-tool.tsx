'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { geoPath, geoStereographic } from 'd3-geo';
import { Activity, AlertTriangle, Pause, Play, Radio, Satellite, Sun, Wind, Zap } from 'lucide-react';
import { ToolLayout } from './tool-layout';
import { ChartCard, LineMulti } from '@/components/charts/lazy';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/misc';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/misc';
import { getLand } from '@/lib/geo';
import { STATIONS } from '@/data/stations';
import { auroraProbability, impactsFor, nextSample, seedHistory, stormLevel, xrayClass, type SwSample } from '@/lib/geospace';
import { useReducedMotion } from 'framer-motion';
import { Skeleton } from '@/components/skeletons';
import { cn } from '@/lib/utils';

function KpGauge({ kp }: { kp: number }) {
  const a = Math.PI * (1 - kp / 9);
  const x = 100 + 80 * Math.cos(a);
  const y = 100 - 80 * Math.sin(a);
  const color = kp >= 7 ? '#ef4444' : kp >= 5 ? '#F59E0B' : kp >= 4 ? '#eab308' : '#22c55e';
  return (
    <svg viewBox="0 0 200 120" className="w-full" role="img" aria-label={`Kp index gauge reading ${kp.toFixed(1)} of 9`}>
      <defs>
        <linearGradient id="kpg" x1="0" x2="1">
          <stop offset="0" stopColor="#22c55e" />
          <stop offset="0.5" stopColor="#eab308" />
          <stop offset="0.75" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#ef4444" />
        </linearGradient>
      </defs>
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="url(#kpg)" strokeWidth="14" strokeLinecap="round" />
      {Array.from({ length: 10 }).map((_, i) => {
        const aa = Math.PI * (1 - i / 9);
        return <text key={i} x={100 + 62 * Math.cos(aa)} y={104 - 62 * Math.sin(aa)} fontSize="8" textAnchor="middle" fill="currentColor" opacity="0.7">{i}</text>;
      })}
      <line x1="100" y1="100" x2={x} y2={y} stroke={color} strokeWidth="4" strokeLinecap="round" style={{ transition: 'all 0.8s ease' }} />
      <circle cx="100" cy="100" r="6" fill={color} />
      <text x="100" y="118" textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor">Kp {kp.toFixed(1)}</text>
    </svg>
  );
}

function AuroraOval({ hemisphere, kp, hourUtc }: { hemisphere: 'north' | 'south'; kp: number; hourUtc: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const size = 260;
  const proj = useMemo(() => geoStereographic().rotate([0, hemisphere === 'north' ? -90 : 90]).clipAngle(50).scale(size / 1.9).translate([size / 2, size / 2]), [hemisphere]);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#030a18';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1b3558';
    ctx.beginPath();
    geoPath(proj, ctx)(getLand());
    ctx.fill();
    // Oval: centred slightly toward the night side (anti-sun), radius grows with Kp.
    const colat = 18 + kp * 1.6;
    const lat = hemisphere === 'north' ? 90 - colat : -90 + colat;
    const edge = proj([0, lat]);
    const r = edge ? Math.hypot(edge[0] - size / 2, edge[1] - size / 2) : 60;
    const nightLon = ((12 - hourUtc) * 15 + 180) % 360;
    const off = r * 0.18;
    const ang = ((nightLon - 90) * Math.PI) / 180 * (hemisphere === 'north' ? 1 : -1);
    const cx = size / 2 + Math.cos(ang) * off;
    const cy = size / 2 + Math.sin(ang) * off;
    const width = 6 + kp * 2.2;
    const g = ctx.createRadialGradient(cx, cy, Math.max(1, r - width), cx, cy, r + width);
    g.addColorStop(0, 'rgba(45,212,191,0)');
    g.addColorStop(0.5, `rgba(45,212,191,${0.45 + kp * 0.05})`);
    g.addColorStop(0.75, `rgba(139,92,246,${0.2 + kp * 0.04})`);
    g.addColorStop(1, 'rgba(139,92,246,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r + width, 0, Math.PI * 2);
    ctx.arc(cx, cy, Math.max(1, r - width), 0, Math.PI * 2, true);
    ctx.fill();
    // Stations
    STATIONS.filter((s) => (hemisphere === 'north' ? s.lat > 50 : s.lat < -50)).forEach((s) => {
      const p = proj([s.lon, s.lat]);
      if (!p) return;
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(p[0], p[1], 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '600 11px sans-serif';
      ctx.fillText(s.name, p[0] + 6, p[1] + 4);
    });
  }, [kp, hourUtc, proj, hemisphere]);
  return (
    <figure className="rounded-lg border bg-card p-2 text-center">
      <canvas ref={ref} width={size} height={size} className="mx-auto h-auto w-full max-w-[260px]" role="img" aria-label={`${hemisphere === 'north' ? 'Northern' : 'Southern'} aurora oval at Kp ${kp.toFixed(1)} (simulated)`} />
      <figcaption className="text-xs text-muted-foreground">{hemisphere === 'north' ? 'Aurora borealis (north)' : 'Aurora australis (south)'}</figcaption>
    </figure>
  );
}

export function GeospaceTool() {
  const reduce = useReducedMotion();
  // Deterministic placeholder for SSR; the random history is generated after mount.
  const [hist, setHist] = useState<SwSample[]>([{ t: 0, speed: 390, density: 5, bz: -1, kp: 2, xray: -6.3, mag: { bharati: 0, maitri: 0, himadri: 0 } }]);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [win, setWin] = useState('15');
  const [log, setLog] = useState<{ t: number; text: string; level: 'info' | 'warn' | 'alert' }[]>([]);
  const lastG = useRef(0);

  // Seed with real wall-clock times after mount (avoids hydration mismatch).
  useEffect(() => {
    setHist(seedHistory(600, Date.now()));
    setReady(true);
    setLog([{ t: Date.now(), text: 'Simulated feed started (demo data).', level: 'info' }]);
  }, []);

  useEffect(() => {
    if (paused || !ready) return;
    const id = setInterval(() => {
      setHist((h) => {
        const cme = Math.random() < 0.012;
        const s = nextSample(h[h.length - 1], Math.random, cme);
        const g = stormLevel(s.kp).g;
        const events: { t: number; text: string; level: 'info' | 'warn' | 'alert' }[] = [];
        if (cme) events.push({ t: s.t, text: `CME shock arrival: solar wind jumped to ${s.speed} km/s (demo).`, level: 'warn' });
        if (g !== lastG.current) {
          events.push({ t: s.t, text: g > lastG.current ? `Geomagnetic storm level raised to G${g}.` : `Storm level eased to ${g ? `G${g}` : 'quiet (G0)'}.`, level: g >= 2 ? 'alert' : 'info' });
          lastG.current = g;
        }
        if (s.xray > -5 && h[h.length - 1].xray <= -5) events.push({ t: s.t, text: `${xrayClass(s.xray)} solar flare detected — possible HF radio blackout on the sunlit side.`, level: 'alert' });
        if (events.length) setLog((l) => [...events, ...l].slice(0, 40));
        return [...h.slice(-599), s];
      });
    }, reduce ? 4500 : 3000);
    return () => clearInterval(id);
  }, [paused, ready, reduce]);

  const cur = hist[hist.length - 1];
  const storm = stormLevel(cur.kp);
  const imp = impactsFor(storm.g);
  const n = Number(win) * 20;
  const series = hist.slice(-n).map((s) => ({ time: new Date(s.t).toISOString().slice(11, 19), Bharati: s.mag.bharati, Maitri: s.mag.maitri, Himadri: s.mag.himadri, speed: s.speed, bz: s.bz }));
  const hourUtc = ready ? new Date(cur.t).getUTCHours() : 0;

  return (
    <ToolLayout
      title="Geospace Observatory"
      hero={{ lead: 'Geospace', script: 'observatory', image: 'aurora-arc' }}
      intro="A simulated space-weather dashboard: solar wind, the Kp index, storm levels, X-ray flares and the aurora ovals over both poles."
      demoNote="All values are SIMULATED demo data generated in your browser every few seconds — not a real space-weather feed."
      howTo={[
        'Watch the live (simulated) values update every 3 seconds; pause or resume anytime.',
        'The Kp gauge and storm badge summarise geomagnetic activity.',
        'The aurora ovals grow toward the equator as Kp rises.',
        'Change the time window on the magnetometer chart (5, 15 or 30 minutes).',
        'Check the event log and alert banners, then read what it means for GPS, radio and power grids.',
      ]}
      science={{
        expert: 'Solar wind speed, density and the southward component of the interplanetary magnetic field (IMF Bz < 0) control dayside reconnection and energy input to the magnetosphere. The planetary Kp index (quasi-logarithmic, 0–9) summarises 3-hour geomagnetic disturbance; NOAA G-scale storms map to Kp 5–9. Ground magnetometers at high latitudes record H-component depressions from auroral electrojets. This page uses a synthetic random-walk model for teaching.',
        general: 'The Sun constantly blows a stream of particles called the solar wind. When its magnetic field points south, it links with Earth’s field and pours energy in — this causes geomagnetic storms and bright auroras near the poles. Stations like Bharati and Himadri measure these changes with magnetometers.',
        class8: 'Space has weather too! When the Sun sends out a big burst of particles, it shakes Earth’s magnetic bubble and makes the northern and southern lights dance. Scientists at India’s polar stations watch this all the time. (This dashboard uses pretend data.)',
      }}
      glossary={['aurora', 'kp-index', 'solar-wind', 'magnetometer']}
      related={[{ label: 'Report: Geomagnetic observations at Bharati', href: '/reports/rep-bharati-aurora' }, { label: 'Blog: What makes the aurora glow?', href: '/blog/blog-aurora-explained' }, { label: 'Quiz: Auroras and space weather', href: '/learn/quizzes/quiz-space-weather' }]}
      aside={
        <>
          <div className="rounded-lg border bg-card p-4">
            <p className="mb-2 text-sm font-semibold">Event log</p>
            <ul className="max-h-72 space-y-1.5 overflow-y-auto text-xs" aria-live="polite">
              {log.map((e, i) => (
                <li key={i} className={cn('rounded-md border p-2', e.level === 'alert' && 'border-destructive/40 bg-destructive/5', e.level === 'warn' && 'border-polar-amber/40 bg-polar-amber/10')}>
                  <span className="font-mono text-muted-foreground">{new Date(e.t).toISOString().slice(11, 19)}Z</span> {e.text}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2 rounded-lg border bg-card p-4 text-sm">
            <p className="font-semibold">What does this mean?</p>
            <p className="flex gap-2"><Satellite className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden /><span><strong>GPS:</strong> {imp.gps}</span></p>
            <p className="flex gap-2"><Radio className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden /><span><strong>Radio:</strong> {imp.radio}</span></p>
            <p className="flex gap-2"><Zap className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden /><span><strong>Power grids:</strong> {imp.power}</span></p>
          </div>
        </>
      }
    >
      {!ready ? (
        <div className="space-y-3" role="status" aria-label="Starting simulated feed">
          <Skeleton className="h-10 w-full" />
          <div className="grid gap-3 sm:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
      <div className="space-y-4">
        {storm.g >= 2 && (
          <div role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium">
            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden /> {storm.label} geomagnetic storm watch (demo) — aurora may be visible at lower latitudes.
          </div>
        )}
        {cur.xray > -5 && (
          <div role="alert" className="flex items-center gap-2 rounded-lg border border-polar-amber/50 bg-polar-amber/10 px-4 py-3 text-sm font-medium">
            <Sun className="h-5 w-5 text-polar-amber" aria-hidden /> {xrayClass(cur.xray)} flare in progress (demo) — HF radio fade possible on the dayside.
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="warning">SIMULATED</Badge>
          <span className="text-xs text-muted-foreground">Last update {ready ? new Date(cur.t).toISOString().slice(11, 19) : '--:--:--'} UTC</span>
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => setPaused(!paused)} aria-pressed={paused}>{paused ? <Play /> : <Pause />} {paused ? 'Resume' : 'Pause'}</Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border bg-card p-3 sm:row-span-2">
            <KpGauge kp={cur.kp} />
            <div className="mt-2 flex items-center justify-center gap-2">
              <Badge variant={storm.g >= 3 ? 'destructive' : storm.g >= 1 ? 'warning' : 'success'} className="text-sm">{storm.g ? `${storm.label} storm` : 'Quiet (G0)'}</Badge>
            </div>
          </div>
          {[
            { icon: Wind, label: 'Solar wind speed', value: `${cur.speed} km/s` },
            { icon: Activity, label: 'Density', value: `${cur.density} p/cm³` },
            { icon: Activity, label: 'IMF Bz', value: `${cur.bz > 0 ? '+' : ''}${cur.bz} nT`, hint: cur.bz < -5 ? 'southward — energy enters' : 'northward / weak' },
            { icon: Sun, label: 'X-ray flux class', value: xrayClass(cur.xray) },
            { icon: Sparkle, label: 'Aurora probability (polar)', value: `${auroraProbability(cur.kp)}%` },
          ].map((c) => (
            <div key={c.label} className="rounded-lg border bg-card p-3" aria-live="polite">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><c.icon className="h-3.5 w-3.5" aria-hidden /> {c.label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{c.value}</p>
              {'hint' in c && c.hint && <p className="text-[11px] text-muted-foreground">{c.hint}</p>}
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <AuroraOval hemisphere="north" kp={cur.kp} hourUtc={hourUtc} />
          <AuroraOval hemisphere="south" kp={cur.kp} hourUtc={hourUtc} />
        </div>
        <ChartCard
          title="Magnetometer H-component deviation (nT) — demo stations"
          action={
            <ToggleGroup type="single" value={win} onValueChange={(v) => v && setWin(v)} aria-label="Time window">
              <ToggleGroupItem value="5" className="h-7 text-xs">5 min</ToggleGroupItem>
              <ToggleGroupItem value="15" className="h-7 text-xs">15 min</ToggleGroupItem>
              <ToggleGroupItem value="30" className="h-7 text-xs">30 min</ToggleGroupItem>
            </ToggleGroup>
          }
        >
          <LineMulti data={series} x="time" ys={[{ key: 'Bharati', color: '#3B82C4' }, { key: 'Maitri', color: '#2DD4BF' }, { key: 'Himadri', color: '#8B5CF6' }]} label="Real-time magnetometer traces (simulated)" height={240} />
        </ChartCard>
        <ChartCard title="Solar wind speed (km/s) and IMF Bz (nT)">
          <LineMulti data={series} x="time" ys={[{ key: 'speed', name: 'Speed', color: '#F59E0B' }, { key: 'bz', name: 'Bz', color: '#ef4444' }]} label="Solar wind speed and Bz (simulated)" height={200} />
        </ChartCard>
        <Collapsible className="rounded-lg border bg-card">
          <CollapsibleTrigger className="w-full px-4 py-3 text-left text-sm font-semibold">Learn: how the poles see the Sun ▾</CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 px-4 pb-4 text-sm text-muted-foreground">
            <p>Earth’s magnetic field lines converge near the poles, funnelling charged particles from the solar wind down into the upper atmosphere around 100–300 km altitude.</p>
            <p>There they collide with oxygen (green and red light) and nitrogen (blue and purple), drawing a ring of light — the auroral oval — around each magnetic pole.</p>
            <p>Stations such as Bharati (south) and Himadri (north) sit close to these ovals, making them ideal places to record magnetic storms and photograph auroras.</p>
          </CollapsibleContent>
        </Collapsible>
      </div>
      )}
    </ToolLayout>
  );
}

function Sparkle(props: { className?: string }) {
  return <Zap {...props} />;
}
