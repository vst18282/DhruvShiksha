'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Crosshair, Database, ExternalLink, Images, Route, Share2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { PolarPoint } from '@/types/polar-map';
import { PolarImage } from '@/components/common/polar-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/skeletons';
import { useChatStore } from '@/store/chat';
import { usePageContextStore } from '@/store/page-context';
import { useCountUp } from '@/hooks/use-count-up';
import { POINT_TYPE_META, STATUS_LABEL } from '@/lib/polar-map';
import { cn } from '@/lib/utils';

function Sparkline({ values }: { values: number[] }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 220},${42 - ((v - min) / span) * 34}`).join(' ');
  return (
    <svg viewBox="0 0 220 48" className="h-12 w-full" role="img" aria-label={`Trend: ${values.join(', ')}`}>
      <defs>
        <linearGradient id="map-spark" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#5BB5E8" /><stop offset="1" stopColor="#2DD4BF" /></linearGradient>
      </defs>
      <path d={`M0 44 L${points} L220 44 Z`} fill="url(#map-spark)" opacity=".12" />
      <polyline points={points} fill="none" stroke="url(#map-spark)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Count({ value, label, icon: Icon }: { value: number; label: string; icon: typeof Route }) {
  const animated = useCountUp(value, 650);
  return (
    <div className="rounded-lg bg-muted/65 p-2 text-center">
      <Icon className="mx-auto h-3.5 w-3.5 text-primary" aria-hidden />
      <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-0.5 block text-base font-semibold tabular-nums">{animated}</motion.span>
      <span className="block text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

/** Content shared by the desktop side panel and mobile draggable sheet. */
export function MapPointCard({ point, onClose, onZoom, mobile = false }: { point: PolarPoint; onClose: () => void; onZoom: () => void; mobile?: boolean }) {
  const [loading, setLoading] = useState(true);
  const heading = useRef<HTMLHeadingElement>(null);
  const openChat = useChatStore((s) => s.setOpen);
  const setContext = usePageContextStore((s) => s.set);

  useEffect(() => {
    setLoading(true);
    const timer = window.setTimeout(() => setLoading(false), 280);
    return () => window.clearTimeout(timer);
  }, [point.id]);

  useEffect(() => {
    if (!loading) heading.current?.focus({ preventScroll: true });
  }, [loading, point.id]);

  if (loading) {
    return (
      <div className="space-y-3 p-4" role="status" aria-label={`Loading ${point.name} details`}>
        <Skeleton className="aspect-[16/7] w-full" />
        <Skeleton className="h-7 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" />
        <div className="grid grid-cols-4 gap-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      </div>
    );
  }

  const coords = `${Math.abs(point.coordinates.lat).toFixed(2)}° ${point.coordinates.lat >= 0 ? 'N' : 'S'}, ${Math.abs(point.coordinates.lng).toFixed(2)}° ${point.coordinates.lng >= 0 ? 'E' : 'W'}`;
  const copy = async () => {
    const url = `${location.origin}${location.pathname}?point=${point.id}`;
    await navigator.clipboard?.writeText(url);
    toast.success('Map link copied');
  };

  return (
    <motion.div key={point.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full min-h-0 flex-col">
      {mobile && <div className="mx-auto mt-2 hidden h-1 w-12 rounded-full bg-muted-foreground/30" aria-hidden />}
      <div className="relative aspect-[16/7] shrink-0 overflow-hidden">
        <PolarImage seed={point.imageSeed} variant={point.art} alt="" decorative className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-polar-navy/90 via-transparent to-black/20" aria-hidden />
        <button type="button" onClick={onClose} className="absolute right-3 top-3 rounded-full bg-black/45 p-2 text-white backdrop-blur hover:bg-black/65 focus-visible:ring-2 focus-visible:ring-white" aria-label="Close point details">
          <X className="h-4 w-4" />
        </button>
        <div className="absolute inset-x-4 bottom-3 text-white">
          <div className="mb-1 flex flex-wrap gap-1.5">
            <Badge className="bg-white/15 text-white backdrop-blur">{POINT_TYPE_META[point.type].symbol} {POINT_TYPE_META[point.type].label}</Badge>
            <Badge variant={point.status === 'active' ? 'success' : point.status === 'historic' ? 'secondary' : 'warning'}>{STATUS_LABEL[point.status]}</Badge>
          </div>
          <h2 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">{point.name}</h2>
          <p className="text-xs text-white/80">{coords} · Est. {point.established}</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <p className="font-medium text-primary">{point.tagline}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{point.summary}</p>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          <Count value={point.counts.expeditions} label="Expeditions" icon={Route} />
          <Count value={point.counts.reports} label="Reports" icon={ExternalLink} />
          <Count value={point.counts.datasets} label="Datasets" icon={Database} />
          <Count value={point.counts.photos} label="Photos" icon={Images} />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
          {point.facts.map((fact) => (
            <div key={fact.label} className="rounded-lg border p-2.5">
              <dt className="text-muted-foreground">{fact.label}</dt><dd className="mt-0.5 font-medium">{fact.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 rounded-xl border bg-gradient-to-br from-polar-glacier/10 to-polar-teal/5 p-3">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Climate snapshot</p><p className="text-sm font-medium">{point.climate.label}</p></div><strong className="text-sm">{point.climate.value}</strong></div>
          <Sparkline values={point.climate.series} />
          <p className="text-[10px] text-muted-foreground">{point.climate.note} · demo data</p>
        </div>

        <Tabs defaultValue="expeditions" className="mt-4">
          <TabsList className="w-full"><TabsTrigger value="expeditions" className="flex-1">Expeditions</TabsTrigger><TabsTrigger value="data" className="flex-1">Data</TabsTrigger><TabsTrigger value="media" className="flex-1">Media</TabsTrigger></TabsList>
          {(['expeditions', 'data', 'media'] as const).map((kind) => (
            <TabsContent key={kind} value={kind} className="mt-2 rounded-lg border p-3">
              <ul className="space-y-1.5 text-sm">{point.links[kind].map((link) => <li key={link.href}><Link href={link.href} className="text-primary hover:underline">{link.label} →</Link></li>)}</ul>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2 border-t bg-card p-3">
        {point.links.overview && <Button asChild size="sm"><Link href={point.links.overview}>Open page <ExternalLink /></Link></Button>}
        <Button size="sm" variant="outline" onClick={onZoom}><Crosshair /> Zoom here</Button>
        <Button size="sm" variant="outline" onClick={copy}><Share2 /> Share</Button>
        <Button size="sm" variant="outline" onClick={() => { setContext({ type: 'station', id: point.id, title: point.name }); openChat(true); }}><Bot /> Ask chatbot</Button>
      </div>
    </motion.div>
  );
}

/** Compact marker hover/focus card. It never captures the pointer, preventing marker flicker. */
export function MapHoverCard({ point, className }: { point: PolarPoint; className?: string }) {
  const coords = `${point.coordinates.lat.toFixed(2)}°, ${point.coordinates.lng.toFixed(2)}°`;
  return (
    <div className={cn('pointer-events-none w-64 rounded-xl border border-white/20 bg-polar-navy/95 p-3 text-left text-white shadow-2xl backdrop-blur-md', className)}>
      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-white/65"><span>{POINT_TYPE_META[point.type].symbol} {POINT_TYPE_META[point.type].label}</span><span>{STATUS_LABEL[point.status]}</span></div>
      <p className="mt-1 text-sm font-semibold">{point.name}</p><p className="mt-0.5 text-xs text-white/75">{point.tagline}</p><p className="mt-1 font-mono text-[10px] text-polar-ice">{coords}</p>
      <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[9px] text-white/65"><span><b className="block text-xs text-white">{point.counts.expeditions}</b>Exp.</span><span><b className="block text-xs text-white">{point.counts.reports}</b>Reports</span><span><b className="block text-xs text-white">{point.counts.datasets}</b>Data</span><span><b className="block text-xs text-white">{point.counts.photos}</b>Photos</span></div>
      <p className="mt-2 text-[10px] text-polar-teal">Click for details</p>
    </div>
  );
}
