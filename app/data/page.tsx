import type { Metadata } from 'next';
import { DatasetsList } from '@/components/archive/lists';

export const metadata: Metadata = { title: 'Data catalogue', description: 'Demo polar and ocean datasets with DOIs and data dictionaries.' };

export default function Page() {
  return <DatasetsList />;
}
