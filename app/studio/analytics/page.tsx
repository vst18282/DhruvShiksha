import type { Metadata } from 'next';
import { RequireCan } from '@/components/auth/require-can';
import { AnalyticsView } from '@/components/studio/analytics-view';

export const metadata: Metadata = { title: 'Social analytics' };

export default function Page() {
  return (
    <RequireCan anyOf={[{ action: 'view_analytics', full: true }]}>
      <AnalyticsView />
    </RequireCan>
  );
}
