import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ExploreView } from '@/components/search/explore-view';
import { PageSkeleton } from '@/components/skeletons';

export const metadata: Metadata = {
  title: 'Explore the archive',
  description: 'Semantic, typo-tolerant search across blogs, reports, expeditions, datasets, publications, media and events.',
};

export default function ExplorePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ExploreView />
    </Suspense>
  );
}
