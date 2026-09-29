'use client';

import { useCallback } from 'react';
import { useUiStore } from '@/store/ui';
import { DICTIONARIES, type DictKey } from './dictionary';

export type { DictKey };

/** Returns a translate function bound to the current UI language. */
export function useT() {
  const lang = useUiStore((s) => s.lang);
  return useCallback((key: DictKey) => DICTIONARIES[lang][key] ?? DICTIONARIES.en[key], [lang]);
}
