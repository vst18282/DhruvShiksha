import { describe, expect, it } from 'vitest';
import type { AuditEntry, SocialPost } from '@/types';
import { affiliationOf, tenure } from '@/lib/users';
import { summariseActivity } from '@/lib/activity';
import { accountStats } from '@/lib/social';

describe('users', () => {
  it('derives internal/external from the organisation unless set explicitly', () => {
    expect(affiliationOf({ org: 'NCPOR (demo)' })).toBe('internal');
    expect(affiliationOf({ org: 'Partner University (demo)' })).toBe('external');
    expect(affiliationOf({ org: 'NCPOR Outreach', affiliation: 'external' })).toBe('external');
  });

  it('formats tenure', () => {
    expect(tenure('2023-09-29', new Date('2026-09-29'))).toBe('3 years');
    expect(tenure('2026-07-01', new Date('2026-09-29'))).toBe('2 months');
    expect(tenure('2026-09-20', new Date('2026-09-29'))).toBe('Less than a month');
  });
});

const post = (id: string, by: string, status: SocialPost['status'], at: string, platforms: SocialPost['platforms'], reach = 0): SocialPost => ({
  id,
  title: id,
  text: 't',
  outputType: 'social',
  platforms,
  accountIds: platforms.map((p) => `acc-${p}`),
  language: 'en',
  status,
  publishedAt: status === 'published' ? at : undefined,
  createdBy: by,
  createdByRole: 'content_manager',
  createdAt: at,
  updatedAt: at,
  sources: [],
  hashtags: [],
  comments: [],
  aiGenerated: false,
  metrics: reach ? { reach, impressions: reach * 2, engagement: reach / 10, clicks: reach / 100 } : undefined,
});

describe('content manager activity summary', () => {
  const now = new Date('2026-09-29T00:00:00Z');
  const posts = [
    post('a', 'Meera', 'published', '2026-09-20T00:00:00Z', ['x', 'instagram'], 1000),
    post('b', 'Meera', 'draft', '2026-09-25T00:00:00Z', ['x']),
    post('c', 'Meera', 'published', '2026-01-01T00:00:00Z', ['linkedin'], 500),
    post('d', 'Vikram', 'published', '2026-09-21T00:00:00Z', ['x'], 900),
  ];
  const audit: AuditEntry[] = [{ id: '1', actor: 'Meera', role: 'content_manager', action: 'approved', itemType: 'post', itemTitle: 'z', at: '2026-09-22T00:00:00Z', ip: '1' }];

  it('counts only the selected managers within the range', () => {
    const s = summariseActivity(posts, audit, { names: ['Meera'], range: '30d', now });
    expect(s.created).toBe(2);
    expect(s.published).toBe(1);
    expect(s.drafts).toBe(1);
    expect(s.reviews).toBe(1);
    expect(s.reach).toBe(1000);
    expect(s.byPlatform[0]).toEqual({ platform: 'x', posts: 2 });
  });

  it('includes older work for longer ranges', () => {
    expect(summariseActivity(posts, audit, { names: ['Meera'], range: 'all', now }).created).toBe(3);
  });

  it('splits post reach evenly across accounts', () => {
    const s = accountStats(posts, { id: 'acc-x' });
    expect(s.posts).toBe(3);
    expect(s.reach).toBe(500 + 900);
  });
});
