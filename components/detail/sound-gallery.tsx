'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Headphones, Pause, Play, Volume2 } from 'lucide-react';
import { SOUNDSCAPES, SoundEngine, type SoundId } from '@/lib/audio/soundscapes';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/** Live bars drawn from the mixer's analyser. Decorative: the caption below carries the meaning. */
function Spectrum({ engine, color, active, still }: { engine: SoundEngine | null; color: string; active: boolean; still: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !active) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const bars = 28;
    const gap = 2;
    const draw = (values: number[]) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width / bars;
      values.forEach((v, i) => {
        const h = Math.max(3, v * canvas.height);
        ctx.globalAlpha = 0.35 + v * 0.65;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(i * w + gap / 2, canvas.height - h, w - gap, h, 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    };
    // Reduced motion: one static snapshot instead of an animation.
    if (still || !engine) {
      draw(Array.from({ length: bars }, (_, i) => 0.25 + 0.5 * Math.abs(Math.sin(i / 3))));
      return;
    }
    const data = new Uint8Array(engine.analyser.frequencyBinCount);
    let raf = 0;
    const loop = () => {
      engine.analyser.getByteFrequencyData(data);
      const usable = Math.floor(data.length * 0.35); // voice range; the top of the FFT is mostly silent
      draw(Array.from({ length: bars }, (_, i) => data[Math.floor((i / bars) * usable)] / 255));
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [engine, color, active, still]);
  if (!active) return null;
  return <canvas ref={ref} width={260} height={34} className="h-[34px] w-full max-w-[260px]" aria-hidden />;
}

/**
 * Audio in the gallery: synthesised polar soundscapes. Playing one stops the previous one, and the
 * playing sound shows a live frequency animation beside its icon with details underneath.
 */
export function SoundGallery() {
  const reduce = useReducedMotion();
  const [engine, setEngine] = useState<SoundEngine | null>(null);
  const [playing, setPlaying] = useState<SoundId | null>(null);
  const [caption, setCaption] = useState(0);
  const current = useMemo(() => SOUNDSCAPES.find((s) => s.id === playing), [playing]);

  // Web Audio needs a user gesture, so the engine is created on the first play and disposed on unmount.
  useEffect(() => () => engine?.dispose(), [engine]);

  useEffect(() => {
    if (!playing) return;
    setCaption(0);
    const t = setInterval(() => setCaption((c) => c + 1), 3800);
    return () => clearInterval(t);
  }, [playing]);

  const toggle = async (id: SoundId) => {
    let e = engine;
    if (!e) {
      e = new SoundEngine();
      setEngine(e);
    }
    if (playing === id) {
      e.stop(id);
      setPlaying(null);
      return;
    }
    if (playing) e.stop(playing); // only one sound at a time
    await e.play(id, 0.7);
    setPlaying(id);
  };

  return (
    <section aria-labelledby="sounds" className="mt-12">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="sounds" className="flex items-center gap-2 text-xl font-semibold">
            <Headphones className="h-5 w-5 text-primary" aria-hidden /> Sounds of the poles
          </h2>
          <p className="text-sm text-muted-foreground">
            Eight audio clips from the stations and the ice. Play one to see its live frequency trace; starting another stops the first. Synthesised for this demo with the Web Audio API.
          </p>
        </div>
        {current && (
          <Badge variant="aurora" className="gap-1.5">
            <Volume2 className="h-3.5 w-3.5" aria-hidden /> Now playing: {current.title}
          </Badge>
        )}
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {SOUNDSCAPES.map((s) => {
          const on = playing === s.id;
          return (
            <li
              key={s.id}
              className={cn(
                'rounded-xl border bg-card p-4 shadow-sm transition-all',
                on ? 'border-transparent shadow-md ring-2' : 'hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none',
              )}
              style={on ? ({ '--tw-ring-color': s.color } as React.CSSProperties) : undefined}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggle(s.id)}
                  aria-pressed={on}
                  aria-label={on ? `Stop ${s.title}` : `Play ${s.title}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transform-none"
                  style={{ background: s.color }}
                >
                  {on ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
                </button>
                {/* Right of the icon: the title, then the live animation, then the details. */}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-tight">{s.title}</p>
                  {on ? (
                    <>
                      <Spectrum engine={engine} color={s.color} active still={!!reduce} />
                      <p className="text-xs text-muted-foreground" aria-live="polite">
                        <span className="font-medium text-foreground">{s.captions[caption % s.captions.length]}</span> · {s.where} · {s.season}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{s.what}</p>
                    </>
                  ) : (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{s.what}</p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
