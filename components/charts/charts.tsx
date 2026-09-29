'use client';

import { memo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCompact } from '@/lib/utils';

export const CHART_COLORS = ['#3B82C4', '#2DD4BF', '#8B5CF6', '#F59E0B', '#0EA5E9', '#ef4444', '#22c55e'];
const axis = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };
const tip = { contentStyle: { background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: 'hsl(var(--popover-foreground))' } };

type Row = Record<string, string | number>;
/** Keep big axis values short (40000 → 40K) so they are not clipped. */
const tickFmt = (v: number) => (typeof v === 'number' && Math.abs(v) >= 10000 ? formatCompact(v) : String(v));

interface Base {
  data: Row[];
  x: string;
  height?: number;
  label: string;
}

export const AreaTrend = memo(function AreaTrend({ data, x, ys, height = 240, label }: Base & { ys: { key: string; name?: string; color?: string }[] }) {
  return (
    <div style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
          <defs>
            {ys.map((y, i) => (
              <linearGradient key={y.key} id={`g-${y.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={y.color ?? CHART_COLORS[i]} stopOpacity={0.4} />
                <stop offset="1" stopColor={y.color ?? CHART_COLORS[i]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey={x} tick={axis} />
          <YAxis tick={axis} width={52} tickFormatter={tickFmt} />
          <Tooltip {...tip} />
          {ys.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {ys.map((y, i) => (
            <Area key={y.key} type="monotone" dataKey={y.key} name={y.name ?? y.key} stroke={y.color ?? CHART_COLORS[i]} fill={`url(#g-${y.key})`} strokeWidth={2} isAnimationActive={false} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

export const BarSimple = memo(function BarSimple({ data, x, ys, height = 240, label, layout = 'horizontal', stacked }: Base & { ys: { key: string; name?: string; color?: string }[]; layout?: 'horizontal' | 'vertical'; stacked?: boolean }) {
  const vertical = layout === 'vertical';
  return (
    <div style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer>
        <BarChart data={data} layout={layout} margin={{ top: 6, right: 8, left: vertical ? 24 : -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          {vertical ? <XAxis type="number" tick={axis} tickFormatter={tickFmt} /> : <XAxis dataKey={x} tick={axis} />}
          {vertical ? <YAxis type="category" dataKey={x} tick={axis} width={90} /> : <YAxis tick={axis} width={52} tickFormatter={tickFmt} />}
          <Tooltip {...tip} />
          {ys.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {ys.map((y, i) => (
            <Bar key={y.key} dataKey={y.key} name={y.name ?? y.key} fill={y.color ?? CHART_COLORS[i]} radius={vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]} stackId={stacked ? 's' : undefined} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

export const LineMulti = memo(function LineMulti({ data, x, ys, height = 240, label, yDomain }: Base & { ys: { key: string; name?: string; color?: string; dashed?: boolean }[]; yDomain?: [number | 'auto', number | 'auto'] }) {
  return (
    <div style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey={x} tick={axis} minTickGap={12} />
          <YAxis tick={axis} width={52} domain={yDomain ?? ['auto', 'auto']} />
          <Tooltip {...tip} />
          {ys.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {ys.map((y, i) => (
            <Line key={y.key} type="monotone" dataKey={y.key} name={y.name ?? y.key} stroke={y.color ?? CHART_COLORS[i]} strokeWidth={2} dot={false} strokeDasharray={y.dashed ? '5 4' : undefined} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

export const PieSimple = memo(function PieSimple({ data, nameKey, valueKey, height = 240, label }: { data: Row[]; nameKey: string; valueKey: string; height?: number; label: string }) {
  return (
    <div style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius="55%" outerRadius="85%" paddingAngle={2} isAnimationActive={false}>
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip {...tip} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
});
