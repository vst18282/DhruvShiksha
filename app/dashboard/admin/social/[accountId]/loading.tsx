import { Skeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading account profile">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-56 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
