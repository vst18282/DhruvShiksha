'use client';

import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { BookOpen, Clock, Download, Info, Languages } from 'lucide-react';
import type { Blog, ReadingLevel, Section } from '@/types';
import { ItemLoader, DetailHeader } from '@/components/archive/detail';
import { BookmarkButton, CiteDialog, GeneratePostButton, ShareButtons } from '@/components/archive/actions';
import { RelatedContent } from '@/components/archive/related-content';
import { GlossaryTerm, GlossaryText } from '@/components/archive/glossary-term';
import { PolarImage } from '@/components/common/polar-image';
import { FileCard } from '@/components/common';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/misc';
import { downloadItem } from '@/lib/downloads';
import { useUiStore } from '@/store/ui';
import { STATION_NAMES } from '@/lib/constants';

const LEVELS: { id: ReadingLevel; label: string }[] = [
  { id: 'expert', label: 'Expert' },
  { id: 'general', label: 'General' },
  { id: 'class8', label: 'Class 8' },
];
const LANGS: { id: 'en' | 'hi' | 'mr'; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'हिन्दी' },
  { id: 'mr', label: 'मराठी' },
];

function Body({ b }: { b: Blog }) {
  const low = useUiStore((s) => s.lowBandwidth);
  const [level, setLevel] = useState<ReadingLevel>('general');
  const [lang, setLang] = useState<'en' | 'hi' | 'mr'>('en');
  const tr = lang !== 'en' ? b.translations?.[lang] : undefined;
  const levelSections = b.versions[level];
  let sections: Section[] = levelSections ?? b.versions.general;
  let notice: string | null = null;
  if (lang !== 'en') {
    if (tr) {
      sections = tr.sections;
      if (level !== 'general') notice = 'Translations are available at the General reading level only.';
    } else notice = `This article is not yet available in ${LANGS.find((l) => l.id === lang)?.label}. Showing English.`;
  } else if (!levelSections) notice = `A ${LEVELS.find((l) => l.id === level)?.label} version isn’t available for this article yet — showing the General version.`;
  const title = tr?.title ?? b.title;
  const summary = tr?.summary ?? b.summary;
  const langAttr = tr ? lang : 'en';

  return (
    <div className="container py-8">
      <DetailHeader
        item={b}
        section="Blog"
        sectionHref="/blog"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span>By {b.authors.join(', ')}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" aria-hidden /> {b.readingMinutes} min read
            </span>
            {b.station && <Link href={`/stations/${b.station}`} className="text-primary hover:underline">{STATION_NAMES[b.station]} station</Link>}
            <span>{new Date(b.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
          </span>
        }
        actions={
          <>
            <BookmarkButton item={b} />
            <CiteDialog item={b} />
            <ShareButtons title={b.title} />
            <GeneratePostButton item={b} />
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" aria-hidden />
          <span className="text-sm font-medium" id="lvl-label">Reading level</span>
          <ToggleGroup type="single" value={level} onValueChange={(v) => v && setLevel(v as ReadingLevel)} aria-labelledby="lvl-label">
            {LEVELS.map((l) => (
              <ToggleGroupItem key={l.id} value={l.id}>
                {l.label}
                {!b.versions[l.id] && <span className="sr-only"> (not available)</span>}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-primary" aria-hidden />
          <span className="text-sm font-medium" id="lang-label">Language</span>
          <ToggleGroup type="single" value={lang} onValueChange={(v) => v && setLang(v as 'en' | 'hi' | 'mr')} aria-labelledby="lang-label">
            {LANGS.map((l) => (
              <ToggleGroupItem key={l.id} value={l.id} lang={l.id}>
                {l.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>
      {notice && (
        <p role="status" className="mb-6 flex items-center gap-2 rounded-md border border-polar-amber/40 bg-polar-amber/10 px-3 py-2 text-sm">
          <Info className="h-4 w-4 shrink-0 text-polar-amber" aria-hidden /> {notice}
        </p>
      )}

      <div className="grid gap-10 lg:grid-cols-[220px_1fr_280px]">
        <nav aria-label="Table of contents" className="hidden lg:block">
          <div className="sticky top-28">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">On this page</p>
            <ol className="space-y-1.5 border-l pl-3 text-sm">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-muted-foreground hover:text-foreground">
                    {s.heading}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>
        <article lang={langAttr} className="min-w-0">
          {!low && <PolarImage variant={b.art} seed={b.id} alt={`Photo illustrating “${title}”`} className="mb-6 aspect-[16/8] rounded-lg" />}
          {tr && <h2 className="mb-2 text-2xl font-semibold">{title}</h2>}
          <p className="text-lg leading-8 text-muted-foreground">{summary}</p>
          <div className="prose-polar">
            {sections.map((s) => (
              <section key={s.id} aria-labelledby={s.id}>
                <h2 id={s.id}>{s.heading}</h2>
                <p>{langAttr === 'en' ? <GlossaryText text={s.body} termIds={b.glossaryTerms} /> : s.body}</p>
              </section>
            ))}
          </div>
          {b.citations.length > 0 && (
            <section aria-labelledby="refs" className="mt-10 border-t pt-6">
              <h2 id="refs" className="text-lg font-semibold">Sources & citations</h2>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                {b.citations.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ol>
              {b.expeditionId && (
                <p className="mt-2 text-sm">
                  Based on work from{' '}
                  <Link className="text-primary hover:underline" href={`/expeditions/${b.expeditionId}`}>
                    expedition {b.expeditionId.toUpperCase()}
                  </Link>
                  .
                </p>
              )}
            </section>
          )}
        </article>
        <aside className="space-y-4">
          {b.glossaryTerms.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <p className="mb-2 text-sm font-semibold">Key terms</p>
              <div className="flex flex-wrap gap-2 text-sm">
                {b.glossaryTerms.map((g) => (
                  <GlossaryTerm key={g} id={g} />
                ))}
              </div>
            </div>
          )}
          {b.attachments.length > 0 && (
            <div className="space-y-2 rounded-lg border bg-card p-4">
              <p className="text-sm font-semibold">Attachments</p>
              {b.attachments.map((f) => (
                <FileCard
                  key={f.id}
                  file={f}
                  actions={
                    <Button size="icon" variant="ghost" aria-label={`Download ${f.name}`} onClick={() => { if (downloadItem(b, f)) toast.success('Download started (demo file)'); }}>
                      <Download />
                    </Button>
                  }
                />
              ))}
            </div>
          )}
          <div className="rounded-lg border bg-card p-4 text-xs text-muted-foreground">
            Licence {b.licence} · {b.credit}. Content is fictional demo material.
          </div>
        </aside>
      </div>
      <RelatedContent item={b} />
    </div>
  );
}

export function BlogDetail({ id }: { id: string }) {
  return <ItemLoader<Blog> id={id}>{(b) => <Body b={b} />}</ItemLoader>;
}
