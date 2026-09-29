'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AccessRequest,
  ArchiveItem,
  AskQuestion,
  AuditEntry,
  BaseItem,
  Audience,
  Blog,
  SocialAccount,
  SocialPost,
  User,
} from '@/types';
import { ACCESS_REQUESTS, POSTS, SOCIAL_ACCOUNTS, USERS } from '@/data/org';
import { ASK_QUESTIONS } from '@/data/learn';

/**
 * Org-wide demo state that the mock API reads/writes. Persisted to localStorage so
 * uploads, approvals, drafts, role changes etc. survive a refresh. "Reset demo data"
 * (admin settings) restores the seeds.
 */
export interface SystemSettings {
  /* Embargo */
  defaultEmbargoMonths: number;
  maxEmbargoMonths: number;
  /** Warn owners/managers this many days before an embargo lifts. */
  embargoWarningDays: number;
  /** Content managers may open and download embargoed items (to prepare launch posts). */
  cmCanViewEmbargoed: boolean;
  /* Defaults */
  defaultLicence: string;
  aiDefaultTone: string;
  aiDefaultLanguage: string;
  /** Default audience for new uploads and posts (null = everyone). */
  defaultVisibility: Audience[] | null;
  /* Content & engagement */
  /** Global switch; per-role download rights live in the permission table. */
  allowDownloads: boolean;
  enableReactions: boolean;
  enableReporting: boolean;
  showShare: boolean;
}

export interface HomeCuration {
  featuredExpeditionId: string;
  featuredBlogIds: string[];
  banner: string;
}

interface DataState {
  uploads: ArchiveItem[];
  patches: Record<string, Partial<BaseItem>>;
  posts: SocialPost[];
  accounts: SocialAccount[];
  accessRequests: AccessRequest[];
  users: User[];
  questions: AskQuestion[];
  auditExtra: AuditEntry[];
  readNotifications: string[];
  cmsBlogs: Blog[];
  settings: SystemSettings;
  curation: HomeCuration;

  addUpload: (item: ArchiveItem) => void;
  patchItem: (id: string, patch: Partial<BaseItem>) => void;
  upsertPost: (post: SocialPost) => void;
  removePost: (id: string) => void;
  upsertAccount: (acc: SocialAccount) => void;
  removeAccount: (id: string) => void;
  upsertAccessRequest: (r: AccessRequest) => void;
  upsertUser: (u: User) => void;
  upsertQuestion: (q: AskQuestion) => void;
  addAudit: (e: Omit<AuditEntry, 'id' | 'at' | 'ip'>) => void;
  markNotificationsRead: (ids: string[]) => void;
  upsertCmsBlog: (b: Blog) => void;
  updateSettings: (s: Partial<SystemSettings>) => void;
  updateCuration: (c: Partial<HomeCuration>) => void;
  reset: () => void;
}

export const DEFAULT_SETTINGS: SystemSettings = {
  defaultEmbargoMonths: 12,
  maxEmbargoMonths: 36,
  embargoWarningDays: 30,
  cmCanViewEmbargoed: false,
  defaultLicence: 'CC-BY-4.0',
  aiDefaultTone: 'Educational',
  aiDefaultLanguage: 'en',
  defaultVisibility: null,
  allowDownloads: true,
  enableReactions: true,
  enableReporting: true,
  showShare: true,
};

/** Keep only known settings keys (drops retired options from older saved data) and fill new ones with defaults. */
export function mergeSettings(saved: Partial<SystemSettings> | undefined): SystemSettings {
  const out = { ...DEFAULT_SETTINGS };
  if (!saved) return out;
  for (const k of Object.keys(DEFAULT_SETTINGS) as (keyof SystemSettings)[]) {
    const v = saved[k];
    const ok = k === 'defaultVisibility' ? v === null || Array.isArray(v) : v !== undefined && typeof v === typeof DEFAULT_SETTINGS[k];
    if (ok) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

const DEFAULT_CURATION: HomeCuration = {
  featuredExpeditionId: 'isea-43',
  featuredBlogIds: ['blog-bharati-sea-ice', 'blog-ice-core-dml', 'blog-chandra-glacier'],
  banner: 'Antarctica Day is on 1 December — join the live school link-up!',
};

const initial = () => ({
  uploads: [] as ArchiveItem[],
  patches: {} as Record<string, Partial<BaseItem>>,
  posts: POSTS,
  accounts: SOCIAL_ACCOUNTS,
  accessRequests: ACCESS_REQUESTS,
  users: USERS,
  questions: ASK_QUESTIONS,
  auditExtra: [] as AuditEntry[],
  readNotifications: [] as string[],
  cmsBlogs: [] as Blog[],
  settings: DEFAULT_SETTINGS,
  curation: DEFAULT_CURATION,
});

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [item, ...list];
  const next = list.slice();
  next[i] = item;
  return next;
}

export const useDataStore = create<DataState>()(
  persist(
    (set) => ({
      ...initial(),
      addUpload: (item) => set((s) => ({ uploads: [item, ...s.uploads] })),
      patchItem: (id, patch) => set((s) => ({ patches: { ...s.patches, [id]: { ...s.patches[id], ...patch } } })),
      upsertPost: (post) => set((s) => ({ posts: upsert(s.posts, post) })),
      removePost: (id) => set((s) => ({ posts: s.posts.filter((p) => p.id !== id) })),
      upsertAccount: (acc) => set((s) => ({ accounts: upsert(s.accounts, acc) })),
      removeAccount: (id) => set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) })),
      upsertAccessRequest: (r) => set((s) => ({ accessRequests: upsert(s.accessRequests, r) })),
      upsertUser: (u) => set((s) => ({ users: upsert(s.users, u) })),
      upsertQuestion: (q) => set((s) => ({ questions: upsert(s.questions, q) })),
      addAudit: (e) =>
        set((s) => ({
          auditExtra: [
            {
              ...e,
              id: `audit-x-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              at: new Date().toISOString(),
              ip: '10.12.0.1 (you)',
              userAgent: e.userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent.replace(/^Mozilla\/5\.0 /, '').slice(0, 90) : undefined),
            },
            ...s.auditExtra,
          ].slice(0, 300),
        })),
      markNotificationsRead: (ids) => set((s) => ({ readNotifications: Array.from(new Set([...s.readNotifications, ...ids])) })),
      upsertCmsBlog: (b) => set((s) => ({ cmsBlogs: upsert(s.cmsBlogs, b) })),
      updateSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
      updateCuration: (p) => set((s) => ({ curation: { ...s.curation, ...p } })),
      reset: () => set(initial()),
    }),
    {
      name: 'pv-data',
      version: 1,
      skipHydration: true,
      // Deep-merge settings so options added later get their defaults and retired ones are dropped.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<DataState>;
        return { ...current, ...p, settings: mergeSettings(p.settings) };
      },
    },
  ),
);
