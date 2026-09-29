import { describe, expect, it } from 'vitest';
import type { AccessRequest, User } from '@/types';
import { accessState, addMonthsIso, clampEmbargoMonths, embargoDaysLeft, isEmbargoActiveAt, monthsBetween, type AccessOptions } from '@/lib/access';
import { DEFAULT_WORKFLOW, effectivePermissions, type Overrides } from '@/lib/permissions-core';

const user = (role: User['role'], id = `u-${role}`): User => ({ id, name: role, email: `${role}@x.demo`, role, active: true, org: 'Demo', createdAt: '2024-01-01', lastActive: '2026-09-01' });
const opts = (o: Partial<AccessOptions> = {}, overrides: Overrides = {}): AccessOptions => {
  const table = effectivePermissions(DEFAULT_WORKFLOW, overrides);
  return { allowDownloads: true, cmCanViewEmbargoed: false, grant: (r, a) => table[a][r ?? 'visitor'], ...o };
};
const NOW = new Date('2026-09-29T00:00:00Z');
const none: AccessRequest[] = [];

describe('download access', () => {
  it('lets everyone download public files by default', () => {
    expect(accessState({ id: 'a', accessLevel: 'public' }, null, none, NOW, opts()).canDownload).toBe(true);
    expect(accessState({ id: 'a', accessLevel: 'public' }, user('student'), none, NOW, opts()).canDownload).toBe(true);
  });

  it('follows the permission table for open and registered downloads', () => {
    const o = opts({}, { download_open: { student: false }, download_registered: { researcher: false } });
    expect(accessState({ id: 'a', accessLevel: 'public' }, user('student'), none, NOW, o).action).toBe('not-allowed');
    expect(accessState({ id: 'a', accessLevel: 'registered' }, user('researcher'), none, NOW, o).canDownload).toBe(false);
    expect(accessState({ id: 'a', accessLevel: 'registered' }, null, none, NOW, o).action).toBe('login');
  });

  it('blocks everyone except owners and admins when downloads are switched off', () => {
    const o = opts({ allowDownloads: false });
    expect(accessState({ id: 'a', accessLevel: 'public' }, user('student'), none, NOW, o).action).toBe('disabled');
    expect(accessState({ id: 'a', accessLevel: 'public', ownerId: 'u-scientist' }, user('scientist'), none, NOW, o).canDownload).toBe(true);
    expect(accessState({ id: 'a', accessLevel: 'public' }, user('admin'), none, NOW, o).canDownload).toBe(true);
  });

  it('keeps embargoed files locked until the date, with owner/admin and optional CM access', () => {
    const item = { id: 'e', accessLevel: 'embargoed' as const, embargoUntil: '2026-12-15', ownerId: 'u-scientist' };
    expect(accessState(item, user('researcher'), none, NOW, opts()).action).toBe('embargo');
    expect(accessState(item, user('scientist'), none, NOW, opts()).canDownload).toBe(true);
    expect(accessState(item, user('content_manager'), none, NOW, opts()).canDownload).toBe(false);
    expect(accessState(item, user('content_manager'), none, NOW, opts({ cmCanViewEmbargoed: true })).canDownload).toBe(true);
    expect(accessState(item, user('researcher'), none, new Date('2027-01-01'), opts()).canDownload).toBe(true);
  });

  it('handles restricted items through access requests', () => {
    const item = { id: 'r', accessLevel: 'restricted' as const };
    const r = user('researcher');
    expect(accessState(item, r, none, NOW, opts()).action).toBe('request');
    const approved: AccessRequest[] = [{ id: 'q', itemId: 'r', itemType: 'dataset', itemTitle: 'x', requesterId: r.id, requesterName: r.name, purpose: 'p', institution: 'i', status: 'approved', createdAt: '2026-09-01' }];
    expect(accessState(item, r, approved, NOW, opts()).canDownload).toBe(true);
    expect(accessState(item, user('student'), none, NOW, opts()).action).toBe('not-allowed');
  });
});

describe('embargo helpers', () => {
  it('adds months and clamps the day to the month length', () => {
    expect(addMonthsIso('2026-01-31T00:00:00Z', 1)).toBe('2026-02-28');
    expect(addMonthsIso('2026-09-29T00:00:00Z', 12)).toBe('2027-09-29');
  });

  it('counts months and days', () => {
    expect(monthsBetween('2026-09-29T00:00:00Z', '2027-09-29T00:00:00Z')).toBe(12);
    expect(monthsBetween('2026-09-29T00:00:00Z', '2027-09-30T00:00:00Z')).toBe(13);
    expect(embargoDaysLeft('2026-10-09T00:00:00Z', NOW)).toBe(10);
    expect(embargoDaysLeft('2026-01-01T00:00:00Z', NOW)).toBe(0);
  });

  it('clamps embargo length to 1..max months', () => {
    expect(clampEmbargoMonths(48, 36)).toBe(36);
    expect(clampEmbargoMonths(0, 36)).toBe(1);
    expect(clampEmbargoMonths(Number.NaN, 36)).toBe(1);
  });

  it('knows when an embargo is active', () => {
    expect(isEmbargoActiveAt({ accessLevel: 'embargoed', embargoUntil: '2026-12-15' }, NOW)).toBe(true);
    expect(isEmbargoActiveAt({ accessLevel: 'public', embargoUntil: '2026-12-15' }, NOW)).toBe(false);
  });
});
