'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, List, MapPin } from 'lucide-react';
import type { EventItem } from '@/types';
import { SectionHeader, EmptyState, RegionBadge } from '@/components/common';
import { CardGridSkeleton } from '@/components/skeletons';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PolarImage } from '@/components/common/polar-image';
import { useApi } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { cn } from '@/lib/utils';

const TYPES: EventItem['eventType'][] = ['Workshop', 'MoU', 'School outreach', 'Lecture', 'Visit', 'Award', 'Conference'];

export function EventsView() {
  const { data, isPending } = useApi(['events'], api.getEvents);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [type, setType] = useState<string>('all');
  const [month, setMonth] = useState(() => new Date(2026, 8, 1));
  const events = useMemo(() => (data ?? []).filter((e) => type === 'all' || e.eventType === type), [data, type]);
  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.date) >= now).sort((a, b) => a.date.localeCompare(b.date));
  const past = events.filter((e) => new Date(e.date) < now);

  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) });

  const Card = ({ e }: { e: EventItem }) => (
    <article className="group relative flex gap-4 rounded-lg border bg-card p-4 hover:shadow-sm focus-within:ring-2 focus-within:ring-ring">
      <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-md bg-secondary py-2 text-center">
        <span className="text-xs uppercase text-muted-foreground">{format(new Date(e.date), 'MMM')}</span>
        <span className="text-2xl font-semibold leading-none">{format(new Date(e.date), 'd')}</span>
        <span className="text-[11px] text-muted-foreground">{format(new Date(e.date), 'yyyy')}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap gap-1.5">
          <Badge variant="secondary">{e.eventType}</Badge>
          <RegionBadge region={e.region} />
        </div>
        <h3 className="font-semibold">
          <Link href={`/events/${e.slug}`} className="after:absolute after:inset-0">
            {e.title}
          </Link>
        </h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{e.summary}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" aria-hidden /> {e.venue}
        </p>
      </div>
      <PolarImage variant={e.art} seed={e.id} alt="" decorative className="hidden h-20 w-28 shrink-0 rounded-md md:block" />
    </article>
  );

  return (
    <div className="container py-8">
      <SectionHeader as="h1" eyebrow="Institutional activities" title="Events" description="Workshops, MoUs, school outreach, lectures, visits and awards (demo records)." />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-52" aria-label="Event type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All event types</SelectItem>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as 'list' | 'calendar')} aria-label="View">
          <ToggleGroupItem value="list">
            <List /> List
          </ToggleGroupItem>
          <ToggleGroupItem value="calendar">
            <CalendarDays /> Calendar
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {isPending ? (
        <CardGridSkeleton count={4} className="lg:grid-cols-2" />
      ) : events.length === 0 ? (
        <EmptyState title="No events of this type" />
      ) : view === 'list' ? (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section aria-labelledby="up">
              <h2 id="up" className="mb-3 text-lg font-semibold">Upcoming</h2>
              <div className="grid gap-3 lg:grid-cols-2">{upcoming.map((e) => <Card key={e.id} e={e} />)}</div>
            </section>
          )}
          <section aria-labelledby="past">
            <h2 id="past" className="mb-3 text-lg font-semibold">Past events</h2>
            <div className="grid gap-3 lg:grid-cols-2">{past.map((e) => <Card key={e.id} e={e} />)}</div>
          </section>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b p-3">
            <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month">
              <ChevronLeft />
            </Button>
            <h2 className="font-semibold" aria-live="polite">{format(month, 'MMMM yyyy')}</h2>
            <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month">
              <ChevronRight />
            </Button>
          </div>
          <div className="grid grid-cols-7 border-b text-center text-xs font-medium text-muted-foreground">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const evs = events.filter((e) => isSameDay(new Date(e.date), d));
              return (
                <div key={d.toISOString()} className={cn('min-h-20 border-b border-r p-1.5 text-xs', !isSameMonth(d, month) && 'bg-muted/40 text-muted-foreground')}>
                  <span className="font-medium">{format(d, 'd')}</span>
                  {evs.map((e) => (
                    <Link key={e.id} href={`/events/${e.slug}`} className="mt-1 block truncate rounded bg-primary/15 px-1 py-0.5 text-[11px] text-foreground hover:bg-primary/25">
                      {e.title}
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
          <p className="p-3 text-xs text-muted-foreground">
            Tip: events in the demo range from 2022 to Dec 2026. Jump months with the arrows. Months with events:{' '}
            {Array.from(new Set(events.map((e) => e.date.slice(0, 7)))).sort().slice(-6).map((m) => (
              <button key={m} type="button" className="mx-1 text-primary hover:underline" onClick={() => setMonth(new Date(`${m}-01T00:00:00`))}>
                {m}
              </button>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}
