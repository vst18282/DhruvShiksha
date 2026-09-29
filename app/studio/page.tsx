import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Composer } from '@/components/studio/composer';
import { StudioSkeleton } from '@/components/studio/studio-skeleton';
import { RequireCan } from '@/components/auth/require-can';

export const metadata: Metadata = { title: 'Content Studio' };

export default function Page() {
  return (
    <RequireCan anyOf={[{ action: 'use_studio' }]}>
      <Suspense fallback={<StudioSkeleton />}>
        <Composer />
      </Suspense>
    </RequireCan>
  );
}
