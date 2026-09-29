'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Collection, SavedSearch, SourceRef } from '@/types';

/** Personal demo state: bookmarks, collections, learning progress, history. */
export interface QuizResult {
  score: number;
  total: number;
  at: string;
}

interface UserState {
  bookmarks: SourceRef[];
  collections: Collection[];
  savedSearches: SavedSearch[];
  quizResults: Record<string, QuizResult>;
  badges: string[];
  streakDays: string[];
  completedSteps: string[];
  downloads: { ref: SourceRef; title: string; at: string }[];
  recentlyViewed: { ref: SourceRef; title: string; at: string }[];
  apiKeys: { id: string; label: string; key: string; createdAt: string }[];
  toggleBookmark: (ref: SourceRef) => boolean;
  isBookmarked: (ref: SourceRef) => boolean;
  createCollection: (name: string) => string;
  renameCollection: (id: string, name: string) => void;
  deleteCollection: (id: string) => void;
  toggleInCollection: (id: string, ref: SourceRef) => void;
  saveSearch: (query: string, filters: string) => void;
  toggleSearchAlert: (id: string) => void;
  deleteSearch: (id: string) => void;
  recordQuiz: (quizId: string, score: number, total: number, badge?: string) => void;
  completeStep: (stepId: string) => void;
  recordDownload: (ref: SourceRef, title: string) => void;
  recordView: (ref: SourceRef, title: string) => void;
  addApiKey: (label: string) => void;
  revokeApiKey: (id: string) => void;
}

const same = (a: SourceRef, b: SourceRef) => a.type === b.type && a.id === b.id;
const today = () => new Date().toISOString().slice(0, 10);

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      bookmarks: [{ type: 'blog', id: 'blog-ice-core-dml' }],
      collections: [{ id: 'col-1', name: 'Sea-ice reading list', items: [{ type: 'dataset', id: 'ds-bharati-sea-ice' }, { type: 'report', id: 'rep-bharati-sea-ice' }], createdAt: '2026-09-01' }],
      savedSearches: [{ id: 'ss-1', query: 'sea ice bharati', filters: '', alerts: true, createdAt: '2026-09-10' }],
      quizResults: { 'quiz-antarctica-basics': { score: 4, total: 5, at: '2026-09-27' } },
      badges: ['Ice Explorer'],
      streakDays: ['2026-09-26', '2026-09-27', '2026-09-28'],
      completedSteps: ['blog-penguin-facts-kids', 'quiz-antarctica-basics'],
      downloads: [],
      recentlyViewed: [],
      apiKeys: [{ id: 'k1', label: 'Notebook analysis', key: 'pv_demo_7f3a…c21e', createdAt: '2026-08-02' }],
      toggleBookmark: (ref) => {
        const has = get().bookmarks.some((b) => same(b, ref));
        set((s) => ({ bookmarks: has ? s.bookmarks.filter((b) => !same(b, ref)) : [ref, ...s.bookmarks] }));
        return !has;
      },
      isBookmarked: (ref) => get().bookmarks.some((b) => same(b, ref)),
      createCollection: (name) => {
        const id = `col-${Date.now()}`;
        set((s) => ({ collections: [...s.collections, { id, name, items: [], createdAt: today() }] }));
        return id;
      },
      renameCollection: (id, name) => set((s) => ({ collections: s.collections.map((c) => (c.id === id ? { ...c, name } : c)) })),
      deleteCollection: (id) => set((s) => ({ collections: s.collections.filter((c) => c.id !== id) })),
      toggleInCollection: (id, ref) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id !== id ? c : { ...c, items: c.items.some((x) => same(x, ref)) ? c.items.filter((x) => !same(x, ref)) : [...c.items, ref] },
          ),
        })),
      saveSearch: (query, filters) =>
        set((s) => ({ savedSearches: [{ id: `ss-${Date.now()}`, query, filters, alerts: false, createdAt: today() }, ...s.savedSearches] })),
      toggleSearchAlert: (id) => set((s) => ({ savedSearches: s.savedSearches.map((x) => (x.id === id ? { ...x, alerts: !x.alerts } : x)) })),
      deleteSearch: (id) => set((s) => ({ savedSearches: s.savedSearches.filter((x) => x.id !== id) })),
      recordQuiz: (quizId, score, total, badge) =>
        set((s) => {
          const prev = s.quizResults[quizId];
          const best = !prev || score > prev.score ? { score, total, at: today() } : prev;
          const earned = badge && score / total >= 0.6 && !s.badges.includes(badge) ? [...s.badges, badge] : s.badges;
          const days = s.streakDays.includes(today()) ? s.streakDays : [...s.streakDays, today()];
          return { quizResults: { ...s.quizResults, [quizId]: best }, badges: earned, streakDays: days, completedSteps: Array.from(new Set([...s.completedSteps, quizId])) };
        }),
      completeStep: (stepId) => set((s) => ({ completedSteps: Array.from(new Set([...s.completedSteps, stepId])) })),
      recordDownload: (ref, title) => set((s) => ({ downloads: [{ ref, title, at: new Date().toISOString() }, ...s.downloads].slice(0, 50) })),
      recordView: (ref, title) =>
        set((s) => ({ recentlyViewed: [{ ref, title, at: new Date().toISOString() }, ...s.recentlyViewed.filter((v) => !same(v.ref, ref))].slice(0, 20) })),
      addApiKey: (label) =>
        set((s) => ({
          apiKeys: [...s.apiKeys, { id: `k${Date.now()}`, label, key: `pv_demo_${Math.random().toString(16).slice(2, 6)}…${Math.random().toString(16).slice(2, 6)}`, createdAt: today() }],
        })),
      revokeApiKey: (id) => set((s) => ({ apiKeys: s.apiKeys.filter((k) => k.id !== id) })),
    }),
    { name: 'pv-user', skipHydration: true },
  ),
);
