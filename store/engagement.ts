'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { seedEngagement, type ContentReport, type Engagement, type Reaction, type ReportReason } from '@/lib/engagement';

/**
 * The user's own likes/dislikes and submitted reports (per browser), plus which seed
 * reports have been resolved by staff. Combined with deterministic seed counts in `getEngagement`.
 */
interface EngagementState {
  reactions: Record<string, Record<string, Reaction>>; // userId → key → reaction
  reports: ContentReport[];
  resolved: string[]; // resolved report ids (seed or user)
  react: (userId: string, key: string, r: Reaction) => void;
  report: (key: string, reason: ReportReason, note: string, by: string) => void;
  resolve: (id: string) => void;
  reset: () => void;
}

export const useEngagementStore = create<EngagementState>()(
  persist(
    (set) => ({
      reactions: {},
      reports: [],
      resolved: [],
      react: (userId, key, r) =>
        set((s) => {
          const mine = { ...s.reactions[userId] };
          if (mine[key] === r) delete mine[key];
          else mine[key] = r;
          return { reactions: { ...s.reactions, [userId]: mine } };
        }),
      report: (key, reason, note, by) =>
        set((s) => ({
          reports: [{ id: `rp-${Date.now().toString(36)}`, key, reason, note, by, at: new Date().toISOString(), status: 'open' }, ...s.reports],
        })),
      resolve: (id) => set((s) => ({ resolved: Array.from(new Set([...s.resolved, id])) })),
      reset: () => set({ reactions: {}, reports: [], resolved: [] }),
    }),
    { name: 'pv-engagement', version: 1, skipHydration: true },
  ),
);

/** Toggle rule: clicking the same reaction removes it; the other reaction replaces it. */
export function nextReaction(current: Reaction | undefined, clicked: Reaction): Reaction | undefined {
  return current === clicked ? undefined : clicked;
}

/** Seed counts + everybody's stored reactions + reports, with resolved status applied. */
export function combineEngagement(key: string, s: Pick<EngagementState, 'reactions' | 'reports' | 'resolved'>): Engagement {
  const base = seedEngagement(key);
  let likes = base.likes;
  let dislikes = base.dislikes;
  for (const mine of Object.values(s.reactions)) {
    if (mine[key] === 'like') likes++;
    else if (mine[key] === 'dislike') dislikes++;
  }
  const reports = [...s.reports.filter((r) => r.key === key), ...base.reports].map((r) => (s.resolved.includes(r.id) ? { ...r, status: 'resolved' as const } : r));
  return { ...base, likes, dislikes, reports };
}

export function getEngagement(key: string): Engagement {
  return combineEngagement(key, useEngagementStore.getState());
}
