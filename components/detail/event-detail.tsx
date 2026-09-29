'use client';

import Link from 'next/link';
import { CalendarDays, MapPin } from 'lucide-react';
import type { EventItem } from '@/types';
import { ItemLoader, DetailHeader, MetaPanel } from '@/components/archive/detail';
import { BookmarkButton, GeneratePostButton, ShareButtons } from '@/components/archive/actions';
import { RelatedContent } from '@/components/archive/related-content';
import { PolarImage } from '@/components/common/polar-image';
import { findItem } from '@/lib/archive';
import type { MediaItem } from '@/types';

export function EventDetail({ id }: { id: string }) {
  return (
    <ItemLoader<EventItem> id={id}>
      {(e) => {
        const upcoming = new Date(e.date) > new Date();
        return (
          <div className="container py-8">
            <DetailHeader
              item={e}
              section="Events"
              sectionHref="/events"
              subtitle={
                <span className="flex flex-wrap gap-4 text-sm">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-4 w-4" aria-hidden /> {new Date(e.date).toLocaleDateString('en-IN', { dateStyle: 'long' })}
                    {upcoming && <span className="ml-1 rounded-full bg-success/15 px-2 text-xs text-success">Upcoming</span>}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4" aria-hidden /> {e.venue}
                  </span>
                  <span>{e.eventType}</span>
                </span>
              }
              actions={
                <>
                  <BookmarkButton item={e} />
                  <ShareButtons title={e.title} />
                  <GeneratePostButton item={e} />
                </>
              }
            />
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] [&>*]:min-w-0">
              <div className="space-y-6">
                <p className="text-lg leading-8">{e.description}</p>
                {e.photoIds.length > 0 && (
                  <section aria-labelledby="ph">
                    <h2 id="ph" className="mb-3 text-lg font-semibold">Photos</h2>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {e.photoIds.map((pid) => {
                        const p = findItem(pid) as MediaItem | undefined;
                        return p ? (
                          <Link key={pid} href={`/gallery?item=${p.id}`} className="group overflow-hidden rounded-lg border">
                            <PolarImage variant={p.art} seed={p.id} alt={p.altText} className="aspect-[4/3] transition-transform group-hover:scale-105" />
                            <p className="line-clamp-1 p-2 text-xs">{p.caption}</p>
                          </Link>
                        ) : null;
                      })}
                    </div>
                  </section>
                )}
                {e.reportIds.length > 0 && (
                  <section aria-labelledby="rp">
                    <h2 id="rp" className="mb-2 text-lg font-semibold">Linked reports</h2>
                    <ul className="list-disc pl-5">
                      {e.reportIds.map((rid) => {
                        const r = findItem(rid);
                        return r ? (
                          <li key={rid}>
                            <Link href={`/reports/${r.slug}`} className="text-primary hover:underline">
                              {r.title}
                            </Link>
                          </li>
                        ) : null;
                      })}
                    </ul>
                  </section>
                )}
              </div>
              <aside>
                <MetaPanel item={e} extra={[{ label: 'Type', value: e.eventType }, { label: 'Venue', value: e.venue }]} />
              </aside>
            </div>
            <RelatedContent item={e} />
          </div>
        );
      }}
    </ItemLoader>
  );
}
