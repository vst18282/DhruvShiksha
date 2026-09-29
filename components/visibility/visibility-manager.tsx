'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Eye, Search } from 'lucide-react';
import type { Audience } from '@/types';
import { DataTable } from '@/components/common/client';
import { VisibilityControl } from '@/components/common/visibility-control';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TableSkeleton } from '@/components/skeletons';
import { useApi, useInvalidate } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { allItems } from '@/lib/archive';
import { CONTENT_TYPE_LABELS } from '@/lib/constants';
import { isPublicToAll, visibilityLabel } from '@/lib/visibility';
import { useDataStore } from '@/store/data';

interface Row {
  kind: 'item' | 'post';
  id: string;
  title: string;
  type: string;
  visibleTo?: Audience[];
}

/** Per-role visibility for published content and posts (content managers and admins). */
export function VisibilityManager() {
  const posts = useApi(['posts'], api.getPosts);
  const patches = useDataStore((s) => s.patches);
  const uploads = useDataStore((s) => s.uploads);
  const invalidate = useInvalidate();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'all' | 'item' | 'post' | 'limited'>('all');
  const [edit, setEdit] = useState<Row | null>(null);

  const rows = useMemo<Row[]>(() => {
    const items = allItems()
      .filter((i) => i.status === 'published')
      .map((i): Row => ({ kind: 'item', id: i.id, title: i.title, type: CONTENT_TYPE_LABELS[i.type].singular, visibleTo: i.visibleTo }));
    const ps = (posts.data ?? []).filter((p) => p.status === 'published').map((p): Row => ({ kind: 'post', id: p.id, title: p.title, type: 'Post', visibleTo: p.visibleTo }));
    return [...ps, ...items];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts.data, patches, uploads]);
  const shown = rows.filter((r) => (kind === 'all' || (kind === 'limited' ? !isPublicToAll(r) : r.kind === kind)) && r.title.toLowerCase().includes(q.toLowerCase()));
  const current = edit ? rows.find((r) => r.id === edit.id) ?? edit : null;

  const save = async (r: Row, v: Audience[] | undefined) => {
    if (r.kind === 'item') await api.patchItem(r.id, { visibleTo: v, updatedAt: new Date().toISOString() });
    else await api.setPostVisibility(r.id, v);
    invalidate([['posts'], ['feed'], ['audit'], ['item', r.id], ['search']]);
    toast.success(`Visible to: ${visibilityLabel(v)}`, { description: r.title });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Everything is visible to everyone by default. Limit an item or post to specific roles; content managers and admins always see all content.</p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search published content…" aria-label="Search content" className="pl-9" />
        </div>
        <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
          <SelectTrigger className="w-48" aria-label="Show">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Posts & archive items</SelectItem>
            <SelectItem value="post">Posts</SelectItem>
            <SelectItem value="item">Archive items</SelectItem>
            <SelectItem value="limited">Only limited visibility</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {posts.isPending ? (
        <TableSkeleton />
      ) : (
        <DataTable
          caption="Content visibility"
          rowKey={(r) => `${r.kind}:${r.id}`}
          rows={shown}
          onRowClick={setEdit}
          rowLabel={(r) => `Change who can see ${r.title}`}
          columns={[
            { key: 'title', header: 'Content', sortValue: (r) => r.title, cell: (r) => <span className="line-clamp-1 font-medium">{r.title}</span> },
            { key: 'type', header: 'Type', sortValue: (r) => r.type, cell: (r) => r.type, className: 'hidden sm:table-cell' },
            { key: 'vis', header: 'Visible to', sortValue: (r) => visibilityLabel(r.visibleTo), cell: (r) => <Badge variant={isPublicToAll(r) ? 'secondary' : 'warning'}>{visibilityLabel(r.visibleTo)}</Badge> },
            {
              key: 'act',
              header: '',
              cell: (r) => (
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEdit(r); }} aria-label={`Change visibility of ${r.title}`}>
                  <Eye /> Change
                </Button>
              ),
            },
          ]}
        />
      )}
      <Dialog open={!!current} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Who can see this?</DialogTitle>
            <DialogDescription className="line-clamp-2">{current?.title}</DialogDescription>
          </DialogHeader>
          {current && <VisibilityControl key={current.id} id="vm-vis" value={current.visibleTo} onChange={(v) => save(current, v)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
