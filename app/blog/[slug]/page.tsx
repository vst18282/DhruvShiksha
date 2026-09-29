import type { Metadata } from 'next';
import { seedFind } from '@/data';
import { BlogDetail } from '@/components/detail/blog-detail';

type Props = { params: { slug: string } };

export function generateMetadata({ params }: Props): Metadata {
  const it = seedFind(params.slug);
  return { title: it?.title ?? 'Article', description: it?.summary, openGraph: { title: it?.title ?? 'Article', description: it?.summary, type: 'article' } };
}

export default function Page({ params }: Props) {
  return <BlogDetail id={params.slug} />;
}
