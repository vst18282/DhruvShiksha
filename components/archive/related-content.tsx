'use client';

import type { ArchiveItem } from '@/types';
import { useApi } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { ItemCard } from './item-card';
import { CardSkeleton, LoadingRegion } from '@/components/skeletons';
import { EmptyState, SectionHeader } from '@/components/common';
import { useT } from '@/lib/i18n';

/** "Related articles and posts" — content-based similarity with a "why related" hint. */
export function RelatedContent({ item, limit = 6 }: { item: Pick<ArchiveItem, 'id' | 'title'>; limit?: number }) {
  const t = useT();
  const { data, isPending } = useApi(['related', item.id], () => api.getRelated(item.id));
  return (
    <section aria-labelledby="related-heading" className="mt-14 border-t pt-10">
      <SectionHeader id="related-heading" title={t('common.related')} description="Picked by shared topics, tags, expedition, station and text similarity." />
      {isPending ? (
        <LoadingRegion className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </LoadingRegion>
      ) : !data?.length ? (
        <EmptyState title="Nothing related yet" description="As the archive grows, related items will appear here." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.slice(0, limit).map((r) => (
            <ItemCard key={r.item.id} item={r.item} href={r.href} reason={r.reason} compact />
          ))}
        </div>
      )}
    </section>
  );
}
