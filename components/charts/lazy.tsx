'use client';

import dynamic from 'next/dynamic';
import { ChartSkeleton } from '@/components/skeletons';

/** Lazily-loaded chart components (Recharts is heavy; keep it out of the initial bundle). */
const loading = () => <ChartSkeleton height={220} />;
export const AreaTrend = dynamic(() => import('./charts').then((m) => m.AreaTrend), { ssr: false, loading });
export const BarSimple = dynamic(() => import('./charts').then((m) => m.BarSimple), { ssr: false, loading });
export const LineMulti = dynamic(() => import('./charts').then((m) => m.LineMulti), { ssr: false, loading });
export const PieSimple = dynamic(() => import('./charts').then((m) => m.PieSimple), { ssr: false, loading });
export const TrendDual = dynamic(() => import('./charts').then((m) => m.TrendDual), { ssr: false, loading: () => <ChartSkeleton height={260} /> });
export const BarColors = dynamic(() => import('./charts').then((m) => m.BarColors), { ssr: false, loading });
export const DonutTotal = dynamic(() => import('./charts').then((m) => m.DonutTotal), { ssr: false, loading });
export const BarRanked = dynamic(() => import('./charts').then((m) => m.BarRanked), { ssr: false, loading: () => <ChartSkeleton height={320} /> });

export function ChartCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-4" aria-label={title}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
