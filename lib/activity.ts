import type { AuditEntry, LanguageCode, PlatformId, SocialPost } from '@/types';

/** Summary of what content managers did in a period (pure, used by the admin Activity tab). */
export type ActivityRange = '30d' | '90d' | '365d' | 'all';

export const RANGE_LABELS: Record<ActivityRange, string> = { '30d': 'Last 30 days', '90d': 'Last 90 days', '365d': 'Last 12 months', all: 'All time' };

const DAYS: Record<ActivityRange, number> = { '30d': 30, '90d': 90, '365d': 365, all: Infinity };

export function inRange(iso: string, range: ActivityRange, now = new Date()): boolean {
  if (range === 'all') return true;
  return now.getTime() - new Date(iso).getTime() <= DAYS[range] * 86_400_000;
}

/** The date an activity "happened": publish, then schedule, then creation. */
export const activityDate = (p: SocialPost) => p.publishedAt ?? p.scheduledAt ?? p.createdAt;

export const REVIEW_ACTIONS = ['approved', 'rejected', 'changes_requested', 'post approved', 'post rejected', 'set status: published', 'set status: rejected', 'set status: changes_requested'];

export interface ActivitySummary {
  created: number;
  published: number;
  scheduled: number;
  drafts: number;
  reviews: number;
  reach: number;
  engagement: number;
  byPlatform: { platform: PlatformId; posts: number }[];
  byLanguage: { language: LanguageCode; posts: number }[];
  byMonth: { month: string; created: number; published: number }[];
}

export function summariseActivity(posts: SocialPost[], audit: AuditEntry[], opts: { names: string[]; range: ActivityRange; now?: Date }): ActivitySummary {
  const now = opts.now ?? new Date();
  const mine = posts.filter((p) => opts.names.includes(p.createdBy) && inRange(activityDate(p), opts.range, now));
  const published = mine.filter((p) => p.status === 'published');
  const reviews = audit.filter((a) => opts.names.includes(a.actor) && REVIEW_ACTIONS.includes(a.action) && inRange(a.at, opts.range, now)).length;

  const platform = new Map<PlatformId, number>();
  const language = new Map<LanguageCode, number>();
  const month = new Map<string, { created: number; published: number }>();
  for (const p of mine) {
    for (const pl of p.platforms) platform.set(pl, (platform.get(pl) ?? 0) + 1);
    language.set(p.language, (language.get(p.language) ?? 0) + 1);
    const m = activityDate(p).slice(0, 7);
    const cur = month.get(m) ?? { created: 0, published: 0 };
    cur.created += 1;
    if (p.status === 'published') cur.published += 1;
    month.set(m, cur);
  }
  return {
    created: mine.length,
    published: published.length,
    scheduled: mine.filter((p) => p.status === 'scheduled').length,
    drafts: mine.filter((p) => p.status === 'draft').length,
    reviews,
    reach: published.reduce((n, p) => n + (p.metrics?.reach ?? 0), 0),
    engagement: published.reduce((n, p) => n + (p.metrics?.engagement ?? 0), 0),
    byPlatform: Array.from(platform, ([p, n]) => ({ platform: p, posts: n })).sort((a, b) => b.posts - a.posts),
    byLanguage: Array.from(language, ([l, n]) => ({ language: l, posts: n })).sort((a, b) => b.posts - a.posts),
    byMonth: Array.from(month, ([m, v]) => ({ month: m, ...v })).sort((a, b) => a.month.localeCompare(b.month)),
  };
}
