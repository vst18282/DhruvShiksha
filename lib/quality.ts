import type { ArchiveItem } from '@/types';

/** Metadata completeness score (0–100) with a list of missing fields — drives "content health". */
export function metadataQuality(it: ArchiveItem): { score: number; missing: string[] } {
  const checks: [boolean, string][] = [
    [it.title.length >= 12, 'descriptive title'],
    [it.summary.length >= 60, 'summary (60+ chars)'],
    [it.tags.length >= 3, 'at least 3 tags'],
    [it.authors.length > 0 && !!it.authors[0], 'authors'],
    [!!it.station || it.region === 'southern_ocean' || it.region === 'indian_ocean', 'station'],
    [!!it.expeditionId || it.type === 'event' || it.type === 'blog', 'expedition link'],
    [!!it.licence, 'licence'],
    [!!it.credit && it.credit.length > 3, 'credit line'],
  ];
  if (it.type === 'photo' || it.type === 'video') checks.push([it.altText.length > 20, 'alt text']);
  if (it.type === 'video') checks.push([!!it.transcript, 'transcript']);
  if (it.type === 'report') checks.push([it.attachments.length > 0, 'attachments'], [it.keyFindings.length > 0, 'key findings']);
  if (it.type === 'dataset') checks.push([it.variables.length > 0, 'data dictionary'], [!!it.doi, 'DOI']);
  if (it.accessLevel === 'embargoed') checks.push([!!it.embargoUntil, 'embargo date']);
  const ok = checks.filter((c) => c[0]).length;
  return { score: Math.round((ok / checks.length) * 100), missing: checks.filter((c) => !c[0]).map((c) => c[1]) };
}
