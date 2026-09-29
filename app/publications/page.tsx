import type { Metadata } from 'next';
import { PublicationsList } from '@/components/archive/lists';

export const metadata: Metadata = { title: 'Publications', description: 'Demo peer-reviewed publications.' };

export default function Page() {
  return <PublicationsList />;
}
