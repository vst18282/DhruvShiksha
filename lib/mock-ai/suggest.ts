import type { ContentType, Discipline, Region, StationSlug } from '@/types';
import { SearchService } from '@/lib/search';
import { TOPICS, type Topic } from '@/data/topics';
import { publishedItems } from '@/lib/archive';
import { normalize, trigramSimilarity } from '@/lib/search/text';

/**
 * SIMULATED "AI" metadata suggestion for uploads. Matches the file name against the archive
 * with the search layer and borrows metadata from the closest topic.
 * SWAP POINT: call a real vision / document-understanding model here.
 */
export interface SuggestedMeta {
  title: string;
  summary: string;
  keywords: string[];
  tags: string[];
  region: Region;
  station?: StationSlug;
  discipline: Discipline;
  expeditionId?: string;
  year: number;
  altText?: string;
  extractedSummary?: string;
  confidence: number;
}

export function fileBase(name: string) {
  return name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function topicFor(query: string): { topic?: Topic; score: number } {
  const r = SearchService.search(query).results.find((x) => x.item.type !== 'expedition');
  if (!r) return { score: 0 };
  const key = r.item.id.replace(/^(rep|blog|pub|ds|photo|video)-/, '').replace(/-\d+$/, '');
  const topic = TOPICS.find((t) => key.startsWith(t.key) || r.item.id.includes(t.key));
  return { topic, score: Math.min(0.95, r.score) };
}

export function suggestMetadata(fileNames: string[], type: ContentType): SuggestedMeta {
  const q = fileNames.map(fileBase).join(' ');
  const { topic, score } = topicFor(q || type);
  const pretty = fileBase(fileNames[0] ?? 'Untitled upload').replace(/\b\w/g, (c) => c.toUpperCase());
  if (!topic) {
    return { title: pretty, summary: `Uploaded ${type} “${pretty}”. Please describe what it contains.`, keywords: [], tags: [type], region: 'antarctica', discipline: 'outreach', year: new Date().getFullYear(), confidence: 0.2 };
  }
  const t = topic;
  const photoLike = type === 'photo' || type === 'video';
  return {
    title: photoLike ? `${pretty} — ${t.blogTitle.split(':')[0]}` : `${pretty}: ${t.title.split(',')[0]}`,
    summary: photoLike ? `Field image related to “${t.title}”.` : `${t.summary} (Suggested from similar archive items — please edit.)`,
    keywords: t.tags.slice(0, 5),
    tags: [...t.tags.slice(0, 4), type],
    region: t.region,
    station: t.station,
    discipline: t.discipline,
    expeditionId: t.expeditionId,
    year: new Date().getFullYear(),
    altText: photoLike ? `Photo from ${t.station ? t.station[0].toUpperCase() + t.station.slice(1) + ' station' : t.region.replace('_', ' ')} showing ${t.tags[0]} and ${t.tags[1] ?? 'the landscape'}.` : undefined,
    extractedSummary: type === 'report' || type === 'publication' ? `Extracted (simulated): ${t.findings.slice(0, 2).join(' ')}` : undefined,
    confidence: Math.max(0.4, score),
  };
}

/** Simulated duplicate detection by filename / title similarity against the archive. */
export function findDuplicates(nameOrTitle: string, limit = 3) {
  const n = normalize(fileBase(nameOrTitle));
  if (n.length < 4) return [];
  return publishedItems()
    .map((i) => {
      const attachHit = 'attachments' in i && i.attachments.some((a) => normalize(fileBase(a.name)) === n);
      const sim = Math.max(trigramSimilarity(n, normalize(i.title)), trigramSimilarity(n, normalize(i.slug.replace(/^[a-z]+-/, '').replace(/-/g, ' '))));
      return { item: i, sim: attachHit ? 1 : sim };
    })
    .filter((x) => x.sim >= 0.45)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, limit);
}
