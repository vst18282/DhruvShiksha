'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { Rocket, Send, Upload } from 'lucide-react';
import type { ArchiveItem } from '@/types';
import { AccessBadge, EmptyState, StatusBadge } from '@/components/common';
import { DataTable } from '@/components/common/client';
import { Button } from '@/components/ui/button';
import { useInvalidate } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { allItems, itemHref } from '@/lib/archive';
import { CONTENT_TYPE_LABELS } from '@/lib/constants';
import { useCan } from '@/lib/permissions';
import { visibilityLabel } from '@/lib/visibility';
import { useAuthStore } from '@/store/auth';
import { useDataStore } from '@/store/data';

/** Submit (or, for content managers, publish) a draft upload. */
export function SubmitUploadButton({ item }: { item: ArchiveItem }) {
  const invalidate = useInvalidate();
  const { canFully } = useCan();
  const direct = canFully('publish_direct');
  if (item.status !== 'draft' && item.status !== 'changes_requested') return null;
  const go = async () => {
    const status = direct ? 'published' : 'in_review';
    await api.patchItem(item.id, { status, updatedAt: new Date().toISOString() });
    invalidate([['pipeline'], ['audit'], ['item', item.id], ['search']]);
    toast.success(direct ? 'Published' : 'Submitted for review', { description: item.title });
  };
  return (
    <Button size="sm" variant={direct ? 'success' : 'outline'} onClick={go}>
      {direct ? <Rocket /> : <Send />} {direct ? 'Publish' : item.status === 'draft' ? 'Submit for review' : 'Resubmit'}
    </Button>
  );
}

/** The signed-in user's uploads with status, access and visibility (researchers, content managers). */
export function MyUploads() {
  const user = useAuthStore((s) => s.user);
  const uploads = useDataStore((s) => s.uploads);
  const patches = useDataStore((s) => s.patches);
  const { can } = useCan();
  const mine = useMemo(
    () => (user ? allItems().filter((i) => i.ownerId === user.id) : []),
    // allItems() is memoised on these store references
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, uploads, patches],
  );
  if (!user || !can('upload')) return null;
  return (
    <section aria-labelledby="my-up" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="my-up" className="text-lg font-semibold">
          My uploads
        </h2>
        <Button size="sm" asChild>
          <Link href="/upload">
            <Upload /> Upload new
          </Link>
        </Button>
      </div>
      {mine.length === 0 ? (
        <EmptyState title="No uploads yet" description="Reports, datasets, expeditions and media you upload appear here with their review status." />
      ) : (
        <DataTable
          caption="My uploads"
          rowKey={(i) => i.id}
          rows={mine}
          pageSize={6}
          columns={[
            { key: 'title', header: 'Title', sortValue: (i) => i.title, cell: (i) => <Link href={itemHref(i)} className="font-medium hover:text-primary hover:underline">{i.title}</Link> },
            { key: 'type', header: 'Type', sortValue: (i) => i.type, cell: (i) => CONTENT_TYPE_LABELS[i.type].singular, className: 'hidden md:table-cell' },
            { key: 'status', header: 'Status', sortValue: (i) => i.status, cell: (i) => <StatusBadge status={i.status} /> },
            { key: 'access', header: 'Access', cell: (i) => <AccessBadge level={i.accessLevel} />, className: 'hidden lg:table-cell' },
            { key: 'vis', header: 'Visible to', cell: (i) => <span className="text-xs">{visibilityLabel(i.visibleTo)}</span>, className: 'hidden lg:table-cell' },
            { key: 'act', header: '', cell: (i) => <SubmitUploadButton item={i} /> },
          ]}
        />
      )}
    </section>
  );
}
