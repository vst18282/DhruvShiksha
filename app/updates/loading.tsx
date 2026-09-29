import { ListRowSkeleton, Skeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <div className="container max-w-3xl space-y-4 py-8" role="status" aria-label="Loading updates">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 4 }).map((_, i) => (
        <ListRowSkeleton key={i} />
      ))}
    </div>
  );
}
