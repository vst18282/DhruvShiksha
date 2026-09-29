'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEFAULT_WORKFLOW,
  GRANT_OPTIONS,
  isLocked,
  type Action,
  type Grant,
  type Overrides,
  type Subject,
  type Workflow,
} from '@/lib/permissions-core';

/** Admin-editable permission state (System settings › Workflow + Permission editor). Persisted per browser. */
interface PermissionState {
  workflow: Workflow;
  overrides: Overrides;
  setWorkflow: (p: Partial<Workflow>) => void;
  setOverride: (action: Action, subject: Subject, value: Grant) => void;
  clearOverride: (action: Action, subject: Subject) => void;
  clearAllOverrides: () => void;
  reset: () => void;
}

export const usePermissionStore = create<PermissionState>()(
  persist(
    (set) => ({
      workflow: DEFAULT_WORKFLOW,
      overrides: {},
      setWorkflow: (p) => set((s) => ({ workflow: { ...s.workflow, ...p } })),
      setOverride: (action, subject, value) =>
        set((s) => {
          if (isLocked(action, subject) || !GRANT_OPTIONS[action].includes(value)) return s;
          return { overrides: { ...s.overrides, [action]: { ...s.overrides[action], [subject]: value } } };
        }),
      clearOverride: (action, subject) =>
        set((s) => {
          const rowO = { ...s.overrides[action] };
          delete rowO[subject];
          const next = { ...s.overrides, [action]: rowO };
          if (!Object.keys(rowO).length) delete next[action];
          return { overrides: next };
        }),
      clearAllOverrides: () => set({ overrides: {} }),
      reset: () => set({ workflow: DEFAULT_WORKFLOW, overrides: {} }),
    }),
    {
      name: 'pv-permissions',
      version: 1,
      skipHydration: true,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PermissionState>;
        return { ...current, overrides: p.overrides ?? {}, workflow: { ...DEFAULT_WORKFLOW, ...p.workflow } };
      },
    },
  ),
);
