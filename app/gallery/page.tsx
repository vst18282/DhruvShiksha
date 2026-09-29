import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GalleryView } from '@/components/detail/gallery-view';
import { PageSkeleton } from '@/components/skeletons';

export const metadata: Metadata = { title: 'Gallery', description: 'Photos and videos from polar expeditions (demo records, freely licensed photographs).' };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton cards={8} />}>
      <GalleryView />
    </Suspense>
  );
}
