import type { Metadata } from 'next';
import { GlossaryView } from '@/components/learn/glossary-view';

export const metadata: Metadata = { title: 'Glossary', description: 'Searchable A–Z glossary of polar science terms.' };

export default function Page() {
  return <GlossaryView />;
}
