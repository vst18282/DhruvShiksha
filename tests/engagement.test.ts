import { describe, expect, it } from 'vitest';
import { engagementKey, healthScore, seedEngagement } from '@/lib/engagement';
import { combineEngagement, nextReaction } from '@/store/engagement';
import { DEFAULT_SETTINGS, mergeSettings } from '@/store/data';

describe('engagement', () => {
  it('seeds deterministic counts per item', () => {
    const k = engagementKey('report', 'rep-bharati-sea-ice');
    expect(seedEngagement(k)).toEqual(seedEngagement(k));
    expect(seedEngagement(k).likes).toBeGreaterThan(0);
  });

  it('toggles reactions: same click removes, other click replaces', () => {
    expect(nextReaction(undefined, 'like')).toBe('like');
    expect(nextReaction('like', 'like')).toBeUndefined();
    expect(nextReaction('like', 'dislike')).toBe('dislike');
  });

  it('adds stored reactions and reports on top of the seed, and applies resolutions', () => {
    const k = 'post:test-1';
    const base = seedEngagement(k);
    const e = combineEngagement(k, {
      reactions: { u1: { [k]: 'like' }, u2: { [k]: 'dislike' }, u3: { other: 'like' } },
      reports: [{ id: 'rp1', key: k, reason: 'incorrect', note: '', by: 'u1', at: '2026-09-01', status: 'open' }],
      resolved: ['rp1'],
    });
    expect(e.likes).toBe(base.likes + 1);
    expect(e.dislikes).toBe(base.dislikes + 1);
    expect(e.reports.find((r) => r.id === 'rp1')?.status).toBe('resolved');
  });

  it('scores health with a Bayesian average so few votes stay near 50', () => {
    expect(healthScore(0, 0)).toBe(50);
    expect(healthScore(0, 1)).toBe(45);
    expect(healthScore(90, 10)).toBeGreaterThan(80);
    expect(healthScore(10, 90)).toBeLessThan(20);
  });
});

describe('system settings merge', () => {
  it('fills new options with defaults and drops retired ones', () => {
    const merged = mergeSettings({ defaultEmbargoMonths: 6, approvalRoles: ['admin'] } as never);
    expect(merged.defaultEmbargoMonths).toBe(6);
    expect(merged.allowDownloads).toBe(DEFAULT_SETTINGS.allowDownloads);
    expect(merged).not.toHaveProperty('approvalRoles');
  });

  it('rejects values of the wrong type', () => {
    expect(mergeSettings({ allowDownloads: 'yes' } as never).allowDownloads).toBe(true);
    expect(mergeSettings({ defaultVisibility: ['researcher'] }).defaultVisibility).toEqual(['researcher']);
  });
});
