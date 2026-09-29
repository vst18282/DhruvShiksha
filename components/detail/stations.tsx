'use client';

import Link from 'next/link';
import { ArrowRight, Mountain, SearchX } from 'lucide-react';
import type { ArchiveItem, ContentType, Station } from '@/types';
import { PolarImage } from '@/components/common/polar-image';
import { Breadcrumbs, EmptyState, RegionBadge, SectionHeader, Timeline } from '@/components/common';
import { CardGridSkeleton, DetailPageSkeleton } from '@/components/skeletons';
import { ItemCard } from '@/components/archive/item-card';
import { RelatedContent } from '@/components/archive/related-content';
import { MiniMap } from '@/components/maps/mini-map';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useApi } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { REGION_META, CONTENT_TYPE_LABELS } from '@/lib/constants';
import { useRegisterPageContext } from '@/store/page-context';

export function StationsView() {
  const { data, isPending } = useApi(['stations'], api.getStations);
  return (
    <div className="container py-8">
      <SectionHeader as="h1" eyebrow="Infrastructure" title="Research stations" description="India’s four polar and high-altitude stations (facts are illustrative demo values)." />
      {isPending || !data ? (
        <CardGridSkeleton count={4} className="lg:grid-cols-2" />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {data.map((s) => (
            <article key={s.slug} className="group relative overflow-hidden rounded-lg border bg-card focus-within:ring-2 focus-within:ring-ring">
              <PolarImage variant={s.art} seed={s.slug} alt={`Photo illustrating ${s.name} station`} className="aspect-[16/8]" />
              <div className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xl font-semibold">
                    <Link href={`/stations/${s.slug}`} className="after:absolute after:inset-0">
                      {s.name}
                    </Link>
                  </h2>
                  <RegionBadge region={s.region} />
                </div>
                <p className="text-sm text-muted-foreground">{s.location}</p>
                <p className="mt-2 line-clamp-2 text-sm">{s.description}</p>
                <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Visit station page <ArrowRight className="h-4 w-4" aria-hidden />
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

const GROUPS: { type: ContentType; label: string }[] = [
  { type: 'expedition', label: 'Expeditions' },
  { type: 'report', label: 'Reports' },
  { type: 'dataset', label: 'Datasets' },
  { type: 'blog', label: 'Blogs' },
  { type: 'photo', label: 'Photos' },
];

function StationBody({ station, items }: { station: Station; items: ArchiveItem[] }) {
  useRegisterPageContext({ type: 'station', id: station.slug, title: `${station.name} station` });
  return (
    <div className="container py-8">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Stations', href: '/stations' }, { label: station.name }]} />
      <div className="relative mb-8 overflow-hidden rounded-lg">
        <PolarImage variant={station.art} seed={station.slug} alt={`Photo illustrating ${station.name} station`} className="aspect-[21/8] min-h-[220px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-polar-navy/90 to-transparent" />
        <div className="absolute bottom-0 p-6 text-white">
          <RegionBadge region={station.region} className="mb-2 border-white/30 bg-white/15 text-white" />
          <h1 className="text-3xl font-semibold md:text-4xl">{station.name} station</h1>
          <p className="text-white/80">{station.location}</p>
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <p className="text-lg leading-8">{station.description}</p>
          <dl className="grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Established', value: String(station.established) },
              { label: 'Elevation', value: `${station.elevationM} m` },
              { label: 'Coordinates', value: `${station.lat.toFixed(2)}°, ${station.lon.toFixed(2)}°` },
              ...station.facts,
            ].map((f) => (
              <div key={f.label} className="rounded-lg border bg-card p-4">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">{f.label}</dt>
                <dd className="mt-1 font-semibold">{f.value}</dd>
              </div>
            ))}
          </dl>
          <section aria-labelledby="st-content">
            <h2 id="st-content" className="mb-3 text-xl font-semibold">From the archive</h2>
            <Tabs defaultValue="expedition">
              <TabsList>
                {GROUPS.map((g) => (
                  <TabsTrigger key={g.type} value={g.type}>
                    {g.label} <span className="text-xs text-muted-foreground">{items.filter((i) => i.type === g.type).length}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
              {GROUPS.map((g) => {
                const list = items.filter((i) => i.type === g.type);
                return (
                  <TabsContent key={g.type} value={g.type}>
                    {list.length ? (
                      <div className="grid gap-4 sm:grid-cols-2">{list.slice(0, 6).map((i) => <ItemCard key={i.id} item={i} compact />)}</div>
                    ) : (
                      <EmptyState title={`No ${CONTENT_TYPE_LABELS[g.type].plural.toLowerCase()} yet`} />
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </section>
        </div>
        <aside className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Mountain className="h-4 w-4 text-primary" aria-hidden /> Location
            </h2>
            <MiniMap points={[{ lon: station.lon, lat: station.lat, label: station.name, color: REGION_META[station.region].color }]} label={`Globe showing the location of ${station.name}`} className="mx-auto max-w-[260px]" />
            <Button variant="link" className="px-0" asChild>
              <Link href="/tools/polar-map/2d">Open on the polar map →</Link>
            </Button>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <h2 className="mb-4 text-sm font-semibold">Station timeline</h2>
            <Timeline items={station.timeline.map((t) => ({ date: String(t.year), title: t.text }))} />
          </div>
        </aside>
      </div>
      {items[0] && <RelatedContent item={{ id: items.find((i) => i.type === 'expedition')?.id ?? items[0].id, title: station.name }} />}
    </div>
  );
}

export function StationDetail({ slug }: { slug: string }) {
  const { data, isPending } = useApi(['station', slug], () => api.getStation(slug).then((x) => x ?? null));
  if (isPending) return <DetailPageSkeleton />;
  if (!data)
    return (
      <div className="container py-12">
        <EmptyState icon={<SearchX className="h-6 w-6" />} title="Station not found" action={<Button asChild><Link href="/stations">All stations</Link></Button>} />
      </div>
    );
  return <StationBody station={data.station} items={data.items} />;
}
