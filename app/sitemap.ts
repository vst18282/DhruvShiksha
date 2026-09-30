import type { MetadataRoute } from 'next';
import { SEED_ITEMS } from '@/data';
import { STATIONS } from '@/data/stations';
import { CONTENT_TYPE_LABELS } from '@/lib/constants';

const BASE = 'https://dhruvshiksha.demo';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ['', '/explore', '/expeditions', '/reports', '/data', '/publications', '/blog', '/gallery', '/stations', '/events', '/learn', '/learn/glossary', '/learn/quizzes', '/learn/resources', '/learn/ask-a-scientist', '/learn/careers', '/map', '/tools', '/tools/polar-map/2d', '/tools/polar-map/3d', '/tools/ice-core', '/tools/sounds-of-the-pole', '/tools/satellite', '/tools/climate-sandbox', '/tools/geospace', '/press', '/about'];
  return [
    ...staticRoutes.map((r) => ({ url: `${BASE}${r}`, changeFrequency: 'weekly' as const })),
    ...STATIONS.map((s) => ({ url: `${BASE}/stations/${s.slug}` })),
    ...SEED_ITEMS.filter((i) => i.type !== 'photo' && i.type !== 'video').map((i) => ({ url: `${BASE}${CONTENT_TYPE_LABELS[i.type].href(i.slug)}`, lastModified: i.updatedAt })),
  ];
}
