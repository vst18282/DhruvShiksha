import type { Metadata } from 'next';
import { QUIZZES } from '@/data/learn';
import { QuizPlayer } from '@/components/learn/quizzes';

type Props = { params: { id: string } };

export function generateStaticParams() {
  return QUIZZES.map((q) => ({ id: q.id }));
}

export function generateMetadata({ params }: Props): Metadata {
  const q = QUIZZES.find((x) => x.id === params.id);
  return { title: q ? `Quiz: ${q.title}` : 'Quiz', description: q?.description };
}

export default function Page({ params }: Props) {
  return <QuizPlayer id={params.id} />;
}
