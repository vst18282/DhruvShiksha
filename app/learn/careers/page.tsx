import type { Metadata } from 'next';
import { CareersView } from '@/components/learn/resources-view';

export const metadata: Metadata = { title: 'Careers in polar science' };

export default function Page() {
  return <CareersView />;
}
