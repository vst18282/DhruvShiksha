'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Database, Download, Eye, Plus, Search } from 'lucide-react';
import type { Dataset } from '@/types';
import { AccessBadge, EmptyState } from '@/components/common';
import { DataTable } from '@/components/common/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useApi } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { allItems, itemHref } from '@/lib/archive';
import { REGION_META } from '@/lib/constants';
import { useAuthStore } from '@/store/auth';
import { useDataStore } from '@/store/data';
import { formatCompact } from '@/lib/utils';

const dateOf = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** "My drafts › Published to Data": everything the scientist has in the Data catalogue. */
export function MyDataItems() {
  const user = useAuthStore((s) => s.user)!;
  const uploads = useDataStore((s) => s.uploads);
  const patches = useDataStore((s) => s.patches);
  // Keeps the list in step with the catalogue cache after a new publish.
  const catalogue = useApi(['datasets'], api.getDatasets);
  const [q, setQ] = useState('');

  const items = useMemo(
    () =>
      allItems()
        .filter((i): i is Dataset => i.type === 'dataset' && i.ownerId === user.id && i.status === 'published')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user.id, uploads, patches, catalogue.data],
  );
  const rows = items.filter((i) => `${i.title} ${i.tags.join(' ')} ${i.format}`.toLowerCase().includes(q.toLowerCase()));
  const views = items.reduce((a, i) => a + i.views, 0);
  const downloads = items.reduce((a, i) => a + i.downloads, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Published to Data</h1>
          <p className="mt-1 text-sm text-muted-foreground">Everything of yours that is live in the Data catalogue. These went in directly, without approval.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/scientist/publish"><Plus /> Publish to Data</Link>
        </Button>
      </div>

      <dl className="grid grid-cols-3 gap-3">
        {[
          { label: 'Entries', value: items.length, icon: Database },
          { label: 'Views', value: views, icon: Eye },
          { label: 'Downloads', value: downloads, icon: Download },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-xl border bg-card p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><s.icon className="h-4 w-4" aria-hidden /></span>
            <div>
              <dt className="text-xs text-muted-foreground">{s.label}</dt>
              <dd className="text-lg font-semibold tabular-nums">{formatCompact(s.value)}</dd>
            </div>
          </div>
        ))}
      </dl>

      {items.length === 0 ? (
        <EmptyState
          icon={<Database className="h-6 w-6" />}
          title="Nothing in the Data catalogue yet"
          description="Publish a dataset, report or sound recording and it will be listed here."
          action={<Button asChild><Link href="/dashboard/scientist/publish">Publish to Data</Link></Button>}
        />
      ) : (
        <>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search my Data entries…" aria-label="Search my Data entries" className="pl-9" />
          </div>
          <DataTable
            caption="My entries in the Data catalogue"
            rowKey={(i) => i.id}
            rows={rows}
            pageSize={10}
            columns={[
              {
                key: 'title', header: 'Title', sortValue: (i) => i.title,
                cell: (i) => (
                  <div className="min-w-0">
                    <Link href={itemHref(i)} className="font-medium hover:text-primary hover:underline">{i.title}</Link>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{REGION_META[i.region].label}</span>
                      {i.userCreated && <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">Added by you</Badge>}
                    </div>
                  </div>
                ),
              },
              { key: 'format', header: 'Format', sortValue: (i) => i.format, cell: (i) => <span className="font-mono text-xs">{i.format}</span>, className: 'hidden sm:table-cell' },
              { key: 'access', header: 'Access', cell: (i) => <AccessBadge level={i.accessLevel} />, className: 'hidden md:table-cell' },
              { key: 'added', header: 'Added', sortValue: (i) => i.createdAt, cell: (i) => dateOf(i.createdAt), className: 'hidden lg:table-cell' },
              { key: 'views', header: 'Views', sortValue: (i) => i.views, cell: (i) => <span className="tabular-nums">{formatCompact(i.views)}</span> },
              { key: 'dl', header: 'Downloads', sortValue: (i) => i.downloads, cell: (i) => <span className="tabular-nums">{formatCompact(i.downloads)}</span>, className: 'hidden sm:table-cell' },
            ]}
          />
        </>
      )}
    </div>
  );
}
