import type { Metadata } from 'next';
import { EventsView } from '@/components/detail/events-view';

export const metadata: Metadata = { title: 'Events', description: 'Institutional activities: workshops, MoUs, school outreach, lectures (demo).' };

export default function Page() {
  return <EventsView />;
}
