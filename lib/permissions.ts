'use client';

/**
 * Runtime permission API. Reads the admin-editable effective table from the persisted
 * permission store (see lib/permissions-core.ts for the model).
 *  - `grant/can/canFully` — non-reactive (for event handlers and plain functions)
 *  - `useCan()` — reactive hook for components (re-renders on permission or role change)
 */
import { useMemo } from 'react';
import type { Role } from '@/types';
import { usePermissionStore } from '@/store/permissions';
import { useAuthStore } from '@/store/auth';
import { effectivePermissions, scienceReviewEnforced, type Action, type Grant, type PermissionTable } from './permissions-core';

export * from './permissions-core';

type Actor = Role | null | undefined;

let cacheKey: [unknown, unknown] | null = null;
let cacheTable: PermissionTable | null = null;

export function currentTable(): PermissionTable {
  const { workflow, overrides } = usePermissionStore.getState();
  if (!cacheTable || !cacheKey || cacheKey[0] !== workflow || cacheKey[1] !== overrides) {
    cacheTable = effectivePermissions(workflow, overrides);
    cacheKey = [workflow, overrides];
  }
  return cacheTable;
}

export function grant(role: Actor, action: Action): Grant {
  return currentTable()[action][role ?? 'visitor'];
}

/** True if the role has any level of access to the action (including partial grants). */
export function can(role: Actor, action: Action): boolean {
  return grant(role, action) !== false;
}

/** True only for full, unconditional access. */
export function canFully(role: Actor, action: Action): boolean {
  return grant(role, action) === true;
}

export function isScienceReviewEnforced(): boolean {
  return scienceReviewEnforced(usePermissionStore.getState().workflow, currentTable());
}

/** Reactive permission helpers bound to the current user (or an explicit role). */
export function useCan(roleOverride?: Actor) {
  const workflow = usePermissionStore((s) => s.workflow);
  const overrides = usePermissionStore((s) => s.overrides);
  const userRole = useAuthStore((s) => s.user?.role ?? null);
  const role = roleOverride === undefined ? userRole : roleOverride;
  return useMemo(() => {
    const table = effectivePermissions(workflow, overrides);
    const g = (a: Action, r: Actor = role) => table[a][r ?? 'visitor'];
    return {
      role,
      table,
      workflow,
      grant: g,
      can: (a: Action, r?: Actor) => g(a, r ?? role) !== false,
      canFully: (a: Action, r?: Actor) => g(a, r ?? role) === true,
      scienceReviewRequired: scienceReviewEnforced(workflow, table),
    };
  }, [workflow, overrides, role]);
}
