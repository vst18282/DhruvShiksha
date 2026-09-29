'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';
import type { AccessLevel, ArchiveItem, ContentType, Discipline, LanguageCode, Region, StationSlug } from '@/types';
import { SearchService, type SearchFilters } from '@/lib/search';
import { Checkbox, Slider } from '@/components/ui/misc';
import { ACCESS_META, DEMO_YEAR_RANGE, DISCIPLINE_LABELS, LANGUAGES, REGION_META, STATION_NAMES } from '@/lib/constants';
import { useHydrated } from '@/store/hydration';
import { cn } from '@/lib/utils';

const TYPE_GROUPS: { id: string; label: string; types: ContentType[] }[] = [
  { id: 'blog', label: 'Blogs', types: ['blog'] },
  { id: 'report', label: 'Reports', types: ['report'] },
  { id: 'expedition', label: 'Expeditions', types: ['expedition'] },
  { id: 'dataset', label: 'Datasets', types: ['dataset'] },
  { id: 'publication', label: 'Publications', types: ['publication'] },
  { id: 'media', label: 'Media', types: ['photo', 'video'] },
  { id: 'event', label: 'Events', types: ['event'] },
];

type Facet = 'regions' | 'stations' | 'disciplines' | 'access';

function countBy<T extends string>(q: string, filters: SearchFilters, facet: Facet, key: (i: ArchiveItem) => T | undefined): Record<string, number> {
  const res = SearchService.search(q, { ...filters, [facet]: undefined, sort: undefined });
  const out: Record<string, number> = {};
  for (const r of res.results) {
    const k = key(r.item);
    if (k) out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = `rs-${title.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="border-t border-[#e6edf6] py-3 first:border-t-0 first:pt-0 dark:border-border">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={id} className="flex w-full items-center justify-between text-left text-[13px] font-semibold text-[#0f2c59] dark:text-foreground">
        {title}
        <ChevronDown className={cn('h-4 w-4 text-slate-500 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div id={id} className="mt-2 space-y-1.5">
          {children}
        </div>
      )}
    </div>
  );
}

function CheckRow({ id, label, count, checked, onChange }: { id: string; label: string; count?: number; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 rounded px-0.5 text-[13px] text-slate-700 hover:text-[#0d2f6b] dark:text-muted-foreground dark:hover:text-foreground">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} className="h-3.5 w-3.5 rounded-[3px] border-[#9fb3cf] data-[state=checked]:border-[#0d2f6b] data-[state=checked]:bg-[#0d2f6b] data-[state=checked]:text-white" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined && <span className="text-[12px] tabular-nums text-slate-500 dark:text-muted-foreground">{count}</span>}
    </label>
  );
}

const toggle = <T extends string>(list: T[] | undefined, v: T, on: boolean): T[] | undefined => {
  const next = on ? Array.from(new Set([...(list ?? []), v])) : (list ?? []).filter((x) => x !== v);
  return next.length ? next : undefined;
};

/**
 * "Refine Results" sidebar (desktop). Edits a draft; nothing changes until "Apply Filters".
 * Counts show how many results each option would give with the other filters applied.
 */
export function RefineSidebar({ q, value, typeCounts, onApply, className }: { q: string; value: SearchFilters; typeCounts?: Record<string, number>; onApply: (f: SearchFilters) => void; className?: string }) {
  const hydrated = useHydrated();
  const [draft, setDraft] = useState<SearchFilters>(value);
  const applied = JSON.stringify(value);
  useEffect(() => setDraft(JSON.parse(applied) as SearchFilters), [applied]);

  const counts = useMemo(() => {
    if (!hydrated) return null;
    return {
      regions: countBy(q, value, 'regions', (i) => i.region),
      stations: countBy(q, value, 'stations', (i) => i.station),
      disciplines: countBy(q, value, 'disciplines', (i) => i.discipline),
      access: countBy(q, value, 'access', (i) => i.accessLevel),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, applied, hydrated]);

  const set = (p: Partial<SearchFilters>) => setDraft((d) => ({ ...d, ...p }));
  const dirty = JSON.stringify({ ...draft, sort: undefined }) !== JSON.stringify({ ...value, sort: undefined });
  const years: [number, number] = [draft.yearFrom ?? DEMO_YEAR_RANGE[0], draft.yearTo ?? DEMO_YEAR_RANGE[1]];
  const typeChecked = (g: (typeof TYPE_GROUPS)[number]) => g.types.every((t) => draft.types?.includes(t));
  const clear = () => {
    const empty: SearchFilters = { sort: value.sort };
    setDraft(empty);
    onApply(empty);
  };

  return (
    <aside aria-label="Refine results" className={cn('flex max-h-[calc(100vh-8rem)] flex-col rounded-2xl border border-[#e2e9f3] bg-card shadow-[0_2px_12px_rgba(13,47,107,0.06)] dark:border-border', className)}>
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h2 className="text-[15px] font-semibold text-[#0f2c59] dark:text-foreground">Refine Results</h2>
        <button type="button" onClick={clear} className="inline-flex items-center gap-1 text-[12px] font-medium text-[#1d5fbf] hover:underline dark:text-primary">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
        <Section title="Content Type">
          <CheckRow id="rs-type-all" label="All" count={typeCounts?.all} checked={!draft.types?.length} onChange={(v) => v && set({ types: undefined })} />
          {TYPE_GROUPS.map((g) => (
            <CheckRow
              key={g.id}
              id={`rs-type-${g.id}`}
              label={g.label}
              count={typeCounts ? g.types.reduce((n, t) => n + (typeCounts[t] ?? 0), 0) : undefined}
              checked={typeChecked(g)}
              onChange={(on) => {
                let next = draft.types;
                for (const t of g.types) next = toggle(next, t, on);
                set({ types: next });
              }}
            />
          ))}
        </Section>

        <Section title="Region">
          {(Object.keys(REGION_META) as Region[]).map((r) => (
            <CheckRow key={r} id={`rs-reg-${r}`} label={REGION_META[r].label} count={counts?.regions[r] ?? 0} checked={!!draft.regions?.includes(r)} onChange={(on) => set({ regions: toggle(draft.regions, r, on) })} />
          ))}
        </Section>

        <Section title="Year Range">
          <Slider
            min={DEMO_YEAR_RANGE[0]}
            max={DEMO_YEAR_RANGE[1]}
            step={1}
            value={years}
            thumbLabels={['From year', 'To year']}
            onValueChange={(v) => set({ yearFrom: v[0] === DEMO_YEAR_RANGE[0] ? undefined : v[0], yearTo: v[1] === DEMO_YEAR_RANGE[1] ? undefined : v[1] })}
           
          />
          <div className="flex justify-between text-[12px] tabular-nums text-slate-500 dark:text-muted-foreground">
            <span>{years[0]}</span>
            <span>{years[1]}</span>
          </div>
        </Section>

        <Section title="Station" defaultOpen={!!draft.stations?.length}>
          {(Object.keys(STATION_NAMES) as StationSlug[]).map((s) => (
            <CheckRow key={s} id={`rs-st-${s}`} label={STATION_NAMES[s]} count={counts?.stations[s] ?? 0} checked={!!draft.stations?.includes(s)} onChange={(on) => set({ stations: toggle(draft.stations, s, on) })} />
          ))}
        </Section>

        <Section title="Discipline" defaultOpen={!!draft.disciplines?.length}>
          {(Object.keys(DISCIPLINE_LABELS) as Discipline[]).map((d) => (
            <CheckRow key={d} id={`rs-dis-${d}`} label={DISCIPLINE_LABELS[d]} count={counts?.disciplines[d] ?? 0} checked={!!draft.disciplines?.includes(d)} onChange={(on) => set({ disciplines: toggle(draft.disciplines, d, on) })} />
          ))}
        </Section>

        <Section title="Access Level" defaultOpen={!!draft.access?.length}>
          {(Object.keys(ACCESS_META) as AccessLevel[]).map((a) => (
            <CheckRow key={a} id={`rs-acc-${a}`} label={ACCESS_META[a].label} count={counts?.access[a] ?? 0} checked={!!draft.access?.includes(a)} onChange={(on) => set({ access: toggle(draft.access, a, on) })} />
          ))}
        </Section>

        <Section title="Language" defaultOpen={!!draft.languages?.length}>
          {LANGUAGES.filter((l) => ['en', 'hi', 'mr'].includes(l.code)).map((l) => (
            <CheckRow key={l.code} id={`rs-lang-${l.code}`} label={`${l.label} (${l.native})`} checked={!!draft.languages?.includes(l.code)} onChange={(on) => set({ languages: toggle<LanguageCode>(draft.languages, l.code, on) })} />
          ))}
        </Section>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-[#e6edf6] p-3 dark:border-border">
        <button type="button" onClick={clear} className="h-10 rounded-lg border border-[#c9d6e8] bg-white text-sm font-semibold text-[#0d2f6b] transition-colors hover:bg-[#f2f6fb] dark:border-border dark:bg-transparent dark:text-foreground dark:hover:bg-muted">
          Reset
        </button>
        <button
          type="button"
          disabled={!dirty}
          onClick={() => onApply({ ...draft, sort: value.sort })}
          className="h-10 rounded-lg bg-[#0d2f6b] text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0a2657] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Apply Filters
        </button>
      </div>
    </aside>
  );
}
