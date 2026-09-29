'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useUiStore } from '@/store/ui';

/** Animated number that respects reduced motion / low-bandwidth mode. */
export function useCountUp(target: number, durationMs = 1200) {
  const reduce = useReducedMotion();
  const low = useUiStore((s) => s.lowBandwidth);
  const [v, setV] = useState(0);
  useEffect(() => {
    if (reduce || low) {
      setV(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, reduce, low]);
  return v;
}

export function useMediaQuery(q: string) {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(q);
    setM(mq.matches);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [q]);
  return m;
}
