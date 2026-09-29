import type { Metadata } from 'next';
import { QuizList } from '@/components/learn/quizzes';

export const metadata: Metadata = { title: 'Quizzes' };

export default function Page() {
  return <QuizList />;
}
