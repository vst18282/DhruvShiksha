import type { Metadata } from 'next';
import { AskView } from '@/components/learn/ask-view';

export const metadata: Metadata = { title: 'Ask a scientist' };

export default function Page() {
  return <AskView />;
}
