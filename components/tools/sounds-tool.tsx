'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { AudioLines, Moon, Pause, Play, Repeat, Square, Timer, Volume2 } from 'lucide-react';
import { ToolLayout } from './tool-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider, Switch } from '@/components/ui/misc';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/misc';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SOUNDSCAPES, SoundEngine, type SoundId } from '@/lib/audio/soundscapes';
import { cn } from '@/lib/utils';

const PRESETS: { name: string; mix: Partial<Record<SoundId, number>> }[] = [
  { name: 'Blizzard night at Maitri', mix: { 'katabatic-wind': 0.8, 'station-hum': 0.4 } },
  { name: 'Summer colony at Bharati', mix: { 'penguin-colony': 0.6, 'ocean-swell': 0.5, 'seal-calls': 0.3 } },
  { name: 'Polar night & aurora', mix: { aurora: 0.6, 'katabatic-wind': 0.25, 'ice-cracking': 0.3 } },
];

function Visualiser({ engine, mode }: { engine: SoundEngine | null; mode: 'wave' | 'spectrogram' }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    const cv = ref.current;
    if (!cv || !engine) return;
    const ctx = cv.getContext('2d')!;
    const an = engine.analyser;
    const buf = new Uint8Array(an.frequencyBinCount);
    let raf = 0;
    let last = 0;
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (reduce && t - last < 120) return;
      last = t;
      const W = cv.width;
      const H = cv.height;
      if (mode === 'wave') {
        an.getByteTimeDomainData(buf);
        ctx.fillStyle = '#0B1F3A';
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#2DD4BF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < buf.length; i++) {
          const x = (i / buf.length) * W;
          const y = (buf[i] / 255) * H;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else {
        an.getByteFrequencyData(buf);
        const img = ctx.getImageData(1, 0, W - 1, H);
        ctx.putImageData(img, 0, 0);
        const bins = Math.min(buf.length, 512);
        for (let y = 0; y < H; y++) {
          const v = buf[Math.floor(((H - y) / H) * bins)];
          ctx.fillStyle = `hsl(${260 - v * 0.8}, 80%, ${Math.max(6, v / 3)}%)`;
          ctx.fillRect(W - 1, y, 1, 1);
        }
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [engine, mode, reduce]);
  return <canvas ref={ref} width={640} height={160} className="h-40 w-full rounded-md bg-polar-navy" role="img" aria-label={`Live ${mode === 'wave' ? 'waveform' : 'spectrogram'} of the playing sounds`} />;
}

export function SoundsTool() {
  const engine = useRef<SoundEngine | null>(null);
  const [ready, setReady] = useState<SoundEngine | null>(null);
  const [playing, setPlaying] = useState<SoundId[]>([]);
  const [vol, setVol] = useState<Record<SoundId, number>>(() => Object.fromEntries(SOUNDSCAPES.map((s) => [s.id, 0.7])) as Record<SoundId, number>);
  const [master, setMaster] = useState(0.8);
  const [loop, setLoop] = useState(true);
  const [mode, setMode] = useState<'wave' | 'spectrogram'>('wave');
  const [focus, setFocus] = useState<SoundId>('katabatic-wind');
  const [sleepAt, setSleepAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const stopTimers = useRef<Map<SoundId, ReturnType<typeof setTimeout>>>(new Map());

  const ensure = () => {
    if (!engine.current) {
      engine.current = new SoundEngine();
      setReady(engine.current);
    }
    return engine.current;
  };
  useEffect(() => () => engine.current?.dispose(), []);
  useEffect(() => {
    if (!sleepAt) return;
    const t = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= sleepAt) {
        engine.current?.stopAll();
        setPlaying([]);
        setSleepAt(null);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [sleepAt]);

  const play = async (id: SoundId, v = vol[id]) => {
    const e = ensure();
    await e.play(id, v);
    setPlaying(e.playing());
    setFocus(id);
    if (!loop) {
      const prev = stopTimers.current.get(id);
      if (prev) clearTimeout(prev);
      stopTimers.current.set(id, setTimeout(() => { e.stop(id); setPlaying(e.playing()); }, 30_000));
    }
  };
  const stop = (id: SoundId) => {
    engine.current?.stop(id);
    setPlaying(engine.current?.playing() ?? []);
  };
  const applyPreset = async (mix: Partial<Record<SoundId, number>>) => {
    const e = ensure();
    e.stopAll();
    const nv = { ...vol, ...mix } as Record<SoundId, number>;
    setVol(nv);
    for (const id of Object.keys(mix) as SoundId[]) await e.play(id, nv[id]);
    setPlaying(e.playing());
  };
  const cur = SOUNDSCAPES.find((s) => s.id === focus)!;
  const mins = sleepAt ? Math.max(0, Math.ceil((sleepAt - now) / 60000)) : 0;

  return (
    <ToolLayout
      title="Sounds of the Pole"
      hero={{ lead: 'Sounds of the', script: 'pole', image: 'pressure-ridge' }}
      intro="Listen to — and mix — the soundscapes of Antarctica and the Arctic. Every sound here is synthesised in your browser for the demo."
      demoNote="All sounds are synthesised for demo with the Web Audio API — they imitate, but are not, real field recordings."
      howTo={[
        'Press play on any card. Sounds can be layered — each card’s slider is its mixer channel.',
        'Try a preset scene, or build your own polar scene.',
        'Switch the visualiser between waveform and spectrogram.',
        'Set a sleep timer to fade everything out.',
        'Read the caption panel to learn what you are hearing and where (demo).',
      ]}
      science={{
        expert: 'Polar acoustics are shaped by low ambient noise, sea-ice cover and temperature/salinity-driven sound-speed profiles. Ice cracking produces broadband transients; Weddell seals emit frequency-modulated calls spanning ~0.1–12 kHz; iceberg calving and ice-sheet “quakes” generate infrasound and low-frequency rumbles. Data sonification maps variables (e.g. magnetometer H-component) to pitch and timbre.',
        general: 'Scientists use underwater microphones (hydrophones) and weather stations to “listen” to the poles. Cracking ice tells us about stresses in the sea ice, seal calls reveal where animals live under the ice, and turning data into sound (sonification) helps people notice patterns.',
        class8: 'The poles are noisy! Ice cracks and booms, seals sing under the ice, and thousands of penguins squawk at once. Here you can mix these sounds like a DJ — but remember, these are pretend sounds made by the computer.',
      }}
      glossary={['katabatic-wind', 'calving', 'adelie-penguin', 'aurora']}
      related={[{ label: 'Blog: Counting penguins', href: '/blog/blog-adelie-census' }, { label: 'Blog: Blizzards and katabatic winds', href: '/blog/blog-maitri-met' }, { label: 'Geospace observatory', href: '/tools/geospace' }]}
      aside={
        <>
          <div className="rounded-lg border bg-card p-4" aria-live="polite">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">What you are hearing</p>
            <p className="font-semibold">{cur.title}</p>
            <p className="mt-1 text-sm">{cur.what}</p>
            <dl className="mt-2 grid grid-cols-[70px_1fr] gap-1 text-xs"><dt className="text-muted-foreground">Where</dt><dd>{cur.where}</dd><dt className="text-muted-foreground">Season</dt><dd>{cur.season}</dd></dl>
            <p className="mt-3 text-xs font-semibold">Captions</p>
            <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">{cur.captions.map((c) => <li key={c}>{c}</li>)}</ul>
            <Badge variant="warning" className="mt-3">Synthesised for demo</Badge>
          </div>
          <div className="space-y-3 rounded-lg border bg-card p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold"><Volume2 className="h-4 w-4" aria-hidden /> Mixer</p>
            <div>
              <label className="text-xs" id="mv">Master volume</label>
              <Slider min={0} max={1} step={0.01} value={[master]} onValueChange={(v) => { setMaster(v[0]); engine.current?.setMaster(v[0]); }} aria-labelledby="mv" />
            </div>
            {playing.length === 0 ? <p className="text-xs text-muted-foreground">Nothing playing.</p> : (
              <ul className="space-y-2">
                {playing.map((id) => (
                  <li key={id} className="text-xs">
                    <div className="flex items-center justify-between"><span>{SOUNDSCAPES.find((s) => s.id === id)?.title}</span><button type="button" onClick={() => stop(id)} className="text-muted-foreground hover:text-destructive" aria-label={`Stop ${id}`}>Stop</button></div>
                    <Slider min={0} max={1} step={0.01} value={[vol[id]]} onValueChange={(v) => { setVol({ ...vol, [id]: v[0] }); engine.current?.setVolume(id, v[0]); }} aria-label={`${id} volume`} />
                  </li>
                ))}
              </ul>
            )}
            <Button size="sm" variant="outline" className="w-full" disabled={!playing.length} onClick={() => { engine.current?.stopAll(); setPlaying([]); }}><Square /> Stop all</Button>
            <label className="flex items-center justify-between text-xs"><span className="flex items-center gap-1"><Repeat className="h-3.5 w-3.5" aria-hidden /> Loop (off = stop after 30 s)</span><Switch checked={loop} onCheckedChange={setLoop} aria-label="Loop sounds" /></label>
            <div className="flex items-center gap-2 text-xs">
              <Timer className="h-3.5 w-3.5" aria-hidden />
              <Select value={sleepAt ? 'on' : 'off'} onValueChange={(v) => setSleepAt(v === 'off' ? null : Date.now() + Number(v) * 60000)}>
                <SelectTrigger className="h-8 flex-1 text-xs" aria-label="Sleep timer"><SelectValue placeholder="Sleep timer" /></SelectTrigger>
                <SelectContent><SelectItem value="off">Sleep timer off</SelectItem><SelectItem value="1">1 minute</SelectItem><SelectItem value="5">5 minutes</SelectItem><SelectItem value="15">15 minutes</SelectItem><SelectItem value="30">30 minutes</SelectItem>{sleepAt && <SelectItem value="on">Running…</SelectItem>}</SelectContent>
              </Select>
              {sleepAt && <span className="flex items-center gap-1"><Moon className="h-3 w-3" aria-hidden />{mins}m</span>}
            </div>
          </div>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold"><AudioLines className="h-4 w-4 text-primary" aria-hidden /> Live visualiser</p>
            <ToggleGroup type="single" value={mode} onValueChange={(v) => v && setMode(v as 'wave' | 'spectrogram')} aria-label="Visualiser mode">
              <ToggleGroupItem value="wave" className="text-xs">Waveform</ToggleGroupItem>
              <ToggleGroupItem value="spectrogram" className="text-xs">Spectrogram</ToggleGroupItem>
            </ToggleGroup>
          </div>
          {ready ? <Visualiser engine={ready} mode={mode} /> : <div className="flex h-40 items-center justify-center rounded-md bg-polar-navy text-sm text-white/70">Press play to start the audio engine</div>}
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Preset scenes">
          {PRESETS.map((p) => <Button key={p.name} size="sm" variant="secondary" onClick={() => applyPreset(p.mix)}>{p.name}</Button>)}
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SOUNDSCAPES.map((s) => {
            const on = playing.includes(s.id);
            return (
              <li key={s.id} className={cn('rounded-lg border bg-card p-4 transition-shadow', on && 'shadow-md ring-2 ring-primary/40')} style={{ borderTop: `3px solid ${s.color}` }}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{s.title}</p>
                  <Button size="icon" variant={on ? 'default' : 'outline'} onClick={() => (on ? stop(s.id) : play(s.id))} aria-label={on ? `Pause ${s.title}` : `Play ${s.title}`} aria-pressed={on}>
                    {on ? <Pause /> : <Play />}
                  </Button>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.what}</p>
                <div className="mt-3">
                  <Slider min={0} max={1} step={0.01} value={[vol[s.id]]} onValueChange={(v) => { setVol({ ...vol, [s.id]: v[0] }); engine.current?.setVolume(s.id, v[0]); }} aria-label={`${s.title} volume`} />
                </div>
                <button type="button" className="mt-2 text-xs text-primary hover:underline" onClick={() => setFocus(s.id)}>Captions & info</button>
              </li>
            );
          })}
        </ul>
      </div>
    </ToolLayout>
  );
}
