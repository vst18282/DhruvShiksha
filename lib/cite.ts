import type { ArchiveItem } from '@/types';

/** Citation generators (APA 7-ish, BibTeX, RIS). DOIs use the 10.5555 test prefix (demo). */
function doiOf(it: ArchiveItem): string | undefined {
  return it.type === 'dataset' || it.type === 'publication' ? it.doi : undefined;
}

function url(it: ArchiveItem) {
  return `https://polarverse.demo/${it.type === 'dataset' ? 'data' : it.type === 'publication' ? 'publications' : it.type === 'report' ? 'reports' : it.type === 'blog' ? 'blog' : it.type === 'event' ? 'events' : it.type === 'expedition' ? 'expeditions' : 'gallery'}/${it.slug}`;
}

function apaAuthors(a: string[]) {
  const fmt = (n: string) => {
    const parts = n.replace(/^Dr\.\s*/, '').split(' ');
    const last = parts.pop() ?? n;
    return `${last}, ${parts.map((p) => p[0] + '.').join(' ')}`.trim().replace(/,\s*$/, '');
  };
  if (a.length === 1) return fmt(a[0]);
  return a.slice(0, -1).map(fmt).join(', ') + ', & ' + fmt(a[a.length - 1]);
}

export function toApa(it: ArchiveItem): string {
  const doi = doiOf(it);
  const kind = it.type === 'dataset' ? ' [Data set]' : it.type === 'report' ? ' [Report]' : '';
  const venue = it.type === 'publication' ? ` ${it.journal}, ${it.volume}, ${it.pages}.` : ' National Centre for Polar and Ocean Research (demo).';
  return `${apaAuthors(it.authors)} (${it.year}). ${it.title}${kind}.${venue} ${doi ? `https://doi.org/${doi}` : url(it)}`;
}

export function toBibtex(it: ArchiveItem): string {
  const key = `${(it.authors[0] ?? 'ncpor').replace(/^Dr\.\s*/, '').split(' ').pop()?.toLowerCase()}${it.year}${it.slug.split('-')[1] ?? ''}`;
  const type = it.type === 'publication' ? 'article' : it.type === 'dataset' ? 'misc' : it.type === 'report' ? 'techreport' : 'misc';
  const lines = [
    `@${type}{${key},`,
    `  title = {${it.title}},`,
    `  author = {${it.authors.join(' and ')}},`,
    `  year = {${it.year}},`,
    it.type === 'publication' ? `  journal = {${it.journal}},\n  volume = {${it.volume}},\n  pages = {${it.pages}},` : `  institution = {NCPOR (demo)},`,
    doiOf(it) ? `  doi = {${doiOf(it)}},` : `  url = {${url(it)}},`,
    `  note = {Demo record}`,
    `}`,
  ];
  return lines.join('\n');
}

export function toRis(it: ArchiveItem): string {
  const ty = it.type === 'publication' ? 'JOUR' : it.type === 'dataset' ? 'DATA' : it.type === 'report' ? 'RPRT' : 'ELEC';
  const lines = [`TY  - ${ty}`, `TI  - ${it.title}`, ...it.authors.map((a) => `AU  - ${a}`), `PY  - ${it.year}`];
  if (it.type === 'publication') lines.push(`JO  - ${it.journal}`, `VL  - ${it.volume}`, `SP  - ${it.pages}`);
  else lines.push('PB  - NCPOR (demo)');
  const doi = doiOf(it);
  lines.push(doi ? `DO  - ${doi}` : `UR  - ${url(it)}`, `AB  - ${it.summary}`, 'N1  - Demo record', 'ER  - ');
  return lines.join('\n');
}
