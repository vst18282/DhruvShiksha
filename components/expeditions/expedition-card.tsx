'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BookOpen, Camera, ChevronDown, Database, FileText, MapPin, Users } from 'lucide-react';
import type { Expedition } from '@/types';
import { PolarImage } from '@/components/common/polar-image';
import { RegionBadge } from '@/components/common';
import { publishedItems } from '@/lib/archive';
import { REGION_META, STATION_NAMES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/ui';

export function expeditionCounts(id: string) {
  const items = publishedItems().filter((i) => i.expeditionId === id);
  return {
    reports: items.filter((i) => i.type === 'report').length,
    datasets: items.filter((i) => i.type === 'dataset').length,
    photos: items.filter((i) => i.type === 'photo' || i.type === 'video').length,
    publications: items.filter((i) => i.type === 'publication').length,
  };
}

export function ExpeditionCard({
  e,
  compact,
  onHover,
  active,
}: {
  e: Expedition;
  compact?: boolean;
  onHover?: (e: Expedition | null) => void;
  active?: boolean;
}) {
  const low = useUiStore((s) => s.lowBandwidth);
  const [open, setOpen] = useState(false);
  const c = expeditionCounts(e.id);
  const color = REGION_META[e.region].color;
  return (
    <article
      onMouseEnter={() => onHover?.(e)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(e)}
      className={cn(
        'group relative overflow-hidden rounded-lg border bg-card transition-all hover:-translate-y-0.5 hover:shadow-lg focus-within:ring-2 focus-within:ring-ring',
        active && 'ring-2 ring-primary/40',
      )}
      style={{ borderTop: `3px solid ${color}` }}
    >
      {!compact && !low && (
        <PolarImage variant={e.art} seed={e.id} alt="" decorative className="aspect-[16/7]">
          <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2 py-0.5 text-xs font-semibold backdrop-blur">{e.number}</span>
        </PolarImage>
      )}
      <div className="p-4">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          <RegionBadge region={e.region} />
          {compact && <span className="text-xs font-semibold text-muted-foreground">{e.number}</span>}
        </div>
        <h3 className="font-semibold leading-snug">
          <Link href={`/expeditions/${e.id}`} className="hover:text-primary focus:outline-none">
            {e.name}
          </Link>
        </h3>
        <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          <span>
            {new Date(e.startDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} – {new Date(e.endDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
          </span>
          {e.station && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden /> {STATION_NAMES[e.station]}
            </span>
          )}
          {e.vessel && <span>{e.vessel}</span>}
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" aria-hidden /> {e.teamSize}
          </span>
        </p>
        {!compact && <p className="mt-2 text-sm">{e.highlights[0]}</p>}
        <ul className="mt-3 grid grid-cols-4 gap-1 text-center text-[11px]" aria-label="Archive items from this expedition">
          {[
            { icon: FileText, n: c.reports, l: 'Reports' },
            { icon: Database, n: c.datasets, l: 'Datasets' },
            { icon: Camera, n: c.photos, l: 'Media' },
            { icon: BookOpen, n: c.publications, l: 'Papers' },
          ].map((x) => (
            <li key={x.l} className="rounded-md bg-muted/60 py-1.5">
              <x.icon className="mx-auto h-3.5 w-3.5 text-primary" aria-hidden />
              <span className="block font-semibold tabular-nums">{x.n}</span>
              <span className="text-muted-foreground">{x.l}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          {open ? 'Less' : 'More'} <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} aria-hidden />
        </button>
        {open && (
          <div className="mt-2 space-y-2 text-sm">
            <p className="text-muted-foreground">Led by {e.leader}</p>
            <ul className="list-disc pl-5">
              {e.objectives.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
            <Link href={`/expeditions/${e.id}`} className="inline-block font-medium text-primary hover:underline">
              Open expedition hub →
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
