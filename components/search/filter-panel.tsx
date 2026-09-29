'use client';

import { SlidersHorizontal } from 'lucide-react';
import type { AccessLevel, ContentType, Discipline, LanguageCode, Region, StationSlug } from '@/types';
import type { SearchFilters } from '@/lib/search';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/misc';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/common/client';
import { ACCESS_META, CONTENT_TYPE_LABELS, DEMO_YEAR_RANGE, DISCIPLINE_LABELS, LANGUAGES, REGION_META, STATION_NAMES } from '@/lib/constants';
import { activeFilterCount } from '@/lib/search/url';
import { useMediaQuery } from '@/hooks/use-count-up';
import { cn } from '@/lib/utils';

const opts = <K extends string>(rec: Record<K, string>) => (Object.keys(rec) as K[]).map((k) => ({ value: k, label: rec[k] }));

export function FilterPanel({ value, onChange, trigger = 'icon', className }: { value: SearchFilters; onChange: (f: SearchFilters) => void; trigger?: 'icon' | 'button'; className?: string }) {
  const desktop = useMediaQuery('(min-width: 768px)');
  const count = activeFilterCount(value);
  const years: [number, number] = [value.yearFrom ?? DEMO_YEAR_RANGE[0], value.yearTo ?? DEMO_YEAR_RANGE[1]];
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size={trigger === 'icon' ? 'icon' : 'default'}
          className={cn(
            'relative h-14 shrink-0',
            trigger === 'icon'
              ? 'w-14'
              : 'gap-2 rounded-xl border-0 bg-white px-4 text-[15px] font-semibold text-[#0d2f6b] shadow-xl shadow-[#061a3a]/20 ring-1 ring-black/5 hover:bg-white/90 sm:px-5 dark:bg-card dark:text-foreground',
            className,
          )}
          aria-label={`Filters${count ? ` (${count} active)` : ''}`}
        >
          <SlidersHorizontal className="!h-5 !w-5" />
          {trigger === 'button' && <span className="hidden sm:inline">Filters</span>}
          {count > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
              {count}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side={desktop ? 'right' : 'bottom'} className="gap-5">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>Refine results. Filters are saved in the page URL so you can share them.</SheetDescription>
        </SheetHeader>
        <div className="space-y-2">
          <Label>Content type</Label>
          <MultiSelect<ContentType>
            label="Content type"
            options={(Object.keys(CONTENT_TYPE_LABELS) as ContentType[]).map((k) => ({ value: k, label: CONTENT_TYPE_LABELS[k].plural }))}
            value={value.types ?? []}
            onChange={(v) => onChange({ ...value, types: v })}
          />
        </div>
        <div className="space-y-2">
          <Label>
            Year range: {years[0]} – {years[1]}
          </Label>
          <Slider
            min={DEMO_YEAR_RANGE[0]}
            max={DEMO_YEAR_RANGE[1] + 1}
            step={1}
            value={years}
            thumbLabels={['From year', 'To year']}
            onValueChange={(v) => onChange({ ...value, yearFrom: v[0] === DEMO_YEAR_RANGE[0] ? undefined : v[0], yearTo: v[1] >= DEMO_YEAR_RANGE[1] + 1 ? undefined : v[1] })}
          />
        </div>
        <div className="space-y-2">
          <Label>Region</Label>
          <MultiSelect<Region> label="Region" options={(Object.keys(REGION_META) as Region[]).map((r) => ({ value: r, label: REGION_META[r].label }))} value={value.regions ?? []} onChange={(v) => onChange({ ...value, regions: v })} />
        </div>
        <div className="space-y-2">
          <Label>Station</Label>
          <MultiSelect<StationSlug> label="Station" options={opts(STATION_NAMES)} value={value.stations ?? []} onChange={(v) => onChange({ ...value, stations: v })} />
        </div>
        <div className="space-y-2">
          <Label>Discipline</Label>
          <MultiSelect<Discipline> label="Discipline" options={opts(DISCIPLINE_LABELS)} value={value.disciplines ?? []} onChange={(v) => onChange({ ...value, disciplines: v })} />
        </div>
        <div className="space-y-2">
          <Label>Access level</Label>
          <MultiSelect<AccessLevel>
            label="Access level"
            options={(Object.keys(ACCESS_META) as AccessLevel[]).map((a) => ({ value: a, label: ACCESS_META[a].label }))}
            value={value.access ?? []}
            onChange={(v) => onChange({ ...value, access: v })}
          />
        </div>
        <div className="space-y-2">
          <Label>Language</Label>
          <MultiSelect<LanguageCode>
            label="Language"
            options={LANGUAGES.filter((l) => ['en', 'hi', 'mr'].includes(l.code)).map((l) => ({ value: l.code, label: `${l.label} (${l.native})` }))}
            value={value.languages ?? []}
            onChange={(v) => onChange({ ...value, languages: v })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sort">Sort by</Label>
          <Select value={value.sort ?? 'relevance'} onValueChange={(v) => onChange({ ...value, sort: v === 'relevance' ? undefined : (v as SearchFilters['sort']) })}>
            <SelectTrigger id="sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="views">Most viewed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={() => onChange({})} disabled={!count}>
          Clear all filters
        </Button>
      </SheetContent>
    </Sheet>
  );
}
