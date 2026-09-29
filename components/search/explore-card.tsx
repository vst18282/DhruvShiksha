'use client';

import Link from 'next/link';
import { ArrowRight, BarChart3, Calendar, MapPin, Play, Users } from 'lucide-react';
import type { ArchiveItem, ContentType } from '@/types';
import { PolarImage } from '@/components/common/polar-image';
import { Highlighted } from '@/components/archive/item-card';
import { REGION_META, STATION_NAMES } from '@/lib/constants';
import { useDataStore } from '@/store/data';
import { cn } from '@/lib/utils';

/** Type badge text colours, as in the Explore design. */
const TYPE_STYLE: Record<ContentType, { label: string; className: string }> = {
  report: { label: 'Report', className: 'text-[#1d5fbf]' },
  dataset: { label: 'Dataset', className: 'text-[#1d5fbf]' },
  blog: { label: 'Blog', className: 'text-[#1d5fbf]' },
  expedition: { label: 'Expedition', className: 'text-[#d6453d]' },
  publication: { label: 'Publication', className: 'bg-[#f1ebff] text-[#6d3fd8]' },
  photo: { label: 'Media', className: 'text-[#d6336c]' },
  video: { label: 'Media', className: 'text-[#d6336c]' },
  event: { label: 'Event', className: 'text-[#d6453d]' },
};

function place(item: ArchiveItem): string {
  if (item.type === 'event') return item.venue;
  if (item.type === 'expedition' && item.vessel) return item.vessel;
  if (item.station) return `${STATION_NAMES[item.station]} Station`;
  return REGION_META[item.region].label;
}

function people(item: ArchiveItem): string {
  if (item.type === 'event') return item.accessLevel === 'public' ? 'Public' : 'Registered';
  if (item.type === 'expedition') return `${item.teamSize} members`;
  const a = item.authors;
  if (!a.length) return 'NCPOR Team';
  const last = a[0].split(' ').pop();
  const short = a[0].startsWith('Dr.') || a[0].split(' ').length < 2 ? a[0] : `${a[0][0]}. ${last}`;
  return a.length > 1 ? `${short} et al.` : short;
}

const duration = (s = 0) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/**
 * Explore result card: photo header with type/region badges (plus Featured, video length or event
 * date), title, two-line summary, meta row, "why this matched" chips and a round arrow.
 */
export function ExploreCard({ item, href, why, snippet, highlights, lead }: { item: ArchiveItem; href: string; why?: string[]; snippet?: string; highlights?: string[]; lead?: boolean }) {
  const featuredExpedition = useDataStore((s) => s.curation.featuredExpeditionId);
  const featured = (item.type === 'blog' && item.featured) || item.id === featuredExpedition;
  const t = TYPE_STYLE[item.type];
  const date = item.type === 'event' ? new Date(item.date) : null;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-[#e2e9f3] bg-card shadow-[0_2px_10px_rgba(13,47,107,0.06)] transition-all duration-200 focus-within:ring-2 focus-within:ring-ring hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(13,47,107,0.14)] motion-reduce:transform-none dark:border-border">
      <PolarImage
        variant={item.art}
        seed={item.id}
        alt={item.type === 'photo' || item.type === 'video' ? item.altText : ''}
        decorative={!(item.type === 'photo' || item.type === 'video')}
        className={cn('w-full shrink-0', lead ? 'h-48' : 'h-44')}
      >
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10" aria-hidden />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className={cn('rounded-md bg-white/95 px-2 py-0.5 text-[11px] font-semibold shadow-sm', t.className)}>{t.label}</span>
          <span className="rounded-md bg-[#e8f1fc]/95 px-2 py-0.5 text-[11px] font-medium text-[#1d4f91] shadow-sm">{REGION_META[item.region].label}</span>
        </div>
        {featured && !date && <span className="absolute right-3 top-3 rounded-md bg-[#f7b52c] px-2 py-0.5 text-[11px] font-semibold text-[#3d2a00] shadow-sm">Featured</span>}
        {date && (
          <span className="absolute right-3 top-3 flex w-12 flex-col items-center rounded-lg bg-white py-1 text-center leading-none text-[#0d2f6b] shadow-md" aria-label={`Event date ${date.toLocaleDateString('en-IN', { dateStyle: 'long' })}`}>
            <span className="text-[10px] font-semibold uppercase">{date.toLocaleDateString('en-IN', { month: 'short' })}</span>
            <span className="text-lg font-bold">{date.getDate()}</span>
            <span className="text-[9px] text-slate-500">{date.getFullYear()}</span>
          </span>
        )}
        {item.type === 'video' && (
          <>
            <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white ring-2 ring-white/70 backdrop-blur-sm transition-transform group-hover:scale-110">
                <Play className="ml-0.5 h-5 w-5 fill-current" />
              </span>
            </span>
            <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">{duration(item.durationSec)}</span>
          </>
        )}
        {item.type === 'dataset' && (
          <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-[#1d5fbf] shadow" aria-hidden>
            <BarChart3 className="h-4 w-4" />
          </span>
        )}
        {lead && (
          <svg viewBox="0 0 400 40" preserveAspectRatio="none" className="absolute -bottom-px left-0 h-6 w-full" aria-hidden>
            <path d="M0 40 L0 28 C 90 6, 170 34, 260 20 S 360 8, 400 16 L400 40 Z" fill="hsl(var(--card))" />
          </svg>
        )}
      </PolarImage>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className={cn('line-clamp-2 font-semibold leading-snug text-[#0f2c59] dark:text-foreground', lead ? 'text-lg' : 'text-[15px]')}>
          <Link href={href} className="after:absolute after:inset-0 focus:outline-none">
            <Highlighted text={item.title} stems={highlights} />
          </Link>
        </h3>
        <p className="line-clamp-2 text-[13px] leading-5 text-slate-600 dark:text-muted-foreground">
          <Highlighted text={snippet ?? item.summary} stems={highlights} />
        </p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <div className="min-w-0 space-y-2">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-500 dark:text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" aria-hidden /> {item.year}
              </span>
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden /> <span className="truncate">{place(item)}</span>
              </span>
              <span className="inline-flex min-w-0 items-center gap-1">
                <Users className="h-3.5 w-3.5 shrink-0" aria-hidden /> <span className="truncate">{people(item)}</span>
              </span>
            </p>
            {why && why.length > 0 && (
              <p className="flex flex-wrap items-center gap-1.5 text-[11px]" aria-label="Why this matched">
                <span className="text-slate-500 dark:text-muted-foreground">Why this matched:</span>
                {why.slice(0, 3).map((w) => (
                  <span key={w} className="rounded-full bg-[#e8f1fc] px-2 py-0.5 font-medium text-[#1d4f91] dark:bg-primary/15 dark:text-primary">
                    {w}
                  </span>
                ))}
              </p>
            )}
          </div>
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d3dfef] text-[#0d2f6b] transition-colors group-hover:border-[#0d2f6b] group-hover:bg-[#0d2f6b] group-hover:text-white dark:border-border dark:text-primary"
            aria-hidden
          >
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </article>
  );
}
