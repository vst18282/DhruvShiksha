import type { User } from '@/types';

export type Affiliation = 'internal' | 'external';

/**
 * Internal = NCPOR staff. Uses the explicit `affiliation` when set, otherwise derives it
 * from the organisation name (anything under NCPOR counts as internal).
 */
export function affiliationOf(u: Pick<User, 'org' | 'affiliation'>): Affiliation {
  if (u.affiliation) return u.affiliation;
  return /\bNCPOR\b/i.test(u.org) ? 'internal' : 'external';
}

export const AFFILIATION_LABELS: Record<Affiliation, string> = { internal: 'Internal (NCPOR)', external: 'External' };

/** "3 years, 2 months" style tenure for the profile pop-up. */
export function tenure(createdAt: string, now = new Date()): string {
  const start = new Date(createdAt);
  if (Number.isNaN(start.getTime())) return '—';
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 1) return 'Less than a month';
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y && `${y} year${y > 1 ? 's' : ''}`, m && `${m} month${m > 1 ? 's' : ''}`].filter(Boolean).join(', ');
}
