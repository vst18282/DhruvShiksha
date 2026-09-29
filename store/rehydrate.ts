'use client';

import { useUiStore } from './ui';
import { useAuthStore } from './auth';
import { useDataStore } from './data';
import { useUserStore } from './user';
import { useChatStore } from './chat';
import { usePermissionStore } from './permissions';
import { useEngagementStore } from './engagement';
import { usePolarMapStore } from './polar-map';

/** Register every persisted store here. Each is created with `skipHydration: true`. */
export async function rehydrateAll() {
  await Promise.all([
    useUiStore.persist.rehydrate(),
    useAuthStore.persist.rehydrate(),
    useDataStore.persist.rehydrate(),
    useUserStore.persist.rehydrate(),
    useChatStore.persist.rehydrate(),
    usePermissionStore.persist.rehydrate(),
    useEngagementStore.persist.rehydrate(),
    usePolarMapStore.persist.rehydrate(),
  ]);
}

/** "Reset demo data": restores every org-wide and personal demo store to its seed. */
export function resetAllDemoData() {
  useDataStore.getState().reset();
  usePermissionStore.getState().reset();
  useEngagementStore.getState().reset();
  usePolarMapStore.getState().reset();
  useUserStore.setState(useUserStore.getInitialState());
}
