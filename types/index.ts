/**
 * Core domain types for DhruvShiksha. All data in this app is fictional demo data.
 */

export type Role = 'admin' | 'scientist' | 'content_manager' | 'researcher' | 'student';
/** Who can see a piece of content. `visitor` = not logged in. */
export type Audience = Role | 'visitor';
export type ContentType = 'blog' | 'report' | 'dataset' | 'publication' | 'photo' | 'video' | 'event' | 'expedition';
export type AccessLevel = 'public' | 'registered' | 'restricted' | 'embargoed';
export type Status =
  | 'draft'
  | 'in_review'
  | 'changes_requested'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'rejected'
  | 'archived';
export type Region = 'antarctica' | 'arctic' | 'himalaya' | 'southern_ocean' | 'indian_ocean';
export type StationSlug = 'maitri' | 'bharati' | 'himadri' | 'himansh';
export type Discipline =
  | 'glaciology'
  | 'oceanography'
  | 'meteorology'
  | 'biology'
  | 'geology'
  | 'atmospheric_science'
  | 'geospace'
  | 'climate'
  | 'outreach';
export type Licence = 'CC-BY-4.0' | 'CC-BY-NC-4.0' | 'CC0' | 'NCPOR-Restricted' | 'All rights reserved';
export type UiLang = 'en' | 'hi' | 'mr';
export type LanguageCode =
  | 'en'
  | 'hi'
  | 'mr'
  | 'kok'
  | 'bn'
  | 'ta'
  | 'te'
  | 'kn'
  | 'ml'
  | 'gu'
  | 'pa'
  | 'or'
  | 'as'
  | 'ur';
export type ReadingLevel = 'expert' | 'general' | 'class8';
export type ArtVariant = 'aurora' | 'ice' | 'ocean' | 'mountain' | 'station' | 'penguin' | 'core' | 'ship' | 'night';

export interface SourceRef {
  type: ContentType;
  id: string;
}

export interface Attachment {
  id: string;
  name: string;
  kind: 'pdf' | 'csv' | 'zip' | 'image' | 'video' | 'doc';
  sizeKb: number;
}

export interface Section {
  id: string;
  heading: string;
  body: string;
}

/** Shared base for every archive item. */
export interface BaseItem {
  id: string;
  type: ContentType;
  title: string;
  slug: string;
  summary: string;
  tags: string[];
  region: Region;
  station?: StationSlug;
  discipline: Discipline;
  year: number;
  expeditionId?: string;
  authors: string[];
  accessLevel: AccessLevel;
  embargoUntil?: string;
  licence: Licence;
  credit: string;
  createdAt: string;
  updatedAt: string;
  status: Status;
  views: number;
  downloads: number;
  ownerId?: string;
  art: ArtVariant;
  /** True for items created in-browser during a demo session (uploads). */
  userCreated?: boolean;
  /** Audiences that can see the item. Undefined = everyone (the default). */
  visibleTo?: Audience[];
}

export interface TeamMember {
  name: string;
  role: string;
  institute: string;
}

export interface Expedition extends BaseItem {
  type: 'expedition';
  number: string;
  name: string;
  startDate: string;
  endDate: string;
  leader: string;
  team: TeamMember[];
  teamSize: number;
  objectives: string[];
  vessel?: string;
  track: [number, number][];
  highlights: string[];
  timeline: { date: string; title: string; text: string }[];
}

export interface Report extends BaseItem {
  type: 'report';
  reportType: 'Expedition report' | 'Technical report' | 'Survey report' | 'Annual report';
  pages: number;
  keyFindings: string[];
  sections: Section[];
  attachments: Attachment[];
}

export interface DatasetVariable {
  name: string;
  unit: string;
  description: string;
  dataType: 'number' | 'string' | 'date';
}

export interface Dataset extends BaseItem {
  type: 'dataset';
  doi: string;
  format: string;
  sizeMb: number;
  temporalCoverage: string;
  spatialExtent: { minLon: number; minLat: number; maxLon: number; maxLat: number };
  variables: DatasetVariable[];
  sampleRows: Record<string, number | string>[];
  keyFindings: string[];
  chart: { x: string; y: string[] };
}

export interface Publication extends BaseItem {
  type: 'publication';
  doi: string;
  journal: string;
  volume: string;
  pages: string;
  abstract: string;
  relatedDatasetIds: string[];
}

export interface BlogVersions {
  expert?: Section[];
  general: Section[];
  class8?: Section[];
}

export interface BlogTranslation {
  title: string;
  summary: string;
  sections: Section[];
}

export interface Blog extends BaseItem {
  type: 'blog';
  readingMinutes: number;
  versions: BlogVersions;
  translations?: Partial<Record<'hi' | 'mr', BlogTranslation>>;
  citations: string[];
  glossaryTerms: string[];
  attachments: Attachment[];
  featured?: boolean;
}

export interface MediaItem extends BaseItem {
  type: 'photo' | 'video';
  caption: string;
  altText: string;
  width: number;
  height: number;
  durationSec?: number;
  transcript?: string;
  chapters?: { t: number; title: string }[];
}

export interface EventItem extends BaseItem {
  type: 'event';
  eventType: 'Workshop' | 'MoU' | 'School outreach' | 'Lecture' | 'Visit' | 'Award' | 'Conference';
  date: string;
  endDate?: string;
  venue: string;
  description: string;
  photoIds: string[];
  reportIds: string[];
}

export type ArchiveItem = Blog | Report | Dataset | Publication | MediaItem | EventItem | Expedition;

export interface Station {
  slug: StationSlug;
  name: string;
  region: Region;
  location: string;
  lat: number;
  lon: number;
  established: number;
  elevationM: number;
  description: string;
  facts: { label: string; value: string }[];
  timeline: { year: number; text: string }[];
  art: ArtVariant;
}

export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  simple: string;
  related: string[];
  aliases?: string[];
}

export interface QuizQuestion {
  id: string;
  q: string;
  options: string[];
  answer: number;
  explain: string;
}

export interface Quiz {
  id: string;
  title: string;
  level: 'Class 5' | 'Class 8' | 'High school' | 'General';
  description: string;
  badge: string;
  questions: QuizQuestion[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  org: string;
  createdAt: string;
  lastActive: string;
  /** Internal = NCPOR staff; external = partner institutions, schools, public. Derived from the org when missing. */
  affiliation?: 'internal' | 'external';
}

export type PlatformId = 'x' | 'instagram' | 'linkedin' | 'facebook' | 'youtube' | 'whatsapp' | 'threads';

export interface SocialAccount {
  id: string;
  platform: PlatformId;
  handle: string;
  displayName: string;
  followers: number;
  connected: boolean;
  purpose: string;
  connectedAt: string;
}

export interface ReviewComment {
  id: string;
  author: string;
  role: Role;
  text: string;
  at: string;
}

export type OutputType = 'social' | 'blog' | 'press' | 'summary' | 'newsletter';

export interface SocialPost {
  id: string;
  title: string;
  text: string;
  outputType: OutputType;
  platforms: PlatformId[];
  accountIds: string[];
  language: LanguageCode;
  status: Status;
  scheduledAt?: string;
  publishedAt?: string;
  createdBy: string;
  createdByRole: Role;
  createdAt: string;
  updatedAt: string;
  sources: SourceRef[];
  hashtags: string[];
  comments: ReviewComment[];
  aiGenerated: boolean;
  metrics?: { reach: number; impressions: number; engagement: number; clicks: number };
  /** Per-platform / per-language variants produced in the Studio. */
  variants?: { platform?: PlatformId; language: LanguageCode; text: string; hashtags: string[]; accountId?: string }[];
  /** Metadata of attached images / voice notes (the binary stays in memory only). */
  media?: { kind: 'image' | 'voice'; name: string; altText?: string; transcript?: string }[];
  /** Audiences that can see the post on the public Updates feed. Undefined = everyone. */
  visibleTo?: Audience[];
  /** Short description shown in review panels (falls back to the first sentence of the text). */
  description?: string;
}

export interface AuditEntry {
  id: string;
  actor: string;
  /** User id of the actor (`visitor` for anonymous actions). */
  userId?: string;
  role: Role;
  action: string;
  itemType: string;
  itemTitle: string;
  at: string;
  ip: string;
  itemId?: string;
  /** Short human-readable description of what happened. */
  details?: string;
  /** Where it happened (page / module) and the client used (demo). */
  module?: string;
  userAgent?: string;
  durationMs?: number;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  roles: Role[];
  link?: string;
  kind: 'approval' | 'access' | 'system' | 'social' | 'learning' | 'comment';
}

export interface AccessRequest {
  id: string;
  itemId: string;
  itemType: ContentType;
  itemTitle: string;
  requesterId: string;
  requesterName: string;
  purpose: string;
  institution: string;
  status: 'pending' | 'approved' | 'declined';
  createdAt: string;
  decidedAt?: string;
}

export interface Collection {
  id: string;
  name: string;
  items: SourceRef[];
  createdAt: string;
}

export interface SavedSearch {
  id: string;
  query: string;
  filters: string;
  alerts: boolean;
  createdAt: string;
}

export interface Faq {
  id: string;
  q: string;
  a: string;
  category: 'general' | 'data' | 'education' | 'careers';
}

export interface AskQuestion {
  id: string;
  askedBy: string;
  question: string;
  answer?: string;
  answeredBy?: string;
  status: 'pending' | 'answered' | 'rejected';
  createdAt: string;
  userId?: string;
}

export interface PressRelease {
  id: string;
  title: string;
  date: string;
  summary: string;
  body: string;
}
