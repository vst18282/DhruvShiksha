import type { DictKey } from '@/lib/i18n/dictionary';

/** Where signed-in users land: `/` is the public landing page, so the portal starts at Explore. */
export const PORTAL_HOME = '/explore';

/**
 * Routes that render without the main navigation bar and without the chatbot: the public landing
 * page and the two auth screens. The auth screens also drop the site footer (see BARE_ROUTES).
 */
export const CHROMELESS_ROUTES = ['/', '/login', '/register'];

/** Auth screens: full-bleed art fills the viewport, so the site footer is dropped too. */
export const BARE_ROUTES = ['/login', '/register'];

export const MAIN_NAV: { key: DictKey; href: string }[] = [
  { key: 'nav.explore', href: '/explore' },
  { key: 'nav.expeditions', href: '/expeditions' },
  { key: 'nav.data', href: '/data' },
  { key: 'nav.gallery', href: '/gallery' },
  { key: 'nav.map', href: '/map' },
  { key: 'nav.updates', href: '/updates' },
];

/** The two live views offered by the Map item in the header. */
export const MAP_VIEWS: { id: '2d' | '3d'; href: string; title: string; description: string }[] = [
  { id: '2d', href: '/tools/polar-map/2d', title: '2D map', description: 'Leaflet polar projections and local coastlines.' },
  { id: '3d', href: '/tools/polar-map/3d', title: '3D globe', description: 'Interactive WebGL globe with the same demo layers.' },
];

export type ToolIcon = 'map' | 'globe' | 'core' | 'sound' | 'satellite' | 'sandbox' | 'geospace';

/** The polar map and globe are no longer tools: they live behind the Map item in the header. */
export const TOOLS: { slug: string; href: string; title: string; description: string; icon: ToolIcon }[] = [
  { slug: 'ice-core', href: '/tools/ice-core', title: 'Ice Core Stratigraphy', description: 'Drill 3,000 m back in time through a 3D ice core.', icon: 'core' },
  { slug: 'sounds', href: '/tools/sounds-of-the-pole', title: 'Sounds of the Pole', description: 'Mix wind, ice and penguin soundscapes.', icon: 'sound' },
  { slug: 'satellite', href: '/tools/satellite', title: 'Satellite & Ice Data', description: 'Compare sea-ice and glacier layers over time.', icon: 'satellite' },
  { slug: 'climate-sandbox', href: '/tools/climate-sandbox', title: 'Climate Sandbox', description: 'Explore tipping points with a toy climate model.', icon: 'sandbox' },
  { slug: 'geospace', href: '/tools/geospace', title: 'Geospace Observatory', description: 'Space weather, Kp index and the aurora oval.', icon: 'geospace' },
];

export const FOOTER_LINKS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Archive',
    links: [
      { label: 'Reports', href: '/reports' },
      { label: 'Data catalogue', href: '/data' },
      { label: 'Publications', href: '/publications' },
      { label: 'Gallery', href: '/gallery' },
      { label: 'Stations', href: '/stations' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { label: 'Learning paths', href: '/learn' },
      { label: 'Glossary', href: '/learn/glossary' },
      { label: 'Quizzes', href: '/learn/quizzes' },
      { label: 'Ask a scientist', href: '/learn/ask-a-scientist' },
      { label: 'Careers', href: '/learn/careers' },
    ],
  },
  {
    title: 'Institute',
    links: [
      { label: 'About NCPOR', href: '/about' },
      { label: 'Events', href: '/events' },
      { label: 'Updates feed', href: '/updates' },
      { label: 'Press & media kit', href: '/press' },
      { label: 'Data policy', href: '/about#data-policy' },
      { label: 'Accessibility', href: '/about#accessibility' },
      { label: 'Image credits', href: '/about#image-credits' },
    ],
  },
];
