'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import type { StationSlug } from '@/types';
import { STATIONS } from '@/data/stations';
import { publishedItems, itemHref } from '@/lib/archive';
import { REGION_META, CONTENT_TYPE_LABELS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { RegionBadge } from '@/components/common';

/** Side panel listing a station's expeditions, reports, datasets and photos (shared by 2D map and 3D globe). */
export function StationPanel({ slug, onClose }: { slug: StationSlug; onClose: () => void }) {
  const st = STATIONS.find((s) => s.slug === slug)!;
  const items = publishedItems().filter((i) => i.station === slug);
  const groups = (['expedition', 'report', 'dataset', 'photo'] as const).map((t) => ({ t, list: items.filter((i) => i.type === t) }));
  return (
    <div className="flex h-full flex-col rounded-lg border bg-card" role="region" aria-label={`${st.name} station details`}>
      <div className="flex items-start gap-2 border-b p-4" style={{ borderTop: `3px solid ${REGION_META[st.region].color}` }}>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{st.name}</h2>
          <p className="text-xs text-muted-foreground">{st.location}</p>
          <RegionBadge region={st.region} className="mt-1" />
        </div>
        <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close station panel"><X /></Button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
        <p className="text-muted-foreground">{st.description}</p>
        <p className="font-mono text-xs">{st.lat.toFixed(2)}°, {st.lon.toFixed(2)}° · est. {st.established} · {st.elevationM} m</p>
        {groups.map(({ t, list }) => (
          <div key={t}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{CONTENT_TYPE_LABELS[t].plural} ({list.length})</p>
            <ul className="space-y-1">
              {list.slice(0, 5).map((i) => (
                <li key={i.id}><Link href={itemHref(i)} className="line-clamp-1 text-primary hover:underline">{i.title}</Link></li>
              ))}
              {list.length === 0 && <li className="text-xs text-muted-foreground">None yet</li>}
            </ul>
          </div>
        ))}
        <Button variant="outline" size="sm" asChild><Link href={`/stations/${slug}`}>Station page →</Link></Button>
      </div>
    </div>
  );
}
