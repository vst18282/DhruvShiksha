import type { AuditEntry, Role } from '@/types';

/** Audit log filtering and grouping (pure, unit-tested). */
export interface AuditFilters {
  from?: string; // yyyy-mm-dd (inclusive, local date)
  to?: string; // yyyy-mm-dd (inclusive)
  name?: string; // matches actor name or user id
  role?: Role | 'all';
  action?: string | 'all';
  itemType?: string | 'all';
  ip?: string; // prefix / substring
  q?: string; // free text over item title and details
}

export type AuditGroupBy = 'none' | 'name' | 'userId' | 'ip' | 'action' | 'itemType' | 'day';

export const GROUP_BY_LABELS: Record<AuditGroupBy, string> = {
  none: 'No grouping',
  name: 'Name',
  userId: 'User ID',
  ip: 'IP address',
  action: 'Action',
  itemType: 'Item type',
  day: 'Day',
};

/** Local calendar day (yyyy-mm-dd) of an ISO timestamp. */
export function localDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function filterAudit(rows: AuditEntry[], f: AuditFilters): AuditEntry[] {
  const name = f.name?.trim().toLowerCase();
  const ip = f.ip?.trim();
  const q = f.q?.trim().toLowerCase();
  return rows.filter((r) => {
    const day = localDay(r.at);
    if (f.from && day < f.from) return false;
    if (f.to && day > f.to) return false;
    if (name && !r.actor.toLowerCase().includes(name) && !(r.userId ?? '').toLowerCase().includes(name)) return false;
    if (f.role && f.role !== 'all' && r.role !== f.role) return false;
    if (f.action && f.action !== 'all' && r.action !== f.action) return false;
    if (f.itemType && f.itemType !== 'all' && r.itemType !== f.itemType) return false;
    if (ip && !r.ip.includes(ip)) return false;
    if (q && !`${r.itemTitle} ${r.details ?? ''} ${r.action}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

export function groupKey(r: AuditEntry, by: AuditGroupBy): string {
  switch (by) {
    case 'name':
      return r.actor;
    case 'userId':
      return r.userId ?? '(unknown)';
    case 'ip':
      return r.ip;
    case 'action':
      return r.action;
    case 'itemType':
      return r.itemType;
    case 'day':
      return localDay(r.at);
    default:
      return 'all';
  }
}

export interface AuditGroup {
  key: string;
  rows: AuditEntry[];
  first: string;
  last: string;
  actors: string[];
}

/** Groups sorted by size (days: newest first). Rows inside stay newest first. */
export function groupAudit(rows: AuditEntry[], by: AuditGroupBy): AuditGroup[] {
  const map = new Map<string, AuditEntry[]>();
  for (const r of rows) {
    const k = groupKey(r, by);
    const list = map.get(k);
    if (list) list.push(r);
    else map.set(k, [r]);
  }
  const groups = Array.from(map, ([key, list]) => {
    const sorted = [...list].sort((a, b) => b.at.localeCompare(a.at));
    return { key, rows: sorted, first: sorted[sorted.length - 1].at, last: sorted[0].at, actors: Array.from(new Set(sorted.map((r) => r.actor))) };
  });
  return by === 'day' ? groups.sort((a, b) => b.key.localeCompare(a.key)) : groups.sort((a, b) => b.rows.length - a.rows.length || a.key.localeCompare(b.key));
}

/** Rows for CSV export (follows the current filters). */
export function auditCsvRows(rows: AuditEntry[]) {
  return rows.map((r) => ({
    time: r.at,
    user_id: r.userId ?? '',
    name: r.actor,
    role: r.role,
    action: r.action,
    item_type: r.itemType,
    item: r.itemTitle,
    details: r.details ?? '',
    ip: r.ip,
    module: r.module ?? '',
    client: r.userAgent ?? '',
  }));
}
