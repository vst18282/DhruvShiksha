import type { Metadata } from 'next';
import { ResourcesView } from '@/components/learn/resources-view';

export const metadata: Metadata = { title: 'Learning resources' };

export default function Page() {
  return <ResourcesView />;
}
