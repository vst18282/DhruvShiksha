'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * Lightweight SVG charts for dashboards (no Recharts, so they render instantly).
 * Each has an accessible text label; interactive ones pair with a clickable legend.
 */

/** Tiny trend line with a soft area fill. */
export function Sparkline({ values, color = '#3B82C4', className, label }: { values: number[]; color?: string; className?: string; label: string }) {
  const id = useId().replace(/:/g, '');
  if (values.length < 2) return null;
  const w = 100;
  const h = 32;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 3 - ((v - min) / span) * (h - 6)] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn('h-8 w-full overflow-visible', className)} role="img" aria-label={label}>
      <defs>
        <linearGradient id={`sp-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#sp-${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="2.2" fill={color} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export interface Segment {
  key: string;
  label: string;
  value: number;
  color: string;
}

/** Donut with a highlighted segment and a centre readout. Hover/click via the legend or the ring. */
export function Donut({ segments, active, onActive, size = 168, label }: { segments: Segment[]; active: string | null; onActive: (k: string | null) => void; size?: number; label: string }) {
  const total = segments.reduce((n, s) => n + s.value, 0) || 1;
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const cur = segments.find((s) => s.key === active);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label={label}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
        {segments.map((s) => {
          const len = (s.value / total) * c;
          const gap = segments.length > 1 ? Math.min(1.2, len / 3) : 0;
          const el = (
            <circle
              key={s.key}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={active === s.key ? 15 : 12}
              strokeDasharray={`${Math.max(0, len - gap)} ${c - Math.max(0, len - gap)}`}
              strokeDashoffset={-offset}
              opacity={active && active !== s.key ? 0.35 : 1}
              className="cursor-pointer transition-all duration-200 motion-reduce:transition-none"
              onMouseEnter={() => onActive(s.key)}
              onMouseLeave={() => onActive(null)}
              onClick={() => onActive(active === s.key ? null : s.key)}
              aria-hidden
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center" aria-live="polite">
        <span className="text-2xl font-semibold tabular-nums">{cur ? cur.value : total}</span>
        <span className="max-w-[70%] truncate text-[11px] text-muted-foreground">{cur ? `${cur.label} · ${Math.round((cur.value / total) * 100)}%` : 'Total'}</span>
      </div>
    </div>
  );
}

/** Circular progress gauge (0–100). */
export function RadialGauge({ value, size = 96, stroke = 9, color, trackClassName, children, label }: { value: number; size?: number; stroke?: number; color: string; trackClassName?: string; children?: React.ReactNode; label: string }) {
  const r = 50 - stroke / 2 - 1;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth={stroke} className={cn('stroke-muted', trackClassName)} />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${(v / 100) * c} ${c}`} className="transition-[stroke-dasharray] duration-700 motion-reduce:transition-none" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/** Horizontal stacked bar made of buttons (each segment is clickable and focusable). */
export function SegmentBar({ segments, onSelect, label, className }: { segments: Segment[]; onSelect?: (s: Segment) => void; label: string; className?: string }) {
  const total = segments.reduce((n, s) => n + s.value, 0) || 1;
  return (
    <div className={cn('flex h-3 w-full overflow-hidden rounded-full bg-muted', className)} role="group" aria-label={label}>
      {segments
        .filter((s) => s.value > 0)
        .map((s) => (
          <button
            key={s.key}
            type="button"
            title={`${s.label}: ${s.value}`}
            aria-label={`${s.label}: ${s.value}`}
            onClick={() => onSelect?.(s)}
            className="h-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
          />
        ))}
    </div>
  );
}
