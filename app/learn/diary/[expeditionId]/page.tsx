import type { Metadata } from 'next';
import { DIARIES } from '@/data/learn';
import { DiaryView } from '@/components/learn/diary-view';

type Props = { params: { expeditionId: string } };

export function generateStaticParams() {
  return Object.keys(DIARIES).map((expeditionId) => ({ expeditionId }));
}

export const metadata: Metadata = { title: 'Virtual expedition diary' };

export default function Page({ params }: Props) {
  return <DiaryView id={params.expeditionId} />;
}
