import type { Metadata } from 'next';
import { StationsView } from '@/components/detail/stations';

export const metadata: Metadata = { title: 'Research stations', description: 'Maitri, Bharati, Himadri and Himansh (demo facts).' };

export default function Page() {
  return <StationsView />;
}
