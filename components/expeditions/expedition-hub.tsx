'use client';

import Link from 'next/link';
import { BookHeart, CalendarRange, Lightbulb, MapPin, Ship, Target, Users } from 'lucide-react';
import type { ArchiveItem, ContentType, Expedition, MediaItem } from '@/types';
import { ItemLoader, DetailHeader } from '@/components/archive/detail';
import { BookmarkButton, GeneratePostButton, ShareButtons } from '@/components/archive/actions';
import { RelatedContent } from '@/components/archive/related-content';
import { GenerateSummaryButton } from '@/components/studio/summary-dialog';
import { ItemCard } from '@/components/archive/item-card';
import { PolarImage } from '@/components/common/polar-image';
import { EmptyState, Timeline } from '@/components/common';
import { MiniMap } from '@/components/maps/mini-map';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { publishedItems } from '@/lib/archive';
import { REGION_META, STATION_NAMES } from '@/lib/constants';
import { DIARIES } from '@/data/learn';

function Grid({ items, empty }: { items: ArchiveItem[]; empty: string }) {
  if (!items.length) return <EmptyState title={empty} />;
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((i) => <ItemCard key={i.id} item={i} compact />)}</div>;
}

function Hub({ e }: { e: Expedition }) {
  const items = publishedItems().filter((i) => i.expeditionId === e.id && i.id !== e.id);
  const of = (t: ContentType[]) => items.filter((i) => t.includes(i.type));
  const media = of(['photo', 'video']) as MediaItem[];
  const events = publishedItems().filter((i) => i.type === 'event' && i.region === e.region && Math.abs(i.year - e.year) <= 1);
  const end = e.track[e.track.length - 1];
  const tabs: { id: string; label: string; n?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'team', label: 'Team', n: e.team.length },
    { id: 'timeline', label: 'Timeline' },
    { id: 'map', label: 'Map track' },
    { id: 'reports', label: 'Reports', n: of(['report']).length },
    { id: 'datasets', label: 'Datasets', n: of(['dataset']).length },
    { id: 'gallery', label: 'Gallery', n: media.length },
    { id: 'blogs', label: 'Blogs', n: of(['blog', 'publication']).length },
    { id: 'activities', label: 'Activities', n: events.length },
  ];
  return (
    <div>
      <div className="relative">
        <PolarImage variant={e.art} seed={e.id} alt={`Photo illustrating ${e.name}`} className="h-[260px] md:h-[340px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>
      <div className="container -mt-28 relative py-2">
        <DetailHeader
          item={e}
          section="Expeditions"
          sectionHref="/expeditions"
          subtitle={
            <span className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1"><CalendarRange className="h-4 w-4" aria-hidden /> {e.startDate} → {e.endDate}</span>
              {e.station && <Link href={`/stations/${e.station}`} className="inline-flex items-center gap-1 text-primary hover:underline"><MapPin className="h-4 w-4" aria-hidden /> {STATION_NAMES[e.station]}</Link>}
              {e.vessel && <span className="inline-flex items-center gap-1"><Ship className="h-4 w-4" aria-hidden /> {e.vessel}</span>}
              <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" aria-hidden /> {e.teamSize} members · leader {e.leader}</span>
            </span>
          }
          actions={
            <>
              <BookmarkButton item={e} />
              <ShareButtons title={e.name} />
              <GenerateSummaryButton item={e} />
              <GeneratePostButton item={e} />
              {DIARIES[e.id] && (
                <Button variant="secondary" size="sm" asChild>
                  <Link href={`/learn/diary/${e.id}`}>
                    <BookHeart /> Virtual expedition diary
                  </Link>
                </Button>
              )}
            </>
          }
        />
        <Tabs defaultValue="overview">
          <TabsList className="w-full justify-start">
            {tabs.map((t) => (
              <TabsTrigger key={t.id} value={t.id}>
                {t.label}
                {t.n !== undefined && <span className="rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">{t.n}</span>}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="overview">
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="space-y-6">
                <p className="text-lg leading-8">{e.summary}</p>
                <section className="rounded-lg border bg-card p-5" aria-labelledby="obj">
                  <h2 id="obj" className="flex items-center gap-2 font-semibold"><Target className="h-5 w-5 text-primary" aria-hidden /> Objectives</h2>
                  <ul className="mt-3 list-disc space-y-1 pl-5">{e.objectives.map((o) => <li key={o}>{o}</li>)}</ul>
                </section>
                <section className="rounded-lg border bg-gradient-to-br from-polar-teal/10 to-polar-violet/10 p-5" aria-labelledby="hl">
                  <h2 id="hl" className="flex items-center gap-2 font-semibold"><Lightbulb className="h-5 w-5 text-polar-amber" aria-hidden /> Highlights</h2>
                  <ul className="mt-3 space-y-2">{e.highlights.map((h) => <li key={h}>• {h}</li>)}</ul>
                  <p className="mt-3 text-xs text-muted-foreground">Demo highlights — illustrative only.</p>
                </section>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <MiniMap track={e.track} center={end} points={[{ lon: end[0], lat: end[1], label: e.station ? STATION_NAMES[e.station] : 'Survey area', color: REGION_META[e.region].color }]} label={`Route of ${e.name}`} />
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  {[
                    ['Reports', of(['report']).length],
                    ['Datasets', of(['dataset']).length],
                    ['Media', media.length],
                    ['Papers', of(['publication']).length],
                  ].map(([l, v]) => (
                    <div key={l} className="rounded-md bg-muted/60 p-2 text-center">
                      <dt className="text-xs text-muted-foreground">{l}</dt>
                      <dd className="text-lg font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="team">
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full text-sm">
                <caption className="sr-only">Expedition team (sample of members, demo names)</caption>
                <thead className="border-b bg-muted/50 text-left"><tr><th scope="col" className="px-4 py-2">Name</th><th scope="col" className="px-4 py-2">Role</th><th scope="col" className="px-4 py-2">Institute</th></tr></thead>
                <tbody>{e.team.map((m, i) => <tr key={i} className="border-b last:border-0"><td className="px-4 py-2 font-medium">{m.name}</td><td className="px-4 py-2">{m.role}</td><td className="px-4 py-2 text-muted-foreground">{m.institute}</td></tr>)}</tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Showing {e.team.length} of {e.teamSize} members. Names are fictional.</p>
          </TabsContent>
          <TabsContent value="timeline" className="max-w-2xl">
            <Timeline items={e.timeline.map((t) => ({ date: t.date, title: t.title, text: t.text }))} />
          </TabsContent>
          <TabsContent value="map">
            <div className="grid gap-6 md:grid-cols-[1fr_280px]">
              <div className="rounded-lg border bg-card p-4">
                <MiniMap className="mx-auto max-w-[520px]" track={e.track} center={[(e.track[0][0] + end[0]) / 2, (e.track[0][1] + end[1]) / 2]} points={[{ lon: e.track[0][0], lat: e.track[0][1], label: 'Start', color: '#2DD4BF' }, { lon: end[0], lat: end[1], label: 'Destination', color: REGION_META[e.region].color }]} label={`Full route of ${e.name}`} />
              </div>
              <div>
                <h3 className="mb-2 font-semibold">Waypoints</h3>
                <ol className="space-y-1 font-mono text-xs">{e.track.map(([lon, lat], i) => <li key={i}>{i + 1}. {lat.toFixed(2)}°, {lon.toFixed(2)}°</li>)}</ol>
                <Button variant="link" className="px-0" asChild><Link href="/tools/polar-map/2d">Open in Polar Map →</Link></Button>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="reports"><Grid items={of(['report'])} empty="No reports yet" /></TabsContent>
          <TabsContent value="datasets"><Grid items={of(['dataset'])} empty="No datasets yet" /></TabsContent>
          <TabsContent value="gallery">
            {media.length ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {media.map((m) => (
                  <Link key={m.id} href={`/gallery?item=${m.id}`} className="group overflow-hidden rounded-lg border">
                    <PolarImage variant={m.art} seed={m.id} alt={m.altText} className="aspect-[4/3] transition-transform group-hover:scale-105" />
                    <p className="line-clamp-1 p-2 text-xs">{m.title}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState title="No media yet" />
            )}
          </TabsContent>
          <TabsContent value="blogs"><Grid items={of(['blog', 'publication'])} empty="No blogs or papers yet" /></TabsContent>
          <TabsContent value="activities"><Grid items={events} empty="No linked activities" /></TabsContent>
        </Tabs>
        <RelatedContent item={e} />
      </div>
    </div>
  );
}

export function ExpeditionHub({ id }: { id: string }) {
  return <ItemLoader<Expedition> id={id}>{(e) => <Hub e={e} />}</ItemLoader>;
}
