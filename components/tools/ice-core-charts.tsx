'use client';

import { memo } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ProxyPoint } from '@/lib/ice-core';

const axis = { fontSize: 10, fill: 'hsl(var(--muted-foreground))' };

function ProxyCharts({ data, depth }: { data: ProxyPoint[]; depth: number }) {
  const charts: { key: keyof ProxyPoint; label: string; color: string }[] = [
    { key: 'd18o', label: 'δ18O (‰) — temperature proxy', color: '#3B82C4' },
    { key: 'co2', label: 'CO₂ (ppm)', color: '#ef4444' },
    { key: 'ch4', label: 'Methane (ppb)', color: '#8B5CF6' },
    { key: 'dust', label: 'Dust (ng/g)', color: '#b08a5a' },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {charts.map((c) => (
        <figure key={c.key} className="rounded-md border bg-background p-2">
          <figcaption className="mb-1 text-xs font-medium">{c.label}</figcaption>
          <div style={{ height: 130 }} role="img" aria-label={`${c.label} versus depth, current depth ${Math.round(depth)} metres (demo)`}>
            <ResponsiveContainer>
              <LineChart data={data} margin={{ top: 4, right: 6, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="depth" type="number" domain={['dataMin', 'dataMax']} tick={axis} tickFormatter={(v: number) => `${Math.round(v)}m`} />
                <YAxis tick={axis} width={48} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ fontSize: 11, background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }} labelFormatter={(v) => `Depth ${Math.round(Number(v))} m`} />
                <Line type="monotone" dataKey={c.key} stroke={c.color} dot={false} strokeWidth={1.6} isAnimationActive={false} />
                <ReferenceLine x={depth} stroke="#F59E0B" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </figure>
      ))}
    </div>
  );
}

export default memo(ProxyCharts);
