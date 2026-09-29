import type { Metadata } from 'next';
import { DraftsView } from '@/components/studio/drafts-view';
import { RequireCan } from '@/components/auth/require-can';

export const metadata: Metadata = { title: 'Studio drafts' };

export default function Page() {
  return (
    <RequireCan anyOf={[{ action: 'use_studio' }]}>
      <DraftsView />
    </RequireCan>
  );
}
