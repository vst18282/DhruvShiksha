'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ChatMessage } from '@/lib/chat/types';

interface ChatState {
  open: boolean;
  messages: ChatMessage[];
  setOpen: (v: boolean) => void;
  toggle: () => void;
  add: (m: ChatMessage) => void;
  update: (id: string, patch: Partial<ChatMessage>) => void;
  clear: () => void;
}

/** Chat history + open state persisted per browser session (sessionStorage). */
export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      open: false,
      messages: [],
      setOpen: (open) => set({ open }),
      toggle: () => set((s) => ({ open: !s.open })),
      add: (m) => set((s) => ({ messages: [...s.messages, m].slice(-60) })),
      update: (id, patch) => set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      clear: () => set({ messages: [] }),
    }),
    { name: 'pv-chat', storage: createJSONStorage(() => sessionStorage), skipHydration: true },
  ),
);
