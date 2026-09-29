import { describe, expect, it } from 'vitest';
import type { AuditEntry } from '@/types';
import { auditCsvRows, filterAudit, groupAudit } from '@/lib/audit';

const e = (id: string, actor: string, userId: string, action: string, at: string, ip: string, itemType = 'post'): AuditEntry => ({ id, actor, userId, role: 'content_manager', action, itemType, itemTitle: `Item ${id}`, at, ip });
const rows: AuditEntry[] = [
  e('1', 'Meera Kulkarni', 'u-content', 'approved', '2026-09-28T10:00:00', '10.12.24.20'),
  e('2', 'Meera Kulkarni', 'u-content', 'published', '2026-09-27T10:00:00', '10.12.24.21'),
  e('3', 'Anika Rao', 'u-admin', 'changed permission', '2026-09-20T10:00:00', '10.12.10.20', 'permission'),
  e('4', 'Dr. Vikram Menon', 'u-scientist', 'uploaded', '2026-08-01T10:00:00', '10.12.17.22', 'report'),
];

describe('audit log filters', () => {
  it('filters by date range (inclusive)', () => {
    expect(filterAudit(rows, { from: '2026-09-20', to: '2026-09-27' }).map((r) => r.id)).toEqual(['2', '3']);
  });

  it('filters by name or user id, action, item type and IP', () => {
    expect(filterAudit(rows, { name: 'meera' })).toHaveLength(2);
    expect(filterAudit(rows, { name: 'u-admin' })).toHaveLength(1);
    expect(filterAudit(rows, { action: 'uploaded' })[0].id).toBe('4');
    expect(filterAudit(rows, { itemType: 'permission' })[0].id).toBe('3');
    expect(filterAudit(rows, { ip: '10.12.24' })).toHaveLength(2);
    expect(filterAudit(rows, { action: 'all', role: 'all' })).toHaveLength(4);
  });
});

describe('audit log grouping', () => {
  it('groups by name, IP and day', () => {
    const byName = groupAudit(rows, 'name');
    expect(byName[0].key).toBe('Meera Kulkarni');
    expect(byName[0].rows).toHaveLength(2);
    expect(groupAudit(rows, 'ip')).toHaveLength(4);
    const byDay = groupAudit(rows, 'day');
    expect(byDay[0].key).toBe('2026-09-28');
  });

  it('exports CSV rows with user id and details columns', () => {
    const csv = auditCsvRows(rows.slice(0, 1))[0];
    expect(csv.user_id).toBe('u-content');
    expect(csv).toHaveProperty('details');
  });
});
