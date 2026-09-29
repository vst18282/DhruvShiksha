/**
 * Skeleton primitives. The `.skeleton` class (globals.css) renders a shimmer that
 * automatically becomes a static block under prefers-reduced-motion or low-bandwidth mode.
 * Sizes mirror the final components to avoid layout shift.
 */
import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton', className)} aria-hidden {...props} />;
}

export function LoadingRegion({ label = 'Loading content', children, className }: { label?: string; children: React.ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-lg border bg-card', className)}>
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <LoadingRegion className={cn('grid gap-5 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </LoadingRegion>
  );
}

export function ListRowSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
      <Skeleton className="h-14 w-20 shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      <Skeleton className="hidden h-8 w-20 sm:block" />
    </div>
  );
}

export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <LoadingRegion className="overflow-hidden rounded-lg border bg-card">
      <div className="flex gap-4 border-b p-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b p-3 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </LoadingRegion>
  );
}

export function ChartSkeleton({ height = 260, className }: { height?: number; className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      <Skeleton className="mb-4 h-4 w-40" />
      <div className="flex items-end gap-2" style={{ height }}>
        {[40, 65, 50, 80, 55, 90, 70, 60, 85, 45, 75, 95].map((h, i) => (
          <Skeleton key={i} className="flex-1 rounded-sm" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

export function MapSkeleton({ className }: { className?: string }) {
  return (
    <LoadingRegion label="Loading map" className={cn('relative aspect-[4/3] w-full overflow-hidden rounded-lg border bg-card', className)}>
      <Skeleton className="absolute inset-0 rounded-none" />
      <div className="absolute left-1/2 top-1/2 h-2/3 w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-muted-foreground/20" />
    </LoadingRegion>
  );
}

export function GlobeSkeleton({ className }: { className?: string }) {
  return (
    <LoadingRegion label="Loading 3D globe" className={cn('flex aspect-square w-full items-center justify-center rounded-lg bg-polar-navy', className)}>
      <div className="skeleton aspect-square w-2/3 rounded-full !bg-white/10" />
    </LoadingRegion>
  );
}

export function DetailPageSkeleton() {
  return (
    <LoadingRegion className="container py-8">
      <Skeleton className="mb-6 h-4 w-60" />
      <Skeleton className="mb-3 h-9 w-3/4" />
      <Skeleton className="mb-8 h-5 w-1/2" />
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Skeleton className="aspect-[16/7] w-full" />
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className={cn('h-4', i % 3 === 2 ? 'w-2/3' : 'w-full')} />
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </LoadingRegion>
  );
}

export function ChatMessageSkeleton() {
  return (
    <div className="flex gap-2" aria-hidden>
      <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2 rounded-lg border bg-card p-3">
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/5" />
      </div>
    </div>
  );
}

export function SearchResultSkeleton() {
  return (
    <div className="flex gap-4 rounded-lg border bg-card p-4">
      <Skeleton className="h-20 w-28 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <Skeleton className="h-4 w-14 rounded-full" />
          <Skeleton className="h-4 w-20 rounded-full" />
        </div>
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
}

export function PostPreviewSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="aspect-video w-full" />
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4">
      <Skeleton className="mb-3 h-3 w-24" />
      <Skeleton className="h-7 w-20" />
    </div>
  );
}

/** Generic page skeleton: heading + grid. Used by most list-route loading.tsx files. */
export function PageSkeleton({ cards = 6, hero = true }: { cards?: number; hero?: boolean }) {
  return (
    <div className="container py-8">
      {hero && (
        <div className="mb-8 space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-9 w-2/3 max-w-xl" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
      )}
      <CardGridSkeleton count={cards} />
    </div>
  );
}

/** Dashboard skeleton: KPI row + two charts + table. */
export function DashboardSkeleton() {
  return (
    <LoadingRegion className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      <TableSkeleton rows={5} />
    </LoadingRegion>
  );
}

export function ToolSkeleton() {
  return (
    <LoadingRegion className="container py-8">
      <Skeleton className="mb-3 h-4 w-40" />
      <Skeleton className="mb-2 h-9 w-80" />
      <Skeleton className="mb-8 h-4 w-full max-w-xl" />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Skeleton className="aspect-[4/3] w-full" />
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </div>
    </LoadingRegion>
  );
}
