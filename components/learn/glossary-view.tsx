'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { SectionHeader, EmptyState, Breadcrumbs } from '@/components/common';
import { Input } from '@/components/ui/input';
import { GlossaryTerm } from '@/components/archive/glossary-term';
import { Skeleton } from '@/components/skeletons';
import { useApi } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { normalize } from '@/lib/search/text';
import { cn } from '@/lib/utils';

export function GlossaryView() {
  const { data, isPending } = useApi(['glossary'], api.getGlossary);
  const [q, setQ] = useState('');
  const terms = useMemo(() => {
    const nq = normalize(q);
    return (data ?? [])
      .filter((g) => !nq || normalize(`${g.term} ${g.definition} ${g.simple} ${(g.aliases ?? []).join(' ')}`).includes(nq))
      .sort((a, b) => normalize(a.term).localeCompare(normalize(b.term)));
  }, [data, q]);
  const letters = Array.from(new Set(terms.map((t) => normalize(t.term)[0]?.toUpperCase())));
  const all = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  return (
    <div className="container py-8">
      <Breadcrumbs items={[{ label: 'Learn', href: '/learn' }, { label: 'Glossary' }]} />
      <SectionHeader as="h1" eyebrow="Learn" title="Polar glossary" description="Expert definitions with “in simple words” versions. These terms show hover cards across the site." />
      <div className="sticky top-24 z-10 -mx-4 mb-6 space-y-3 bg-background/95 px-4 py-3 backdrop-blur">
        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search terms, e.g. albedo, krill, ice core…" aria-label="Search glossary" className="pl-9" />
        </div>
        <nav aria-label="Jump to letter" className="flex flex-wrap gap-1">
          {all.map((l) => {
            const on = letters.includes(l);
            return on ? (
              <a key={l} href={`#letter-${l}`} className="flex h-7 w-7 items-center justify-center rounded text-xs font-semibold hover:bg-primary hover:text-primary-foreground">{l}</a>
            ) : (
              <span key={l} className="flex h-7 w-7 items-center justify-center rounded text-xs text-muted-foreground/40" aria-hidden>{l}</span>
            );
          })}
        </nav>
      </div>
      {isPending ? (
        <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : terms.length === 0 ? (
        <EmptyState title="No matching terms" description="Try a different word or check the spelling." />
      ) : (
        <div className="space-y-8">
          {letters.map((l) => (
            <section key={l} id={`letter-${l}`} aria-labelledby={`h-${l}`} className="scroll-mt-48">
              <h2 id={`h-${l}`} className="mb-3 text-2xl font-bold text-primary">{l}</h2>
              <dl className="grid gap-3 md:grid-cols-2">
                {terms.filter((t) => normalize(t.term)[0]?.toUpperCase() === l).map((t) => (
                  <div key={t.id} id={t.id} className={cn('scroll-mt-48 rounded-lg border bg-card p-4 target:ring-2 target:ring-primary')}>
                    <dt className="font-semibold">{t.term}</dt>
                    <dd className="mt-1 text-sm">{t.definition}</dd>
                    <dd className="mt-2 rounded-md bg-accent px-2 py-1 text-xs text-accent-foreground"><strong>In simple words:</strong> {t.simple}</dd>
                    {t.related.length > 0 && (
                      <dd className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        Related: {t.related.map((r) => <GlossaryTerm key={r} id={r} />)}
                      </dd>
                    )}
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
