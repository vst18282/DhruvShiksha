'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Hash, Search, TrendingUp, X } from 'lucide-react';
import { SearchService } from '@/lib/search';
import { CONTENT_TYPE_LABELS } from '@/lib/constants';
import { useUiStore } from '@/store/ui';
import { useHydrated } from '@/store/hydration';
import { cn } from '@/lib/utils';

export const TRENDING = ['sea ice bharati', 'how old is the ice', 'penguins breeding', 'himalayan glaciers', 'krill', 'aurora'];

interface Option {
  id: string;
  label: string;
  group: string;
  href?: string;
  query?: string;
  icon: 'search' | 'recent' | 'trend' | 'topic';
  meta?: string;
}

/**
 * Large search input with an accessible combobox autocomplete: grouped suggestions by type,
 * matched topics, recent searches (localStorage) and trending searches.
 */
export function SearchBox({
  initial = '',
  onSearch,
  size = 'lg',
  placeholder = 'Search reports, blogs, expeditions, datasets… try “ice melting near bharti”',
  autoFocus,
  className,
  variant = 'default',
}: {
  initial?: string;
  onSearch?: (q: string) => void;
  size?: 'lg' | 'md';
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  /** `hero`: white, elevated bar with a solid navy Search button (Explore page). */
  variant?: 'default' | 'hero';
}) {
  const hero = variant === 'hero';
  const router = useRouter();
  const listId = useId();
  const hydrated = useHydrated();
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [debounced, setDebounced] = useState(initial);
  const { recentSearches, addRecentSearch, clearRecentSearches } = useUiStore();
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => setQ(initial), [initial]);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 150);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const options: Option[] = useMemo(() => {
    if (!hydrated) return [];
    if (debounced.trim().length < 2) {
      return [
        ...recentSearches.slice(0, 5).map((r) => ({ id: `r-${r}`, label: r, group: 'Recent searches', query: r, icon: 'recent' as const })),
        ...TRENDING.map((t) => ({ id: `t-${t}`, label: t, group: 'Trending', query: t, icon: 'trend' as const })),
      ];
    }
    const s = SearchService.suggest(debounced);
    return [
      { id: 'go', label: `Search for “${debounced}”`, group: 'Search', query: debounced, icon: 'search' as const, meta: s.didYouMean ? `Did you mean: ${s.didYouMean}` : undefined },
      ...s.topics.map((t) => ({ id: `topic-${t}`, label: t, group: 'Topics', query: t, icon: 'topic' as const })),
      ...s.groups.flatMap((g) =>
        g.items.map((r) => ({ id: r.item.id, label: r.item.title, group: CONTENT_TYPE_LABELS[g.type].plural, href: r.href, icon: 'search' as const, meta: String(r.item.year) })),
      ),
    ];
  }, [debounced, recentSearches, hydrated]);

  const submit = (query: string) => {
    const v = query.trim();
    if (v) addRecentSearch(v);
    setOpen(false);
    if (onSearch) onSearch(v);
    else router.push(`/explore?q=${encodeURIComponent(v)}`);
  };
  const choose = (o: Option) => {
    if (o.href) {
      setOpen(false);
      addRecentSearch(q);
      router.push(o.href);
    } else if (o.query !== undefined) {
      setQ(o.query);
      submit(o.query);
    }
  };

  const groups = options.reduce<Record<string, Option[]>>((acc, o) => {
    (acc[o.group] ??= []).push(o);
    return acc;
  }, {});
  const Icon = ({ k }: { k: Option['icon'] }) =>
    k === 'recent' ? <Clock className="h-4 w-4" /> : k === 'trend' ? <TrendingUp className="h-4 w-4" /> : k === 'topic' ? <Hash className="h-4 w-4" /> : <Search className="h-4 w-4" />;

  return (
    <div ref={wrap} className={cn('relative w-full', className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (open && active >= 0 && options[active]) choose(options[active]);
          else submit(q);
        }}
      >
        <label htmlFor={`${listId}-input`} className="sr-only">
          Search the archive
        </label>
        <div
          className={cn(
            'flex items-center gap-2 focus-within:ring-2 focus-within:ring-ring',
            hero ? 'h-14 rounded-xl bg-white pl-4 pr-2 text-slate-900 shadow-xl shadow-[#061a3a]/20 ring-1 ring-black/5 dark:bg-card dark:text-foreground' : 'rounded-lg border bg-background shadow-sm',
            !hero && (size === 'lg' ? 'h-14 px-4' : 'h-11 px-3'),
          )}
        >
          <Search className={cn('h-5 w-5 shrink-0', hero ? 'text-slate-500 dark:text-muted-foreground' : 'text-muted-foreground')} aria-hidden />
          <input
            id={`${listId}-input`}
            role="combobox"
            aria-expanded={open}
            aria-controls={`${listId}-list`}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
            autoComplete="off"
            autoFocus={autoFocus}
            value={q}
            placeholder={placeholder}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setOpen(true);
                setActive((a) => Math.min(options.length - 1, a + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(-1, a - 1));
              } else if (e.key === 'Escape') setOpen(false);
            }}
            className={cn('min-w-0 flex-1 bg-transparent outline-none', hero ? 'text-[15px] placeholder:text-slate-500 dark:placeholder:text-muted-foreground' : 'placeholder:text-muted-foreground', !hero && (size === 'lg' ? 'text-base' : 'text-sm'))}
          />
          {q && (
            <button type="button" onClick={() => setQ('')} aria-label="Clear search" className="rounded p-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            className={cn(
              hero
                ? 'h-10 rounded-lg bg-[#0d2f6b] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0a2657] sm:px-7'
                : 'hidden rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:block',
            )}
          >
            Search
          </button>
        </div>
      </form>
      {open && options.length > 0 && (
        <div id={`${listId}-list`} role="listbox" aria-label="Search suggestions" className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[60vh] overflow-y-auto rounded-lg border bg-popover p-2 text-left shadow-lg">
          {Object.entries(groups).map(([g, opts]) => (
            <div key={g} role="group" aria-label={g} className="mb-1">
              <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {g}
                {g === 'Recent searches' && (
                  <button type="button" className="normal-case text-primary hover:underline" onClick={clearRecentSearches}>
                    Clear
                  </button>
                )}
              </div>
              {opts.map((o) => {
                const i = options.indexOf(o);
                return (
                  <div
                    key={o.id}
                    id={`${listId}-opt-${i}`}
                    role="option"
                    aria-selected={active === i}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(o)}
                    onMouseEnter={() => setActive(i)}
                    className={cn('flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm', active === i && 'bg-muted')}
                  >
                    <span className="text-muted-foreground">
                      <Icon k={o.icon} />
                    </span>
                    <span className="line-clamp-1 flex-1">{o.label}</span>
                    {o.meta && <span className="shrink-0 text-xs text-muted-foreground">{o.meta}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
