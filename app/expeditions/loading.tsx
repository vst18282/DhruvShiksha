import { Skeleton, StatSkeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <div className="container py-8" role="status" aria-label="Loading expeditions">
      <Skeleton className="mb-2 h-4 w-40" />
      <Skeleton className="mb-6 h-9 w-96 max-w-full" />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatSkeleton key={i} />
        ))}
      </div>
      <Skeleton className="mb-6 h-12 w-full" />
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="mx-auto h-56 w-full max-w-3xl" />
        ))}
      </div>
    </div>
  );
}
