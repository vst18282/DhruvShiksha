import type { Metadata } from 'next';
import { StreamView } from '@/components/expeditions/stream-view';

export const metadata: Metadata = { title: 'Expeditions — year-wise stream', description: 'Every Indian polar and ocean expedition from 2008 to 2025 on one flowing timeline (demo).' };

export default function Page() {
  return <StreamView />;
}
