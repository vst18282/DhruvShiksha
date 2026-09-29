'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, Download, FilterX, Group } from 'lucide-react';
import type { AuditEntry, Role } from '@/types';
import { DataTable } from '@/components/common/client';
import { EmptyState } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TableSkeleton } from '@/components/skeletons';
import { useApi } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { ROLE_LABELS } from '@/lib/constants';
import { GROUP_BY_LABELS, auditCsvRows, filterAudit, groupAudit, type AuditFilters, type AuditGroupBy } from '@/lib/audit';
import { downloadTextFile, toCsv } from '@/lib/utils';

const ROLES: Role[] = ['admin', 'scientist', 'content_manager', 'researcher', 'student'];
const fmtTime = (iso: string) => new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' });
const EMPTY: AuditFilters = { role: 'all', action: 'all', itemType: 'all' };

function DetailDialog({ entry, all, onClose, onFilter }: { entry: AuditEntry | null; all: AuditEntry[]; onClose: () => void; onFilter: (f: AuditFilters) => void }) {
  if (!entry) return null;
  const sameUser = all.filter((a) => a.id !== entry.id && (entry.userId ? a.userId === entry.userId : a.actor === entry.actor)).slice(0, 5);
  const rows: [string, React.ReactNode][] = [
    ['Operation time', fmtTime(entry.at)],
    ['User', `${entry.actor} (${ROLE_LABELS[entry.role]})`],
    ['User ID', <span key="u" className="font-mono text-xs">{entry.userId ?? 'unknown'}</span>],
    ['Action', entry.action],
    ['Item', `${entry.itemType}: ${entry.itemTitle}`],
    ['IP address', <span key="ip" className="font-mono text-xs">{entry.ip}</span>],
    ['Module / page', entry.module ?? '—'],
    ['Client', entry.userAgent ?? '—'],
    ['Server time', entry.durationMs ? `${entry.durationMs} ms (simulated)` : '—'],
    ['Entry ID', <span key="id" className="font-mono text-xs">{entry.id}</span>],
  ];
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="capitalize">{entry.action}</DialogTitle>
          <DialogDescription>{entry.details ?? `${entry.actor} ${entry.action} ${entry.itemType} “${entry.itemTitle}”.`}</DialogDescription>
        </DialogHeader>
        <dl className="divide-y rounded-md border text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[9rem_1fr] gap-2 px-3 py-2">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="break-words">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => { onFilter({ ...EMPTY, name: entry.userId ?? entry.actor }); onClose(); }}>
            All by this user
          </Button>
          <Button size="sm" variant="outline" onClick={() => { onFilter({ ...EMPTY, ip: entry.ip }); onClose(); }}>
            All from this IP
          </Button>
        </div>
        {sameUser.length > 0 && (
          <div>
            <p className="mb-1 text-sm font-medium">Other recent actions by {entry.actor}</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {sameUser.map((a) => (
                <li key={a.id}>
                  {fmtTime(a.at)} · {a.action} · {a.itemTitle}
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AuditTab() {
  const { data, isPending } = useApi(['audit'], api.getAudit);
  const [f, setF] = useState<AuditFilters>(EMPTY);
  const [by, setBy] = useState<AuditGroupBy>('none');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [detail, setDetail] = useState<AuditEntry | null>(null);
  const all = useMemo(() => data ?? [], [data]);
  const rows = useMemo(() => filterAudit(all, f), [all, f]);
  const groups = useMemo(() => (by === 'none' ? [] : groupAudit(rows, by)), [rows, by]);
  const actions = useMemo(() => Array.from(new Set(all.map((a) => a.action))).sort(), [all]);
  const types = useMemo(() => Array.from(new Set(all.map((a) => a.itemType))).sort(), [all]);
  const set = (p: Partial<AuditFilters>) => setF((x) => ({ ...x, ...p }));
  const active = Object.entries(f).filter(([k, v]) => v && v !== 'all' && k in f).length;

  const columns = [
    { key: 'at', header: 'Time', cell: (r: AuditEntry) => <span className="whitespace-nowrap">{new Date(r.at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>, sortValue: (r: AuditEntry) => r.at },
    {
      key: 'actor',
      header: 'Who',
      sortValue: (r: AuditEntry) => r.actor,
      cell: (r: AuditEntry) => (
        <span>
          {r.actor} <span className="text-xs text-muted-foreground">({ROLE_LABELS[r.role]})</span>
          <span className="block font-mono text-[10px] text-muted-foreground">{r.userId}</span>
        </span>
      ),
    },
    { key: 'action', header: 'Action', cell: (r: AuditEntry) => r.action, sortValue: (r: AuditEntry) => r.action },
    {
      key: 'item',
      header: 'Item',
      cell: (r: AuditEntry) => (
        <span>
          <span className="text-xs text-muted-foreground">{r.itemType}:</span> {r.itemTitle}
        </span>
      ),
      className: 'hidden md:table-cell',
    },
    { key: 'ip', header: 'IP (demo)', cell: (r: AuditEntry) => <span className="font-mono text-xs">{r.ip}</span>, sortValue: (r: AuditEntry) => r.ip, className: 'hidden lg:table-cell' },
  ];

  return (
    <div className="space-y-4">
      <section aria-label="Audit filters" className="space-y-3 rounded-lg border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="au-from">From date</Label>
            <Input id="au-from" type="date" value={f.from ?? ''} max={f.to} onChange={(e) => set({ from: e.target.value || undefined })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="au-to">To date</Label>
            <Input id="au-to" type="date" value={f.to ?? ''} min={f.from} onChange={(e) => set({ to: e.target.value || undefined })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="au-name">Name or user ID</Label>
            <Input id="au-name" value={f.name ?? ''} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Meera or u-content" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="au-ip">IP address</Label>
            <Input id="au-ip" value={f.ip ?? ''} onChange={(e) => set({ ip: e.target.value })} placeholder="e.g. 10.12.17" className="font-mono" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="au-role">Role</Label>
            <Select value={f.role ?? 'all'} onValueChange={(v) => set({ role: v as Role | 'all' })}>
              <SelectTrigger id="au-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="au-action">Action</Label>
            <Select value={f.action ?? 'all'} onValueChange={(v) => set({ action: v })}>
              <SelectTrigger id="au-action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {actions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="au-type">Item type</Label>
            <Select value={f.itemType ?? 'all'} onValueChange={(v) => set({ itemType: v })}>
              <SelectTrigger id="au-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All item types</SelectItem>
                {types.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="au-q">Search item or details</Label>
            <Input id="au-q" value={f.q ?? ''} onChange={(e) => set({ q: e.target.value })} placeholder="e.g. Bharati" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <Group className="h-4 w-4 text-muted-foreground" aria-hidden />
          <Label htmlFor="au-group" className="text-sm">
            Group by
          </Label>
          <Select value={by} onValueChange={(v) => { setBy(v as AuditGroupBy); setOpenGroups({}); }}>
            <SelectTrigger id="au-group" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(GROUP_BY_LABELS) as AuditGroupBy[]).map((g) => (
                <SelectItem key={g} value={g}>
                  {GROUP_BY_LABELS[g]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {rows.length} of {all.length} entries{by !== 'none' ? ` in ${groups.length} groups` : ''}
          </span>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" disabled={!active} onClick={() => setF(EMPTY)}>
              <FilterX /> Clear filters
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!rows.length}
              onClick={() => {
                downloadTextFile('audit-log-demo.csv', toCsv(auditCsvRows(rows)), 'text/csv');
                toast.success(`Exported ${rows.length} entries (demo CSV)`);
              }}
            >
              <Download /> Export CSV
            </Button>
          </div>
        </div>
      </section>

      {isPending ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState title="No audit entries match" description="Adjust the date range or filters." />
      ) : by === 'none' ? (
        <DataTable caption="Audit log" rowKey={(r) => r.id} rows={rows} pageSize={15} columns={columns} onRowClick={setDetail} rowLabel={(r) => `Open details: ${r.actor} ${r.action} ${r.itemTitle}`} />
      ) : (
        <ul className="space-y-2">
          {groups.map((g) => {
            const open = !!openGroups[g.key];
            return (
              <li key={g.key} className="rounded-lg border bg-card">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenGroups((s) => ({ ...s, [g.key]: !open }))}
                  className="flex w-full flex-wrap items-center gap-2 px-4 py-3 text-left hover:bg-muted/40"
                >
                  {open ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronRight className="h-4 w-4" aria-hidden />}
                  <span className={by === 'ip' || by === 'userId' ? 'font-mono text-sm' : 'font-medium'}>{g.key}</span>
                  <Badge variant="secondary">{g.rows.length}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {by !== 'name' && by !== 'userId' && `${g.actors.slice(0, 3).join(', ')}${g.actors.length > 3 ? ` +${g.actors.length - 3}` : ''} · `}
                    {new Date(g.first).toLocaleDateString('en-IN', { dateStyle: 'medium' })} – {new Date(g.last).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                  </span>
                </button>
                {open && (
                  <div className="border-t p-3">
                    <DataTable caption={`Audit entries for ${g.key}`} rowKey={(r) => r.id} rows={g.rows} pageSize={10} columns={columns} onRowClick={setDetail} rowLabel={(r) => `Open details: ${r.actor} ${r.action} ${r.itemTitle}`} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <DetailDialog entry={detail} all={all} onClose={() => setDetail(null)} onFilter={(nf) => { setF(nf); setBy('none'); }} />
    </div>
  );
}
