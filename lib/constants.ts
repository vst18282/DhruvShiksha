import type {
  AccessLevel,
  ContentType,
  Discipline,
  LanguageCode,
  PlatformId,
  Region,
  Role,
  Status,
  StationSlug,
} from '@/types';

/** Artificial latency window for the mock API (ms). Change here to speed up/slow down skeletons. */
export const MOCK_DELAY_RANGE: [number, number] = [400, 1200];

export const DEMO_YEAR_RANGE: [number, number] = [2008, 2025];

export const REGION_META: Record<Region, { label: string; color: string; badge: string }> = {
  antarctica: { label: 'Antarctica', color: '#3B82C4', badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30' },
  arctic: { label: 'Arctic', color: '#8B5CF6', badge: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30' },
  himalaya: { label: 'Himalaya', color: '#F59E0B', badge: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30' },
  southern_ocean: { label: 'Southern Ocean', color: '#2DD4BF', badge: 'bg-teal-500/15 text-teal-800 dark:text-teal-300 border-teal-500/30' },
  indian_ocean: { label: 'Indian Ocean', color: '#0EA5E9', badge: 'bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border-cyan-500/30' },
};

export const STATION_NAMES: Record<StationSlug, string> = {
  maitri: 'Maitri',
  bharati: 'Bharati',
  himadri: 'Himadri',
  himansh: 'Himansh',
};

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  glaciology: 'Glaciology',
  oceanography: 'Oceanography',
  meteorology: 'Meteorology',
  biology: 'Biology',
  geology: 'Geology',
  atmospheric_science: 'Atmospheric science',
  geospace: 'Geospace',
  climate: 'Climate',
  outreach: 'Outreach',
};

export const CONTENT_TYPE_LABELS: Record<ContentType, { singular: string; plural: string; href: (slugOrId: string) => string }> = {
  blog: { singular: 'Blog', plural: 'Blogs', href: (s) => `/blog/${s}` },
  report: { singular: 'Report', plural: 'Reports', href: (s) => `/reports/${s}` },
  dataset: { singular: 'Dataset', plural: 'Datasets', href: (s) => `/data/${s}` },
  publication: { singular: 'Publication', plural: 'Publications', href: (s) => `/publications/${s}` },
  photo: { singular: 'Photo', plural: 'Photos', href: (s) => `/gallery?item=${s}` },
  video: { singular: 'Video', plural: 'Videos', href: (s) => `/gallery?item=${s}` },
  event: { singular: 'Event', plural: 'Events', href: (s) => `/events/${s}` },
  expedition: { singular: 'Expedition', plural: 'Expeditions', href: (s) => `/expeditions/${s}` },
};

export const STATUS_META: Record<Status, { label: string; variant: 'muted' | 'warning' | 'success' | 'destructive' | 'secondary' | 'default' | 'aurora' }> = {
  draft: { label: 'Draft', variant: 'muted' },
  in_review: { label: 'In review', variant: 'warning' },
  changes_requested: { label: 'Changes requested', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  scheduled: { label: 'Scheduled', variant: 'secondary' },
  published: { label: 'Published', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  archived: { label: 'Archived', variant: 'muted' },
};

export const ACCESS_META: Record<AccessLevel, { label: string; description: string }> = {
  public: { label: 'Open', description: 'Free to view and download' },
  registered: { label: 'Registered', description: 'Sign in to download' },
  restricted: { label: 'Restricted', description: 'Request access from the data owner' },
  embargoed: { label: 'Embargoed', description: 'Available after the embargo date' },
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  scientist: 'Scientist',
  content_manager: 'Content manager',
  researcher: 'Researcher',
  student: 'Student',
};

export const LANGUAGES: { code: LanguageCode; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'kok', label: 'Konkani', native: 'कोंकणी' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'or', label: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'as', label: 'Assamese', native: 'অসমীয়া' },
  { code: 'ur', label: 'Urdu', native: 'اردو' },
];

export const PLATFORM_META: Record<PlatformId, { label: string; limit: number; color: string }> = {
  x: { label: 'X', limit: 280, color: '#111827' },
  instagram: { label: 'Instagram', limit: 2200, color: '#FF0069' },
  linkedin: { label: 'LinkedIn', limit: 3000, color: '#0A66C2' },
  facebook: { label: 'Facebook', limit: 5000, color: '#0866FF' },
  youtube: { label: 'YouTube', limit: 5000, color: '#FF0000' },
  whatsapp: { label: 'WhatsApp', limit: 1024, color: '#25D366' },
  threads: { label: 'Threads', limit: 500, color: '#000000' },
};

export const SPECIAL_DAYS: { month: number; day: number; name: string }[] = [
  { month: 2, day: 28, name: 'National Science Day' },
  { month: 3, day: 22, name: 'World Water Day' },
  { month: 3, day: 23, name: 'World Meteorological Day' },
  { month: 4, day: 22, name: 'Earth Day' },
  { month: 6, day: 5, name: 'World Environment Day' },
  { month: 6, day: 8, name: 'World Ocean Day' },
  { month: 9, day: 16, name: 'World Ozone Day' },
  { month: 12, day: 1, name: 'Antarctica Day' },
  { month: 12, day: 11, name: 'International Mountain Day' },
];
