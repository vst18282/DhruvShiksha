import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  // Demo deployment: discourage indexing, but keep the sitemap discoverable.
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/dashboard', '/studio', '/upload'] }],
    sitemap: 'https://dhruvshiksha.demo/sitemap.xml',
  };
}
