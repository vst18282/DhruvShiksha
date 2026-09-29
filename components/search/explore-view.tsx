'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowUpDown, BookmarkPlus, LayoutGrid, List, SearchX, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import type { ContentType } from '@/types';
import { TRENDING } from './search-box';
import { ExploreHero } from './explore-hero';
import { ExploreCard } from './explore-card';
import { RefineSidebar } from './refine-sidebar';
import { ItemRow } from '@/components/archive/item-card';
import { Pagination } from '@/components/common/client';
import { EmptyState, ErrorState } from '@/components/common';
import { LoadingRegion, SearchResultSkeleton, Skeleton } from '@/components/skeletons';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApi } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import type { SearchFilters } from '@/lib/search';
import { parseExplore, serializeExplore, type ExploreState } from '@/lib/search/url';
import { ACCESS_META, CONTENT_TYPE_LABELS, DISCIPLINE_LABELS, LANGUAGES, REGION_META, STATION_NAMES } from '@/lib/constants';
import { useAuthStore } from '@/store/auth';
import { useUserStore } from '@/store/user';
import { useCan } from '@/lib/permissions';
import { cn } from '@/lib/utils';

const TABS: { id: ExploreState['tab']; label: string; types?: ContentType[] }[] = [
  { id: 'all', label: 'All' },
  { id: 'blog', label: 'Blogs', types: ['blog'] },
  { id: 'report', label: 'Reports', types: ['report'] },
  { id: 'expedition', label: 'Expeditions', types: ['expedition'] },
  { id: 'dataset', label: 'Datasets', types: ['dataset'] },
  { id: 'publication', label: 'Publications', types: ['publication'] },
  { id: 'media', label: 'Media', types: ['photo', 'video'] },
  { id: 'event', label: 'Events', types: ['event'] },
];
const PAGE_SIZE = 12;

/** Card skeleton in the Explore card shape (photo band + text). */
function ExploreCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-[#e2e9f3] bg-card dark:border-border">
      <Skeleton className="h-44 w-full rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="mt-3 h-3 w-1/2" />
      </div>
    </div>
  );
}

export function ExploreView() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const state = useMemo(() => parseExplore(new URLSearchParams(sp.toString())), [sp]);
  const user = useAuthStore((s) => s.user);
  const saveSearch = useUserStore((s) => s.saveSearch);
  const { can } = useCan();

  const filters: SearchFilters = {
    types: state.types,
    yearFrom: state.yearFrom,
    yearTo: state.yearTo,
    regions: state.regions,
    stations: state.stations,
    disciplines: state.disciplines,
    access: state.access,
    languages: state.languages,
    sort: state.sort,
  };
  const { data, isPending, isFetching, isError, refetch } = useApi(['search', state.q, JSON.stringify(filters)], () => api.search(state.q, filters));

  const update = (patch: Partial<ExploreState>, resetPage = true) => {
    const next = { ...state, ...patch, ...(resetPage ? { page: 1 } : {}) };
    router.replace(`${pathname}?${serializeExplore(next)}`, { scroll: false });
  };
  /** Replace all filters at once (sidebar Apply / drawer), keeping query, tab and view. */
  const applyFilters = (f: SearchFilters) => update({ types: undefined, yearFrom: undefined, yearTo: undefined, regions: undefined, stations: undefined, disciplines: undefined, access: undefined, languages: undefined, ...f });

  const tab = TABS.find((t) => t.id === state.tab) ?? TABS[0];
  const results = (data?.results ?? []).filter((r) => !tab.types || tab.types.includes(r.item.type));
  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const page = Math.min(state.page, pageCount);
  const slice = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const count = (t: (typeof TABS)[number]) => (!data ? null : t.types ? t.types.reduce((a, x) => a + (data.counts[x] ?? 0), 0) : data.counts.all);

  const chips: { label: string; clear: () => void }[] = [];
  state.types?.forEach((t) => chips.push({ label: CONTENT_TYPE_LABELS[t].plural, clear: () => update({ types: state.types!.filter((x) => x !== t) }) }));
  state.regions?.forEach((r) => chips.push({ label: REGION_META[r].label, clear: () => update({ regions: state.regions!.filter((x) => x !== r) }) }));
  state.stations?.forEach((r) => chips.push({ label: STATION_NAMES[r], clear: () => update({ stations: state.stations!.filter((x) => x !== r) }) }));
  state.disciplines?.forEach((r) => chips.push({ label: DISCIPLINE_LABELS[r], clear: () => update({ disciplines: state.disciplines!.filter((x) => x !== r) }) }));
  state.access?.forEach((r) => chips.push({ label: ACCESS_META[r].label, clear: () => update({ access: state.access!.filter((x) => x !== r) }) }));
  state.languages?.forEach((r) => chips.push({ label: LANGUAGES.find((l) => l.code === r)?.label ?? r, clear: () => update({ languages: state.languages!.filter((x) => x !== r) }) }));
  if (state.yearFrom || state.yearTo) chips.push({ label: `${state.yearFrom ?? '…'}–${state.yearTo ?? '…'}`, clear: () => update({ yearFrom: undefined, yearTo: undefined }) });

  const loading = isPending || (isFetching && !data);

  return (
    <div className="bg-[#f3f6fb] dark:bg-background">
      <ExploreHero q={state.q} filters={filters} onSearch={(q) => update({ q })} onFilters={(f) => update({ ...f })} />

      <div className="container relative z-10 -mt-16 grid gap-6 pb-16 lg:grid-cols-[248px_minmax(0,1fr)]">
        <RefineSidebar q={state.q} value={filters} typeCounts={data?.counts} onApply={applyFilters} className="sticky top-28 hidden self-start lg:flex" />

        <div className="min-w-0">
          {/* Content-type pills (scroll sideways when they do not fit) */}
          <div className="relative">
            <div role="group" aria-label="Result type" className="no-scrollbar flex gap-1.5 overflow-x-auto py-0.5">
              {TABS.map((t) => {
                const active = state.tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => update({ tab: t.id })}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors',
                      active ? 'border-[#0d2f6b] bg-[#0d2f6b] text-white shadow-sm' : 'border-[#dbe4f0] bg-white text-slate-700 hover:border-[#b9cbe3] hover:text-[#0d2f6b] dark:border-border dark:bg-card dark:text-muted-foreground dark:hover:text-foreground',
                    )}
                  >
                    {t.label}
                    <span className={cn('rounded-full px-1.5 text-[11px] tabular-nums', active ? 'bg-white/20 text-white' : 'bg-[#eef3fa] text-slate-500 dark:bg-muted dark:text-muted-foreground')}>{count(t) ?? '–'}</span>
                  </button>
                );
              })}
            </div>
            <span className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#f3f6fb] to-transparent lg:hidden dark:from-background" aria-hidden />
          </div>

          {/* Result count, sort and view */}
          <div className="mt-3 flex items-center gap-2">
            <span className="mr-auto truncate text-[13px] text-slate-600 dark:text-muted-foreground" aria-live="polite">
              {data ? `${results.length} result${results.length === 1 ? '' : 's'}${state.q ? ` for “${state.q}”` : ''}${isFetching ? ' · updating…' : ''}` : 'Searching…'}
            </span>
            <Select value={state.sort ?? 'relevance'} onValueChange={(v) => update({ sort: v === 'relevance' ? undefined : (v as SearchFilters['sort']) })}>
              <SelectTrigger className="h-9 w-[140px] shrink-0 gap-1.5 rounded-lg border-[#dbe4f0] bg-white text-[13px] dark:border-border dark:bg-card" aria-label="Sort results">
                <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="views">Most viewed</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex shrink-0 overflow-hidden rounded-lg border border-[#dbe4f0] dark:border-border" role="group" aria-label="View">
              {(['card', 'list'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={state.view === v}
                  aria-label={v === 'card' ? 'Card view' : 'List view'}
                  onClick={() => update({ view: v }, false)}
                  className={cn('flex h-9 w-9 items-center justify-center transition-colors', state.view === v ? 'bg-[#0d2f6b] text-white' : 'bg-white text-slate-600 hover:text-[#0d2f6b] dark:bg-card dark:text-muted-foreground')}
                >
                  {v === 'card' ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>

          {/* Active filters, spelling help and understood concepts */}
          {(chips.length > 0 || state.q) && (
            <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Active filters">
              {state.q && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#0d2f6b]/10 px-2.5 py-1 text-xs font-medium text-[#0d2f6b] dark:bg-primary/15 dark:text-primary">
                  “{state.q}”
                  <button type="button" onClick={() => update({ q: '' })} aria-label="Clear search text" className="rounded-full p-0.5 hover:bg-black/5">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {chips.map((c) => (
                <span key={c.label} className="inline-flex items-center gap-1 rounded-full border border-[#dbe4f0] bg-white px-2.5 py-1 text-xs dark:border-border dark:bg-card">
                  {c.label}
                  <button type="button" onClick={c.clear} aria-label={`Remove filter ${c.label}`} className="rounded-full p-0.5 hover:bg-muted">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {chips.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => router.replace(`${pathname}?${serializeExplore({ q: state.q, view: state.view, sort: state.sort })}`, { scroll: false })}>
                  Clear filters
                </Button>
              )}
              {user && can('bookmarks') && state.q && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={() => {
                    saveSearch(state.q, serializeExplore({ ...state, q: '' }));
                    toast.success('Search saved', { description: 'Manage alerts from your dashboard.' });
                  }}
                >
                  <BookmarkPlus /> Save search
                </Button>
              )}
            </div>
          )}
          {data?.didYouMean && (
            <p className="mt-3 text-sm">
              Showing results for <strong>{data.didYouMean}</strong>. <span className="text-muted-foreground">Did you mean:</span>{' '}
              <button type="button" className="font-medium text-[#1d5fbf] hover:underline dark:text-primary" onClick={() => update({ q: data.didYouMean })}>
                {data.didYouMean}
              </button>
              ?
            </p>
          )}
          {data && data.concepts.length > 0 && (
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-600 dark:text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-polar-violet" aria-hidden /> Understood as:
              {data.concepts.map((c) => (
                <span key={c} className="rounded-full bg-polar-violet/10 px-2 py-0.5 text-foreground">
                  {c}
                </span>
              ))}
            </p>
          )}

          <div className="mt-4" aria-busy={isFetching}>
            {isError ? (
              <ErrorState action={<Button onClick={() => refetch()}>Retry</Button>} />
            ) : loading ? (
              state.view === 'card' ? (
                <LoadingRegion label="Searching" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.35fr_1fr_1fr]">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <ExploreCardSkeleton key={i} />
                  ))}
                </LoadingRegion>
              ) : (
                <LoadingRegion label="Searching" className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SearchResultSkeleton key={i} />
                  ))}
                </LoadingRegion>
              )
            ) : results.length === 0 ? (
              <EmptyState
                icon={<SearchX className="h-6 w-6" />}
                title="No results found"
                description="Try fewer words, remove a filter, or one of these popular searches."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    {TRENDING.map((t) => (
                      <Button key={t} variant="outline" size="sm" onClick={() => update({ q: t, tab: 'all' })}>
                        {t}
                      </Button>
                    ))}
                  </div>
                }
              />
            ) : (
              <>
                {state.view === 'card' ? (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.35fr_1fr_1fr]">
                    {slice.map((r, i) => (
                      <ExploreCard key={r.item.id} item={r.item} href={r.href} why={r.why} snippet={r.snippet} highlights={r.highlights} lead={i === 0 && page === 1} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {slice.map((r) => (
                      <ItemRow key={r.item.id} item={r.item} href={r.href} why={r.why} snippet={r.snippet} highlights={r.highlights} className="rounded-xl border-[#e2e9f3] shadow-[0_2px_10px_rgba(13,47,107,0.05)] dark:border-border" />
                    ))}
                  </div>
                )}
                <Pagination
                  className="mt-8"
                  page={page}
                  pageCount={pageCount}
                  onPageChange={(p) => {
                    update({ page: p }, false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
