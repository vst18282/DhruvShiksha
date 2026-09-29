'use client';

import Link from 'next/link';
import { Calendar, Clock, Download, Eye, FileText, MapPin, Play } from 'lucide-react';
import type { ArchiveItem } from '@/types';
import { PolarImage } from '@/components/common/polar-image';
import { AccessBadge, RegionBadge, StatusBadge } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { CONTENT_TYPE_LABELS, STATION_NAMES } from '@/lib/constants';
import { itemHref } from '@/lib/archive';
import { highlightParts } from '@/lib/search';
import { cn, formatCompact } from '@/lib/utils';
import { useUiStore } from '@/store/ui';

export function Highlighted({ text, stems }: { text: string; stems?: string[] }) {
  if (!stems?.length) return <>{text}</>;
  return (
    <>
      {highlightParts(text, stems).map((p, i) =>
        p.hit ? (
          <mark key={i} className="rounded-sm bg-polar-amber/30 px-0.5 text-inherit">
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

function meta(item: ArchiveItem): string {
  switch (item.type) {
    case 'blog':
      return `${item.readingMinutes} min read`;
    case 'report':
      return `${item.reportType} · ${item.pages} pp`;
    case 'dataset':
      return `${item.format} · ${item.sizeMb} MB`;
    case 'publication':
      return item.journal;
    case 'video':
      return `${Math.floor((item.durationSec ?? 0) / 60)} min video`;
    case 'photo':
      return 'Photo';
    case 'event':
      return `${item.eventType} · ${item.venue}`;
    case 'expedition':
      return `${item.number} · ${item.teamSize} members`;
  }
}

interface CardProps {
  item: ArchiveItem;
  href?: string;
  why?: string[];
  snippet?: string;
  highlights?: string[];
  reason?: string;
  className?: string;
  compact?: boolean;
  showStatus?: boolean;
}

export function ItemCard({ item, href, why, snippet, highlights, reason, className, compact, showStatus }: CardProps) {
  const low = useUiStore((s) => s.lowBandwidth);
  const link = href ?? itemHref(item);
  return (
    <article className={cn('group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring', className)}>
      {!low && (
        <PolarImage variant={item.art} seed={item.id} alt={item.type === 'photo' || item.type === 'video' ? item.altText : ''} decorative={!(item.type === 'photo' || item.type === 'video')} className={cn('w-full', compact ? 'aspect-[16/8]' : 'aspect-[16/10]')}>
          <div className="absolute left-3 top-3 flex gap-1.5">
            <Badge variant="secondary" className="bg-background/90 backdrop-blur">
              {CONTENT_TYPE_LABELS[item.type].singular}
            </Badge>
          </div>
          {item.type === 'video' && (
            <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white">
                <Play className="h-5 w-5" />
              </span>
            </span>
          )}
        </PolarImage>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {low && <Badge variant="secondary">{CONTENT_TYPE_LABELS[item.type].singular}</Badge>}
          <RegionBadge region={item.region} />
          {item.accessLevel !== 'public' && <AccessBadge level={item.accessLevel} />}
          {showStatus && item.status !== 'published' && <StatusBadge status={item.status} />}
        </div>
        <h3 className="line-clamp-2 font-semibold leading-snug">
          <Link href={link} className="after:absolute after:inset-0 focus:outline-none">
            <Highlighted text={item.title} stems={highlights} />
          </Link>
        </h3>
        {!compact && (
          <p className="line-clamp-3 text-sm text-muted-foreground">
            <Highlighted text={snippet ?? item.summary} stems={highlights} />
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" aria-hidden />
            {item.year}
          </span>
          {item.station && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden />
              {STATION_NAMES[item.station]}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <FileText className="h-3 w-3" aria-hidden />
            {meta(item)}
          </span>
        </div>
        {(why?.length || reason) && (
          <div className="flex flex-wrap gap-1 pt-1" aria-label={reason ? 'Why related' : 'Why this matched'}>
            {reason && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] text-accent-foreground">{reason}</span>
            )}
            {why?.map((w) => (
              <span key={w} className="rounded-full bg-accent px-2 py-0.5 text-[11px] text-accent-foreground">
                {w}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export function ItemRow({ item, href, why, snippet, highlights, className }: CardProps) {
  const low = useUiStore((s) => s.lowBandwidth);
  const link = href ?? itemHref(item);
  return (
    <article className={cn('group relative flex gap-4 rounded-lg border bg-card p-3 transition-shadow hover:shadow-sm focus-within:ring-2 focus-within:ring-ring sm:p-4', className)}>
      {!low && <PolarImage variant={item.art} seed={item.id} alt="" decorative className="hidden h-20 w-28 shrink-0 rounded-md sm:block" />}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary">{CONTENT_TYPE_LABELS[item.type].singular}</Badge>
          <RegionBadge region={item.region} />
          {item.accessLevel !== 'public' && <AccessBadge level={item.accessLevel} />}
          <span className="text-xs text-muted-foreground">{item.year}</span>
        </div>
        <h3 className="line-clamp-1 font-semibold">
          <Link href={link} className="after:absolute after:inset-0 focus:outline-none">
            <Highlighted text={item.title} stems={highlights} />
          </Link>
        </h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          <Highlighted text={snippet ?? item.summary} stems={highlights} />
        </p>
        {why && why.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {why.map((w) => (
              <span key={w} className="rounded-full bg-accent px-2 py-0.5 text-[11px] text-accent-foreground">
                {w}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="hidden shrink-0 flex-col items-end gap-1 text-xs text-muted-foreground md:flex">
        <span className="inline-flex items-center gap-1">
          <Eye className="h-3 w-3" aria-hidden /> {formatCompact(item.views)}
        </span>
        {item.downloads > 0 && (
          <span className="inline-flex items-center gap-1">
            <Download className="h-3 w-3" aria-hidden /> {formatCompact(item.downloads)}
          </span>
        )}
        {item.type === 'blog' && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden /> {item.readingMinutes}m
          </span>
        )}
      </div>
    </article>
  );
}
