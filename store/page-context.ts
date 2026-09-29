'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import type { ContentType } from '@/types';

export type PageContextType = ContentType | 'station';

export interface PageContext {
  type: PageContextType;
  id: string;
  title: string;
}

interface PageContextState {
  current: PageContext | null;
  set: (c: PageContext | null) => void;
}

export const usePageContextStore = create<PageContextState>((set) => ({
  current: null,
  set: (current) => set({ current }),
}));

/** Detail pages call this so the chatbot can scope answers to "Current page". */
export function useRegisterPageContext(ctx: PageContext | null) {
  const setCtx = usePageContextStore((s) => s.set);
  const key = ctx ? `${ctx.type}:${ctx.id}:${ctx.title}` : '';
  useEffect(() => {
    if (!ctx) return;
    setCtx(ctx);
    return () => setCtx(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setCtx]);
}
