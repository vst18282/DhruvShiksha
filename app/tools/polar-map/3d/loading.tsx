import { GlobeSkeleton } from '@/components/skeletons';

export default function Loading() {
  return <div className="container py-8"><GlobeSkeleton className="min-h-[560px] aspect-auto" /></div>;
}
