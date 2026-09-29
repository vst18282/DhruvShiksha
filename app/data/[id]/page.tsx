import type { Metadata } from 'next';
import { seedFind } from '@/data';
import { DatasetDetail } from '@/components/detail/dataset-detail';

type Props = { params: { id: string } };

export function generateMetadata({ params }: Props): Metadata {
  const it = seedFind(params.id);
  return { title: it?.title ?? 'Dataset', description: it?.summary, openGraph: { title: it?.title ?? 'Dataset', description: it?.summary, type: 'article' } };
}

export default function Page({ params }: Props) {
  return <DatasetDetail id={params.id} />;
}
