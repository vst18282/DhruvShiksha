import type { Metadata } from 'next';
import { BlogsList } from '@/components/archive/lists';

export const metadata: Metadata = { title: 'Blog', description: 'Stories from the poles in plain language.' };

export default function Page() {
  return <BlogsList />;
}
