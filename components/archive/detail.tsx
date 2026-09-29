'use client';

import * as React from 'react';
import { useEffect } from 'react';
import Link from 'next/link';
import { SearchX } from 'lucide-react';
import type { ArchiveItem } from '@/types';
import { AccessBadge, Breadcrumbs, EmptyState, ErrorState, RegionBadge, StatusBadge } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DetailPageSkeleton } from '@/components/skeletons';
import { useItem } from '@/hooks/use-queries';
import { useRegisterPageContext, type PageContextType } from '@/store/page-context';
import { useUserStore } from '@/store/user';
import { refOf } from '@/lib/archive';
import { CONTENT_TYPE_LABELS, DISCIPLINE_LABELS, STATION_NAMES } from '@/lib/constants';
import { formatNumber } from '@/lib/utils';
import { ReactionBar } from '@/components/engagement/reaction-bar';

/**
 * Loads an item via the mock API, handles skeleton / error / not-found states,
 * registers chatbot page context and records "recently viewed".
 */
export function ItemLoader<T extends ArchiveItem>({ id, children }: { id: string; children: (item: T) => React.ReactNode }) {
  const { data, isPending, isError, refetch } = useItem<T>(id);
  const record = useUserStore((s) => s.recordView);
  useRegisterPageContext(data ? { type: data.type as PageContextType, id: data.id, title: data.title } : null);
  useEffect(() => {
    if (data) record(refOf(data), data.title);
  }, [data, record]);

  if (isPending) return <DetailPageSkeleton />;
  if (isError)
    return (
      <div className="container py-12">
        <ErrorState action={<Button onClick={() => refetch()}>Retry</Button>} />
      </div>
    );
  if (!data)
    return (
      <div className="container py-12">
        <EmptyState
          icon={<SearchX className="h-6 w-6" />}
          title="Item not found"
          description="It may be unpublished, awaiting approval, or the link is incorrect."
          action={
            <Button asChild>
              <Link href="/explore">Search the archive</Link>
            </Button>
          }
        />
      </div>
    );
  return <>{children(data)}</>;
}

export function DetailHeader({ item, section, sectionHref, actions, subtitle }: { item: ArchiveItem; section: string; sectionHref: string; actions?: React.ReactNode; subtitle?: React.ReactNode }) {
  return (
    <header className="mb-8">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: section, href: sectionHref }, { label: item.title }]} />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{CONTENT_TYPE_LABELS[item.type].singular}</Badge>
        <RegionBadge region={item.region} />
        <AccessBadge level={item.accessLevel} />
        {item.status !== 'published' && <StatusBadge status={item.status} />}
        {item.userCreated && <Badge variant="outline">Uploaded in this demo</Badge>}
      </div>
      <h1 className="max-w-4xl text-balance text-3xl font-semibold tracking-tight md:text-4xl">{item.title}</h1>
      {subtitle && <div className="mt-3 max-w-3xl text-muted-foreground">{subtitle}</div>}
      {actions && <div className="mt-5 flex flex-wrap gap-2">{actions}</div>}
      {item.status === 'published' && <ReactionBar type={item.type} id={item.id} title={item.title} className="mt-3" />}
    </header>
  );
}

export function MetaPanel({ item, extra }: { item: ArchiveItem; extra?: { label: string; value: React.ReactNode }[] }) {
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Authors', value: item.authors.join(', ') },
    { label: 'Year', value: item.year },
    ...(item.station ? [{ label: 'Station', value: <Link className="text-primary hover:underline" href={`/stations/${item.station}`}>{STATION_NAMES[item.station]}</Link> }] : []),
    ...(item.expeditionId && item.type !== 'expedition' ? [{ label: 'Expedition', value: <Link className="text-primary hover:underline" href={`/expeditions/${item.expeditionId}`}>{item.expeditionId.toUpperCase()}</Link> }] : []),
    { label: 'Discipline', value: DISCIPLINE_LABELS[item.discipline] },
    ...(extra ?? []),
    { label: 'Licence', value: item.licence },
    { label: 'Credit', value: item.credit },
    { label: 'Views', value: formatNumber(item.views) },
    { label: 'Downloads', value: formatNumber(item.downloads) },
  ];
  return (
    <div className="rounded-lg border bg-card p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Metadata</h2>
      <dl className="space-y-2.5 text-sm">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[110px_1fr] gap-2">
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd className="min-w-0 break-words">{r.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {item.tags.slice(0, 10).map((t) => (
          <Link key={t} href={`/explore?q=${encodeURIComponent(t)}`} className="rounded-full border px-2 py-0.5 text-xs hover:bg-muted">
            #{t}
          </Link>
        ))}
      </div>
    </div>
  );
}
