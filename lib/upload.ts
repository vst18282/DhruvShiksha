import type { AccessLevel, ArchiveItem, Attachment, Audience, BaseItem, ContentType, DatasetVariable, Discipline, EventItem, Licence, Region, StationSlug, Status } from '@/types';
import { slugify } from '@/lib/utils';

/** Metadata captured by the Upload Centre wizard. */
export interface UploadMeta {
  title: string;
  summary: string;
  keywords: string[];
  tags: string[];
  region: Region;
  station?: StationSlug;
  discipline: Discipline;
  expeditionId?: string;
  year: number;
  authors: string[];
  accessLevel: AccessLevel;
  embargoUntil?: string;
  licence: Licence;
  credit: string;
  altText?: string;
  eventType?: EventItem['eventType'];
  venue?: string;
  date?: string;
  journal?: string;
  /* Expedition */
  endDate?: string;
  vessel?: string;
  objectives?: string[];
  /** Audiences that can see the item (undefined = everyone). */
  visibleTo?: Audience[];
}

export interface UploadFileInfo {
  name: string;
  size: number;
  kind: Attachment['kind'];
  csv?: { header: string[]; rows: string[][] };
}

export function kindOf(name: string, mime: string): Attachment['kind'] {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (/\.csv$/i.test(name)) return 'csv';
  if (/\.pdf$/i.test(name)) return 'pdf';
  if (/\.(zip|tar|gz|nc)$/i.test(name)) return 'zip';
  return 'doc';
}

/**
 * Build a complete, typed archive item from wizard state. Items start "in_review" (sent to a content
 * manager), "draft" (saved for later) or "published" (content managers publish directly).
 */
export function buildItem(type: ContentType, meta: UploadMeta, files: UploadFileInfo[], ownerId: string, status: Extract<Status, 'draft' | 'in_review' | 'published'> = 'in_review'): ArchiveItem {
  const now = new Date().toISOString();
  const id = `up-${type}-${slugify(meta.title).slice(0, 36)}-${Date.now().toString(36)}`;
  const base: Omit<BaseItem, 'type'> = {
    id,
    slug: id,
    title: meta.title,
    summary: meta.summary,
    tags: Array.from(new Set([...meta.tags, ...meta.keywords])).filter(Boolean),
    region: meta.region,
    station: meta.station,
    discipline: meta.discipline,
    year: meta.year,
    expeditionId: meta.expeditionId,
    authors: meta.authors.length ? meta.authors : ['Unknown'],
    accessLevel: meta.accessLevel,
    embargoUntil: meta.accessLevel === 'embargoed' ? meta.embargoUntil : undefined,
    licence: meta.licence,
    credit: meta.credit,
    createdAt: now,
    updatedAt: now,
    status,
    visibleTo: meta.visibleTo,
    views: 0,
    downloads: 0,
    ownerId,
    art: meta.region === 'himalaya' ? 'mountain' : meta.region === 'arctic' ? 'aurora' : meta.region === 'southern_ocean' || meta.region === 'indian_ocean' ? 'ocean' : type === 'dataset' ? 'core' : 'ice',
    userCreated: true,
  };
  const attachments: Attachment[] = files.map((f, i) => ({ id: `${id}-f${i}`, name: f.name, kind: f.kind, sizeKb: Math.max(1, Math.round(f.size / 1024)) }));
  const sentences = meta.summary.split(/(?<=[.!?])\s+/).filter(Boolean);
  switch (type) {
    case 'report':
      return { ...base, type, reportType: 'Technical report', pages: Math.max(4, Math.round((files[0]?.size ?? 200000) / 60000)), keyFindings: sentences.slice(0, 3), sections: [{ id: 'summary', heading: 'Summary', body: meta.summary }], attachments };
    case 'dataset': {
      const csv = files.find((f) => f.csv)?.csv;
      const header = csv?.header.length ? csv.header : ['index', 'value'];
      const rows = csv?.rows.length ? csv.rows : Array.from({ length: 12 }, (_, i) => [String(i), String(Math.round(Math.sin(i / 2) * 50 + 50))]);
      const variables: DatasetVariable[] = header.map((h, i) => ({ name: h, unit: '', description: `Column ${i + 1} from uploaded file`, dataType: rows.every((r) => r[i] !== undefined && !isNaN(Number(r[i]))) ? 'number' : 'string' }));
      const sampleRows = rows.slice(0, 50).map((r) => Object.fromEntries(header.map((h, i) => [h, variables[i].dataType === 'number' ? Number(r[i]) : r[i] ?? ''])));
      const numeric = variables.filter((v) => v.dataType === 'number').map((v) => v.name);
      return {
        ...base, type, doi: `10.5555/pv.ds.upload.${Date.now().toString(36)}`, format: files[0]?.name.split('.').pop()?.toUpperCase() ?? 'CSV', sizeMb: Math.round((files.reduce((a, f) => a + f.size, 0) / 1048576) * 10) / 10,
        temporalCoverage: String(meta.year), spatialExtent: { minLon: 70, minLat: -71, maxLon: 80, maxLat: -68 }, variables, sampleRows, keyFindings: sentences.slice(0, 2),
        chart: { x: header[0], y: numeric.filter((n) => n !== header[0]).slice(0, 2).length ? numeric.filter((n) => n !== header[0]).slice(0, 2) : [header[1] ?? header[0]] },
      };
    }
    case 'publication':
      return { ...base, type, doi: `10.5555/pv.pub.upload.${Date.now().toString(36)}`, journal: meta.journal || 'Journal (to be confirmed)', volume: '—', pages: '—', abstract: meta.summary, relatedDatasetIds: [] };
    case 'photo':
    case 'video':
      return { ...base, type, caption: meta.summary, altText: meta.altText || meta.title, width: 1600, height: 1000, durationSec: type === 'video' ? 120 : undefined, transcript: type === 'video' ? 'Transcript pending (auto-transcription simulated).' : undefined };
    case 'event':
      return { ...base, type, eventType: meta.eventType ?? 'Workshop', date: meta.date ?? now.slice(0, 10), venue: meta.venue ?? 'TBC', description: meta.summary, photoIds: [], reportIds: [] };
    case 'blog':
      return { ...base, type, readingMinutes: 3, versions: { general: [{ id: 's1', heading: 'Story', body: meta.summary }] }, citations: [], glossaryTerms: [], attachments };
    case 'expedition':
      return {
        ...base, type, number: 'NEW', name: meta.title, startDate: meta.date || now.slice(0, 10), endDate: meta.endDate || meta.date || now.slice(0, 10), vessel: meta.vessel || undefined, leader: meta.authors[0] ?? 'TBC',
        team: meta.authors.map((n) => ({ name: n, role: 'Member', institute: 'NCPOR (demo)' })), teamSize: meta.authors.length, objectives: meta.objectives?.length ? meta.objectives : sentences.slice(0, 3), track: [[73.8, 15.4]], highlights: sentences.slice(0, 2),
        timeline: [{ date: meta.date || now.slice(0, 10), title: 'Expedition logged', text: meta.summary }],
      };
  }
}
