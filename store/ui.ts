'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UiLang } from '@/types';

export type TextSize = 'sm' | 'md' | 'lg';

interface UiState {
  textSize: TextSize;
  highContrast: boolean;
  lowBandwidth: boolean;
  lang: UiLang;
  commandOpen: boolean;
  recentSearches: string[];
  recentTopics: string[];
  notifPrefs: Record<'email' | 'approvals' | 'access' | 'learning' | 'digest', boolean>;
  setNotifPref: (k: keyof UiState['notifPrefs'], v: boolean) => void;
  setTextSize: (s: TextSize) => void;
  toggleHighContrast: () => void;
  setLowBandwidth: (v: boolean) => void;
  setLang: (l: UiLang) => void;
  setCommandOpen: (v: boolean) => void;
  addRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;
  addRecentTopic: (t: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      textSize: 'md',
      highContrast: false,
      lowBandwidth: false,
      lang: 'en',
      commandOpen: false,
      recentSearches: [],
      recentTopics: [],
      notifPrefs: { email: true, approvals: true, access: true, learning: true, digest: false },
      setNotifPref: (k, v) => set((s) => ({ notifPrefs: { ...s.notifPrefs, [k]: v } })),
      setTextSize: (textSize) => set({ textSize }),
      toggleHighContrast: () => set((s) => ({ highContrast: !s.highContrast })),
      setLowBandwidth: (lowBandwidth) => set({ lowBandwidth }),
      setLang: (lang) => set({ lang }),
      setCommandOpen: (commandOpen) => set({ commandOpen }),
      addRecentSearch: (q) =>
        set((s) => {
          const t = q.trim();
          if (!t) return s;
          return { recentSearches: [t, ...s.recentSearches.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 8) };
        }),
      clearRecentSearches: () => set({ recentSearches: [] }),
      addRecentTopic: (t) =>
        set((s) => ({ recentTopics: [t, ...s.recentTopics.filter((x) => x !== t)].slice(0, 6) })),
    }),
    {
      name: 'pv-ui',
      // Rehydrated manually in <StoreHydrator/> after mount to avoid SSR hydration mismatches.
      skipHydration: true,
      partialize: (s) => ({
        textSize: s.textSize,
        highContrast: s.highContrast,
        lowBandwidth: s.lowBandwidth,
        lang: s.lang,
        recentSearches: s.recentSearches,
        recentTopics: s.recentTopics,
        notifPrefs: s.notifPrefs,
      }),
    },
  ),
);
