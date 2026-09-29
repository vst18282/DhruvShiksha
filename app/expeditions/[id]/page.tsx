import type { Metadata } from 'next';
import { EXPEDITIONS } from '@/data/expeditions';
import { ExpeditionHub } from '@/components/expeditions/expedition-hub';

type Props = { params: { id: string } };

export function generateStaticParams() {
  return EXPEDITIONS.map((e) => ({ id: e.id }));
}

export function generateMetadata({ params }: Props): Metadata {
  const e = EXPEDITIONS.find((x) => x.id === params.id);
  return { title: e?.name ?? 'Expedition', description: e?.summary, openGraph: { title: e?.name, description: e?.summary } };
}

export default function Page({ params }: Props) {
  return <ExpeditionHub id={params.id} />;
}
