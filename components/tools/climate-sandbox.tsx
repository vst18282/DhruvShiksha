'use client';

import { useMemo, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import { AlertTriangle, Copy, RotateCcw, Save, Target, Trophy } from 'lucide-react';
import { ToolLayout } from './tool-layout';
import { ChartCard, LineMulti } from '@/components/charts/lazy';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress, Slider, Switch } from '@/components/ui/misc';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ELEMENTS, INTERACTIONS, PATHWAY_DEFAULTS, indiaImpacts, simulate, type ElementState, type Pathway, type ScenarioInput, type ScenarioResult } from '@/lib/climate-model';
import { cn } from '@/lib/utils';

const STATE_STYLE: Record<ElementState, { label: string; color: string; badge: 'success' | 'warning' | 'destructive' }> = {
  safe: { label: 'Safe', color: '#22c55e', badge: 'success' },
  at_risk: { label: 'At risk', color: '#F59E0B', badge: 'warning' },
  tipped: { label: 'Tipped', color: '#ef4444', badge: 'destructive' },
};

function Cascade({ r }: { r: ScenarioResult }) {
  const reduce = useReducedMotion();
  const W = 420, H = 300, cx = W / 2, cy = H / 2, R = 115;
  const pos = Object.fromEntries(ELEMENTS.map((e, i) => {
    const a = (i / ELEMENTS.length) * Math.PI * 2 - Math.PI / 2;
    return [e.id, [cx + R * Math.cos(a) * 1.35, cy + R * Math.sin(a)]];
  })) as Record<string, [number, number]>;
  const st = Object.fromEntries(r.elements.map((e) => [e.id, e.state]));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Cascade diagram showing how tipped elements push others">
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="currentColor" /></marker>
      </defs>
      <style>{`@keyframes cascade-dash { to { stroke-dashoffset: -20; } }`}</style>
      {INTERACTIONS.map((i) => {
        const [x1, y1] = pos[i.from];
        const [x2, y2] = pos[i.to];
        const active = st[i.from] === 'tipped';
        const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
        const ex = x2 - (dx / len) * 26, ey = y2 - (dy / len) * 26;
        return (
          <line key={i.from + i.to} x1={x1 + (dx / len) * 26} y1={y1 + (dy / len) * 26} x2={ex} y2={ey} stroke={active ? '#ef4444' : 'hsl(var(--border))'} className={active ? 'text-destructive' : 'text-border'} strokeWidth={active ? 2.5 : 1.5} strokeDasharray={active ? '6 4' : undefined} markerEnd="url(#arr)" style={active && !reduce ? { animation: 'cascade-dash 1s linear infinite' } : undefined} />
        );
      })}
      {ELEMENTS.map((e) => {
        const [x, y] = pos[e.id];
        const s = STATE_STYLE[st[e.id] as ElementState];
        return (
          <g key={e.id} transform={`translate(${x} ${y})`}>
            <circle r="24" fill={s.color} fillOpacity={0.2} stroke={s.color} strokeWidth="2.5" />
            <text textAnchor="middle" y="4" fontSize="9" fontWeight="600" fill="currentColor">{e.short.split(' ')[0]}</text>
            <text textAnchor="middle" y="38" fontSize="9" fill="currentColor" opacity="0.8">{e.short.includes(' ') ? e.short.split(' ').slice(1).join(' ') : s.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function ClimateSandbox() {
  const [input, setInput] = useState<ScenarioInput>({ pathway: 'medium', peak: 2.7, horizon: 2100, overshoot: 10 });
  const [saved, setSaved] = useState<{ A?: ScenarioResult; B?: ScenarioResult }>({});
  const [challenge, setChallenge] = useState(false);
  const [target, setTarget] = useState(1.8);
  const [goal, setGoal] = useState(5);
  const r = useMemo(() => simulate(input), [input]);
  const safeCount = r.elements.filter((e) => e.state !== 'tipped').length;
  const pass = r.peakWarming <= target + 0.05 && safeCount >= goal;
  const score = Math.max(0, Math.round(safeCount * 120 - Math.max(0, r.peakWarming - 1.5) * 150 - r.seaLevel2100 * 100));
  const impacts = indiaImpacts(r);

  const chartData = useMemo(() => {
    const byYear = new Map<number, Record<string, number>>();
    const put = (res: ScenarioResult | undefined, suffix: string) =>
      res?.rows.forEach((row) => byYear.set(row.year, { ...(byYear.get(row.year) ?? { year: row.year }), [`sl${suffix}`]: row.seaLevel, [`t${suffix}`]: row.warming, [`ai${suffix}`]: row.arcticIce, [`si${suffix}`]: row.southernIce }));
    put(r, '');
    put(saved.A, 'A');
    put(saved.B, 'B');
    return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
  }, [r, saved]);

  const setPathway = (p: Pathway) => setInput({ ...input, pathway: p, peak: PATHWAY_DEFAULTS[p].peak });
  const shareText = `My DhruvShiksha Climate Sandbox run: ${PATHWAY_DEFAULTS[input.pathway].label}, peak ${r.peakWarming} °C → ${safeCount}/7 tipping elements safe, ~${Math.round(r.seaLevel2100 * 100)} cm sea-level rise by ${input.horizon}. Score ${score}. (Educational toy model)`;

  return (
    <ToolLayout
      title="Climate Sandbox — Tipping Points"
      eyebrow="Scientific tool · Tipping points"
      hero={{ lead: 'Climate', script: 'sandbox', image: 'glacier-calving' }}
      intro="Change the warming path and see which polar and climate tipping elements stay safe, become at risk, or tip — and what cascades follow."
      demoNote="Educational model — indicative, not a scientific projection. Thresholds and effects are simplified for learning."
      howTo={[
        'Pick an emissions pathway preset, then fine-tune the peak warming level.',
        'Move the time horizon to see how states change by a given year.',
        'For the low pathway, set how long warming overshoots before declining.',
        'Watch the cascade diagram: red animated arrows show a tipped element pushing another.',
        'Save scenarios A and B to compare, or turn on Challenge mode.',
      ]}
      science={{
        expert: 'Tipping elements are sub-systems that can cross a critical threshold into a qualitatively different, often self-sustaining state. This toy model integrates a logistic exceedance probability over time (a proxy for committed change), applies inter-element coupling as additive effective warming, and implements hysteresis via a lower recovery threshold. It omits timescale-dependent dynamics, spatial patterns and carbon-cycle feedback magnitudes beyond a simple permafrost term.',
        general: 'Some parts of the climate system behave like a tipping chair: push a little and it wobbles back, push too far and it falls. Ice sheets, sea ice and ocean currents may have such thresholds. If one tips, it can nudge others — a “cascade”. Keeping warming low keeps more elements safe.',
        class8: 'Imagine a row of dominoes made of ice and ocean currents. If the Earth warms too much, one domino can fall and knock the next. In this game, try to keep as many dominoes standing as you can! (It is a simple learning game, not a real forecast.)',
      }}
      glossary={['tipping-point', 'permafrost', 'sea-ice', 'mass-balance']}
      related={[{ label: 'Blog: Climate tipping points in plain language', href: '/blog/blog-climate-tipping-points' }, { label: 'Blog: Why the poles matter for India', href: '/blog/blog-why-poles-matter-india' }, { label: 'Satellite & ice data', href: '/tools/satellite' }]}
      aside={
        <>
          <div className="space-y-4 rounded-lg border bg-card p-4">
            <p className="text-sm font-semibold">Scenario</p>
            <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label="Emissions pathway">
              {(['low', 'medium', 'high'] as Pathway[]).map((p) => (
                <button key={p} type="button" role="radio" aria-checked={input.pathway === p} onClick={() => setPathway(p)} className={cn('rounded-md border py-1.5 text-xs capitalize', input.pathway === p && 'border-primary bg-primary/10 font-semibold')}>{p}</button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{PATHWAY_DEFAULTS[input.pathway].note}</p>
            <div>
              <Label id="pk">Peak warming: {input.peak.toFixed(1)} °C above pre-industrial</Label>
              <Slider min={0.5} max={5} step={0.1} value={[input.peak]} onValueChange={(v) => setInput({ ...input, peak: v[0] })} aria-labelledby="pk" />
            </div>
            <div>
              <Label id="hz">Time horizon: {input.horizon}</Label>
              <Slider min={2030} max={2100} step={1} value={[input.horizon]} onValueChange={(v) => setInput({ ...input, horizon: v[0] })} aria-labelledby="hz" />
            </div>
            <div>
              <Label id="os">Overshoot duration: {input.overshoot} years {input.pathway !== 'low' && <span className="text-muted-foreground">(low pathway only)</span>}</Label>
              <Slider min={0} max={40} step={1} value={[input.overshoot]} onValueChange={(v) => setInput({ ...input, overshoot: v[0] })} aria-labelledby="os" disabled={input.pathway !== 'low'} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button size="sm" variant="outline" onClick={() => { setSaved({ ...saved, A: r }); toast.success('Saved as scenario A'); }}><Save /> A</Button>
              <Button size="sm" variant="outline" onClick={() => { setSaved({ ...saved, B: r }); toast.success('Saved as scenario B'); }}><Save /> B</Button>
              <Button size="sm" variant="ghost" onClick={() => { setInput({ pathway: 'medium', peak: 2.7, horizon: 2100, overshoot: 10 }); setSaved({}); }}><RotateCcw /> Reset</Button>
            </div>
          </div>
          <div className="space-y-3 rounded-lg border bg-card p-4">
            <label className="flex items-center justify-between text-sm font-semibold"><span className="flex items-center gap-1.5"><Target className="h-4 w-4 text-polar-amber" aria-hidden /> Challenge mode</span><Switch checked={challenge} onCheckedChange={setChallenge} aria-label="Challenge mode" /></label>
            {challenge && (
              <>
                <div className="flex items-center gap-2 text-xs">
                  Keep warming ≤
                  <Select value={String(target)} onValueChange={(v) => setTarget(Number(v))}><SelectTrigger className="h-8 w-20 text-xs" aria-label="Target warming"><SelectValue /></SelectTrigger><SelectContent>{[1.5, 1.8, 2, 2.5].map((t) => <SelectItem key={t} value={String(t)}>{t} °C</SelectItem>)}</SelectContent></Select>
                  and save ≥
                  <Select value={String(goal)} onValueChange={(v) => setGoal(Number(v))}><SelectTrigger className="h-8 w-16 text-xs" aria-label="Elements to save"><SelectValue /></SelectTrigger><SelectContent>{[3, 4, 5, 6, 7].map((g) => <SelectItem key={g} value={String(g)}>{g}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className={cn('rounded-md p-3 text-sm', pass ? 'bg-success/10' : 'bg-destructive/10')} role="status" aria-live="polite">
                  <p className="flex items-center gap-2 font-semibold"><Trophy className={cn('h-4 w-4', pass ? 'text-success' : 'text-destructive')} aria-hidden /> {pass ? 'Challenge passed!' : 'Not yet — try a lower peak'}</p>
                  <p className="text-xs">Score {score} · {safeCount}/7 safe · peak {r.peakWarming} °C</p>
                </div>
                <div className="rounded-md border bg-gradient-to-br from-polar-navy to-[#123a63] p-3 text-xs text-white">
                  <p className="font-semibold">Share card</p>
                  <p className="mt-1 text-white/85">{shareText}</p>
                  <Button size="sm" variant="aurora" className="mt-2" onClick={async () => { await navigator.clipboard?.writeText(shareText); toast.success('Result copied'); }}><Copy /> Copy result</Button>
                </div>
              </>
            )}
          </div>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">Peak warming</p><p className="text-2xl font-semibold">{r.peakWarming} °C</p></div>
          <div className="rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">Sea-level rise by {input.horizon}</p><p className="text-2xl font-semibold">{Math.round(r.seaLevel2100 * 100)} cm</p></div>
          <div className="rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">Elements safe / at risk</p><p className="text-2xl font-semibold">{r.elements.filter((e) => e.state === 'safe').length} / {r.elements.filter((e) => e.state === 'at_risk').length}</p></div>
          <div className="rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">Tipped</p><p className="text-2xl font-semibold text-destructive">{r.elements.filter((e) => e.state === 'tipped').length}</p></div>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Tipping elements">
          {ELEMENTS.map((e) => {
            const res = r.elements.find((x) => x.id === e.id)!;
            const s = STATE_STYLE[res.state];
            return (
              <li key={e.id} className="rounded-lg border bg-card p-3" style={{ borderLeft: `4px solid ${s.color}` }}>
                <div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold">{e.name}</p><Badge variant={s.badge}>{s.label}</Badge></div>
                <p className="mt-1 text-xs text-muted-foreground">{e.blurb}</p>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <Progress value={res.probability * 100} className="h-1.5 flex-1" indicatorClassName={res.state === 'tipped' ? 'bg-destructive' : res.state === 'at_risk' ? 'bg-polar-amber' : 'bg-success'} aria-label={`${e.name} exceedance probability ${Math.round(res.probability * 100)}%`} />
                  <span className="tabular-nums">{Math.round(res.probability * 100)}%</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">Threshold ~{e.threshold} ± {e.uncertainty} °C{res.tippedYear ? ` · tipped in ${res.tippedYear}` : ''}</p>
              </li>
            );
          })}
        </ul>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Sea-level rise (m, relative to 2025)">
            <LineMulti data={chartData} x="year" ys={[{ key: 'sl', name: 'Current', color: '#3B82C4' }, ...(saved.A ? [{ key: 'slA', name: 'Scenario A', color: '#8B5CF6', dashed: true }] : []), ...(saved.B ? [{ key: 'slB', name: 'Scenario B', color: '#F59E0B', dashed: true }] : [])]} label="Sea-level rise over time" />
          </ChartCard>
          <ChartCard title="Warming path & sea-ice extent">
            <LineMulti data={chartData} x="year" ys={[{ key: 't', name: 'Warming °C', color: '#ef4444' }, { key: 'ai', name: 'Arctic Sept ice (M km²)', color: '#8B5CF6' }, { key: 'si', name: 'S. Ocean min ice (M km²)', color: '#2DD4BF' }]} label="Warming and sea-ice extent over time" />
          </ChartCard>
          <ChartCard title="Cascade diagram"><Cascade r={r} /></ChartCard>
          <section className="rounded-lg border bg-card p-4" aria-labelledby="india">
            <h2 id="india" className="mb-2 flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-polar-amber" aria-hidden /> Impact for India (qualitative)</h2>
            <ul className="space-y-2 text-sm">{impacts.map((i) => <li key={i} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />{i}</li>)}</ul>
          </section>
        </div>

        {(saved.A || saved.B) && (
          <section aria-labelledby="cmp" className="overflow-x-auto rounded-lg border bg-card p-4">
            <h2 id="cmp" className="mb-2 text-sm font-semibold">Scenario comparison</h2>
            <table className="w-full text-sm">
              <thead className="border-b text-left"><tr><th scope="col" className="py-1">Element</th>{saved.A && <th scope="col">A ({PATHWAY_DEFAULTS[saved.A.input.pathway].label}, {saved.A.input.peak} °C)</th>}{saved.B && <th scope="col">B ({PATHWAY_DEFAULTS[saved.B.input.pathway].label}, {saved.B.input.peak} °C)</th>}</tr></thead>
              <tbody>
                {ELEMENTS.map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="py-1">{e.name}</td>
                    {saved.A && <td><Badge variant={STATE_STYLE[saved.A.elements.find((x) => x.id === e.id)!.state].badge}>{STATE_STYLE[saved.A.elements.find((x) => x.id === e.id)!.state].label}</Badge></td>}
                    {saved.B && <td><Badge variant={STATE_STYLE[saved.B.elements.find((x) => x.id === e.id)!.state].badge}>{STATE_STYLE[saved.B.elements.find((x) => x.id === e.id)!.state].label}</Badge></td>}
                  </tr>
                ))}
                <tr><td className="py-1 font-medium">Sea-level rise</td>{saved.A && <td>{Math.round(saved.A.seaLevel2100 * 100)} cm</td>}{saved.B && <td>{Math.round(saved.B.seaLevel2100 * 100)} cm</td>}</tr>
              </tbody>
            </table>
          </section>
        )}
      </div>
    </ToolLayout>
  );
}
