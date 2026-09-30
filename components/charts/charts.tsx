'use client';

import { memo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
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

type RankedRow = { name: string; full: string; views: number; downloads: number };

function RankedTip({ active, payload }: { active?: boolean; payload?: { payload: RankedRow }[] }) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  const rate = r.views ? Math.round((r.downloads / r.views) * 100) : 0;
  return (
    <div className="max-w-64 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="mb-1.5 font-semibold leading-snug">{r.full}</p>
      <p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#2F5D8C]" aria-hidden /> Views <span className="ml-auto font-semibold tabular-nums">{r.views.toLocaleString('en-IN')}</span></p>
      <p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#94A3B8]" aria-hidden /> Downloads <span className="ml-auto font-semibold tabular-nums">{r.downloads.toLocaleString('en-IN')}</span></p>
      <p className="mt-1.5 border-t pt-1.5 text-muted-foreground">{rate}% of viewers downloaded</p>
    </div>
  );
}

/**
 * Ranked horizontal bars (views and downloads per item): gradient fills on a soft track, value labels
 * at the bar ends and a tooltip with the full title. Used by the scientist overview.
 */
export const BarRanked = memo(function BarRanked({ data, height = 320, label, animate = true, labelWidth = 168 }: { data: RankedRow[]; height?: number; label: string; animate?: boolean; labelWidth?: number }) {
  const tick = (v: number) => formatCompact(v);
  return (
    <div style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 44, left: 4, bottom: 0 }} barCategoryGap="26%" barGap={3}>
          <defs>
            <linearGradient id="br-views" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#1E3A5F" />
              <stop offset="1" stopColor="#4A7FB0" />
            </linearGradient>
            <linearGradient id="br-dl" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#64748B" />
              <stop offset="1" stopColor="#A9B6C6" />
            </linearGradient>
          </defs>
          <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
          <XAxis type="number" tick={axis} tickFormatter={tick} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={labelWidth} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} />
          <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.45 }} content={<RankedTip />} />
          <Bar dataKey="views" name="Views" fill="url(#br-views)" radius={[0, 6, 6, 0]} maxBarSize={14} background={{ fill: 'hsl(var(--muted))', radius: 6 }} isAnimationActive={animate} animationDuration={700}>
            <LabelList dataKey="views" position="right" formatter={tick} style={{ fontSize: 11, fontWeight: 600, fill: 'hsl(var(--foreground))' }} />
          </Bar>
          <Bar dataKey="downloads" name="Downloads" fill="url(#br-dl)" radius={[0, 6, 6, 0]} maxBarSize={14} isAnimationActive={animate} animationDuration={700}>
            <LabelList dataKey="downloads" position="right" formatter={tick} style={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

/* ------------------------------------------------------------------------------------------------
 * Presentation charts for the content manager's overview and analytics. Additive: the base charts
 * above are shared by other dashboards and stay as they are.
 * ---------------------------------------------------------------------------------------------- */

type Series = { key: string; name: string; color: string };

function DualTip({ active, payload, label, a, b }: { active?: boolean; payload?: { dataKey: string; value: number }[]; label?: string; a: Series; b: Series }) {
  if (!active || !payload?.length) return null;
  const val = (k: string) => payload.find((p) => p.dataKey === k)?.value ?? 0;
  const va = val(a.key);
  const vb = val(b.key);
  return (
    <div className="min-w-44 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="mb-1.5 font-semibold">{label}</p>
      <p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: a.color }} aria-hidden /> {a.name}<span className="ml-auto font-semibold tabular-nums">{va.toLocaleString('en-IN')}</span></p>
      <p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: b.color }} aria-hidden /> {b.name}<span className="ml-auto font-semibold tabular-nums">{vb.toLocaleString('en-IN')}</span></p>
      {va > 0 && <p className="mt-1.5 border-t pt-1.5 text-muted-foreground">{((vb / va) * 100).toFixed(1)}% engagement rate</p>}
    </div>
  );
}

/** Two series on their own axes (e.g. reach vs engagement), gradient areas and a rich tooltip. */
export const TrendDual = memo(function TrendDual({ data, x, a, b, height = 260, label, animate = true }: { data: Row[]; x: string; a: Series; b: Series; height?: number; label: string; animate?: boolean }) {
  const id = `td-${a.key}-${b.key}`;
  return (
    <div style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id={`${id}-a`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={a.color} stopOpacity={0.35} />
              <stop offset="1" stopColor={a.color} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={b.color} stopOpacity={0.25} />
              <stop offset="1" stopColor={b.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.7} />
          <XAxis dataKey={x} tick={axis} axisLine={false} tickLine={false} />
          <YAxis yAxisId="a" tick={axis} width={44} tickFormatter={(v: number) => formatCompact(v)} axisLine={false} tickLine={false} />
          <YAxis yAxisId="b" orientation="right" tick={axis} width={40} tickFormatter={(v: number) => formatCompact(v)} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeDasharray: '3 3' }} content={<DualTip a={a} b={b} />} />
          <Area yAxisId="a" type="monotone" dataKey={a.key} name={a.name} stroke={a.color} strokeWidth={2.5} fill={`url(#${id}-a)`} activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--card))' }} isAnimationActive={animate} />
          <Area yAxisId="b" type="monotone" dataKey={b.key} name={b.name} stroke={b.color} strokeWidth={2} strokeDasharray="5 4" fill={`url(#${id}-b)`} activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--card))' }} isAnimationActive={animate} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

type ColRow = { name: string; value: number; color: string; note?: string };

function ColTip({ active, payload, valueName }: { active?: boolean; payload?: { payload: ColRow }[]; valueName: string }) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="flex items-center gap-2 font-semibold"><span className="h-2 w-2 rounded-full" style={{ background: r.color }} aria-hidden /> {r.name}</p>
      <p className="mt-1 tabular-nums">{valueName}: <span className="font-semibold">{r.value.toLocaleString('en-IN')}</span></p>
      {r.note && <p className="text-muted-foreground">{r.note}</p>}
    </div>
  );
}

/** Columns (or horizontal bars) with a colour per row, soft gradient, rounded ends and value labels. */
export const BarColors = memo(function BarColors({ data, height = 240, label, valueName, layout = 'columns', animate = true, labelWidth = 80 }: { data: ColRow[]; height?: number; label: string; valueName: string; layout?: 'columns' | 'bars'; animate?: boolean; labelWidth?: number }) {
  const bars = layout === 'bars';
  const gid = (i: number) => `bc-${valueName.replace(/\W/g, '')}-${i}`;
  return (
    <div style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer>
        <BarChart data={data} layout={bars ? 'vertical' : 'horizontal'} margin={{ top: bars ? 0 : 18, right: bars ? 40 : 4, left: bars ? 0 : -16, bottom: 0 }} barCategoryGap={bars ? '28%' : '22%'}>
          <defs>
            {data.map((d, i) => (
              <linearGradient key={i} id={gid(i)} x1="0" y1={bars ? '0' : '1'} x2={bars ? '1' : '0'} y2="0">
                <stop offset="0" stopColor={d.color} stopOpacity={0.55} />
                <stop offset="1" stopColor={d.color} stopOpacity={1} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={bars} horizontal={!bars} stroke="hsl(var(--border))" strokeOpacity={0.7} />
          {bars ? (
            <>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={labelWidth} tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} axisLine={false} tickLine={false} />
            </>
          ) : (
            <>
              <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} />
              <YAxis tick={axis} width={44} tickFormatter={(v: number) => formatCompact(v)} axisLine={false} tickLine={false} />
            </>
          )}
          <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.45 }} content={<ColTip valueName={valueName} />} />
          <Bar dataKey="value" name={valueName} radius={bars ? [0, 6, 6, 0] : [6, 6, 0, 0]} maxBarSize={bars ? 16 : 42} isAnimationActive={animate} background={bars ? { fill: 'hsl(var(--muted))', radius: 6 } : undefined}>
            {data.map((_, i) => (
              <Cell key={i} fill={`url(#${gid(i)})`} />
            ))}
            <LabelList dataKey="value" position={bars ? 'right' : 'top'} formatter={(v: number) => formatCompact(v)} style={{ fontSize: 11, fontWeight: 600, fill: 'hsl(var(--foreground))' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

/** Donut with the total in the centre and a colour per slice. */
export const DonutTotal = memo(function DonutTotal({ data, height = 220, label, centerLabel, animate = true }: { data: ColRow[]; height?: number; label: string; centerLabel: string; animate?: boolean }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div style={{ height }} className="relative" role="img" aria-label={label}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="90%" paddingAngle={3} cornerRadius={6} stroke="none" isAnimationActive={animate}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip content={<ColTip valueName={centerLabel} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
        <span className="text-2xl font-semibold tabular-nums">{formatCompact(total)}</span>
        <span className="text-[11px] text-muted-foreground">{centerLabel}</span>
      </div>
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
