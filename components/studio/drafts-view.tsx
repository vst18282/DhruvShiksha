'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Copy, PenSquare, Search, Trash2 } from 'lucide-react';
import type { PlatformId, SocialPost, Status } from '@/types';
import { AiBadge, EmptyState, StatusBadge } from '@/components/common';
import { DataTable } from '@/components/common/client';
import { PlatformIcon } from './platform-icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableSkeleton } from '@/components/skeletons';
import { useApi, useInvalidate } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { LANGUAGES, PLATFORM_META, STATUS_META } from '@/lib/constants';
import { useAuthStore } from '@/store/auth';

export function DraftsView() {
  const user = useAuthStore((s) => s.user)!;
  const { data, isPending } = useApi(['posts'], api.getPosts);
  const invalidate = useInvalidate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<Status | 'all'>('all');
  const [platform, setPlatform] = useState<PlatformId | 'all'>('all');
  const [mine, setMine] = useState(user.role === 'scientist' ? 'mine' : 'all');
  const rows = useMemo(
    () => (data ?? []).filter((p) => (status === 'all' || p.status === status) && (platform === 'all' || p.platforms.includes(platform)) && (mine === 'all' || p.createdBy === user.name) && `${p.title} ${p.text}`.toLowerCase().includes(q.toLowerCase())),
    [data, status, platform, mine, q, user.name],
  );
  const dup = async (p: SocialPost) => {
    await api.savePost({ ...p, id: `post-${Date.now().toString(36)}`, title: `${p.title} (copy)`, status: 'draft', comments: [], scheduledAt: undefined, publishedAt: undefined, metrics: undefined, createdBy: user.name, createdByRole: user.role, createdAt: new Date().toISOString() });
    invalidate([['posts']]);
    toast.success('Duplicated');
  };
  const del = async (p: SocialPost) => {
    await api.deletePost(p.id);
    invalidate([['posts']]);
    toast.success('Deleted');
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search posts…" aria-label="Search posts" className="pl-9" />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as Status | 'all')}>
          <SelectTrigger className="w-44" aria-label="Status"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All statuses</SelectItem>{(Object.keys(STATUS_META) as Status[]).map((s) => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={platform} onValueChange={(v) => setPlatform(v as PlatformId | 'all')}>
          <SelectTrigger className="w-40" aria-label="Platform"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All platforms</SelectItem>{(Object.keys(PLATFORM_META) as PlatformId[]).map((p) => <SelectItem key={p} value={p}>{PLATFORM_META[p].label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={mine} onValueChange={setMine}>
          <SelectTrigger className="w-36" aria-label="Author"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Everyone</SelectItem><SelectItem value="mine">My posts</SelectItem></SelectContent>
        </Select>
        <Button asChild><Link href="/studio"><PenSquare /> New</Link></Button>
      </div>
      {isPending ? <TableSkeleton /> : rows.length === 0 ? <EmptyState title="No posts match" /> : (
        <DataTable
          caption="Posts and drafts"
          rowKey={(p) => p.id}
          rows={rows}
          columns={[
            { key: 'title', header: 'Title', sortValue: (p) => p.title, cell: (p) => <div><Link href={`/studio?post=${p.id}`} className="font-medium hover:text-primary hover:underline">{p.title}</Link><div className="mt-0.5 flex items-center gap-1.5">{p.aiGenerated && <AiBadge label="AI" className="py-0" />}<span className="text-xs text-muted-foreground">{p.outputType}</span></div></div> },
            { key: 'status', header: 'Status', sortValue: (p) => p.status, cell: (p) => <StatusBadge status={p.status} /> },
            { key: 'platforms', header: 'Platforms', cell: (p) => <span className="flex gap-1">{p.platforms.map((pl) => <PlatformIcon key={pl} id={pl} />)}</span> },
            { key: 'lang', header: 'Language', cell: (p) => LANGUAGES.find((l) => l.code === p.language)?.label, className: 'hidden md:table-cell' },
            { key: 'by', header: 'Author', sortValue: (p) => p.createdBy, cell: (p) => p.createdBy, className: 'hidden lg:table-cell' },
            { key: 'upd', header: 'Updated', sortValue: (p) => p.updatedAt, cell: (p) => new Date(p.updatedAt).toLocaleDateString('en-IN'), className: 'hidden md:table-cell' },
            {
              key: 'act', header: 'Actions', cell: (p) => (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => dup(p)} aria-label={`Duplicate ${p.title}`}><Copy /></Button>
                  {(p.createdBy === user.name || user.role !== 'scientist') && p.status !== 'published' && <Button size="icon" variant="ghost" onClick={() => del(p)} aria-label={`Delete ${p.title}`}><Trash2 /></Button>}
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
