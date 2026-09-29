'use client';

import { useMemo, useState } from 'react';
import { LayoutGrid, List, Search } from 'lucide-react';
import type { AccessLevel, ArchiveItem, ContentType, Discipline, Region } from '@/types';
import type { ImageId } from '@/lib/images';
import { ItemCard, ItemRow } from './item-card';
import { EmptyState, ErrorState, SectionHeader } from '@/components/common';
import { PageHero } from '@/components/common/page-hero';
import { Pagination } from '@/components/common/client';
import { CardGridSkeleton } from '@/components/skeletons';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/misc';
import { useApi } from '@/hooks/use-queries';
import { ACCESS_META, DISCIPLINE_LABELS, REGION_META } from '@/lib/constants';
import { normalize } from '@/lib/search/text';

/**
 * Generic archive listing with quick filters (region, discipline, access, year) and
 * in-list keyword filter. For semantic search the header links to /explore.
 */
export function ArchiveListView<T extends ArchiveItem>({
  queryKey,
  fetcher,
  title,
  eyebrow,
  description,
  type,
  extraFilter,
  headerAction,
  hero,
}: {
  queryKey: string;
  fetcher: () => Promise<T[]>;
  title: string;
  eyebrow?: string;
  description?: string;
  type: ContentType;
  extraFilter?: { label: string; options: { value: string; label: string }[]; test: (item: T, v: string) => boolean };
  headerAction?: React.ReactNode;
  /** Opt-in full-bleed header (used by the Data catalogue) instead of the plain section heading. */
  hero?: { title?: string; script?: string; image?: ImageId; meta?: React.ReactNode };
}) {
  const { data, isPending, isError, refetch } = useApi([queryKey], fetcher);
  const [q, setQ] = useState('');
  const [region, setRegion] = useState<Region | 'all'>('all');
  const [disc, setDisc] = useState<Discipline | 'all'>('all');
  const [access, setAccess] = useState<AccessLevel | 'all'>('all');
  const [extra, setExtra] = useState('all');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'views'>('newest');
  const [view, setView] = useState<'card' | 'list'>('card');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const nq = normalize(q);
    const out = (data ?? []).filter(
      (i) =>
        (region === 'all' || i.region === region) &&
        (disc === 'all' || i.discipline === disc) &&
        (access === 'all' || i.accessLevel === access) &&
        (extra === 'all' || !extraFilter || extraFilter.test(i, extra)) &&
        (!nq || normalize(`${i.title} ${i.summary} ${i.tags.join(' ')}`).includes(nq)),
    );
    out.sort((a, b) => (sort === 'views' ? b.views - a.views : sort === 'oldest' ? a.year - b.year : b.year - a.year || b.createdAt.localeCompare(a.createdAt)));
    return out;
  }, [data, q, region, disc, access, extra, sort, extraFilter]);

  const size = 12;
  const pageCount = Math.max(1, Math.ceil(filtered.length / size));
  const cur = Math.min(page, pageCount);
  const slice = filtered.slice((cur - 1) * size, cur * size);
  const reset = () => setPage(1);

  return (
    <div>
      {hero ? (
        <PageHero eyebrow={eyebrow} title={hero.title ?? title} script={hero.script} description={description} image={hero.image} action={headerAction} meta={hero.meta} />
      ) : null}
      <div className="container py-8">
      {!hero && <SectionHeader as="h1" eyebrow={eyebrow} title={title} description={description} action={headerAction} />}
      <div className="mb-6 grid gap-3 rounded-lg border bg-card p-3 md:grid-cols-[1fr_repeat(4,minmax(0,170px))_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              reset();
            }}
            placeholder={`Filter ${title.toLowerCase()}…`}
            aria-label={`Filter ${title}`}
            className="pl-9"
          />
        </div>
        <Select value={region} onValueChange={(v) => { setRegion(v as Region | 'all'); reset(); }}>
          <SelectTrigger aria-label="Region"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All regions</SelectItem>
            {(Object.keys(REGION_META) as Region[]).map((r) => (
              <SelectItem key={r} value={r}>{REGION_META[r].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={disc} onValueChange={(v) => { setDisc(v as Discipline | 'all'); reset(); }}>
          <SelectTrigger aria-label="Discipline"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All disciplines</SelectItem>
            {(Object.keys(DISCIPLINE_LABELS) as Discipline[]).map((d) => (
              <SelectItem key={d} value={d}>{DISCIPLINE_LABELS[d]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {extraFilter ? (
          <Select value={extra} onValueChange={(v) => { setExtra(v); reset(); }}>
            <SelectTrigger aria-label={extraFilter.label}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {extraFilter.label.toLowerCase()}</SelectItem>
              {extraFilter.options.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Select value={access} onValueChange={(v) => { setAccess(v as AccessLevel | 'all'); reset(); }}>
            <SelectTrigger aria-label="Access level"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any access</SelectItem>
              {(Object.keys(ACCESS_META) as AccessLevel[]).map((a) => (
                <SelectItem key={a} value={a}>{ACCESS_META[a].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger aria-label="Sort"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="views">Most viewed</SelectItem>
          </SelectContent>
        </Select>
        <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as 'card' | 'list')} aria-label="View">
          <ToggleGroupItem value="card" aria-label="Card view"><LayoutGrid /></ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view"><List /></ToggleGroupItem>
        </ToggleGroup>
      </div>

      {isError ? (
        <ErrorState action={<Button onClick={() => refetch()}>Retry</Button>} />
      ) : isPending ? (
        <CardGridSkeleton count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState title={`No ${title.toLowerCase()} match`} description="Try clearing a filter." action={<Button variant="outline" onClick={() => { setQ(''); setRegion('all'); setDisc('all'); setAccess('all'); setExtra('all'); }}>Clear filters</Button>} />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">{filtered.length} {type === 'dataset' ? 'datasets' : 'items'}</p>
          {view === 'card' ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{slice.map((i) => <ItemCard key={i.id} item={i} />)}</div>
          ) : (
            <div className="space-y-3">{slice.map((i) => <ItemRow key={i.id} item={i} />)}</div>
          )}
          <Pagination className="mt-8" page={cur} pageCount={pageCount} onPageChange={setPage} />
        </>
      )}
      </div>
    </div>
  );
}
