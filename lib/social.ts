import type { SocialAccount, SocialPost } from '@/types';

/** Per-account performance, computed from published posts (reach is split evenly across a post's accounts). */
export interface AccountStats {
  posts: number;
  published: number;
  scheduled: number;
  reach: number;
  engagement: number;
  clicks: number;
  /** Engagement ÷ reach, in percent (0 when no reach). */
  rate: number;
}

export function postsForAccount(posts: SocialPost[], accountId: string): SocialPost[] {
  return posts.filter((p) => p.accountIds.includes(accountId));
}

export function accountStats(posts: SocialPost[], account: Pick<SocialAccount, 'id'>): AccountStats {
  const mine = postsForAccount(posts, account.id);
  let reach = 0;
  let engagement = 0;
  let clicks = 0;
  for (const p of mine) {
    if (p.status !== 'published' || !p.metrics) continue;
    const share = 1 / Math.max(1, p.accountIds.length);
    reach += p.metrics.reach * share;
    engagement += p.metrics.engagement * share;
    clicks += p.metrics.clicks * share;
  }
  return {
    posts: mine.length,
    published: mine.filter((p) => p.status === 'published').length,
    scheduled: mine.filter((p) => p.status === 'scheduled').length,
    reach: Math.round(reach),
    engagement: Math.round(engagement),
    clicks: Math.round(clicks),
    rate: reach ? Math.round((engagement / reach) * 1000) / 10 : 0,
  };
}

/** Demo profile URL on the real platform (the handles are fictional, so links are shown as text only). */
export function profileUrl(a: Pick<SocialAccount, 'platform' | 'handle'>): string {
  const h = a.handle.replace(/^@/, '').replace(/\s+/g, '');
  switch (a.platform) {
    case 'x':
      return `x.com/${h}`;
    case 'instagram':
      return `instagram.com/${h}`;
    case 'threads':
      return `threads.net/@${h}`;
    case 'youtube':
      return `youtube.com/@${h}`;
    case 'linkedin':
      return `linkedin.com/company/${h}`;
    case 'facebook':
      return `facebook.com/${h}`;
    case 'whatsapp':
      return 'WhatsApp broadcast list';
  }
}
