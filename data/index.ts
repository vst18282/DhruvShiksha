import type { ArchiveItem } from '@/types';
import { BLOGS, EVENTS, MEDIA, PUBLICATIONS, REPORTS } from './archive';
import { DATASETS } from './datasets';
import { EXPEDITIONS } from './expeditions';

/** All seed items (server-safe; no store access). */
export const SEED_ITEMS: ArchiveItem[] = [...EXPEDITIONS, ...REPORTS, ...DATASETS, ...PUBLICATIONS, ...BLOGS, ...MEDIA, ...EVENTS];

export function seedFind(id: string): ArchiveItem | undefined {
  return SEED_ITEMS.find((i) => i.id === id || i.slug === id);
}
