'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FlaskConical, Info, ListChecks } from 'lucide-react';
import type { ReadingLevel } from '@/types';
import { Breadcrumbs, DemoBadge } from '@/components/common';
import { GlossaryTerm } from '@/components/archive/glossary-term';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/misc';

export interface ToolScience {
  expert: string;
  general: string;
  class8: string;
}

/** Shared layout for every Scientific Tool page (section 12). */
export function ToolLayout({
  title,
  eyebrow = 'Scientific tool',
  intro,
  howTo,
  science,
  glossary = [],
  related = [],
  children,
  aside,
  demoNote = 'All values on this page are simulated demo data for education — not real measurements.',
}: {
  title: string;
  eyebrow?: string;
  intro: string;
  howTo: string[];
  science: ToolScience;
  glossary?: string[];
  related?: { label: string; href: string }[];
  children: React.ReactNode;
  aside?: React.ReactNode;
  demoNote?: string;
}) {
  const [level, setLevel] = useState<ReadingLevel>('general');
  return (
    <div className="container py-8">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Scientific Tools', href: '/tools' }, { label: title }]} />
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
          <p className="mt-2 text-muted-foreground">{intro}</p>
        </div>
        <DemoBadge />
      </header>

      <details className="mb-5 rounded-lg border bg-card p-4 [&_summary::-webkit-details-marker]:hidden" open>
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <ListChecks className="h-4 w-4 text-primary" aria-hidden /> How to use
        </summary>
        <ol className="mt-2 list-decimal space-y-1 pl-6 text-sm text-muted-foreground">
          {howTo.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ol>
      </details>

      <div className={aside ? 'grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]' : ''}>
        <div className="min-w-0">{children}</div>
        {aside && <aside className="space-y-4">{aside}</aside>}
      </div>

      <p role="note" className="mt-6 flex items-center gap-2 rounded-md border border-polar-amber/40 bg-polar-amber/10 px-3 py-2 text-sm">
        <Info className="h-4 w-4 shrink-0 text-polar-amber" aria-hidden /> {demoNote}
      </p>

      <section aria-labelledby="science" className="mt-10 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 id="science" className="flex items-center gap-2 text-xl font-semibold">
              <FlaskConical className="h-5 w-5 text-primary" aria-hidden /> The science behind this
            </h2>
            <ToggleGroup type="single" value={level} onValueChange={(v) => v && setLevel(v as ReadingLevel)} aria-label="Reading level">
              <ToggleGroupItem value="expert">Expert</ToggleGroupItem>
              <ToggleGroupItem value="general">General</ToggleGroupItem>
              <ToggleGroupItem value="class8">Class 8</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <p className="leading-7" aria-live="polite">{science[level]}</p>
        </div>
        <div className="space-y-4">
          {glossary.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <p className="mb-2 text-sm font-semibold">Glossary</p>
              <div className="flex flex-wrap gap-2 text-sm">{glossary.map((g) => <GlossaryTerm key={g} id={g} />)}</div>
            </div>
          )}
          {related.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <p className="mb-2 text-sm font-semibold">Related content</p>
              <ul className="space-y-1 text-sm">
                {related.map((r) => (
                  <li key={r.href}>
                    <Link href={r.href} className="text-primary hover:underline">{r.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
