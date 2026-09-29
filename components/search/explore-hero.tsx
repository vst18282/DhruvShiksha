'use client';

import Link from 'next/link';
import { ArrowRight, Atom } from 'lucide-react';
import type { SearchFilters } from '@/lib/search';
import { SearchBox } from './search-box';
import { FilterPanel } from './filter-panel';
import { EXPLORE_HERO_IMAGE } from '@/lib/images';
import { useUiStore } from '@/store/ui';

export const TRY_SEARCHES = ['Antarctic ice', 'Bharati station', 'Penguin research', 'Ice cores', 'Climate change', 'Himadri station'];

/** Full-bleed aurora hero with the natural-language search bar, Filters button and suggestion chips. */
export function ExploreHero({ q, filters, onSearch, onFilters }: { q: string; filters: SearchFilters; onSearch: (q: string) => void; onFilters: (f: SearchFilters) => void }) {
  const low = useUiStore((s) => s.lowBandwidth);
  return (
    <section aria-labelledby="explore-title" className="relative isolate overflow-hidden bg-[#061a3a] text-white">
      {!low && (
        <img
          src={EXPLORE_HERO_IMAGE.src}
          alt=""
          aria-hidden
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[52%_62%]"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      )}
      {/* The photo is bright, so darken it enough for white text (left) and keep the valley visible (right). */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#061a3a]/92 via-[#0a2452]/70 to-[#0a2452]/35" aria-hidden />
      <div className="absolute inset-0 -z-10 bg-[#061a3a]/25" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-b from-transparent to-[#f3f6fb] dark:to-background" aria-hidden />

      <div className="container relative pb-28 pt-10 md:pt-14">
        <div className="max-w-3xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.32em] text-[#8fd6ff]">Explore the archive</p>
          <h1 id="explore-title" className="mt-2 text-balance text-4xl font-bold tracking-tight md:text-5xl">
            Find the science behind the poles.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-white/85 md:text-base">
            Search reports, expeditions, datasets, publications, media and events using natural language. Discover research, learn stories and explore the polar regions with smart search that understands everyday words.
          </p>
        </div>

        <div className="mt-7 flex max-w-4xl items-start gap-3">
          <SearchBox variant="hero" initial={q} onSearch={onSearch} placeholder="Try: ice melting near Bharati" className="min-w-0 flex-1" />
          <FilterPanel trigger="button" value={filters} onChange={onFilters} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-white/80">Try searching:</span>
          {TRY_SEARCHES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onSearch(t.toLowerCase())}
              className="rounded-full border border-white/35 bg-white/10 px-3 py-1 text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {t}
            </button>
          ))}
        </div>

        <Link
          href="/about"
          className="group absolute right-4 top-10 hidden w-72 items-start gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-white/15 xl:flex"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30" aria-hidden>
            <Atom className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold leading-tight">
              Real Science.
              <br />
              Greater Awareness.
            </span>
            <span className="mt-1.5 block text-[12px] leading-5 text-white/80">Explore India’s polar and ocean research through reports, data, media and stories.</span>
          </span>
          <ArrowRight className="mt-auto h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
