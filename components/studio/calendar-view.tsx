'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isWeekend, startOfMonth, startOfWeek } from 'date-fns';
import { toast } from 'sonner';
import { CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, GripVertical, PenSquare, Sparkles } from 'lucide-react';
import type { PlatformId, SocialPost } from '@/types';
import { PlatformIcon, brandHex } from './platform-icon';
import { PostDetailDialog } from './post-detail';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/misc';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/skeletons';
import { useApi, useInvalidate } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { PLATFORM_META, SPECIAL_DAYS } from '@/lib/constants';
import { useCan } from '@/lib/permissions';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';

/** Convert an ISO instant to an IST wall-clock Date (for day bucketing). */
const toIst = (iso: string) => new Date(new Date(iso).getTime() + (330 + new Date().getTimezoneOffset()) * 60000);
const whenOf = (p: SocialPost) => p.scheduledAt ?? p.publishedAt;
const MAX_CHIPS = 3;
const PLATFORMS = Object.keys(PLATFORM_META) as PlatformId[];
type View = 'month' | 'week' | 'agenda';

/** Soft brand-tinted chip: brand colour on the left edge, tinted background (dark marks fall back to primary). */
function tint(p: SocialPost) {
  const hex = brandHex(p.platforms[0] ?? 'x');
  const c = hex === '#000000' ? '#3B82C4' : hex;
  return { borderLeftColor: c, background: `${c}14` };
}

function Chip({ p, draggable, onOpen, refined }: { p: SocialPost; draggable: boolean; onOpen: (p: SocialPost) => void; refined?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: p.id, disabled: !draggable });
  const published = p.status === 'published';
  const move = transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined;
  if (refined) {
    const c = tint(p).borderLeftColor;
    return (
      <div
        ref={setNodeRef}
        style={{ transform: move }}
        className={cn('group flex items-center gap-1.5 rounded-lg border bg-background px-2 py-1 text-[11px] leading-tight shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:-translate-y-px hover:shadow-md', isDragging && 'z-50 shadow-lg ring-1 ring-primary')}
      >
        <span className={cn('h-2 w-2 shrink-0 rounded-full', !published && 'ring-2 ring-inset ring-current bg-transparent')} style={{ background: published ? c : undefined, color: c }} aria-hidden />
        <button type="button" onClick={() => onOpen(p)} className="min-w-0 flex-1 truncate text-left" title={p.title}>
          <span className="font-semibold tabular-nums text-muted-foreground">{format(toIst(whenOf(p)!), 'HH:mm')}</span> <span className="group-hover:underline">{p.title}</span>
        </button>
        <span className="flex shrink-0 -space-x-0.5 opacity-80">
          {p.platforms.slice(0, 2).map((pl) => (
            <PlatformIcon key={pl} id={pl} className="h-3 w-3" />
          ))}
        </span>
        <span className="sr-only">{published ? 'Published' : 'Scheduled'}</span>
      </div>
    );
  }
  return (
    <div
      ref={setNodeRef}
      style={{ transform: move, ...tint(p) }}
      className={cn('group flex items-center gap-1 rounded-md border-l-[3px] px-1.5 py-1 text-[11px] leading-tight transition-shadow hover:shadow-sm', isDragging && 'z-50 shadow-lg ring-1 ring-primary')}
    >
      {draggable && (
        <button type="button" {...listeners} {...attributes} className="-ml-0.5 cursor-grab text-muted-foreground opacity-60 hover:opacity-100" aria-label={`Drag to reschedule ${p.title}`}>
          <GripVertical className="h-3 w-3" />
        </button>
      )}
      <span className="flex shrink-0 -space-x-0.5">
        {p.platforms.slice(0, 3).map((pl) => (
          <PlatformIcon key={pl} id={pl} className="h-3 w-3" />
        ))}
      </span>
      <button type="button" onClick={() => onOpen(p)} className="min-w-0 flex-1 truncate text-left hover:underline" title={p.title}>
        <span className="font-semibold tabular-nums">{format(toIst(whenOf(p)!), 'HH:mm')}</span> {p.title}
      </button>
      {published && <CheckCircle2 className="h-3 w-3 shrink-0 text-success" aria-label="Published" />}
    </div>
  );
}

function DayCell({ day, muted, children, special, canDraft, onMore, more, refined }: { day: Date; muted: boolean; children: React.ReactNode; special?: string; canDraft: boolean; onMore?: () => void; more: number; refined?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: day.toISOString() });
  const today = isSameDay(day, new Date());
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col gap-1 text-xs transition-colors',
        refined
          ? cn('min-h-[8.5rem] bg-card p-2 hover:bg-muted/30', isWeekend(day) && 'bg-muted/20', muted && 'bg-muted/40 text-muted-foreground/60', today && 'bg-primary/[0.05] ring-1 ring-inset ring-primary/30')
          : cn('min-h-[7.5rem] border-b border-r p-1.5', isWeekend(day) && 'bg-muted/25', muted && 'bg-muted/50 text-muted-foreground'),
        isOver && 'bg-primary/10 ring-2 ring-inset ring-primary/40',
      )}
      aria-label={format(day, 'EEEE d MMMM')}
    >
      <div className="flex items-center justify-between">
        {refined ? (
          <span className={cn('flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-semibold', today ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground/80', muted && !today && 'text-muted-foreground/60')}>
            {day.getDate() === 1 ? format(day, 'd MMM') : format(day, 'd')}
          </span>
        ) : (
          <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold', today && 'bg-primary text-primary-foreground shadow')}>{format(day, 'd')}</span>
        )}
        {refined && today && <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">Today</span>}
      </div>
      {special &&
        (canDraft ? (
          <Link href={`/studio?note=${encodeURIComponent(`Post for ${special}`)}`} className="flex items-center gap-1 rounded bg-polar-amber/20 px-1 py-0.5 text-[10px] font-medium text-foreground hover:bg-polar-amber/30" title="Suggested special day: click to draft">
            <Sparkles className="h-3 w-3 shrink-0" aria-hidden /> <span className="truncate">{special}</span>
          </Link>
        ) : (
          <span className="flex items-center gap-1 rounded bg-polar-amber/20 px-1 py-0.5 text-[10px] font-medium">
            <Sparkles className="h-3 w-3 shrink-0" aria-hidden /> <span className="truncate">{special}</span>
          </span>
        ))}
      {children}
      {more > 0 && (
        <button type="button" onClick={onMore} className="mt-auto self-start rounded px-1 text-[10px] font-medium text-primary hover:underline">
          +{more} more
        </button>
      )}
    </div>
  );
}

/**
 * Content calendar shared by the Studio and the admin's Publishing & Insights.
 * Month / week grid with brand-coloured chips, and an agenda list (default on phones).
 * Clicking a title opens the post and its description in a pop-up.
 */
export function CalendarView({ embedded = false }: { embedded?: boolean }) {
  // Scientists get a softer, card-style calendar under "My drafts"; other roles keep the dense grid.
  const refined = useAuthStore((s) => s.user?.role) === 'scientist';
  const { canFully, can } = useCan();
  const canMove = canFully('approve_publish') || canFully('publish_direct');
  const canDraft = can('use_studio');
  const { data, isPending } = useApi(['posts'], api.getPosts);
  const accounts = useApi(['accounts'], api.getAccounts);
  const invalidate = useInvalidate();
  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [platforms, setPlatforms] = useState<PlatformId[]>([]);
  const [open, setOpen] = useState<SocialPost | null>(null);
  const [dayOpen, setDayOpen] = useState<Date | null>(null);
  const [edit, setEdit] = useState<SocialPost | null>(null);
  const [when, setWhen] = useState('');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // Phones start on the agenda list; the grid needs width.
  useEffect(() => {
    if (!window.matchMedia('(min-width: 768px)').matches) setView('agenda');
  }, []);

  const posts = useMemo(
    () => (data ?? []).filter((p) => (p.status === 'scheduled' || p.status === 'published') && whenOf(p) && (!platforms.length || p.platforms.some((pl) => platforms.includes(pl)))),
    [data, platforms],
  );
  const days =
    view === 'week'
      ? eachDayOfInterval({ start: startOfWeek(cursor, { weekStartsOn: 1 }), end: addDays(startOfWeek(cursor, { weekStartsOn: 1 }), 6) })
      : eachDayOfInterval({ start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }) });
  const onDay = (day: Date) => posts.filter((p) => isSameDay(toIst(whenOf(p)!), day)).sort((a, b) => whenOf(a)!.localeCompare(whenOf(b)!));
  const monthPosts = posts.filter((p) => isSameMonth(toIst(whenOf(p)!), cursor));
  const agendaDays = eachDayOfInterval({ start: startOfMonth(cursor), end: endOfMonth(cursor) })
    .map((d) => ({ d, list: onDay(d), special: SPECIAL_DAYS.find((s) => s.month === d.getMonth() + 1 && s.day === d.getDate())?.name }))
    .filter((x) => x.list.length || x.special);

  const move = async (p: SocialPost, iso: string) => {
    await api.transitionPost(p.id, 'scheduled', undefined, { scheduledAt: iso });
    invalidate([['posts'], ['audit']]);
    toast.success(`Rescheduled to ${new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST`);
  };
  const onDragEnd = (e: DragEndEvent) => {
    const p = posts.find((x) => x.id === e.active.id);
    if (!p || !e.over || !p.scheduledAt) return;
    const target = new Date(String(e.over.id));
    const ist = toIst(p.scheduledAt);
    const y = target.getFullYear(),
      m = target.getMonth() + 1,
      d = target.getDate();
    const iso = new Date(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(ist.getHours()).padStart(2, '0')}:${String(ist.getMinutes()).padStart(2, '0')}:00+05:30`).toISOString();
    if (new Date(iso) < new Date()) return toast.error('Cannot schedule in the past');
    move(p, iso);
  };
  const openEdit = (p: SocialPost) => {
    setOpen(null);
    setEdit(p);
    setWhen(format(toIst(p.scheduledAt!), "yyyy-MM-dd'T'HH:mm"));
  };
  const step = (dir: 1 | -1) => setCursor(view === 'week' ? addWeeks(cursor, dir) : addMonths(cursor, dir));
  const togglePlatform = (p: PlatformId) => setPlatforms((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));

  const scheduledCount = monthPosts.filter((p) => p.status === 'scheduled').length;
  const publishedCount = monthPosts.filter((p) => p.status === 'published').length;
  const specialCount = SPECIAL_DAYS.filter((s) => s.month === cursor.getMonth() + 1).length;

  return (
    <div className="space-y-4">
      <div className={cn('flex flex-wrap items-center gap-2', refined && 'gap-3 rounded-2xl border bg-card p-4 shadow-sm md:p-5')}>
        <div className="mr-auto">
          {embedded ? <h2 className="text-lg font-semibold">Content calendar</h2> : <h1 className="text-2xl font-semibold">Content calendar</h1>}
          {refined ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1"><span className="h-2 w-2 rounded-full ring-2 ring-inset ring-foreground/50" aria-hidden /> {scheduledCount} scheduled</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1"><span className="h-2 w-2 rounded-full bg-foreground/50" aria-hidden /> {publishedCount} published</span>
              {specialCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1"><Sparkles className="h-3 w-3 text-polar-amber" aria-hidden /> {specialCount} special {specialCount === 1 ? 'day' : 'days'}</span>
              )}
              <span className="text-muted-foreground">in {format(cursor, 'MMMM')} · times in IST</span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {scheduledCount} scheduled · {publishedCount} published in {format(cursor, 'MMMM')} · times in IST
            </p>
          )}
        </div>
        <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as View)} aria-label="Calendar view">
          <ToggleGroupItem value="month" className="hidden md:inline-flex">
            Month
          </ToggleGroupItem>
          <ToggleGroupItem value="week" className="hidden md:inline-flex">
            Week
          </ToggleGroupItem>
          <ToggleGroupItem value="agenda">Agenda</ToggleGroupItem>
        </ToggleGroup>
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => step(-1)} aria-label="Previous">
            <ChevronLeft />
          </Button>
          <span className="min-w-36 text-center text-sm font-semibold" aria-live="polite">
            {view === 'week' ? `Week of ${format(startOfWeek(cursor, { weekStartsOn: 1 }), 'd MMM yyyy')}` : format(cursor, 'MMMM yyyy')}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => step(1)} aria-label="Next">
            <ChevronRight />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
          Today
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by platform">
        {PLATFORMS.map((p) => {
          const on = platforms.includes(p);
          return (
            <button
              key={p}
              type="button"
              aria-pressed={on}
              onClick={() => togglePlatform(p)}
              className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors hover:bg-muted', on && 'border-primary bg-primary/10 font-medium')}
            >
              <PlatformIcon id={p} className="h-3.5 w-3.5" /> {PLATFORM_META[p].label}
            </button>
          );
        })}
        {platforms.length > 0 && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setPlatforms([])}>
            Clear
          </Button>
        )}
        <span className="ml-auto hidden text-[11px] text-muted-foreground lg:inline">
          {canMove ? 'Drag a scheduled post to another day (time is kept). ' : ''}Click a title to see the post.
        </span>
      </div>

      {isPending ? (
        <Skeleton className="h-[560px] w-full rounded-xl" />
      ) : view === 'agenda' ? (
        agendaDays.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nothing scheduled or published in {format(cursor, 'MMMM yyyy')}.</p>
        ) : (
          <ol className="space-y-3">
            {agendaDays.map(({ d, list, special }) => (
              <li key={d.toISOString()} className="overflow-hidden rounded-xl border bg-card">
                <div className={cn('flex items-center gap-3 border-b px-4 py-2', isSameDay(d, new Date()) && 'bg-primary/5')}>
                  <span className={cn('flex h-9 w-9 flex-col items-center justify-center rounded-lg border text-center leading-none', isSameDay(d, new Date()) && 'border-primary bg-primary text-primary-foreground')}>
                    <span className="text-sm font-bold">{format(d, 'd')}</span>
                    <span className="text-[9px] uppercase">{format(d, 'EEE')}</span>
                  </span>
                  <span className="text-sm font-medium">{format(d, 'EEEE, d MMMM')}</span>
                  {special && (
                    <Badge variant="warning" className="ml-auto gap-1">
                      <Sparkles className="h-3 w-3" aria-hidden /> {special}
                    </Badge>
                  )}
                </div>
                {list.length > 0 && (
                  <ul className="divide-y">
                    {list.map((p) => (
                      <li key={p.id}>
                        <button type="button" onClick={() => setOpen(p)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted/40">
                          <span className="w-12 shrink-0 font-semibold tabular-nums text-muted-foreground">{format(toIst(whenOf(p)!), 'HH:mm')}</span>
                          <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: tint(p).borderLeftColor }} aria-hidden />
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-1 font-medium">{p.title}</span>
                            <span className="flex gap-1 pt-0.5">
                              {p.platforms.map((pl) => (
                                <PlatformIcon key={pl} id={pl} title={PLATFORM_META[pl].label} className="h-3.5 w-3.5" />
                              ))}
                            </span>
                          </span>
                          <Badge variant={p.status === 'published' ? 'success' : 'secondary'}>{p.status === 'published' ? 'Published' : 'Scheduled'}</Badge>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        )
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className={cn('overflow-x-auto border bg-card shadow-sm', refined ? 'rounded-2xl' : 'rounded-xl')}>
            <div
              className={cn(
                'grid min-w-[760px] grid-cols-7 border-b text-center',
                refined ? 'bg-card text-xs font-medium text-muted-foreground' : 'bg-muted/40 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground',
              )}
            >
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
                <div key={d} className={cn(refined ? 'py-3' : 'py-2', refined && i >= 5 && 'text-muted-foreground/70')}>
                  {d}
                </div>
              ))}
            </div>
            <div className={cn('grid min-w-[760px] grid-cols-7', refined && 'gap-px bg-border/70')}>
              {days.map((day) => {
                const list = onDay(day);
                const limit = view === 'week' ? 12 : MAX_CHIPS;
                const special = SPECIAL_DAYS.find((s) => s.month === day.getMonth() + 1 && s.day === day.getDate())?.name;
                return (
                  <DayCell key={day.toISOString()} day={day} muted={view === 'month' && !isSameMonth(day, cursor)} special={special} canDraft={canDraft} more={Math.max(0, list.length - limit)} onMore={() => setDayOpen(day)} refined={refined}>
                    {list.slice(0, limit).map((p) => (
                      <Chip key={p.id} p={p} draggable={canMove && p.status === 'scheduled'} onOpen={setOpen} refined={refined} />
                    ))}
                  </DayCell>
                );
              })}
            </div>
          </div>
          {refined && (
            <div className="flex flex-wrap items-center gap-4 px-1 text-xs text-muted-foreground" aria-hidden>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full ring-2 ring-inset ring-foreground/50" /> Scheduled</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-foreground/50" /> Published</span>
              <span className="flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-polar-amber" /> Special day, click to draft a post</span>
              <span className="ml-auto">Dot colour shows the first platform</span>
            </div>
          )}
        </DndContext>
      )}

      <PostDetailDialog
        post={open}
        accounts={accounts.data ?? []}
        onClose={() => setOpen(null)}
        footer={
          open && (
            <>
              {canMove && open.status === 'scheduled' && (
                <Button variant="outline" onClick={() => openEdit(open)}>
                  <CalendarClock /> Reschedule
                </Button>
              )}
              {canDraft && (
                <Button asChild>
                  <Link href={`/studio?post=${open.id}`}>
                    <PenSquare /> {refined ? 'Open draft' : 'Open in Studio'}
                  </Link>
                </Button>
              )}
            </>
          )
        }
      />

      <Dialog open={!!dayOpen} onOpenChange={(o) => !o && setDayOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dayOpen && format(dayOpen, 'EEEE, d MMMM yyyy')}</DialogTitle>
            <DialogDescription>All scheduled and published posts on this day.</DialogDescription>
          </DialogHeader>
          <ul className="divide-y rounded-md border">
            {dayOpen &&
              onDay(dayOpen).map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/40"
                    onClick={() => {
                      setDayOpen(null);
                      setOpen(p);
                    }}
                  >
                    <span className="font-semibold tabular-nums">{format(toIst(whenOf(p)!), 'HH:mm')}</span>
                    <span className="flex gap-0.5">
                      {p.platforms.map((pl) => (
                        <PlatformIcon key={pl} id={pl} className="h-3.5 w-3.5" />
                      ))}
                    </span>
                    <span className="flex-1 truncate">{p.title}</span>
                  </button>
                </li>
              ))}
          </ul>
        </DialogContent>
      </Dialog>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule</DialogTitle>
            <DialogDescription className="line-clamp-2">{edit?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="rs">Date & time (IST)</Label>
            <Input id="rs" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEdit(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const iso = new Date(`${when}:00+05:30`).toISOString();
                if (new Date(iso) < new Date()) return toast.error('Pick a future time');
                if (edit) await move(edit, iso);
                setEdit(null);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
