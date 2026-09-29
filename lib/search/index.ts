import Fuse from 'fuse.js';
import type { AccessLevel, ArchiveItem, ContentType, Discipline, LanguageCode, Region, SourceRef, StationSlug } from '@/types';
import { allItems, canViewerSee, itemHref, publishedItems } from '@/lib/archive';
import { STATION_NAMES, REGION_META, DISCIPLINE_LABELS } from '@/lib/constants';
import { GLOSSARY } from '@/data/glossary';
import { ALIASES, CONCEPTS, type Concept } from './concepts';
import { levenshtein, normalize, stem, STOPWORDS, tokenize, trigramSimilarity } from './text';

/* ============================================================================
 * SearchService — "semantic-ish" hybrid search, 100% in-browser.
 *   1. Normalise + alias-correct + fuzzy-correct query tokens ("bharti" → bharati)
 *   2. Expand with concept/synonym map ("melting" → ablation, retreat, thaw…)
 *   3. BM25 scoring over weighted fields (title, tags, summary, body, metadata)
 *   4. Fuse.js fuzzy score on title/tags for typo tolerance
 *   5. Combine into relevance + "why matched" hints
 * Swap point: replace `search()` with an embeddings/vector call (e.g. transformers.js
 * or a server endpoint) while keeping the same SearchResult shape.
 * ========================================================================== */

export interface SearchFilters {
  types?: ContentType[];
  yearFrom?: number;
  yearTo?: number;
  regions?: Region[];
  stations?: StationSlug[];
  disciplines?: Discipline[];
  access?: AccessLevel[];
  languages?: LanguageCode[];
  sort?: 'relevance' | 'newest' | 'views';
}

export interface SearchScope {
  /** Restrict to specific items (used by chatbot "Current page" and Studio). */
  refs?: SourceRef[];
  includeUnpublished?: boolean;
}

export interface SearchResult {
  item: ArchiveItem;
  href: string;
  score: number;
  why: string[];
  snippet: string;
  highlights: string[];
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  counts: Record<ContentType | 'all', number>;
  didYouMean?: string;
  concepts: string[];
  tookMs: number;
}

interface Doc {
  item: ArchiveItem;
  tf: Map<string, number>;
  len: number;
  body: string;
  languages: LanguageCode[];
}

interface Index {
  docs: Doc[];
  df: Map<string, number>;
  avgLen: number;
  vocab: string[];
  fuse: Fuse<{ id: string; title: string; tags: string }>;
  source: ArchiveItem[];
}

const FIELD_W = { title: 3, tags: 2.4, meta: 2, summary: 1.5, body: 1 };

export function itemBodyText(it: ArchiveItem): string {
  switch (it.type) {
    case 'blog':
      return [...it.versions.general, ...(it.versions.expert ?? [])].map((s) => `${s.heading}. ${s.body}`).join(' ');
    case 'report':
      return [...it.keyFindings, ...it.sections.map((s) => `${s.heading}. ${s.body}`)].join(' ');
    case 'dataset':
      return [...it.keyFindings, ...it.variables.map((v) => `${v.name} ${v.description}`), it.temporalCoverage].join(' ');
    case 'publication':
      return `${it.abstract} ${it.journal}`;
    case 'photo':
    case 'video':
      return `${it.caption} ${it.altText} ${it.transcript ?? ''}`;
    case 'event':
      return `${it.description} ${it.venue} ${it.eventType}`;
    case 'expedition':
      return [...it.objectives, ...it.highlights, it.number, it.vessel ?? '', it.leader].join(' ');
  }
}

function metaText(it: ArchiveItem): string {
  return [
    REGION_META[it.region].label,
    it.station ? STATION_NAMES[it.station] : '',
    DISCIPLINE_LABELS[it.discipline],
    it.type,
    String(it.year),
    it.authors.join(' '),
  ].join(' ');
}

/** Tokens + adjacent bigrams (joined with "_") for phrase matching. */
function terms(text: string): string[] {
  const toks = tokenize(text);
  const out = [...toks];
  for (let i = 0; i < toks.length - 1; i++) out.push(`${toks[i]}_${toks[i + 1]}`);
  return out;
}

let INDEX: Index | null = null;

function getIndex(): Index {
  const source = allItems();
  if (INDEX && INDEX.source === source) return INDEX;
  const df = new Map<string, number>();
  const docs: Doc[] = source.map((item) => {
    const tf = new Map<string, number>();
    const add = (text: string, w: number) => {
      for (const t of terms(text)) tf.set(t, (tf.get(t) ?? 0) + w);
    };
    const body = itemBodyText(item);
    add(item.title, FIELD_W.title);
    add(item.tags.join(' . '), FIELD_W.tags);
    add(metaText(item), FIELD_W.meta);
    add(item.summary, FIELD_W.summary);
    add(body, FIELD_W.body);
    tf.forEach((_, t) => df.set(t, (df.get(t) ?? 0) + 1));
    let len = 0;
    tf.forEach((v) => (len += v));
    const languages: LanguageCode[] = ['en'];
    if (item.type === 'blog' && item.translations) (Object.keys(item.translations) as LanguageCode[]).forEach((l) => languages.push(l));
    return { item, tf, len, body, languages };
  });
  const avgLen = docs.reduce((a, d) => a + d.len, 0) / Math.max(1, docs.length);
  const vocab = Array.from(df.keys()).filter((t) => !t.includes('_') && t.length > 2);
  const fuse = new Fuse(
    source.map((i) => ({ id: i.id, title: i.title, tags: i.tags.join(' ') })),
    { keys: [{ name: 'title', weight: 0.7 }, { name: 'tags', weight: 0.3 }], includeScore: true, threshold: 0.42, ignoreLocation: true, minMatchCharLength: 3 },
  );
  INDEX = { docs, df, avgLen, vocab, fuse, source };
  return INDEX;
}

const TYPE_HINTS: Record<string, ContentType> = {
  report: 'report', reports: 'report', blog: 'blog', blogs: 'blog', article: 'blog', articles: 'blog', story: 'blog', stories: 'blog',
  dataset: 'dataset', datasets: 'dataset', data: 'dataset', paper: 'publication', papers: 'publication', publication: 'publication', publications: 'publication',
  photo: 'photo', photos: 'photo', picture: 'photo', pictures: 'photo', image: 'photo', images: 'photo', video: 'video', videos: 'video',
  event: 'event', events: 'event', workshop: 'event', expedition: 'expedition', expeditions: 'expedition',
};

const TRIGGER_WORDS = new Set(CONCEPTS.flatMap((c) => c.triggers.flatMap((t) => normalize(t).split(' '))));

interface ParsedQuery {
  weights: Map<string, number>;
  /** term -> label for "why matched" */
  labels: Map<string, string>;
  concepts: Concept[];
  typeHints: ContentType[];
  corrected: string;
  didYouMean?: string;
  highlights: string[];
}

/** Convert a natural phrase to its index term (single stemmed token or bigram). */
function phraseTerm(p: string): string[] {
  const t = tokenize(p);
  if (t.length === 0) return [];
  if (t.length === 1) return t;
  const out: string[] = [];
  for (let i = 0; i < t.length - 1; i++) out.push(`${t[i]}_${t[i + 1]}`);
  return out;
}

export function parseQuery(query: string): ParsedQuery {
  const idx = getIndex();
  const words = normalize(query).split(' ').filter(Boolean);
  let changed = false;
  const fixed = words.map((w) => {
    if (ALIASES[w]) {
      changed = true;
      return ALIASES[w];
    }
    return w;
  });
  // Fuzzy-correct unknown content words against the vocabulary (concept trigger words are protected).
  const corrected = fixed.map((w) => {
    if (STOPWORDS.has(w) || w.length < 4 || TYPE_HINTS[w] || TRIGGER_WORDS.has(w)) return w;
    const s = stem(w);
    if (idx.df.has(s)) return w;
    const maxD = w.length >= 7 ? 2 : 1;
    let best: string | null = null;
    let bestDf = 0;
    for (const v of idx.vocab) {
      if (Math.abs(v.length - s.length) > maxD) continue;
      if (levenshtein(s, v, maxD) <= maxD) {
        const d = idx.df.get(v) ?? 0;
        if (d > bestDf) {
          best = v;
          bestDf = d;
        }
      }
    }
    if (!best) {
      let bestSim = 0.5;
      for (const v of idx.vocab) {
        const sim = trigramSimilarity(s, v);
        if (sim > bestSim) {
          bestSim = sim;
          best = v;
        }
      }
    }
    if (best && best !== s) {
      changed = true;
      return best;
    }
    return w;
  });
  const correctedStr = corrected.join(' ');
  const joined = ` ${correctedStr} `;

  const weights = new Map<string, number>();
  const labels = new Map<string, string>();
  const highlights = new Set<string>();
  const bump = (t: string, w: number, label: string) => {
    if (!idx.df.has(t)) return;
    if ((weights.get(t) ?? 0) < w) {
      weights.set(t, w);
      labels.set(t, label);
    }
  };

  const typeHints: ContentType[] = [];
  const content: string[] = [];
  corrected.forEach((w) => {
    if (TYPE_HINTS[w]) typeHints.push(TYPE_HINTS[w]);
    if (!STOPWORDS.has(w)) content.push(stem(w));
  });
  content.forEach((t, i) => {
    const isHint = !!TYPE_HINTS[corrected.find((w) => stem(w) === t) ?? ''];
    bump(t, isHint ? 0.3 : 1, t);
    highlights.add(t);
    if (i < content.length - 1) bump(`${t}_${content[i + 1]}`, 1.6, `${t} ${content[i + 1]}`);
  });

  // Concept expansion
  const concepts: Concept[] = [];
  for (const c of CONCEPTS) {
    const hit = c.triggers.some((tr) => {
      const n = normalize(tr);
      if (joined.includes(` ${n} `)) return true;
      if (!n.includes(' ')) return content.includes(stem(n));
      return false;
    });
    if (!hit) continue;
    concepts.push(c);
    for (const e of c.expands) {
      for (const t of phraseTerm(e)) bump(t, t.includes('_') ? 0.8 : 0.55, c.label);
      normalize(e)
        .split(' ')
        .forEach((w) => w.length > 2 && highlights.add(stem(w)));
    }
  }

  return {
    weights,
    labels,
    concepts,
    typeHints,
    corrected: correctedStr,
    didYouMean: changed && correctedStr !== normalize(query) ? correctedStr : undefined,
    highlights: Array.from(highlights),
  };
}

function bm25(doc: Doc, weights: Map<string, number>, N: number, df: Map<string, number>, avgLen: number) {
  const k1 = 1.2;
  const b = 0.6;
  let score = 0;
  const matched: string[] = [];
  weights.forEach((w, t) => {
    const f = doc.tf.get(t);
    if (!f) return;
    const n = df.get(t) ?? 0;
    const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
    score += w * idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * doc.len) / avgLen)));
    matched.push(t);
  });
  return { score, matched };
}

function passes(it: ArchiveItem, f: SearchFilters, langs: LanguageCode[]): boolean {
  if (f.types?.length && !f.types.includes(it.type)) return false;
  if (f.yearFrom && it.year < f.yearFrom) return false;
  if (f.yearTo && it.year > f.yearTo) return false;
  if (f.regions?.length && !f.regions.includes(it.region)) return false;
  if (f.stations?.length && (!it.station || !f.stations.includes(it.station))) return false;
  if (f.disciplines?.length && !f.disciplines.includes(it.discipline)) return false;
  if (f.access?.length && !f.access.includes(it.accessLevel)) return false;
  if (f.languages?.length && !f.languages.some((l) => langs.includes(l))) return false;
  return true;
}

function makeSnippet(doc: Doc, highlights: string[]): string {
  const text = `${doc.item.summary} ${doc.body}`;
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 20);
  if (!sentences.length) return doc.item.summary;
  let best = sentences[0];
  let bestHits = -1;
  for (const s of sentences.slice(0, 40)) {
    const toks = new Set(tokenize(s));
    const hits = highlights.filter((h) => toks.has(h)).length;
    if (hits > bestHits) {
      best = s;
      bestHits = hits;
    }
  }
  return best.length > 240 ? best.slice(0, 237) + '…' : best;
}

const ALL_TYPES: ContentType[] = ['blog', 'report', 'dataset', 'publication', 'photo', 'video', 'event', 'expedition'];

export const SearchService = {
  search(query: string, filters: SearchFilters = {}, scope: SearchScope = {}): SearchResponse {
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    const idx = getIndex();
    const q = query.trim();
    const pool = idx.docs.filter((d) => {
      if (!scope.includeUnpublished && d.item.status !== 'published') return false;
      if (!scope.includeUnpublished && !canViewerSee(d.item)) return false;
      if (scope.refs && !scope.refs.some((r) => r.id === d.item.id)) return false;
      return true;
    });
    let results: SearchResult[] = [];
    let parsed: ParsedQuery | null = null;

    if (!q) {
      results = pool.map((d) => ({ item: d.item, href: itemHref(d.item), score: 0, why: [], snippet: d.item.summary, highlights: [] }));
    } else {
      parsed = parseQuery(q);
      const fuseHits = new Map<string, number>();
      idx.fuse.search(parsed.corrected || q).forEach((h) => fuseHits.set(h.item.id, h.score ?? 1));
      const raw = pool.map((d) => ({ d, ...bm25(d, parsed!.weights, idx.docs.length, idx.df, idx.avgLen) }));
      const max = Math.max(0.0001, ...raw.map((r) => r.score));
      results = raw
        .map(({ d, score, matched }) => {
          const fz = fuseHits.has(d.item.id) ? 1 - (fuseHits.get(d.item.id) ?? 1) : 0;
          let rel = (score / max) * 0.78 + fz * 0.22 + Math.log10(1 + d.item.views) * 0.004;
          if (parsed!.typeHints.includes(d.item.type)) rel *= 1.35;
          else if (!parsed!.typeHints.length && parsed!.concepts.some((c) => c.boostType === d.item.type)) rel *= 1.5;
          const why = Array.from(new Set(matched.map((m) => parsed!.labels.get(m) ?? m))).slice(0, 4);
          if (fz > 0.4 && why.length === 0) why.push('similar title');
          return { item: d.item, href: itemHref(d.item), score: rel, why, snippet: makeSnippet(d, parsed!.highlights), highlights: parsed!.highlights, keep: score > 0 || fz > 0.35 };
        })
        .filter((r) => r.keep && r.score > 0.08)
        .map(({ keep: _k, ...r }) => r);
    }

    const langOf = (it: ArchiveItem) => idx.docs.find((d) => d.item === it)?.languages ?? ['en'];
    const facetBase = results.filter((r) => passes(r.item, { ...filters, types: undefined }, langOf(r.item)));
    const counts = { all: facetBase.length } as Record<ContentType | 'all', number>;
    ALL_TYPES.forEach((t) => (counts[t] = facetBase.filter((r) => r.item.type === t).length));

    results = facetBase.filter((r) => !filters.types?.length || filters.types.includes(r.item.type));
    const sort = filters.sort ?? (q ? 'relevance' : 'newest');
    if (sort === 'newest') results.sort((a, b) => b.item.year - a.item.year || b.item.createdAt.localeCompare(a.item.createdAt));
    else if (sort === 'views') results.sort((a, b) => b.item.views - a.item.views);
    else results.sort((a, b) => b.score - a.score);

    return {
      query: q,
      results,
      counts,
      didYouMean: parsed?.didYouMean,
      concepts: parsed?.concepts.map((c) => c.label) ?? [],
      tookMs: Math.round((typeof performance !== 'undefined' ? performance.now() : 0) - t0),
    };
  },

  /** Autocomplete suggestions grouped by type + matched topics/glossary. */
  suggest(query: string) {
    const q = query.trim();
    if (q.length < 2) return { groups: [] as { type: ContentType; items: SearchResult[] }[], topics: [] as string[] };
    const res = SearchService.search(q, {}, {});
    const groups = (['blog', 'report', 'expedition', 'dataset'] as ContentType[])
      .map((type) => ({ type, items: res.results.filter((r) => r.item.type === type).slice(0, 3) }))
      .filter((g) => g.items.length);
    const nq = normalize(q);
    const topics = Array.from(
      new Set([
        ...res.concepts,
        ...GLOSSARY.filter((g) => normalize(g.term).includes(nq) || nq.split(' ').some((w) => w.length > 3 && normalize(g.term).includes(w))).map((g) => g.term),
      ]),
    ).slice(0, 5);
    return { groups, topics, didYouMean: res.didYouMean };
  },

  /** Content-based related items (section 11). */
  related(item: ArchiveItem, limit = 6): { item: ArchiveItem; href: string; reason: string }[] {
    const pool = publishedItems().filter((i) => i.id !== item.id && !(i.type === 'photo' && item.type !== 'photo'));
    const text = SearchService.search(`${item.title} ${item.tags.slice(0, 5).join(' ')}`, {}, {});
    const textScore = new Map(text.results.map((r) => [r.item.id, r.score]));
    const tagSet = new Set(item.tags.map((t) => t.toLowerCase()));
    const scored = pool.map((c) => {
      const shared = c.tags.filter((t) => tagSet.has(t.toLowerCase()) && !['expedition', 'dataset', 'photo', 'video'].includes(t));
      const jac = shared.length / (new Set([...c.tags, ...item.tags]).size || 1);
      const reasons: [number, string][] = [];
      if (item.expeditionId && c.expeditionId === item.expeditionId) reasons.push([2.5, 'Same expedition']);
      if (item.station && c.station === item.station) reasons.push([1.2, `Same station: ${STATION_NAMES[item.station]}`]);
      if (c.discipline === item.discipline) reasons.push([0.8, `Same field: ${DISCIPLINE_LABELS[item.discipline]}`]);
      if (c.region === item.region) reasons.push([0.4, REGION_META[item.region].label]);
      if (shared.length) reasons.push([jac * 4 + shared.length * 0.3, `Shared tags: ${shared.slice(0, 2).join(', ')}`]);
      const ts = (textScore.get(c.id) ?? 0) * 2;
      if (ts > 0.6) reasons.push([ts, 'Similar topic']);
      const score = reasons.reduce((a, r) => a + r[0], 0);
      reasons.sort((a, b) => b[0] - a[0]);
      return { item: c, score, reason: reasons[0]?.[1] ?? 'Related', href: itemHref(c) };
    });
    scored.sort((a, b) => b.score - a.score);
    // Diversify: max 2 per type.
    const out: typeof scored = [];
    const perType = new Map<ContentType, number>();
    for (const s of scored) {
      if (out.length >= limit) break;
      const n = perType.get(s.item.type) ?? 0;
      if (n >= 2) continue;
      perType.set(s.item.type, n + 1);
      out.push(s);
    }
    return out.map(({ item: i, href, reason }) => ({ item: i, href, reason }));
  },
};

/** Split highlighted text into parts for rendering <mark>. */
export function highlightParts(text: string, stems: string[]): { text: string; hit: boolean }[] {
  if (!stems.length) return [{ text, hit: false }];
  const parts: { text: string; hit: boolean }[] = [];
  const re = /([\p{L}\p{N}]+)|([^\p{L}\p{N}]+)/gu;
  let m: RegExpExecArray | null;
  const set = new Set(stems);
  while ((m = re.exec(text))) {
    const w = m[0];
    const isWord = !!m[1];
    const hit = isWord && w.length > 2 && set.has(stem(normalize(w)));
    const last = parts[parts.length - 1];
    if (last && last.hit === hit) last.text += w;
    else parts.push({ text: w, hit });
  }
  return parts;
}
