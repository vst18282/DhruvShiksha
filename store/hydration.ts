'use client';

import { create } from 'zustand';

/** Flips to true once all persisted stores have been rehydrated from localStorage. */
export const useHydration = create<{ hydrated: boolean; setHydrated: () => void }>((set) => ({
  hydrated: false,
  setHydrated: () => set({ hydrated: true }),
}));

export const useHydrated = () => useHydration((s) => s.hydrated);
