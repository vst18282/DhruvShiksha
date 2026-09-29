import type { Metadata } from 'next';
import { STATIONS } from '@/data/stations';
import { StationDetail } from '@/components/detail/stations';

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return STATIONS.map((s) => ({ slug: s.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const s = STATIONS.find((x) => x.slug === params.slug);
  return { title: s ? `${s.name} station` : 'Station', description: s?.description };
}

export default function Page({ params }: Props) {
  return <StationDetail slug={params.slug} />;
}
