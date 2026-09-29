'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { ArchiveItem } from '@/types';
import { api } from '@/lib/mock-api';
import { useHydrated } from '@/store/hydration';
import { useAuthStore } from '@/store/auth';

/** Cache results per viewer: visibility and permissions differ by role, so role switches must not reuse data. */
function useViewerKey() {
  return useAuthStore((s) => (s.user ? `@${s.user.id}:${s.user.role}` : '@visitor'));
}

/**
 * Thin TanStack Query wrappers around the mock API.
 * Queries wait for store hydration so persisted demo overrides are included.
 */
export function useItem<T extends ArchiveItem>(id: string) {
  const hydrated = useHydrated();
  const viewer = useViewerKey();
  return useQuery({ queryKey: ['item', id, viewer], queryFn: () => api.getItem<T>(id).then((x) => x ?? null), enabled: hydrated });
}

export function useApi<T>(key: unknown[], fn: () => Promise<T>, enabled = true) {
  const hydrated = useHydrated();
  const viewer = useViewerKey();
  return useQuery({ queryKey: [...key, viewer], queryFn: fn, enabled: hydrated && enabled });
}

/** Invalidate everything (cheap for a mock layer) after a mutation. */
export function useInvalidate() {
  const qc = useQueryClient();
  return useCallback(
    async (keys?: unknown[][]): Promise<void> => {
      if (!keys) return qc.invalidateQueries();
      await Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: k })));
    },
    [qc],
  );
}
