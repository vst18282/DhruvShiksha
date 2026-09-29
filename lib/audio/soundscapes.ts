/**
 * Procedural polar soundscapes with the Web Audio API (synthesised for the demo).
 *
 * REAL RECORDINGS: drop files at /public/audio/{id}.mp3 and list them in REAL_AUDIO_FILES,
 * e.g. { 'katabatic-wind': '/audio/katabatic-wind.mp3' }. Listed ids play the file
 * (looped, through the same mixer/analyser); others fall back to the synthesiser.
 */
export const REAL_AUDIO_FILES: Partial<Record<SoundId, string>> = {};

export type SoundId = 'katabatic-wind' | 'ice-cracking' | 'calving' | 'seal-calls' | 'penguin-colony' | 'ocean-swell' | 'station-hum' | 'aurora';

export interface Soundscape {
  id: SoundId;
  title: string;
  what: string;
  where: string;
  season: string;
  captions: string[];
  color: string;
}

export const SOUNDSCAPES: Soundscape[] = [
  { id: 'katabatic-wind', title: 'Katabatic wind', what: 'Cold, dense air rushing down from the ice plateau, rising and falling in gusts.', where: 'Maitri, Schirmacher Oasis', season: 'Winter blizzard (demo)', captions: ['[low howling wind]', '[gust builds and fades]', '[snow hisses across the ice]'], color: '#5BB5E8' },
  { id: 'ice-cracking', title: 'Ice cracking', what: 'Sharp cracks as sea ice flexes with tides and temperature changes.', where: 'Fast ice, Prydz Bay near Bharati', season: 'Spring (demo)', captions: ['[sharp crack]', '[silence]', '[ping-like snaps echo]'], color: '#bfe3fb' },
  { id: 'calving', title: 'Iceberg calving', what: 'A deep rumble and crash as a slab of ice breaks off a glacier front.', where: 'Glacier margin, Larsemann Hills', season: 'Summer (demo)', captions: ['[distant rumble]', '[loud crash]', '[water churning]'], color: '#94a3b8' },
  { id: 'seal-calls', title: 'Weddell seal calls', what: 'Eerie descending whistles and trills that seals use under the ice.', where: 'Under fast ice near Bharati', season: 'Spring breeding season (demo)', captions: ['[descending whistle]', '[trill]', '[long glide down]'], color: '#8B5CF6' },
  { id: 'penguin-colony', title: 'Penguin colony', what: 'Hundreds of Adélie penguins squawking and calling to their partners.', where: 'Adélie colony, Larsemann Hills', season: 'Summer (demo)', captions: ['[many short squawks]', '[chicks chirping]', '[wind in the background]'], color: '#F59E0B' },
  { id: 'ocean-swell', title: 'Ocean swell under ice', what: 'Slow, heavy surges of the Southern Ocean moving beneath the ice edge.', where: 'Ice edge, Southern Ocean', season: 'Late summer (demo)', captions: ['[slow whoosh]', '[deep surge]', '[water retreats]'], color: '#2DD4BF' },
  { id: 'station-hum', title: 'Research station hum', what: 'Generators, ventilation and electronics that keep the station alive.', where: 'Bharati station, inside', season: 'All year (demo)', captions: ['[steady low hum]', '[fan whir]', '[faint electrical buzz]'], color: '#F97316' },
  { id: 'aurora', title: 'Aurora sonification', what: 'Magnetometer changes during an aurora turned into slowly shifting tones.', where: 'Bharati geospace lab (sonified data)', season: 'Polar night (demo)', captions: ['[soft shimmering chords]', '[tones drift up]', '[echoing sparkle]'], color: '#22c55e' },
];

interface Voice {
  gain: GainNode;
  stop: () => void;
}

export class SoundEngine {
  ctx: AudioContext;
  master: GainNode;
  analyser: AnalyserNode;
  private voices = new Map<SoundId, Voice>();
  private white: AudioBuffer;
  private brown: AudioBuffer;

  constructor() {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.master.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    this.white = this.noise('white');
    this.brown = this.noise('brown');
  }

  private noise(kind: 'white' | 'brown'): AudioBuffer {
    const len = this.ctx.sampleRate * 4;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'white') d[i] = w;
      else {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
    }
    return buf;
  }

  private src(buf: AudioBuffer) {
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.start();
    return s;
  }

  private lfo(freq: number, depth: number, target: AudioParam) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.value = freq;
    g.gain.value = depth;
    o.connect(g).connect(target);
    o.start();
    return o;
  }

  isPlaying(id: SoundId) {
    return this.voices.has(id);
  }
  playing(): SoundId[] {
    return Array.from(this.voices.keys());
  }

  async play(id: SoundId, volume = 0.7) {
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    if (this.voices.has(id)) return;
    const out = this.ctx.createGain();
    out.gain.value = 0;
    out.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.4);
    out.connect(this.master);
    const file = REAL_AUDIO_FILES[id];
    const stop = file ? this.playFile(file, out) : this.synth(id, out);
    this.voices.set(id, { gain: out, stop });
  }

  private playFile(url: string, out: GainNode) {
    const el = new Audio(url);
    el.loop = true;
    el.crossOrigin = 'anonymous';
    const node = this.ctx.createMediaElementSource(el);
    node.connect(out);
    el.play().catch(() => undefined);
    return () => {
      el.pause();
      node.disconnect();
    };
  }

  private synth(id: SoundId, out: GainNode): () => void {
    const c = this.ctx;
    const nodes: AudioScheduledSourceNode[] = [];
    const timers: ReturnType<typeof setInterval>[] = [];
    const now = () => c.currentTime;
    switch (id) {
      case 'katabatic-wind': {
        const s = this.src(this.white);
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 450;
        bp.Q.value = 0.9;
        const g = c.createGain();
        g.gain.value = 0.55;
        s.connect(bp).connect(g).connect(out);
        nodes.push(s, this.lfo(0.07, 280, bp.frequency), this.lfo(0.13, 0.3, g.gain));
        break;
      }
      case 'ice-cracking': {
        const s = this.src(this.white);
        const hp = c.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 1400;
        const env = c.createGain();
        env.gain.value = 0;
        s.connect(hp).connect(env).connect(out);
        nodes.push(s);
        timers.push(
          setInterval(() => {
            if (Math.random() < 0.45) {
              const t = now();
              env.gain.cancelScheduledValues(t);
              env.gain.setValueAtTime(0, t);
              env.gain.linearRampToValueAtTime(0.9, t + 0.004);
              env.gain.exponentialRampToValueAtTime(0.001, t + 0.08 + Math.random() * 0.25);
              hp.frequency.setValueAtTime(900 + Math.random() * 2500, t);
            }
          }, 350),
        );
        break;
      }
      case 'calving': {
        const s = this.src(this.brown);
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 160;
        const env = c.createGain();
        env.gain.value = 0.08;
        s.connect(lp).connect(env).connect(out);
        nodes.push(s);
        const rumble = () => {
          const t = now();
          env.gain.cancelScheduledValues(t);
          env.gain.setValueAtTime(env.gain.value, t);
          env.gain.linearRampToValueAtTime(1.0, t + 1.2);
          env.gain.exponentialRampToValueAtTime(0.08, t + 7);
        };
        rumble();
        timers.push(setInterval(rumble, 11000));
        break;
      }
      case 'seal-calls': {
        const call = () => {
          const t = now();
          const o = c.createOscillator();
          const g = c.createGain();
          o.type = 'sine';
          const f0 = 1800 + Math.random() * 1500;
          o.frequency.setValueAtTime(f0, t);
          o.frequency.exponentialRampToValueAtTime(180 + Math.random() * 150, t + 1.6 + Math.random());
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.25, t + 0.1);
          g.gain.exponentialRampToValueAtTime(0.001, t + 2.4);
          const vib = c.createOscillator();
          const vg = c.createGain();
          vib.frequency.value = 7;
          vg.gain.value = 25;
          vib.connect(vg).connect(o.frequency);
          o.connect(g).connect(out);
          o.start(t);
          vib.start(t);
          o.stop(t + 2.6);
          vib.stop(t + 2.6);
        };
        call();
        timers.push(setInterval(() => Math.random() < 0.7 && call(), 2600));
        break;
      }
      case 'penguin-colony': {
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1100;
        bp.Q.value = 2.5;
        bp.connect(out);
        const w = this.src(this.white);
        const wg = c.createGain();
        wg.gain.value = 0.04;
        w.connect(wg).connect(out);
        nodes.push(w);
        timers.push(
          setInterval(() => {
            const t = now();
            for (let k = 0; k < 2; k++) {
              if (Math.random() > 0.65) continue;
              const o = c.createOscillator();
              const g = c.createGain();
              o.type = 'sawtooth';
              const f = 480 + Math.random() * 700;
              const st = t + Math.random() * 0.1;
              o.frequency.setValueAtTime(f, st);
              o.frequency.linearRampToValueAtTime(f * (0.8 + Math.random() * 0.5), st + 0.15);
              g.gain.setValueAtTime(0, st);
              g.gain.linearRampToValueAtTime(0.05 + Math.random() * 0.1, st + 0.02);
              g.gain.exponentialRampToValueAtTime(0.001, st + 0.12 + Math.random() * 0.2);
              o.connect(g).connect(bp);
              o.start(st);
              o.stop(st + 0.4);
            }
          }, 110),
        );
        break;
      }
      case 'ocean-swell': {
        const s = this.src(this.brown);
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 480;
        const g = c.createGain();
        g.gain.value = 0.5;
        s.connect(lp).connect(g).connect(out);
        nodes.push(s, this.lfo(0.08, 0.45, g.gain), this.lfo(0.08, 200, lp.frequency));
        break;
      }
      case 'station-hum': {
        [50, 100, 150, 250].forEach((f, i) => {
          const o = c.createOscillator();
          const g = c.createGain();
          o.frequency.value = f;
          g.gain.value = [0.2, 0.12, 0.06, 0.02][i];
          o.connect(g).connect(out);
          o.start();
          nodes.push(o);
        });
        const s = this.src(this.white);
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 900;
        const g = c.createGain();
        g.gain.value = 0.03;
        s.connect(lp).connect(g).connect(out);
        nodes.push(s);
        break;
      }
      case 'aurora': {
        const delay = c.createDelay(1);
        delay.delayTime.value = 0.38;
        const fb = c.createGain();
        fb.gain.value = 0.45;
        delay.connect(fb).connect(delay);
        const mix = c.createGain();
        mix.gain.value = 0.35;
        mix.connect(out);
        mix.connect(delay);
        delay.connect(out);
        const oscs = [220, 277.2, 329.6, 440].map((f) => {
          const o = c.createOscillator();
          o.type = 'sine';
          o.frequency.value = f;
          const g = c.createGain();
          g.gain.value = 0.08;
          o.connect(g).connect(mix);
          o.start();
          nodes.push(o);
          return o;
        });
        timers.push(
          setInterval(() => {
            const scale = [1, 1.122, 1.26, 1.335, 1.498, 1.682];
            oscs.forEach((o, i) => o.frequency.setTargetAtTime(220 * (i + 1 > 2 ? 2 : 1) * scale[Math.floor(Math.random() * scale.length)], now(), 1.5));
          }, 2500),
        );
        break;
      }
    }
    return () => {
      timers.forEach(clearInterval);
      nodes.forEach((n) => {
        try {
          n.stop();
        } catch {
          /* already stopped */
        }
      });
    };
  }

  setVolume(id: SoundId, v: number) {
    const voice = this.voices.get(id);
    if (voice) voice.gain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
  }
  setMaster(v: number) {
    this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
  }
  stop(id: SoundId) {
    const voice = this.voices.get(id);
    if (!voice) return;
    voice.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
    this.voices.delete(id);
    setTimeout(() => {
      voice.stop();
      voice.gain.disconnect();
    }, 1200);
  }
  stopAll() {
    Array.from(this.voices.keys()).forEach((id) => this.stop(id));
  }
  dispose() {
    this.stopAll();
    setTimeout(() => this.ctx.close().catch(() => undefined), 1500);
  }
}
