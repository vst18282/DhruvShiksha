'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CalendarPlus, Hourglass, Unlock } from 'lucide-react';
import type { ArchiveItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/misc';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useDataStore } from '@/store/data';
import { useInvalidate } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { allItems, itemHref } from '@/lib/archive';
import { CONTENT_TYPE_LABELS } from '@/lib/constants';
import { EMBARGO_PRESETS, addMonthsIso, clampEmbargoMonths, embargoDaysLeft, isEmbargoActiveAt, monthsBetween } from '@/lib/access';
import { cn } from '@/lib/utils';
import { useAuditLog } from './use-audit-log';

const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' });

/** Embargo rules (default + maximum length, warning window, early access) and a live list of embargoed items. */
export function EmbargoBox() {
  const settings = useDataStore((s) => s.settings);
  const updateSettings = useDataStore((s) => s.updateSettings);
  const patches = useDataStore((s) => s.patches);
  const uploads = useDataStore((s) => s.uploads);
  const invalidate = useInvalidate();
  const log = useAuditLog();
  const [now, setNow] = useState<Date | null>(null);
  const [release, setRelease] = useState<ArchiveItem | null>(null);
  const [custom, setCustom] = useState(String(settings.defaultEmbargoMonths));

  useEffect(() => setNow(new Date()), []);
  useEffect(() => setCustom(String(settings.defaultEmbargoMonths)), [settings.defaultEmbargoMonths]);

  const items = useMemo(
    () => allItems().filter((i) => i.accessLevel === 'embargoed' && i.embargoUntil).sort((a, b) => a.embargoUntil!.localeCompare(b.embargoUntil!)),
    // allItems() is memoised on these store references
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [patches, uploads],
  );

  const setDefault = (m: number) => {
    const v = clampEmbargoMonths(m, settings.maxEmbargoMonths);
    if (v !== m) toast.info(`Clamped to the ${settings.maxEmbargoMonths}-month maximum`);
    updateSettings({ defaultEmbargoMonths: v });
    log('changed setting', 'settings', 'Default embargo length', `${v} months`);
  };
  const setMax = (m: number) => {
    const max = Math.min(120, Math.max(1, Math.round(m || 1)));
    const patch: Partial<typeof settings> = { maxEmbargoMonths: max };
    if (settings.defaultEmbargoMonths > max) patch.defaultEmbargoMonths = max;
    updateSettings(patch);
    log('changed setting', 'settings', 'Maximum embargo length', `${max} months${patch.defaultEmbargoMonths ? ` (default lowered to ${max})` : ''}`);
  };

  const extend = async (it: ArchiveItem, months: number) => {
    if (!now) return;
    const from = it.embargoUntil && new Date(it.embargoUntil) > now ? it.embargoUntil : now.toISOString();
    let until = addMonthsIso(from, months);
    const limit = addMonthsIso(now, settings.maxEmbargoMonths);
    if (monthsBetween(now, until) > settings.maxEmbargoMonths || until > limit) {
      until = limit;
      toast.info(`Capped at the ${settings.maxEmbargoMonths}-month maximum`);
    }
    await api.patchItem(it.id, { embargoUntil: until, accessLevel: 'embargoed', updatedAt: new Date().toISOString() });
    invalidate([['item', it.id], ['audit'], ['pipeline']]);
    toast.success(`Embargo extended to ${fmt(until)}`, { description: it.title });
  };

  const doRelease = async (it: ArchiveItem) => {
    await api.patchItem(it.id, { accessLevel: 'public', embargoUntil: undefined, updatedAt: new Date().toISOString() });
    invalidate([['item', it.id], ['audit'], ['pipeline']]);
    setRelease(null);
    toast.success('Embargo released: the item is now open access', { description: it.title });
  };

  const preview = now ? addMonthsIso(now, settings.defaultEmbargoMonths) : null;
  const active = now ? items.filter((i) => isEmbargoActiveAt(i, now)) : [];
  const ended = now ? items.filter((i) => !isEmbargoActiveAt(i, now)) : [];
  const soon = now ? active.filter((i) => embargoDaysLeft(i.embargoUntil!, now) <= settings.embargoWarningDays) : [];

  return (
    <section aria-labelledby="emb-h" className="space-y-5 rounded-lg border bg-card p-5 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="emb-h" className="flex items-center gap-2 font-semibold">
            <Hourglass className="h-4 w-4 text-polar-amber" aria-hidden /> Embargo
          </h2>
          <p className="text-sm text-muted-foreground">Embargoed items are listed in the archive but their files stay locked until the date. Owners and admins always have access.</p>
        </div>
        <div className="flex gap-2 text-xs">
          <Badge variant="warning">{active.length} active</Badge>
          {soon.length > 0 && <Badge variant="destructive">{soon.length} lifting soon</Badge>}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label id="emb-def">Default length for new uploads</Label>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="emb-def">
            {EMBARGO_PRESETS.filter((m) => m <= settings.maxEmbargoMonths).map((m) => (
              <Button key={m} size="sm" variant={settings.defaultEmbargoMonths === m ? 'default' : 'outline'} aria-pressed={settings.defaultEmbargoMonths === m} onClick={() => setDefault(m)}>
                {m} months
              </Button>
            ))}
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={1}
                max={settings.maxEmbargoMonths}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onBlur={() => custom && Number(custom) !== settings.defaultEmbargoMonths && setDefault(Number(custom))}
                onKeyDown={(e) => e.key === 'Enter' && setDefault(Number(custom))}
                className="h-9 w-20"
                aria-label="Custom default embargo in months"
              />
              <span className="text-xs text-muted-foreground">months</span>
            </div>
          </div>
          {preview && <p className="text-xs text-muted-foreground">An item embargoed today would open on {fmt(preview)}.</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="emb-max">Maximum length (months)</Label>
            <Input id="emb-max" type="number" min={1} max={120} value={settings.maxEmbargoMonths} onChange={(e) => setMax(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Uploaders and extensions cannot go beyond this.</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="emb-warn">Warn before lifting (days)</Label>
            <Input
              id="emb-warn"
              type="number"
              min={1}
              max={180}
              value={settings.embargoWarningDays}
              onChange={(e) => {
                const d = Math.min(180, Math.max(1, Math.round(Number(e.target.value) || 1)));
                updateSettings({ embargoWarningDays: d });
                log('changed setting', 'settings', 'Embargo warning window', `${d} days`);
              }}
            />
            <p className="text-xs text-muted-foreground">Highlights items opening soon.</p>
          </div>
          <div className="flex items-center justify-between gap-3 sm:col-span-2">
            <Label htmlFor="emb-cm" className="leading-snug">
              Content managers can open embargoed items early
              <span className="block text-xs font-normal text-muted-foreground">To prepare launch posts before the date.</span>
            </Label>
            <Switch
              id="emb-cm"
              checked={settings.cmCanViewEmbargoed}
              onCheckedChange={(v) => {
                updateSettings({ cmCanViewEmbargoed: v });
                log('changed setting', 'settings', 'Content manager early access to embargoed items', v ? 'On' : 'Off');
              }}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Embargoed items</h3>
        {!now ? null : items.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">No embargoed items.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {[...active, ...ended].map((it) => {
              const left = embargoDaysLeft(it.embargoUntil!, now);
              const isActive = isEmbargoActiveAt(it, now);
              const warn = isActive && left <= settings.embargoWarningDays;
              const pct = isActive ? Math.max(4, Math.min(100, 100 - (left / (settings.maxEmbargoMonths * 30.4)) * 100)) : 100;
              return (
                <li key={it.id} className={cn('flex flex-col gap-2 p-3 sm:flex-row sm:items-center', warn && 'bg-polar-amber/5')}>
                  <div className="min-w-0 flex-1">
                    <Link href={itemHref(it)} className="line-clamp-1 font-medium hover:text-primary hover:underline">
                      {it.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {CONTENT_TYPE_LABELS[it.type].singular} · {isActive ? `opens ${fmt(it.embargoUntil!)}` : `embargo ended ${fmt(it.embargoUntil!)}`}
                    </p>
                    <div className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted" aria-hidden>
                      <div className={cn('h-full rounded-full', isActive ? (warn ? 'bg-polar-amber' : 'bg-primary') : 'bg-success')} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {isActive ? (
                      <Badge variant={warn ? 'destructive' : 'warning'} className="gap-1">
                        {warn && <AlertTriangle className="h-3 w-3" aria-hidden />}
                        {left} day{left === 1 ? '' : 's'} left
                      </Badge>
                    ) : (
                      <Badge variant="success">Ended</Badge>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" aria-label={`Extend embargo for ${it.title}`}>
                          <CalendarPlus /> Extend
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Extend by</DropdownMenuLabel>
                        {[3, 6, 12].map((m) => (
                          <DropdownMenuItem key={m} onSelect={() => extend(it, m)}>
                            {m} months
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button size="sm" variant={isActive ? 'secondary' : 'default'} onClick={() => setRelease(it)}>
                      <Unlock /> {isActive ? 'Release now' : 'Make open access'}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={!!release} onOpenChange={(o) => !o && setRelease(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Release embargo now?</DialogTitle>
            <DialogDescription className="line-clamp-3">
              “{release?.title}” becomes open access immediately and its files can be downloaded by everyone allowed to download open files. This is recorded in the audit log.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRelease(null)}>
              Cancel
            </Button>
            <Button onClick={() => release && doRelease(release)}>
              <Unlock /> Release
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
