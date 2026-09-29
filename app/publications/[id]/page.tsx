import type { Metadata } from 'next';
import { seedFind } from '@/data';
import { PublicationDetail } from '@/components/detail/publication-detail';

type Props = { params: { id: string } };

export function generateMetadata({ params }: Props): Metadata {
  const it = seedFind(params.id);
  return { title: it?.title ?? 'Publication', description: it?.summary, openGraph: { title: it?.title ?? 'Publication', description: it?.summary, type: 'article' } };
}

export default function Page({ params }: Props) {
  return <PublicationDetail id={params.id} />;
}
