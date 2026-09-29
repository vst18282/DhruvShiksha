import type { AccessLevel, ContentType, Discipline, LanguageCode, Region, StationSlug } from '@/types';
import type { SearchFilters } from './index';

export interface ExploreState extends SearchFilters {
  q: string;
  tab: ContentType | 'all' | 'media';
  view: 'card' | 'list';
  page: number;
}

const list = <T extends string>(v: string | null): T[] | undefined => (v ? (v.split(',').filter(Boolean) as T[]) : undefined);

export function parseExplore(sp: URLSearchParams): ExploreState {
  const num = (k: string) => (sp.get(k) ? Number(sp.get(k)) : undefined);
  return {
    q: sp.get('q') ?? '',
    tab: (sp.get('tab') as ExploreState['tab']) ?? 'all',
    view: sp.get('view') === 'list' ? 'list' : 'card',
    page: Math.max(1, Number(sp.get('page') ?? 1)),
    types: list<ContentType>(sp.get('types')),
    yearFrom: num('from'),
    yearTo: num('to'),
    regions: list<Region>(sp.get('regions')),
    stations: list<StationSlug>(sp.get('stations')),
    disciplines: list<Discipline>(sp.get('disciplines')),
    access: list<AccessLevel>(sp.get('access')),
    languages: list<LanguageCode>(sp.get('lang')),
    sort: (sp.get('sort') as SearchFilters['sort']) ?? undefined,
  };
}

export function serializeExplore(s: Partial<ExploreState>): string {
  const p = new URLSearchParams();
  if (s.q) p.set('q', s.q);
  if (s.tab && s.tab !== 'all') p.set('tab', s.tab);
  if (s.view === 'list') p.set('view', 'list');
  if (s.page && s.page > 1) p.set('page', String(s.page));
  const setL = (k: string, v?: string[]) => v?.length && p.set(k, v.join(','));
  setL('types', s.types);
  setL('regions', s.regions);
  setL('stations', s.stations);
  setL('disciplines', s.disciplines);
  setL('access', s.access);
  setL('lang', s.languages);
  if (s.yearFrom) p.set('from', String(s.yearFrom));
  if (s.yearTo) p.set('to', String(s.yearTo));
  if (s.sort) p.set('sort', s.sort);
  return p.toString();
}

export function activeFilterCount(s: SearchFilters): number {
  return (
    (s.types?.length ?? 0) +
    (s.regions?.length ?? 0) +
    (s.stations?.length ?? 0) +
    (s.disciplines?.length ?? 0) +
    (s.access?.length ?? 0) +
    (s.languages?.length ?? 0) +
    (s.yearFrom || s.yearTo ? 1 : 0) +
    (s.sort ? 1 : 0)
  );
}
