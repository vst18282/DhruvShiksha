import type { Metadata } from 'next';
import { LearnHub } from '@/components/learn/learn-hub';

export const metadata: Metadata = { title: 'Learn', description: 'Learning paths, glossary, quizzes, virtual diaries and teaching resources about polar science.' };

export default function Page() {
  return <LearnHub />;
}
