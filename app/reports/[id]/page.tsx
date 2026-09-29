import type { Metadata } from 'next';
import { seedFind } from '@/data';
import { ReportDetail } from '@/components/detail/report-detail';

type Props = { params: { id: string } };

export function generateMetadata({ params }: Props): Metadata {
  const it = seedFind(params.id);
  return { title: it?.title ?? 'Report', description: it?.summary, openGraph: { title: it?.title ?? 'Report', description: it?.summary, type: 'article' } };
}

export default function Page({ params }: Props) {
  return <ReportDetail id={params.id} />;
}
