'use client';

import Link from 'next/link';
import * as React from 'react';
import { BookOpen } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/popover';
import { GLOSSARY } from '@/data/glossary';
import type { GlossaryTerm as G } from '@/types';
import { escapeRe } from '@/lib/search/text';

const BY_ID = new Map(GLOSSARY.map((g) => [g.id, g]));

/** Hover/focus definition card for a glossary term. Reused across the site. */
export function GlossaryTerm({ id, children }: { id: string; children?: React.ReactNode }) {
  const g = BY_ID.get(id);
  if (!g) return <>{children}</>;
  return (
    <HoverCard openDelay={150} closeDelay={80}>
      <HoverCardTrigger asChild>
        <Link
          href={`/learn/glossary#${g.id}`}
          className="cursor-help border-b border-dashed border-primary/60 text-inherit no-underline hover:border-primary hover:text-primary"
        >
          {children ?? g.term}
        </Link>
      </HoverCardTrigger>
      <HoverCardContent className="w-72">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <BookOpen className="h-4 w-4 text-primary" aria-hidden /> {g.term}
        </p>
        <p className="mt-1.5 text-sm">{g.definition}</p>
        <p className="mt-2 rounded-md bg-accent px-2 py-1 text-xs text-accent-foreground">
          <strong>In simple words:</strong> {g.simple}
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}

/**
 * Renders plain text and wraps the first occurrence of each given glossary term
 * (by term name or alias) in a <GlossaryTerm> hover card.
 */
export function GlossaryText({ text, termIds }: { text: string; termIds: string[] }) {
  const terms: { g: G; re: RegExp }[] = termIds
    .map((id) => BY_ID.get(id))
    .filter((g): g is G => !!g)
    .map((g) => {
      const names = [g.term.replace(/\s*\(.*\)$/, ''), ...(g.aliases ?? [])].map(escapeRe);
      return { g, re: new RegExp(`\\b(${names.join('|')})\\b`, 'i') };
    });
  if (!terms.length) return <>{text}</>;
  const out: React.ReactNode[] = [];
  let rest = text;
  const used = new Set<string>();
  let key = 0;
  // Greedy: repeatedly find the earliest matching unused term.
  for (;;) {
    let best: { idx: number; len: number; g: G; match: string } | null = null;
    for (const t of terms) {
      if (used.has(t.g.id)) continue;
      const m = t.re.exec(rest);
      if (m && (best === null || m.index < best.idx)) best = { idx: m.index, len: m[0].length, g: t.g, match: m[0] };
    }
    if (!best) break;
    out.push(rest.slice(0, best.idx));
    out.push(
      <GlossaryTerm key={key++} id={best.g.id}>
        {best.match}
      </GlossaryTerm>,
    );
    used.add(best.g.id);
    rest = rest.slice(best.idx + best.len);
  }
  out.push(rest);
  return <>{out}</>;
}
