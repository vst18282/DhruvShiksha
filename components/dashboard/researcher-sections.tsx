'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Bell,
  BellOff,
  BookOpenCheck,
  Check,
  CheckCircle2,
  Clock,
  Code2,
  Copy,
  Database,
  Download,
  FileDown,
  FolderOpen,
  FolderPlus,
  Hourglass,
  KeyRound,
  Link2,
  Lock,
  LockOpen,
  Pencil,
  Play,
  Plus,
  Quote,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import type { ArchiveItem, ContentType, Dataset, SourceRef } from '@/types';
import { Kpi, MoreLink, Panel, TYPE_TONE, TypeBadge, daysSince, shortDate } from './researcher-ui';
import { TRENDING } from '@/components/search/search-box';
import { EmptyState } from '@/components/common';
import { RequestAccessDialog } from '@/components/archive/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox, Switch, ToggleGroup, ToggleGroupItem } from '@/components/ui/misc';
import { TableSkeleton } from '@/components/skeletons';
import { useApi } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { findRef, itemHref, publishedItems } from '@/lib/archive';
import { toApa, toBibtex, toRis } from '@/lib/cite';
import { CONTENT_TYPE_LABELS, REGION_META } from '@/lib/constants';
import { SearchService } from '@/lib/search';
import { parseExplore } from '@/lib/search/url';
import { useUserStore } from '@/store/user';
import { useAuthStore } from '@/store/auth';
import { cn, downloadTextFile, formatCompact, toCsv } from '@/lib/utils';

const exploreHref = (query: string, filters = '') => `/explore?q=${encodeURIComponent(query)}${filters ? `&${filters}` : ''}`;
const copyText = async (text: string, msg: string) => {
  await navigator.clipboard?.writeText(text);
  toast.success(msg);
};

/* ================================ Saved searches ================================ */

export function Searches() {
  const { savedSearches, saveSearch, toggleSearchAlert, deleteSearch } = useUserStore();
  const [q, setQ] = useState('');
  const runs = useMemo(
    () => Object.fromEntries(savedSearches.map((s) => [s.id, SearchService.search(s.query, parseExplore(new URLSearchParams(s.filters)))])),
    [savedSearches],
  );
  const preview = useMemo(() => (q.trim().length >= 2 ? SearchService.search(q.trim()) : null), [q]);
  const alertsOn = savedSearches.filter((s) => s.alerts).length;
  const matches = Object.values(runs).reduce((n, r) => n + r.results.length, 0);
  const suggestions = TRENDING.filter((t) => !savedSearches.some((s) => s.query.toLowerCase() === t.toLowerCase()));

  const save = (query: string) => {
    const v = query.trim();
    if (v.length < 2) return toast.error('Type at least 2 characters');
    if (savedSearches.some((s) => s.query.toLowerCase() === v.toLowerCase())) return toast.info('Already saved');
    saveSearch(v, '');
    toast.success('Search saved', { description: 'Turn on alerts to hear about new matches.' });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Kpi label="Saved searches" value={savedSearches.length} icon={Search} tone="sky" />
        <Kpi label="Alerts on" value={alertsOn} icon={Bell} tone="amber" note="Email alerts (demo)" />
        <Kpi label="Current matches" value={matches} icon={Sparkles} tone="teal" note="Across all saved searches" />
      </div>

      <Panel id="ss-new" title="Save a new search" icon={Plus} subtitle="Track a query and see how many archive items match it right now">
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); save(q); setQ(''); }}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. krill biomass southern ocean" aria-label="Search query to save" className="h-11 pl-9" />
          </div>
          <Button type="submit" size="lg"><Bell /> Save search</Button>
          <Button type="button" size="lg" variant="outline" asChild><Link href={exploreHref(q || '')}><Play /> Run</Link></Button>
        </form>
        {preview && (
          <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
            <span className="font-semibold text-foreground">{preview.results.length}</span> items match right now
            {preview.didYouMean && <> · did you mean <button type="button" className="font-medium text-primary hover:underline" onClick={() => setQ(preview.didYouMean!)}>{preview.didYouMean}</button>?</>}
          </p>
        )}
        {suggestions.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Trending searches</p>
            <ul className="flex flex-wrap gap-2">
              {suggestions.map((t) => (
                <li key={t}>
                  <button type="button" onClick={() => save(t)} className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-sm transition-colors hover:border-primary hover:bg-primary/5">
                    <Plus className="h-3.5 w-3.5 text-primary" aria-hidden /> {t}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>

      {savedSearches.length === 0 ? (
        <EmptyState icon={<Search className="h-6 w-6" />} title="No saved searches" description="Save a query above, or use “Save search” on the Explore page." />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {savedSearches.map((s) => {
            const r = runs[s.id];
            const types = (Object.entries(r.counts) as [ContentType | 'all', number][]).filter(([k, n]) => k !== 'all' && n > 0) as [ContentType, number][];
            const href = exploreHref(s.query, s.filters);
            return (
              <li key={s.id} className="flex flex-col rounded-xl border bg-card shadow-sm">
                <div className="flex items-start gap-3 border-b p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-300"><Search className="h-4 w-4" aria-hidden /></span>
                  <div className="min-w-0 flex-1">
                    <Link href={href} className="line-clamp-1 font-semibold hover:text-primary hover:underline">“{s.query}”</Link>
                    <p className="text-xs text-muted-foreground">Saved {shortDate(s.createdAt)}{s.filters ? ' · with filters' : ''}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-primary">{r.results.length} matches</span>
                </div>
                <div className="flex-1 space-y-3 p-4">
                  {types.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5" aria-label="Matches by type">
                      {types.map(([t, n]) => (
                        <li key={t} className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', TYPE_TONE[t])}>{CONTENT_TYPE_LABELS[t].plural} · {n}</li>
                      ))}
                    </ul>
                  )}
                  {r.results.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No matches yet. Alerts will tell you when something new arrives.</p>
                  ) : (
                    <ul className="space-y-2">
                      {r.results.slice(0, 3).map((x) => (
                        <li key={x.item.id} className="flex items-center gap-2.5">
                          <TypeBadge type={x.item.type} className="h-7 w-7" />
                          <Link href={x.href} className="line-clamp-1 flex-1 text-sm hover:text-primary hover:underline">{x.item.title}</Link>
                          <span className="shrink-0 text-xs text-muted-foreground">{x.item.year}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t bg-muted/20 px-4 py-2.5">
                  <label className="mr-auto flex items-center gap-2 text-sm">
                    {s.alerts ? <Bell className="h-4 w-4 text-primary" aria-hidden /> : <BellOff className="h-4 w-4 text-muted-foreground" aria-hidden />}
                    Alerts
                    <Switch checked={s.alerts} onCheckedChange={() => { toggleSearchAlert(s.id); toast.success(`Alerts ${s.alerts ? 'off' : 'on'} (demo)`); }} aria-label={`Email alerts for ${s.query}`} />
                  </label>
                  <Button size="sm" variant="ghost" onClick={() => copyText(`${window.location.origin}${href}`, 'Link copied')} aria-label={`Copy link to ${s.query}`}><Link2 /> Copy link</Button>
                  <Button size="sm" variant="outline" asChild><Link href={href}><Play /> Run</Link></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { deleteSearch(s.id); toast.success('Saved search deleted'); }} aria-label={`Delete saved search ${s.query}`}><Trash2 /></Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ================================== Collections ================================== */

export function Collections() {
  const { collections, bookmarks, recentlyViewed, createCollection, renameCollection, deleteCollection, toggleInCollection } = useUserStore();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const library: SourceRef[] = Array.from(new Map([...bookmarks, ...recentlyViewed.map((r) => r.ref)].map((r) => [`${r.type}:${r.id}`, r])).values());
  const totalItems = collections.reduce((n, c) => n + c.items.length, 0);
  const typesUsed = new Set(collections.flatMap((c) => c.items.map((i) => i.type))).size;

  const exportBib = (c: (typeof collections)[number]) => {
    const items = c.items.map(findRef).filter((x): x is ArchiveItem => !!x);
    if (!items.length) return toast.error('This collection is empty');
    downloadTextFile(`${c.name.replace(/\W+/g, '-').toLowerCase()}.bib`, items.map(toBibtex).join('\n\n'), 'application/x-bibtex');
    toast.success(`${items.length} citation${items.length === 1 ? '' : 's'} exported`);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Kpi label="Collections" value={collections.length} icon={FolderOpen} tone="violet" />
        <Kpi label="Items collected" value={totalItems} icon={BookOpenCheck} tone="teal" />
        <Kpi label="Content types" value={typesUsed} icon={Database} tone="sky" note="Datasets, reports, publications…" />
      </div>

      <form
        className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center"
        onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; createCollection(name.trim()); setName(''); toast.success('Collection created'); }}
      >
        <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 sm:flex dark:text-violet-300"><FolderPlus className="h-5 w-5" aria-hidden /></span>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name a new collection, e.g. Himalayan glacier mass balance" aria-label="New collection name" className="h-11 flex-1" />
        <Button type="submit" size="lg"><FolderPlus /> Create collection</Button>
      </form>

      {collections.length === 0 ? (
        <EmptyState icon={<FolderOpen className="h-6 w-6" />} title="No collections yet" description="Create one above, or use the folder button next to Bookmark on any item." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {collections.map((c) => {
            const items = c.items.map((r) => ({ r, it: findRef(r) })).filter((x): x is { r: SourceRef; it: ArchiveItem } => !!x.it);
            const byType = items.reduce<Record<string, number>>((a, { it }) => ((a[it.type] = (a[it.type] ?? 0) + 1), a), {});
            const lead = (Object.entries(byType).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'dataset') as ContentType;
            const candidates = library.filter((r) => !c.items.some((i) => i.type === r.type && i.id === r.id)).map((r) => ({ r, it: findRef(r) })).filter((x) => x.it).slice(0, 3);
            return (
              <article key={c.id} className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className={cn('flex items-center gap-3 px-4 py-4', TYPE_TONE[lead].split(' ')[0])}>
                  <TypeBadge type={lead} className="h-11 w-11 bg-background/80" />
                  <div className="min-w-0 flex-1">
                    {editing === c.id ? (
                      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) renameCollection(c.id, draft.trim()); setEditing(null); }}>
                        <Input value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Collection name" className="h-8 bg-background" autoFocus />
                        <Button size="sm" type="submit">Save</Button>
                      </form>
                    ) : (
                      <h3 className="truncate font-semibold">{c.name}</h3>
                    )}
                    <p className="text-xs text-muted-foreground">{items.length} item{items.length === 1 ? '' : 's'} · created {shortDate(c.createdAt)}</p>
                  </div>
                  {editing !== c.id && (
                    <div className="flex shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(c.id); setDraft(c.name); }} aria-label={`Rename ${c.name}`}><Pencil /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => { deleteCollection(c.id); toast.success('Collection deleted'); }} aria-label={`Delete ${c.name}`}><Trash2 /></Button>
                    </div>
                  )}
                </div>

                <div className="flex-1 p-4">
                  {Object.keys(byType).length > 0 && (
                    <ul className="mb-3 flex flex-wrap gap-1.5" aria-label="Items by type">
                      {Object.entries(byType).map(([t, n]) => (
                        <li key={t} className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', TYPE_TONE[t as ContentType])}>{CONTENT_TYPE_LABELS[t as ContentType].plural} · {n}</li>
                      ))}
                    </ul>
                  )}
                  {items.length === 0 ? (
                    <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Empty. Add items from your library below or from any detail page.</p>
                  ) : (
                    <ul className="divide-y">
                      {items.map(({ r, it }) => (
                        <li key={`${r.type}:${r.id}`} className="flex items-center gap-2.5 py-2">
                          <TypeBadge type={it.type} className="h-7 w-7" />
                          <span className="min-w-0 flex-1">
                            <Link href={itemHref(it)} className="line-clamp-1 text-sm font-medium hover:text-primary hover:underline">{it.title}</Link>
                            <span className="text-[11px] text-muted-foreground">{CONTENT_TYPE_LABELS[it.type].singular} · {it.year} · {REGION_META[it.region].label}</span>
                          </span>
                          <button type="button" onClick={() => toggleInCollection(c.id, r)} className="shrink-0 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Remove ${it.title} from ${c.name}`}>Remove</button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {candidates.length > 0 && (
                    <div className="mt-4 rounded-lg bg-muted/40 p-3">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Add from your bookmarks & history</p>
                      <ul className="space-y-1.5">
                        {candidates.map(({ r, it }) => (
                          <li key={`${r.type}:${r.id}`} className="flex items-center gap-2 text-sm">
                            <span className="line-clamp-1 flex-1">{it!.title}</span>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { toggleInCollection(c.id, r); toast.success('Added to collection'); }}><Plus /> Add</Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 border-t bg-muted/20 px-4 py-2.5">
                  <Button size="sm" variant="outline" onClick={() => exportBib(c)}><FileDown /> Export BibTeX</Button>
                  <Button size="sm" variant="ghost" asChild><Link href="/dashboard/researcher?tab=cite"><Quote /> Cite items</Link></Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================================ Access requests ================================ */

const REQ_STEPS = ['Requested', 'With data owner', 'Decision'];

export function Access() {
  const user = useAuthStore((s) => s.user)!;
  const { data, isPending } = useApi(['access'], api.getAccessRequests);
  const [q, setQ] = useState('');
  const mine = (data ?? []).filter((r) => r.requesterId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const restricted = publishedItems().filter((i) => i.accessLevel === 'restricted' && !mine.some((m) => m.itemId === i.id && m.status !== 'declined'));
  const shown = restricted.filter((i) => `${i.title} ${i.authors.join(' ')} ${i.tags.join(' ')}`.toLowerCase().includes(q.toLowerCase()));
  const count = (s: 'pending' | 'approved' | 'declined') => mine.filter((r) => r.status === s).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Pending" value={count('pending')} icon={Hourglass} tone="amber" note="Waiting for the data owner" />
        <Kpi label="Approved" value={count('approved')} icon={CheckCircle2} tone="emerald" note="Ready to download" />
        <Kpi label="Declined" value={count('declined')} icon={XCircle} tone="rose" note="You can request again" />
        <Kpi label="Restricted items" value={restricted.length} icon={Lock} tone="violet" note="Available to request" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel id="my-req" title="My requests" icon={Send} subtitle="Every request and where it stands">
          {isPending ? <TableSkeleton rows={3} cols={3} /> : mine.length === 0 ? (
            <EmptyState title="No requests yet" description="Pick a restricted item on the right to ask its owner for access." />
          ) : (
            <ul className="space-y-3">
              {mine.map((r) => {
                const step = r.status === 'pending' ? 1 : 2;
                const tone = r.status === 'approved' ? 'success' : r.status === 'declined' ? 'destructive' : 'warning';
                return (
                  <li key={r.id} className="rounded-lg border p-4">
                    <div className="flex items-start gap-3">
                      <TypeBadge type={r.itemType} />
                      <div className="min-w-0 flex-1">
                        <Link href={CONTENT_TYPE_LABELS[r.itemType].href(r.itemId)} className="line-clamp-1 text-sm font-semibold hover:text-primary hover:underline">{r.itemTitle}</Link>
                        <p className="text-xs text-muted-foreground">{CONTENT_TYPE_LABELS[r.itemType].singular} · {r.institution}</p>
                      </div>
                      <Badge variant={tone} className="shrink-0 capitalize">{r.status}</Badge>
                    </div>
                    <ol className="mt-3 flex items-center gap-1" aria-label={`Progress: ${REQ_STEPS[step]}`}>
                      {REQ_STEPS.map((s, i) => (
                        <li key={s} className="flex flex-1 items-center gap-1">
                          <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold', i < step || (i === step && r.status !== 'pending') ? (r.status === 'declined' && i === 2 ? 'bg-destructive text-white' : 'bg-success text-white') : i === step ? 'bg-polar-amber text-white' : 'bg-muted text-muted-foreground')}>
                            {i < step || (i === step && r.status === 'approved') ? <Check className="h-3 w-3" aria-hidden /> : i + 1}
                          </span>
                          <span className="hidden truncate text-[11px] text-muted-foreground sm:inline">{s}</span>
                          {i < REQ_STEPS.length - 1 && <span className={cn('h-px flex-1', i < step ? 'bg-success' : 'bg-border')} aria-hidden />}
                        </li>
                      ))}
                    </ol>
                    <p className="mt-3 rounded-md bg-muted/50 px-3 py-2 text-xs italic text-muted-foreground">“{r.purpose}”</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" aria-hidden />
                      <span>Requested {shortDate(r.createdAt)}</span>
                      {r.decidedAt ? <span>· decided {shortDate(r.decidedAt)}</span> : <span>· waiting {daysSince(r.createdAt)} day{daysSince(r.createdAt) === 1 ? '' : 's'}</span>}
                      {r.status === 'approved' && (
                        <Button size="sm" className="ml-auto h-7 text-xs" asChild><Link href={CONTENT_TYPE_LABELS[r.itemType].href(r.itemId)}><Download /> Open & download</Link></Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel id="new-req" title="Restricted data you can request" icon={Lock} subtitle={`${restricted.length} items need the owner's permission`}>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by title, author or tag…" aria-label="Filter restricted items" className="pl-9" />
          </div>
          {shown.length === 0 ? (
            <EmptyState title={restricted.length ? 'Nothing matches' : 'All restricted items requested'} />
          ) : (
            <ul className="space-y-2">
              {shown.map((i) => (
                <li key={i.id} className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/30">
                  <TypeBadge type={i.type} />
                  <div className="min-w-0 flex-1">
                    <Link href={itemHref(i)} className="line-clamp-1 text-sm font-medium hover:text-primary hover:underline">{i.title}</Link>
                    <p className="truncate text-xs text-muted-foreground">{i.authors[0]}{i.authors.length > 1 ? ' et al.' : ''} · {i.year} · {REGION_META[i.region].label}</p>
                  </div>
                  <RequestAccessDialog item={i}><Button size="sm" variant="outline"><LockOpen /> Request</Button></RequestAccessDialog>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <section aria-labelledby="how-access" className="rounded-xl border bg-gradient-to-br from-primary/5 via-card to-card p-5 shadow-sm">
        <h2 id="how-access" className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-primary" aria-hidden /> How access works</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            { t: 'Tell us why', d: 'Explain your purpose and institution. Clear, specific requests are approved faster.' },
            { t: 'The owner reviews', d: 'The scientist who owns the data approves or declines, usually within a few working days (demo).' },
            { t: 'Download and cite', d: 'Approved items unlock on their page. Cite them with the DOI from the Citation manager.' },
          ].map((s, i) => (
            <li key={s.t} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
              <div><p className="text-sm font-medium">{s.t}</p><p className="text-xs leading-5 text-muted-foreground">{s.d}</p></div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

/* ================================ Citation manager ================================ */

type Fmt = 'apa' | 'bibtex' | 'ris';
const FORMAT: Record<Fmt, { label: string; fn: (i: ArchiveItem) => string; ext: string; mime: string; join: string }> = {
  apa: { label: 'APA', fn: toApa, ext: 'txt', mime: 'text/plain', join: '\n\n' },
  bibtex: { label: 'BibTeX', fn: toBibtex, ext: 'bib', mime: 'application/x-bibtex', join: '\n\n' },
  ris: { label: 'RIS', fn: toRis, ext: 'ris', mime: 'application/x-research-info-systems', join: '\n' },
};

export function Cite() {
  const { bookmarks, collections, recentlyViewed } = useUserStore();
  const source = new Map<string, string>();
  recentlyViewed.forEach((r) => source.set(r.ref.id, 'Recently viewed'));
  collections.forEach((c) => c.items.forEach((r) => source.set(r.id, c.name)));
  bookmarks.forEach((r) => source.set(r.id, 'Bookmarked'));
  const refs: SourceRef[] = [...bookmarks, ...collections.flatMap((c) => c.items), ...recentlyViewed.map((r) => r.ref)];
  const items = Array.from(new Map(refs.map((r) => [r.id, findRef(r)])).values()).filter((x): x is ArchiveItem => !!x);
  const [sel, setSel] = useState<string[]>([]);
  const [fmt, setFmt] = useState<Fmt>('apa');
  const [q, setQ] = useState('');
  const [type, setType] = useState<ContentType | 'all'>('all');
  const types = Array.from(new Set(items.map((i) => i.type)));
  const shown = items.filter((i) => (type === 'all' || i.type === type) && i.title.toLowerCase().includes(q.toLowerCase()));
  const chosen = items.filter((i) => sel.includes(i.id));
  const output = chosen.map(FORMAT[fmt].fn).join(FORMAT[fmt].join);
  const allShown = shown.length > 0 && shown.every((i) => sel.includes(i.id));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Kpi label="Items in your library" value={items.length} icon={BookOpenCheck} tone="sky" note="Bookmarks, collections and history" />
        <Kpi label="Selected" value={chosen.length} icon={Check} tone="teal" />
        <Kpi label="With a DOI" value={items.filter((i) => 'doi' in i && (i as { doi?: string }).doi).length} icon={Quote} tone="violet" note="Datasets and publications" />
      </div>

      {items.length === 0 ? (
        <EmptyState icon={<Quote className="h-6 w-6" />} title="Nothing to cite yet" description="Bookmark items or add them to collections first." action={<Button asChild><Link href="/data">Browse the Data catalogue</Link></Button>} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Panel
            id="cite-items"
            title="Your library"
            icon={BookOpenCheck}
            subtitle={`${shown.length} shown`}
            action={<Button size="sm" variant="outline" onClick={() => setSel(allShown ? sel.filter((id) => !shown.some((i) => i.id === id)) : Array.from(new Set([...sel, ...shown.map((i) => i.id)])))}>{allShown ? 'Clear' : 'Select all'}</Button>}
            bodyClassName="p-0"
          >
            <div className="space-y-2 border-b p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter your library…" aria-label="Filter your library" className="pl-9" />
              </div>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by type">
                {(['all', ...types] as (ContentType | 'all')[]).map((t) => (
                  <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)} className={cn('rounded-full border px-2.5 py-0.5 text-xs transition-colors hover:bg-muted', type === t && 'border-primary bg-primary/10 font-medium')}>
                    {t === 'all' ? 'All' : CONTENT_TYPE_LABELS[t].plural}
                  </button>
                ))}
              </div>
            </div>
            <ul className="max-h-[440px] divide-y overflow-y-auto">
              {shown.map((i) => (
                <li key={i.id} className={cn('flex items-center gap-3 px-4 py-3 transition-colors', sel.includes(i.id) && 'bg-primary/5')}>
                  <Checkbox id={`c-${i.id}`} checked={sel.includes(i.id)} onCheckedChange={(c) => setSel(c ? [...sel, i.id] : sel.filter((x) => x !== i.id))} />
                  <TypeBadge type={i.type} className="h-7 w-7" />
                  <label htmlFor={`c-${i.id}`} className="min-w-0 flex-1 cursor-pointer">
                    <span className="line-clamp-1 text-sm font-medium">{i.title}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{i.authors[0]}{i.authors.length > 1 ? ' et al.' : ''} · {i.year} · {source.get(i.id)}</span>
                  </label>
                </li>
              ))}
              {shown.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Nothing matches.</li>}
            </ul>
          </Panel>

          <Panel
            id="cite-out"
            title="Bibliography"
            icon={Quote}
            subtitle={chosen.length ? `${chosen.length} reference${chosen.length === 1 ? '' : 's'} in ${FORMAT[fmt].label}` : 'Select items to build a reference list'}
            action={
              <ToggleGroup type="single" value={fmt} onValueChange={(v) => v && setFmt(v as Fmt)} aria-label="Citation format">
                {(Object.keys(FORMAT) as Fmt[]).map((f) => <ToggleGroupItem key={f} value={f} className="h-7 text-xs">{FORMAT[f].label}</ToggleGroupItem>)}
              </ToggleGroup>
            }
          >
            {chosen.length === 0 ? (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed text-center">
                <Quote className="h-8 w-8 text-muted-foreground/60" aria-hidden />
                <p className="mt-2 text-sm font-medium">No references selected</p>
                <p className="text-xs text-muted-foreground">Tick items on the left to preview their citations here.</p>
              </div>
            ) : (
              <>
                <pre className="max-h-[380px] overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 font-mono text-xs leading-6" aria-live="polite">{output}</pre>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button onClick={() => copyText(output, `${chosen.length} citation(s) copied as ${FORMAT[fmt].label}`)}><Copy /> Copy</Button>
                  <Button variant="outline" onClick={() => { downloadTextFile(`references.${FORMAT[fmt].ext}`, output, FORMAT[fmt].mime); toast.success('Reference list downloaded'); }}><Download /> Download .{FORMAT[fmt].ext}</Button>
                </div>
              </>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}

/* ================================ API & dictionary ================================ */

type Lang = 'curl' | 'python' | 'r';
const API = 'https://api.dhruvshiksha.demo/v1';
const SNIPPETS: Record<Lang, { label: string; code: (key: string) => string }> = {
  curl: { label: 'cURL', code: (k) => `curl -H "Authorization: Bearer ${k}" \\\n  "${API}/datasets?region=antarctica&limit=20"` },
  python: { label: 'Python', code: (k) => `import requests\n\nr = requests.get(\n    "${API}/datasets",\n    params={"region": "antarctica", "limit": 20},\n    headers={"Authorization": "Bearer ${k}"},\n)\nfor d in r.json()["results"]:\n    print(d["doi"], d["title"])` },
  r: { label: 'R', code: (k) => `library(httr2)\n\nresp <- request("${API}/datasets") |>\n  req_url_query(region = "antarctica", limit = 20) |>\n  req_auth_bearer_token("${k}") |>\n  req_perform()\n\nstr(resp_body_json(resp)$results)` },
};
const ENDPOINTS = [
  { path: '/datasets', d: 'List datasets; filter by region, discipline, year' },
  { path: '/datasets/{id}', d: 'Metadata, variables and DOI for one dataset' },
  { path: '/datasets/{id}/rows', d: 'Sample rows (open and approved data only)' },
  { path: '/search?q=', d: 'Full-text search across the archive' },
  { path: '/reports', d: 'Expedition and technical reports' },
];

export function ApiKeys() {
  const { apiKeys, addApiKey, revokeApiKey } = useUserStore();
  const [label, setLabel] = useState('');
  const [lang, setLang] = useState<Lang>('python');
  const datasets = useMemo(() => publishedItems().filter((i): i is Dataset => i.type === 'dataset'), []);
  const rows = useMemo(() => datasets.flatMap((d) => d.variables.map((v) => ({ dataset: d.id, doi: d.doi, variable: v.name, unit: v.unit, type: v.dataType, description: v.description }))), [datasets]);
  const hrefOf = (id: string) => { const d = datasets.find((x) => x.id === id); return d ? itemHref(d) : '/data'; };
  const dictionary = () => {
    downloadTextFile('dhruvshiksha-data-dictionary-demo.csv', toCsv(rows), 'text/csv');
    toast.success('Data dictionary downloaded');
  };
  const code = SNIPPETS[lang].code(apiKeys[0]?.key.replace('…', '') ?? '<your-key>');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Kpi label="Active keys" value={apiKeys.length} icon={KeyRound} tone="amber" />
        <Kpi label="Datasets via API" value={datasets.length} icon={Database} tone="teal" note="Published and open to query" />
        <Kpi label="Variables documented" value={rows.length} icon={BookOpenCheck} tone="violet" note="In the data dictionary" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Panel id="keys" title="API keys" icon={KeyRound} subtitle="Demo keys: nothing leaves your browser">
          <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!label.trim()) return; addApiKey(label.trim()); setLabel(''); toast.success('Demo key created'); }}>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Key label, e.g. Jupyter notebook" aria-label="API key label" />
            <Button type="submit"><Plus /> Create</Button>
          </form>
          {apiKeys.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No keys yet. Create one to try the examples.</p>
          ) : (
            <ul className="space-y-2">
              {apiKeys.map((k) => (
                <li key={k.id} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-300"><KeyRound className="h-4 w-4" aria-hidden /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{k.label}</p>
                      <p className="text-[11px] text-muted-foreground">Created {shortDate(k.createdAt)} · read-only</p>
                    </div>
                    <Badge variant="success" className="shrink-0">Active</Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 truncate rounded-md bg-muted px-2 py-1 font-mono text-xs">{k.key}</code>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyText(k.key, 'Key copied')} aria-label={`Copy ${k.label} key`}><Copy /></Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-destructive" onClick={() => { revokeApiKey(k.id); toast.success('Key revoked'); }}>Revoke</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          id="quick"
          title="Quickstart"
          icon={Code2}
          subtitle="Query published datasets from your own tools"
          action={
            <ToggleGroup type="single" value={lang} onValueChange={(v) => v && setLang(v as Lang)} aria-label="Code language">
              {(Object.keys(SNIPPETS) as Lang[]).map((l) => <ToggleGroupItem key={l} value={l} className="h-7 text-xs">{SNIPPETS[l].label}</ToggleGroupItem>)}
            </ToggleGroup>
          }
        >
          <div className="relative">
            <pre className="overflow-x-auto rounded-lg bg-neutral-900 p-4 font-mono text-xs leading-6 text-neutral-100">{code}</pre>
            <Button size="sm" variant="secondary" className="absolute right-2 top-2 h-7 text-xs" onClick={() => copyText(code, 'Snippet copied')}><Copy /> Copy</Button>
          </div>
          <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Endpoints (demo, not live)</p>
          <ul className="divide-y rounded-lg border">
            {ENDPOINTS.map((e) => (
              <li key={e.path} className="flex flex-wrap items-center gap-3 px-3 py-2">
                <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-300">GET</span>
                <code className="font-mono text-xs">{e.path}</code>
                <span className="ml-auto text-xs text-muted-foreground">{e.d}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel id="dd" title="Data dictionary" icon={Database} subtitle={`${rows.length} variables across ${datasets.length} published datasets, in one CSV`} action={<Button size="sm" onClick={dictionary}><Download /> Download CSV</Button>} bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Data dictionary preview</caption>
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-5 py-2 font-medium">Variable</th>
                <th scope="col" className="px-3 py-2 font-medium">Unit</th>
                <th scope="col" className="px-3 py-2 font-medium">Type</th>
                <th scope="col" className="hidden px-3 py-2 font-medium md:table-cell">Dataset</th>
                <th scope="col" className="hidden px-3 py-2 font-medium lg:table-cell">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.slice(0, 6).map((r) => (
                <tr key={`${r.dataset}:${r.variable}`}>
                  <td className="px-5 py-2 font-mono text-xs">{r.variable}</td>
                  <td className="px-3 py-2 text-xs">{r.unit || '—'}</td>
                  <td className="px-3 py-2"><span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{r.type}</span></td>
                  <td className="hidden px-3 py-2 md:table-cell"><Link href={hrefOf(r.dataset)} className="font-mono text-xs text-primary hover:underline">{r.doi}</Link></td>
                  <td className="hidden max-w-xs truncate px-3 py-2 text-xs text-muted-foreground lg:table-cell">{r.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t px-5 py-2.5 text-xs text-muted-foreground">Showing 6 of {formatCompact(rows.length)} variables. <MoreLink href="/data">Browse the Data catalogue</MoreLink></p>
      </Panel>
    </div>
  );
}
