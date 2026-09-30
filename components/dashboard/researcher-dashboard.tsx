'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  Bell,
  Bookmark,
  BookMarked,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Compass,
  Database,
  FileText,
  FolderOpen,
  History,
  Lock,
  Search,
  Send,
  Sparkles,
  Upload,
} from 'lucide-react';
import type { ArchiveItem, Dataset } from '@/types';
import { DashHeader } from './shell';
import { WelcomePanel } from './welcome-panel';
import { Kpi, MoreLink, Panel, TypeBadge, shortDate } from './researcher-ui';
import { Access, ApiKeys, Cite, Collections, Searches } from './researcher-sections';
import { AccessBadge, EmptyState, StatusBadge } from '@/components/common';
import { SubmitUploadButton } from '@/components/upload/my-uploads';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useApi } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { allItems, itemHref, publishedItems } from '@/lib/archive';
import { CONTENT_TYPE_LABELS, REGION_META } from '@/lib/constants';
import { useCan } from '@/lib/permissions';
import { useUserStore } from '@/store/user';
import { useAuthStore } from '@/store/auth';
import { useDataStore } from '@/store/data';
import { cn } from '@/lib/utils';

type Section = 'overview' | 'searches' | 'collections' | 'access' | 'cite' | 'api';

const SECTIONS: Record<Section, { title: string; description: string }> = {
  overview: { title: 'Researcher workspace', description: 'Search, collect, request and cite archive data, and submit your own work for review.' },
  searches: { title: 'Saved searches', description: 'Queries you track, with live match counts and alerts.' },
  collections: { title: 'Collections', description: 'Reading lists and data bundles for your projects.' },
  access: { title: 'Access requests', description: 'Ask data owners for restricted items and follow each request.' },
  cite: { title: 'Citation manager', description: 'Build a reference list from your library in APA, BibTeX or RIS.' },
  api: { title: 'API keys & data dictionary', description: 'Query published datasets from your own tools.' },
};

/** Draft → review → live: how a researcher submission moves through the portal. */
const FLOW = [
  { icon: Upload, title: 'Upload', text: 'Report, dataset, publication, photo or video' },
  { icon: ClipboardCheck, title: 'Review', text: 'A content manager or admin checks it' },
  { icon: CheckCircle2, title: 'Published', text: 'Live in the archive for everyone' },
];

function Overview() {
  const user = useAuthStore((s) => s.user)!;
  const { can } = useCan();
  const { recentlyViewed, savedSearches, collections, bookmarks } = useUserStore();
  const uploads = useDataStore((s) => s.uploads);
  const patches = useDataStore((s) => s.patches);
  const requests = useApi(['access'], api.getAccessRequests);
  const mine = useMemo<ArchiveItem[]>(
    () => allItems().filter((i) => i.ownerId === user.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    // allItems() is memoised on these store references
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user.id, uploads, patches],
  );
  const myReq = (requests.data ?? []).filter((r) => r.requesterId === user.id);
  const collected = new Set(collections.flatMap((c) => c.items.map((i) => i.id)));
  const interests = new Set(collections.flatMap((c) => c.items).map((r) => allItems().find((i) => i.id === r.id)?.discipline).filter(Boolean));
  const recommended = useMemo(
    () =>
      publishedItems()
        .filter((i): i is Dataset => i.type === 'dataset' && !collected.has(i.id))
        .sort((a, b) => Number(interests.has(b.discipline)) - Number(interests.has(a.discipline)) || b.downloads - a.downloads)
        .slice(0, 4),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collections],
  );
  const fresh = useMemo(() => publishedItems().filter((i) => ['dataset', 'publication', 'report'].includes(i.type)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5), []);
  const count = (s: ArchiveItem['status']) => mine.filter((i) => i.status === s).length;
  const collectedItems = collections.reduce((n, c) => n + c.items.length, 0);

  return (
    <div className="space-y-6">
      <WelcomePanel
        eyebrow="Research desk"
        name={user.name.split(' ').slice(0, 2).join(' ')}
        subtitle={`${user.org} · ${user.affiliation === 'external' ? 'Partner researcher' : 'NCPOR researcher'}`}
        links={[
          { href: '/data', label: 'Data catalogue', icon: Database },
          { href: '/publications', label: 'Publications', icon: BookMarked },
          { href: '/reports', label: 'Reports', icon: FileText },
          { href: '/explore', label: 'Explore', icon: Compass },
        ]}
        searchPlaceholder="Search datasets, reports and publications…"
        tip="Tip: save any search from Explore to get alerts when new items match."
        className="mb-0"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi label="Saved searches" value={savedSearches.length} icon={Search} tone="sky" note={`${savedSearches.filter((s) => s.alerts).length} with alerts`} href="/dashboard/researcher?tab=searches" />
        <Kpi label="Collections" value={collections.length} icon={FolderOpen} tone="violet" note={`${collectedItems} items collected`} href="/dashboard/researcher?tab=collections" />
        <Kpi label="Access requests" value={myReq.length} icon={Lock} tone="amber" note={`${myReq.filter((r) => r.status === 'pending').length} pending`} href="/dashboard/researcher?tab=access" />
        <Kpi label="Bookmarks" value={bookmarks.length} icon={Bookmark} tone="rose" note="Across the archive" href="/dashboard/researcher?tab=cite" />
        <Kpi label="My submissions" value={mine.length} icon={Send} tone="teal" note={`${count('in_review')} in review`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {can('upload') && (
          <Panel id="submit" title="Submit your work" icon={Upload} subtitle="Every submission is reviewed before it goes live" action={<Button size="sm" asChild><Link href="/upload"><Upload /> Upload for review</Link></Button>}>
            <ol className="grid grid-cols-3 gap-2" aria-label="Review flow">
              {FLOW.map((s, i) => (
                <li key={s.title} className="relative rounded-lg border bg-muted/30 p-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><s.icon className="h-4 w-4" aria-hidden /></span>
                  <p className="mt-2 text-sm font-semibold">{i + 1}. {s.title}</p>
                  <p className="text-[11px] leading-4 text-muted-foreground">{s.text}</p>
                </li>
              ))}
            </ol>
            <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
              {([['draft', 'Drafts'], ['in_review', 'In review'], ['changes_requested', 'Changes'], ['published', 'Published']] as const).map(([s, l]) => (
                <div key={s} className="flex flex-col-reverse rounded-lg border py-2">
                  <dt className="text-[11px] text-muted-foreground">{l}</dt>
                  <dd className="text-lg font-semibold tabular-nums">{count(s)}</dd>
                </div>
              ))}
            </dl>
            {mine.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Nothing submitted yet. Your uploads and their review status appear here.</p>
            ) : (
              <ul className="mt-4 divide-y">
                {mine.slice(0, 4).map((i) => (
                  <li key={i.id} className="flex items-center gap-3 py-2.5">
                    <TypeBadge type={i.type} />
                    <span className="min-w-0 flex-1">
                      <Link href={itemHref(i)} className="line-clamp-1 text-sm font-medium hover:text-primary hover:underline">{i.title}</Link>
                      <span className="text-[11px] text-muted-foreground">{CONTENT_TYPE_LABELS[i.type].singular} · updated {shortDate(i.updatedAt)}</span>
                    </span>
                    <StatusBadge status={i.status} />
                    <SubmitUploadButton item={i} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        <Panel id="rec" title="Recommended datasets" icon={Sparkles} subtitle={interests.size ? 'Based on your collections, then most downloaded' : 'Most downloaded in the catalogue'} action={<MoreLink href="/data">Data catalogue</MoreLink>} className={cn(!can('upload') && 'xl:col-span-2')}>
          <ul className="grid gap-3 sm:grid-cols-2">
            {recommended.map((d) => (
              <li key={d.id}>
                <Link href={itemHref(d)} className="group flex h-full flex-col rounded-lg border p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md motion-reduce:hover:translate-y-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: REGION_META[d.region].color, background: `${REGION_META[d.region].color}1a` }}>{REGION_META[d.region].label}</span>
                    <AccessBadge level={d.accessLevel} />
                  </div>
                  <p className="mt-3 line-clamp-2 font-medium leading-snug group-hover:text-primary">{d.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{d.summary}</p>
                  <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-[11px] text-muted-foreground">
                    <span className="font-mono">{d.format}</span>
                    <span>{d.sizeMb} MB</span>
                    <span>{d.variables.length} variables</span>
                    <span className="ml-auto inline-flex items-center gap-1 font-medium text-primary">Open <ArrowRight className="h-3 w-3" aria-hidden /></span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Panel id="recent" title="Recently viewed" icon={History} subtitle="Pick up where you left off">
          {recentlyViewed.length === 0 ? (
            <EmptyState title="Nothing viewed yet" description="Open a dataset or report and it will show up here." action={<Button size="sm" asChild><Link href="/data">Browse datasets</Link></Button>} />
          ) : (
            <ol className="relative space-y-3 border-l pl-4">
              {recentlyViewed.slice(0, 6).map((r) => (
                <li key={r.ref.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-primary" aria-hidden />
                  <Link href={CONTENT_TYPE_LABELS[r.ref.type].href(r.ref.id)} className="line-clamp-1 text-sm font-medium hover:text-primary hover:underline">{r.title}</Link>
                  <p className="text-[11px] text-muted-foreground">{CONTENT_TYPE_LABELS[r.ref.type].singular} · {new Date(r.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel id="fresh" title="New in the archive" icon={Bell} subtitle="Latest datasets, reports and publications">
          <ul className="space-y-3">
            {fresh.map((i) => (
              <li key={i.id} className="flex items-start gap-3">
                <TypeBadge type={i.type} />
                <div className="min-w-0 flex-1">
                  <Link href={itemHref(i)} className="line-clamp-1 text-sm font-medium hover:text-primary hover:underline">{i.title}</Link>
                  <p className="truncate text-[11px] text-muted-foreground">{CONTENT_TYPE_LABELS[i.type].singular} · {i.authors[0]} · {i.year}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel id="req-snap" title="Access requests" icon={Lock} subtitle="Restricted data you asked for" action={<MoreLink href="/dashboard/researcher?tab=access">Manage</MoreLink>} className="lg:col-span-2 xl:col-span-1">
          {myReq.length === 0 ? (
            <EmptyState title="No requests yet" action={<Button size="sm" variant="outline" asChild><Link href="/dashboard/researcher?tab=access">Request access</Link></Button>} />
          ) : (
            <ul className="space-y-2">
              {myReq.slice(0, 4).map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                  <TypeBadge type={r.itemType} className="h-7 w-7" />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 text-sm font-medium">{r.itemTitle}</span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="h-3 w-3" aria-hidden /> {shortDate(r.createdAt)}</span>
                  </span>
                  <Badge variant={r.status === 'approved' ? 'success' : r.status === 'declined' ? 'destructive' : 'warning'} className="shrink-0 capitalize">{r.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

/**
 * Researcher workspace. Each sidebar link (?tab=) opens one section on its own, so there is no
 * in-page tab strip.
 */
export function ResearcherDashboard() {
  const tab = useSearchParams().get('tab');
  const section: Section = tab && tab in SECTIONS ? (tab as Section) : 'overview';
  const meta = SECTIONS[section];
  return (
    <>
      {section !== 'overview' && <DashHeader title={meta.title} description={meta.description} />}
      {section === 'overview' && <Overview />}
      {section === 'searches' && <Searches />}
      {section === 'collections' && <Collections />}
      {section === 'access' && <Access />}
      {section === 'cite' && <Cite />}
      {section === 'api' && <ApiKeys />}
    </>
  );
}
