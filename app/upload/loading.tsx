import { Skeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading Upload Centre">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-7 w-full max-w-lg" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
