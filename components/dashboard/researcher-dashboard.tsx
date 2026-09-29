'use client';

import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { Bell, BellOff, Copy, Download, FolderPlus, KeyRound, Lock, Pencil, Search, Trash2 } from 'lucide-react';
import type { ArchiveItem, SourceRef } from '@/types';
import { DashHeader } from './shell';
import { useTabParam } from './use-tab';
import { SearchBox } from '@/components/search/search-box';
import { EmptyState } from '@/components/common';
import { RequestAccessDialog } from '@/components/archive/actions';
import { MyUploads } from '@/components/upload/my-uploads';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox, Switch } from '@/components/ui/misc';
import { TableSkeleton } from '@/components/skeletons';
import { useApi } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { findRef, itemHref, publishedItems } from '@/lib/archive';
import { toApa, toBibtex, toRis } from '@/lib/cite';
import { CONTENT_TYPE_LABELS } from '@/lib/constants';
import { useUserStore } from '@/store/user';
import { useAuthStore } from '@/store/auth';
import { downloadTextFile, toCsv } from '@/lib/utils';
import type { Dataset } from '@/types';

function Searches() {
  const { savedSearches, toggleSearchAlert, deleteSearch } = useUserStore();
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <p className="mb-2 text-sm font-medium">Advanced search</p>
        <SearchBox size="md" />
        <p className="mt-2 text-xs text-muted-foreground">Use filters on the Explore page, then “Save search” to track new matches.</p>
      </div>
      {savedSearches.length === 0 ? <EmptyState title="No saved searches" /> : (
        <ul className="space-y-2">
          {savedSearches.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
              <Search className="h-4 w-4 text-primary" aria-hidden />
              <Link href={`/explore?q=${encodeURIComponent(s.query)}${s.filters ? `&${s.filters}` : ''}`} className="flex-1 font-medium hover:underline">{s.query}</Link>
              <span className="text-xs text-muted-foreground">saved {s.createdAt}</span>
              <label className="flex items-center gap-2 text-sm">
                {s.alerts ? <Bell className="h-4 w-4 text-primary" aria-hidden /> : <BellOff className="h-4 w-4 text-muted-foreground" aria-hidden />}
                Email alerts
                <Switch checked={s.alerts} onCheckedChange={() => { toggleSearchAlert(s.id); toast.success(`Alerts ${s.alerts ? 'off' : 'on'} (demo)`); }} aria-label={`Email alerts for ${s.query}`} />
              </label>
              <Button variant="ghost" size="icon" onClick={() => deleteSearch(s.id)} aria-label={`Delete saved search ${s.query}`}><Trash2 /></Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Collections() {
  const { collections, createCollection, renameCollection, deleteCollection, toggleInCollection } = useUserStore();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  return (
    <div className="space-y-4">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; createCollection(name.trim()); setName(''); toast.success('Collection created'); }}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New collection name" aria-label="New collection name" />
        <Button type="submit"><FolderPlus /> Create</Button>
      </form>
      {collections.length === 0 ? <EmptyState title="No collections yet" description="Use the folder button next to Bookmark on any item." /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {collections.map((c) => (
            <div key={c.id} className="rounded-lg border bg-card p-4">
              <div className="mb-2 flex items-center gap-2">
                {editing === c.id ? (
                  <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); renameCollection(c.id, draft); setEditing(null); }}>
                    <Input value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Collection name" className="h-8" autoFocus />
                    <Button size="sm" type="submit">Save</Button>
                  </form>
                ) : (
                  <>
                    <p className="flex-1 font-semibold">{c.name} <span className="text-xs font-normal text-muted-foreground">({c.items.length})</span></p>
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(c.id); setDraft(c.name); }} aria-label={`Rename ${c.name}`}><Pencil /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteCollection(c.id)} aria-label={`Delete ${c.name}`}><Trash2 /></Button>
                  </>
                )}
              </div>
              <ul className="space-y-1 text-sm">
                {c.items.length === 0 && <li className="text-muted-foreground">Empty — add items from any detail page.</li>}
                {c.items.map((r) => {
                  const it = findRef(r);
                  return it ? (
                    <li key={r.id} className="flex items-center gap-2">
                      <Badge variant="secondary">{CONTENT_TYPE_LABELS[it.type].singular}</Badge>
                      <Link href={itemHref(it)} className="line-clamp-1 flex-1 hover:underline">{it.title}</Link>
                      <button type="button" onClick={() => toggleInCollection(c.id, r)} className="text-xs text-muted-foreground hover:text-destructive" aria-label={`Remove ${it.title}`}>Remove</button>
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Access() {
  const user = useAuthStore((s) => s.user)!;
  const { data, isPending } = useApi(['access'], api.getAccessRequests);
  const mine = (data ?? []).filter((r) => r.requesterId === user.id);
  const restricted = publishedItems().filter((i) => i.accessLevel === 'restricted' && !mine.some((m) => m.itemId === i.id && m.status !== 'declined'));
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section aria-labelledby="my-req">
        <h2 id="my-req" className="mb-3 font-semibold">My requests</h2>
        {isPending ? <TableSkeleton rows={3} cols={3} /> : mine.length === 0 ? <EmptyState title="No requests yet" /> : (
          <ul className="space-y-2">
            {mine.map((r) => (
              <li key={r.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === 'approved' ? 'success' : r.status === 'declined' ? 'destructive' : 'warning'} className="capitalize">{r.status}</Badge>
                  <Link href={CONTENT_TYPE_LABELS[r.itemType].href(r.itemId)} className="line-clamp-1 flex-1 text-sm font-medium hover:underline">{r.itemTitle}</Link>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Requested {new Date(r.createdAt).toLocaleDateString('en-IN')}{r.decidedAt ? ` · decided ${new Date(r.decidedAt).toLocaleDateString('en-IN')}` : ''}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="new-req">
        <h2 id="new-req" className="mb-3 font-semibold">Request access to restricted items</h2>
        <ul className="space-y-2">
          {restricted.map((i) => (
            <li key={i.id} className="flex items-center gap-2 rounded-lg border bg-card p-3">
              <Lock className="h-4 w-4 text-destructive" aria-hidden />
              <Link href={itemHref(i)} className="line-clamp-1 flex-1 text-sm hover:underline">{i.title}</Link>
              <RequestAccessDialog item={i}><Button size="sm">Request</Button></RequestAccessDialog>
            </li>
          ))}
          {restricted.length === 0 && <li><EmptyState title="All restricted items requested" /></li>}
        </ul>
      </section>
    </div>
  );
}

function Cite() {
  const { bookmarks, collections, recentlyViewed } = useUserStore();
  const refs: SourceRef[] = [...bookmarks, ...collections.flatMap((c) => c.items), ...recentlyViewed.map((r) => r.ref)];
  const items = Array.from(new Map(refs.map((r) => [r.id, findRef(r)])).values()).filter((x): x is ArchiveItem => !!x);
  const [sel, setSel] = useState<string[]>([]);
  const chosen = items.filter((i) => sel.includes(i.id));
  const copy = async (fmt: 'apa' | 'bibtex' | 'ris') => {
    const f = fmt === 'apa' ? toApa : fmt === 'bibtex' ? toBibtex : toRis;
    await navigator.clipboard?.writeText(chosen.map(f).join('\n\n'));
    toast.success(`${chosen.length} citation(s) copied as ${fmt.toUpperCase()}`);
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setSel(sel.length === items.length ? [] : items.map((i) => i.id))}>{sel.length === items.length && items.length ? 'Clear all' : 'Select all'}</Button>
        <span className="text-sm text-muted-foreground">{chosen.length} selected</span>
        <div className="ml-auto flex gap-2">
          {(['apa', 'bibtex', 'ris'] as const).map((f) => <Button key={f} size="sm" disabled={!chosen.length} onClick={() => copy(f)}><Copy /> {f === 'apa' ? 'APA' : f === 'bibtex' ? 'BibTeX' : 'RIS'}</Button>)}
        </div>
      </div>
      {items.length === 0 ? <EmptyState title="Nothing to cite yet" description="Bookmark items or add them to collections first." /> : (
        <ul className="divide-y rounded-lg border bg-card">
          {items.map((i) => (
            <li key={i.id} className="flex items-center gap-3 p-3">
              <Checkbox id={`c-${i.id}`} checked={sel.includes(i.id)} onCheckedChange={(c) => setSel(c ? [...sel, i.id] : sel.filter((x) => x !== i.id))} />
              <label htmlFor={`c-${i.id}`} className="flex-1 text-sm"><Badge variant="secondary" className="mr-2">{CONTENT_TYPE_LABELS[i.type].singular}</Badge>{i.title}</label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ApiKeys() {
  const { apiKeys, addApiKey, revokeApiKey } = useUserStore();
  const [label, setLabel] = useState('');
  const dictionary = () => {
    const rows = publishedItems().filter((i): i is Dataset => i.type === 'dataset').flatMap((d) => d.variables.map((v) => ({ dataset: d.id, doi: d.doi, variable: v.name, unit: v.unit, type: v.dataType, description: v.description })));
    downloadTextFile('polarverse-data-dictionary-demo.csv', toCsv(rows), 'text/csv');
    toast.success('Data dictionary downloaded');
  };
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-lg border bg-card p-5" aria-labelledby="keys">
        <h2 id="keys" className="mb-3 flex items-center gap-2 font-semibold"><KeyRound className="h-4 w-4 text-primary" aria-hidden /> API keys (demo)</h2>
        <form className="mb-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!label.trim()) return; addApiKey(label.trim()); setLabel(''); toast.success('Demo key created'); }}>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Key label, e.g. Jupyter notebook" aria-label="API key label" />
          <Button type="submit">Create</Button>
        </form>
        <ul className="space-y-2">
          {apiKeys.map((k) => (
            <li key={k.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
              <span className="flex-1">{k.label}<span className="block font-mono text-xs text-muted-foreground">{k.key}</span></span>
              <Button size="sm" variant="ghost" onClick={() => revokeApiKey(k.id)}>Revoke</Button>
            </li>
          ))}
        </ul>
        <pre className="mt-4 overflow-x-auto rounded-md bg-muted p-3 text-xs">{`GET https://api.polarverse.demo/v1/datasets?region=antarctica\nAuthorization: Bearer <your-key>\n# Demo only — this endpoint does not exist.`}</pre>
      </section>
      <section className="rounded-lg border bg-card p-5" aria-labelledby="dd">
        <h2 id="dd" className="mb-2 font-semibold">Data dictionary</h2>
        <p className="text-sm text-muted-foreground">All variables across published datasets in one CSV.</p>
        <Button className="mt-3" onClick={dictionary}><Download /> Download data dictionary</Button>
      </section>
    </div>
  );
}

function Overview() {
  const { recentlyViewed, savedSearches, collections } = useUserStore();
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-4"><SearchBox size="md" /></div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4"><p className="text-sm text-muted-foreground">Saved searches</p><p className="text-2xl font-semibold">{savedSearches.length}</p></div>
        <div className="rounded-lg border bg-card p-4"><p className="text-sm text-muted-foreground">Collections</p><p className="text-2xl font-semibold">{collections.length}</p></div>
        <div className="rounded-lg border bg-card p-4"><p className="text-sm text-muted-foreground">Recently viewed</p><p className="text-2xl font-semibold">{recentlyViewed.length}</p></div>
      </div>
      <MyUploads />
      <section aria-labelledby="recent">
        <h2 id="recent" className="mb-3 font-semibold">Recently viewed</h2>
        {recentlyViewed.length === 0 ? <EmptyState title="Nothing viewed yet" description="Open a dataset or report and it will show up here." action={<Button asChild><Link href="/data">Browse datasets</Link></Button>} /> : (
          <ul className="divide-y rounded-lg border bg-card">
            {recentlyViewed.slice(0, 10).map((r) => (
              <li key={r.ref.id} className="flex items-center gap-2 p-3 text-sm">
                <Badge variant="secondary">{CONTENT_TYPE_LABELS[r.ref.type].singular}</Badge>
                <Link href={CONTENT_TYPE_LABELS[r.ref.type].href(r.ref.id)} className="flex-1 hover:underline">{r.title}</Link>
                <span className="text-xs text-muted-foreground">{new Date(r.at).toLocaleString('en-IN')}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function ResearcherDashboard() {
  const [tab, setTab] = useTabParam('overview');
  return (
    <>
      <DashHeader title="Researcher workspace" description="Search, collect, request and cite archive data, and upload your own work for review." />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {[['overview', 'Overview'], ['searches', 'Saved searches'], ['collections', 'Collections'], ['access', 'Access requests'], ['cite', 'Citation manager'], ['api', 'API & dictionary']].map(([v, l]) => <TabsTrigger key={v} value={v}>{l}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="overview"><Overview /></TabsContent>
        <TabsContent value="searches"><Searches /></TabsContent>
        <TabsContent value="collections"><Collections /></TabsContent>
        <TabsContent value="access"><Access /></TabsContent>
        <TabsContent value="cite"><Cite /></TabsContent>
        <TabsContent value="api"><ApiKeys /></TabsContent>
      </Tabs>
    </>
  );
}
