'use client';

import Link from 'next/link';
import { Database } from 'lucide-react';
import type { Publication } from '@/types';
import { ItemLoader, DetailHeader, MetaPanel } from '@/components/archive/detail';
import { AccessPanel, BookmarkButton, CiteDialog, GeneratePostButton, ShareButtons } from '@/components/archive/actions';
import { RelatedContent } from '@/components/archive/related-content';
import { findItem } from '@/lib/archive';

export function PublicationDetail({ id }: { id: string }) {
  return (
    <ItemLoader<Publication> id={id}>
      {(p) => (
        <div className="container py-8">
          <DetailHeader
            item={p}
            section="Publications"
            sectionHref="/publications"
            subtitle={
              <span>
                {p.authors.join(', ')} · <em>{p.journal}</em> {p.volume}, {p.pages} ({p.year}) ·{' '}
                <span className="font-mono text-sm">doi:{p.doi}</span>
              </span>
            }
            actions={
              <>
                <BookmarkButton item={p} />
                <CiteDialog item={p} />
                <ShareButtons title={p.title} />
                <GeneratePostButton item={p} />
              </>
            }
          />
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] [&>*]:min-w-0">
            <div className="space-y-6">
              <section aria-labelledby="abs" className="rounded-lg border bg-card p-6">
                <h2 id="abs" className="text-lg font-semibold">Abstract</h2>
                <p className="mt-3 leading-7">{p.abstract}</p>
              </section>
              {p.relatedDatasetIds.length > 0 && (
                <section aria-labelledby="rds" className="rounded-lg border bg-card p-6">
                  <h2 id="rds" className="flex items-center gap-2 text-lg font-semibold">
                    <Database className="h-5 w-5 text-primary" aria-hidden /> Related datasets
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {p.relatedDatasetIds.map((did) => {
                      const d = findItem(did);
                      return d ? (
                        <li key={did}>
                          <Link href={`/data/${d.slug}`} className="text-primary hover:underline">
                            {d.title}
                          </Link>
                        </li>
                      ) : null;
                    })}
                  </ul>
                </section>
              )}
            </div>
            <aside className="space-y-4">
              <div className="rounded-lg border bg-card p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Full text</h2>
                <AccessPanel item={p} files={[{ id: `${p.id}-pdf`, name: `${p.slug}.pdf`, kind: 'pdf', sizeKb: 1800 }]} />
              </div>
              <MetaPanel item={p} extra={[{ label: 'Journal', value: p.journal }, { label: 'DOI', value: <span className="font-mono text-xs">{p.doi}</span> }]} />
            </aside>
          </div>
          <RelatedContent item={p} />
        </div>
      )}
    </ItemLoader>
  );
}
