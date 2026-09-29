import type { Metadata } from 'next';
import { seedFind } from '@/data';
import { EventDetail } from '@/components/detail/event-detail';

type Props = { params: { id: string } };

export function generateMetadata({ params }: Props): Metadata {
  const it = seedFind(params.id);
  return { title: it?.title ?? 'Event', description: it?.summary, openGraph: { title: it?.title ?? 'Event', description: it?.summary, type: 'article' } };
}

export default function Page({ params }: Props) {
  return <EventDetail id={params.id} />;
}
