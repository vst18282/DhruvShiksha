'use client';

import { memo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Dataset } from '@/types';

const COLORS = ['#3B82C4', '#2DD4BF', '#8B5CF6', '#F59E0B'];

/** Quick preview chart from a dataset's demo sample rows. Line for numeric/date x, bars for categorical x. */
function DatasetChartInner({ dataset, height = 280 }: { dataset: Dataset; height?: number }) {
  const rows = dataset.sampleRows;
  const xKey = dataset.chart.x;
  const categorical = typeof rows[0]?.[xKey] === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(String(rows[0]?.[xKey]));
  const unit = (k: string) => dataset.variables.find((v) => v.name === k)?.unit ?? '';
  const Chart = categorical ? BarChart : LineChart;
  return (
    <div style={{ height }} role="img" aria-label={`Chart of ${dataset.chart.y.join(' and ')} by ${xKey} (demo data)`}>
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} minTickGap={16} />
          <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={56} />
          <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {dataset.chart.y.map((k, i) =>
            categorical ? (
              <Bar key={k} dataKey={k} name={`${k}${unit(k) ? ` (${unit(k)})` : ''}`} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
            ) : (
              <Line key={k} type="monotone" dataKey={k} name={`${k}${unit(k) ? ` (${unit(k)})` : ''}`} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} isAnimationActive={false} />
            ),
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}

export const DatasetChart = memo(DatasetChartInner);
export default DatasetChart;
