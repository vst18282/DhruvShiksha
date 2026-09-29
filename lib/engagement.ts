/**
 * Demo engagement data (likes, dislikes, reviews, reports). Seed numbers are deterministic
 * per item so they are stable across reloads; the user's own reactions and reports are
 * added on top from the engagement store.
 * SWAP POINT: replace `seedEngagement` with counts from a real analytics/moderation backend.
 */
import { hashString, seededRandom } from '@/lib/utils';

export type Reaction = 'like' | 'dislike';
export type ReportReason = 'incorrect' | 'outdated' | 'broken_file' | 'inappropriate' | 'accessibility' | 'other';

export const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: 'incorrect', label: 'Incorrect or misleading information' },
  { id: 'outdated', label: 'Outdated content' },
  { id: 'broken_file', label: 'Broken file or link' },
  { id: 'accessibility', label: 'Accessibility problem (alt text, captions…)' },
  { id: 'inappropriate', label: 'Inappropriate content' },
  { id: 'other', label: 'Something else' },
];

export interface ContentReport {
  id: string;
  key: string;
  reason: ReportReason;
  note: string;
  by: string;
  at: string;
  status: 'open' | 'resolved';
  seed?: boolean;
}

export interface Review {
  id: string;
  key: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  by: string;
}

export interface Engagement {
  likes: number;
  dislikes: number;
  reviews: Review[];
  reports: ContentReport[];
}

export const engagementKey = (type: string, id: string) => `${type}:${id}`;

const NEG_REVIEWS = [
  'The chart is hard to read on mobile.',
  'Numbers do not match the linked dataset.',
  'Please add a simpler summary for students.',
  'Images need better alt text.',
  'Units are missing in the table.',
  'The download link gave an empty file.',
];
const POS_REVIEWS = ['Very clear and useful for my class.', 'Great visuals, thank you!', 'Helped with my project.', 'Well explained.'];
const REVIEWERS = ['Riya (Class 7)', 'Kabir S.', 'Teacher, Nagpur', 'Dr. N. Rao', 'Student, Goa', 'Researcher, Kochi'];

/** Deterministic demo engagement for an item/post key. */
export function seedEngagement(key: string): Engagement {
  const r = seededRandom(hashString(key));
  const popularity = 20 + Math.floor(r() * 400);
  const approval = 0.55 + r() * 0.42;
  const likes = Math.round(popularity * approval);
  const dislikes = Math.max(0, popularity - likes);
  const reviews: Review[] = Array.from({ length: Math.floor(r() * 4) }, (_, i) => {
    const bad = r() > approval;
    return {
      id: `${key}-rv${i}`,
      key,
      rating: (bad ? 1 + Math.floor(r() * 2) : 4 + Math.floor(r() * 2)) as Review['rating'],
      text: bad ? NEG_REVIEWS[Math.floor(r() * NEG_REVIEWS.length)] : POS_REVIEWS[Math.floor(r() * POS_REVIEWS.length)],
      by: REVIEWERS[Math.floor(r() * REVIEWERS.length)],
    };
  });
  const reasons: ReportReason[] = ['incorrect', 'outdated', 'broken_file', 'accessibility'];
  const reports: ContentReport[] = r() < 0.18
    ? Array.from({ length: 1 + Math.floor(r() * 2) }, (_, i) => ({
        id: `${key}-rp${i}`,
        key,
        reason: reasons[Math.floor(r() * reasons.length)],
        note: 'Reported by a visitor (demo).',
        by: REVIEWERS[Math.floor(r() * REVIEWERS.length)],
        at: new Date(Date.UTC(2026, 8, 1 + Math.floor(r() * 27))).toISOString(),
        status: 'open' as const,
        seed: true,
      }))
    : [];
  return { likes, dislikes, reviews, reports };
}

/**
 * Health score 0–100 from likes/dislikes, shrunk toward a neutral 50% when there are few votes
 * (Bayesian average with 10 pseudo-votes) so a single dislike can't tank an item.
 */
export function healthScore(likes: number, dislikes: number, prior = 0.5, weight = 10): number {
  const total = likes + dislikes;
  return Math.round(((likes + prior * weight) / (total + weight)) * 100);
}

export const reasonLabel = (r: ReportReason) => REPORT_REASONS.find((x) => x.id === r)?.label ?? r;
