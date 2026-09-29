import type { Metadata } from 'next';
import { ReportsList } from '@/components/archive/lists';

export const metadata: Metadata = { title: 'Reports', description: 'Expedition, survey and technical reports (demo).' };

export default function Page() {
  return <ReportsList />;
}
