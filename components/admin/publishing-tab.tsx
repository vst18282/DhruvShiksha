'use client';

import { useMemo, useState } from 'react';
import { BarChart3, CalendarDays, FilePen, Search } from 'lucide-react';
import type { PlatformId, SocialPost, Status } from '@/types';
import { AiBadge, EmptyState, StatusBadge } from '@/components/common';
import { DataTable } from '@/components/common/client';
import { CalendarView } from '@/components/studio/calendar-view';
import { AnalyticsView } from '@/components/studio/analytics-view';
import { PlatformIcon } from '@/components/studio/platform-icon';
import { PostDetailDialog, shortDescription } from '@/components/studio/post-detail';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/misc';
import { TableSkeleton } from '@/components/skeletons';
import { useApi } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { PLATFORM_META, STATUS_META } from '@/lib/constants';

type Section = 'drafts' | 'calendar' | 'analytics';
const PIPELINE: Status[] = ['draft', 'in_review', 'changes_requested', 'approved', 'scheduled', 'rejected'];

/** Read-only drafts list for the admin (admins oversee; they do not write posts). */
function DraftsOverview() {
  const { data, isPending } = useApi(['posts'], api.getPosts);
  const accounts = useApi(['accounts'], api.getAccounts);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<Status | 'all'>('all');
  const [platform, setPlatform] = useState<PlatformId | 'all'>('all');
  const [open, setOpen] = useState<SocialPost | null>(null);
  const rows = useMemo(
    () =>
      (data ?? []).filter(
        (p) => PIPELINE.includes(p.status) && (status === 'all' || p.status === status) && (platform === 'all' || p.platforms.includes(platform)) && `${p.title} ${p.text} ${p.createdBy}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [data, status, platform, q],
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search drafts, text or author…" aria-label="Search drafts" className="pl-9" />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as Status | 'all')}>
          <SelectTrigger className="w-44" aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All pipeline stages</SelectItem>
            {PIPELINE.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={platform} onValueChange={(v) => setPlatform(v as PlatformId | 'all')}>
          <SelectTrigger className="w-40" aria-label="Platform">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            {(Object.keys(PLATFORM_META) as PlatformId[]).map((p) => (
              <SelectItem key={p} value={p}>
                {PLATFORM_META[p].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isPending ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState title="No drafts match" />
      ) : (
        <DataTable
          caption="Drafts and posts in the pipeline"
          rowKey={(p) => p.id}
          rows={rows}
          onRowClick={setOpen}
          rowLabel={(p) => `Open ${p.title}`}
          columns={[
            {
              key: 'title',
              header: 'Title',
              sortValue: (p) => p.title,
              cell: (p) => (
                <div className="min-w-0">
                  <p className="line-clamp-1 font-medium">{p.title}</p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{shortDescription(p)}</p>
                  {p.aiGenerated && <AiBadge label="AI" className="mt-0.5 py-0" />}
                </div>
              ),
            },
            { key: 'status', header: 'Status', sortValue: (p) => p.status, cell: (p) => <StatusBadge status={p.status} /> },
            { key: 'platforms', header: 'Platforms', cell: (p) => <span className="flex gap-1">{p.platforms.map((pl) => <PlatformIcon key={pl} id={pl} title={PLATFORM_META[pl].label} />)}</span>, className: 'hidden sm:table-cell' },
            { key: 'by', header: 'Author', sortValue: (p) => p.createdBy, cell: (p) => p.createdBy, className: 'hidden md:table-cell' },
            { key: 'upd', header: 'Updated', sortValue: (p) => p.updatedAt, cell: (p) => new Date(p.updatedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' }), className: 'hidden lg:table-cell' },
          ]}
        />
      )}
      <PostDetailDialog post={open} accounts={accounts.data ?? []} onClose={() => setOpen(null)} />
    </div>
  );
}

/** Admin "Publishing & Insights": oversight of drafts, the calendar and analytics (no composer, no approving). */
export function PublishingTab() {
  const [section, setSection] = useState<Section>('drafts');
  return (
    <div className="space-y-5">
      <ToggleGroup type="single" value={section} onValueChange={(v) => v && setSection(v as Section)} aria-label="Publishing & Insights section" className="justify-start">
        <ToggleGroupItem value="drafts" className="gap-1.5">
          <FilePen className="h-4 w-4" aria-hidden /> Drafts
        </ToggleGroupItem>
        <ToggleGroupItem value="calendar" className="gap-1.5">
          <CalendarDays className="h-4 w-4" aria-hidden /> Calendar
        </ToggleGroupItem>
        <ToggleGroupItem value="analytics" className="gap-1.5">
          <BarChart3 className="h-4 w-4" aria-hidden /> Analytics
        </ToggleGroupItem>
      </ToggleGroup>
      {section === 'drafts' && <DraftsOverview />}
      {section === 'calendar' && <CalendarView embedded />}
      {section === 'analytics' && <AnalyticsView embedded />}
    </div>
  );
}
