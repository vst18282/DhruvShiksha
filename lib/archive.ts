import type { ArchiveItem, ContentType, SourceRef } from '@/types';
import { SEED_ITEMS } from '@/data';
import { useDataStore } from '@/store/data';
import { useAuthStore } from '@/store/auth';
import { isVisibleTo } from '@/lib/visibility';
import { CONTENT_TYPE_LABELS } from '@/lib/constants';

export { SEED_ITEMS };

/**
 * Synchronous archive accessors that merge seed data with persisted demo overrides
 * (metadata patches, uploads, CMS blog drafts). The async mock API wraps these.
 */

let cacheKey: unknown[] = [];
let cache: ArchiveItem[] = SEED_ITEMS;

export function allItems(): ArchiveItem[] {
  const s = typeof window === 'undefined' ? null : useDataStore.getState();
  if (!s) return SEED_ITEMS;
  const key = [s.patches, s.uploads, s.cmsBlogs];
  if (key.every((k, i) => k === cacheKey[i])) return cache;
  const patched = SEED_ITEMS.map((it) => (s.patches[it.id] ? ({ ...it, ...s.patches[it.id] } as ArchiveItem) : it));
  const extra = [...s.uploads, ...s.cmsBlogs].map((it) => (s.patches[it.id] ? ({ ...it, ...s.patches[it.id] } as ArchiveItem) : it));
  cache = [...extra, ...patched];
  cacheKey = key;
  return cache;
}

/** The signed-in viewer (null for visitors and on the server). */
export function viewer() {
  return typeof window === 'undefined' ? null : useAuthStore.getState().user;
}

/** True when the current viewer may see the item (per-role visibility set by content managers / admins). */
export function canViewerSee(item: Pick<ArchiveItem, 'visibleTo' | 'ownerId'>): boolean {
  const u = viewer();
  return isVisibleTo(item, u?.role, u?.id);
}

/** Items visible in the public archive to the current viewer. */
export function publishedItems(): ArchiveItem[] {
  return allItems().filter((i) => i.status === 'published' && canViewerSee(i));
}

export function findItem(id: string): ArchiveItem | undefined {
  return allItems().find((i) => i.id === id || i.slug === id);
}

export function findRef(ref: SourceRef): ArchiveItem | undefined {
  return allItems().find((i) => i.id === ref.id && i.type === ref.type) ?? findItem(ref.id);
}

export function itemsOfType<T extends ArchiveItem>(type: ContentType, includeUnpublished = false): T[] {
  return (includeUnpublished ? allItems() : publishedItems()).filter((i) => i.type === type) as T[];
}

export function itemHref(item: Pick<ArchiveItem, 'type' | 'slug'>): string {
  return CONTENT_TYPE_LABELS[item.type].href(item.slug);
}

export function refOf(item: Pick<ArchiveItem, 'type' | 'id'>): SourceRef {
  return { type: item.type, id: item.id };
}

/** Embargo helpers */
export function isEmbargoActive(item: Pick<ArchiveItem, 'accessLevel' | 'embargoUntil'>, now = new Date()): boolean {
  return item.accessLevel === 'embargoed' && !!item.embargoUntil && new Date(item.embargoUntil) > now;
}
