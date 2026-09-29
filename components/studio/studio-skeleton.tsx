import { PostPreviewSkeleton, Skeleton } from '@/components/skeletons';

export function StudioSkeleton() {
  return (
    <div role="status" aria-label="Loading Content Studio" className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 lg:grid-cols-[300px_1fr] xl:grid-cols-[300px_1fr_340px]">
        <Skeleton className="h-[520px] w-full" />
        <div className="space-y-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <div className="hidden space-y-3 xl:block">
          <PostPreviewSkeleton />
          <PostPreviewSkeleton />
        </div>
      </div>
    </div>
  );
}
