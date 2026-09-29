'use client';

import { useMemo, useState } from 'react';
import { CheckSquare, FileStack, Files, Search, Target, X } from 'lucide-react';
import type { ArchiveItem, ContentType, SourceRef } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/misc';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/misc';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { findRef, publishedItems } from '@/lib/archive';
import { CONTENT_TYPE_LABELS } from '@/lib/constants';
import { normalize } from '@/lib/search/text';
import type { SourceMode } from '@/store/studio';
import type { Expedition } from '@/types';

const PICKER_TABS: { id: string; label: string; types: ContentType[] }[] = [
  { id: 'report', label: 'Reports', types: ['report'] },
  { id: 'dataset', label: 'Datasets', types: ['dataset'] },
  { id: 'publication', label: 'Publications', types: ['publication'] },
  { id: 'photo', label: 'Photos', types: ['photo'] },
  { id: 'video', label: 'Videos', types: ['video'] },
  { id: 'blog', label: 'Blogs', types: ['blog'] },
  { id: 'expedition', label: 'Expeditions', types: ['expedition'] },
  { id: 'event', label: 'Events', types: ['event'] },
];

const refOf = (i: ArchiveItem): SourceRef => ({ type: i.type, id: i.id });
const has = (list: SourceRef[], i: ArchiveItem) => list.some((r) => r.id === i.id);

/**
 * Source selector shared by the Studio composer and the "Generate summary" dialog.
 * Modes: current item · selected items (searchable multi-select picker) · all reports.
 */
export function SourceSelector({
  mode,
  onModeChange,
  currentRef,
  selected,
  onSelectedChange,
}: {
  mode: SourceMode;
  onModeChange: (m: SourceMode) => void;
  currentRef: SourceRef | null;
  selected: SourceRef[];
  onSelectedChange: (r: SourceRef[]) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('report');
  const items = useMemo(() => publishedItems(), []);
  const reports = items.filter((i) => i.type === 'report');
  const expeditions = items.filter((i): i is Expedition => i.type === 'expedition');
  const current = currentRef ? findRef(currentRef) : undefined;
  const nq = normalize(q);
  const filtered = (types: ContentType[]) => items.filter((i) => types.includes(i.type) && (!nq || normalize(`${i.title} ${i.tags.join(' ')}`).includes(nq))).slice(0, 80);
  const toggle = (i: ArchiveItem) => onSelectedChange(has(selected, i) ? selected.filter((r) => r.id !== i.id) : [...selected, refOf(i)]);
  const chips = (mode === 'current' ? (currentRef ? [currentRef] : []) : mode === 'all' && !selected.length ? reports.map(refOf) : selected).map((r) => findRef(r)).filter((x): x is ArchiveItem => !!x);

  return (
    <div className="space-y-3">
      <ToggleGroup
        type="single"
        value={mode}
        onValueChange={(v) => {
          if (!v) return;
          if (v === 'all') setConfirmAll(true);
          else onModeChange(v as SourceMode);
        }}
        aria-label="Source mode"
        className="grid w-full grid-cols-3"
      >
        <ToggleGroupItem value="current" disabled={!currentRef} className="text-xs" title={currentRef ? undefined : 'Open the Studio from an item page to use “Current item”'}>
          <Target /> Current
        </ToggleGroupItem>
        <ToggleGroupItem value="selected" className="text-xs">
          <CheckSquare /> Select
        </ToggleGroupItem>
        <ToggleGroupItem value="all" className="text-xs">
          <FileStack /> All reports
        </ToggleGroupItem>
      </ToggleGroup>

      {mode === 'current' && current && <p className="text-xs text-muted-foreground">Using the item you opened the Studio from.</p>}
      {mode === 'selected' && (
        <Button variant="outline" size="sm" className="w-full" onClick={() => setPickerOpen(true)}>
          <Files /> Choose files, reports & items…
        </Button>
      )}
      {mode === 'all' && (
        <div className="space-y-2 rounded-md bg-muted/50 p-2 text-xs">
          <p>
            {selected.length ? selected.length : reports.length} of {reports.length} reports selected.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { onSelectedChange(reports.map(refOf)); setTab('report'); setPickerOpen(true); }}>
              Deselect some…
            </Button>
          </div>
          <Select
            onValueChange={(v) => {
              const exp = items.filter((i) => i.expeditionId === v);
              onSelectedChange(exp.map(refOf));
              onModeChange('selected');
            }}
          >
            <SelectTrigger className="h-8 text-xs" aria-label="All items of an expedition">
              <SelectValue placeholder="…or all items of expedition X" />
            </SelectTrigger>
            <SelectContent>
              {expeditions.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.number} ({e.year})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {chips.length > 0 && (
        <ul className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto" aria-label="Selected sources">
          {chips.slice(0, mode === 'all' ? 6 : 40).map((i) => (
            <li key={i.id} className="inline-flex max-w-full items-center gap-1 rounded-full border bg-background py-0.5 pl-2 pr-1 text-xs">
              <span className="text-[10px] text-muted-foreground">{CONTENT_TYPE_LABELS[i.type].singular}</span>
              <span className="max-w-[180px] truncate">{i.title}</span>
              {mode !== 'current' && (
                <button type="button" onClick={() => onSelectedChange((selected.length ? selected : reports.map(refOf)).filter((r) => r.id !== i.id))} aria-label={`Remove ${i.title}`} className="rounded-full p-0.5 hover:bg-muted">
                  <X className="h-3 w-3" />
                </button>
              )}
            </li>
          ))}
          {mode === 'all' && chips.length > 6 && <li className="text-xs text-muted-foreground">+{chips.length - 6} more</li>}
        </ul>
      )}
      {chips.length === 0 && <p className="text-xs text-destructive">No sources selected yet.</p>}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select sources</DialogTitle>
            <DialogDescription>Pick any mix of reports, datasets, publications, media, blogs, expeditions and events.</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items…" className="pl-9" aria-label="Search items" />
          </div>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full justify-start">
              {PICKER_TABS.map((t) => (
                <TabsTrigger key={t.id} value={t.id} className="text-xs">
                  {t.label}
                  <span className="text-[10px] text-muted-foreground">{selected.filter((r) => t.types.includes(r.type)).length || ''}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            {PICKER_TABS.map((t) => (
              <TabsContent key={t.id} value={t.id} className="mt-2 max-h-[45vh] overflow-y-auto rounded-md border">
                <ul className="divide-y">
                  {filtered(t.types).map((i) => (
                    <li key={i.id}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50">
                        <Checkbox checked={has(selected, i)} onCheckedChange={() => toggle(i)} />
                        <span className="flex-1">{i.title}</span>
                        <span className="text-xs text-muted-foreground">{i.year}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </TabsContent>
            ))}
          </Tabs>
          <DialogFooter className="items-center sm:justify-between">
            <span className="text-sm text-muted-foreground">{selected.length} selected</span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => onSelectedChange([])}>Clear</Button>
              <Button onClick={() => setPickerOpen(false)}>Done</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmAll} onOpenChange={setConfirmAll}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use all reports?</DialogTitle>
            <DialogDescription>This selects all {reports.length} published reports as sources. You can deselect some afterwards.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmAll(false)}>Cancel</Button>
            <Button
              onClick={() => {
                onSelectedChange(reports.map(refOf));
                onModeChange('all');
                setConfirmAll(false);
              }}
            >
              Select {reports.length} reports
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Badge variant="muted" className="sr-only">{chips.length} sources</Badge>
    </div>
  );
}
