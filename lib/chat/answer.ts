import type { ArchiveItem, SourceRef } from '@/types';
import { SearchService, itemBodyText, parseQuery } from '@/lib/search';
import { allItems, findItem, itemHref, publishedItems } from '@/lib/archive';
import { normalize, tokenize } from '@/lib/search/text';
import { GLOSSARY } from '@/data/glossary';
import { STATIONS } from '@/data/stations';
import type { PageContext } from '@/store/page-context';
import type { ChatAnswer, ChatAttachment } from './types';

/**
 * "Ask the Archive" answer builder — retrieval-only (no generation), so it never invents facts.
 * 1. Retrieve items via the shared SearchService (or restrict to the current page's item).
 * 2. Score sentences (passages) from retrieved items against expanded query terms.
 * 3. Compose summary + key facts + citations + attachments from the best passages.
 * SWAP POINT: pass the retrieved passages to a real LLM for fluent answers with citations.
 */

export const POPULAR_TOPICS = ['Ice core findings', 'Bharati station', 'Krill survey', 'Sea-ice extent', 'Himalayan glaciers', 'Antarctic Treaty', 'Ozone hole', 'How to become a polar scientist'];

interface Passage {
  text: string;
  item: ArchiveItem;
  score: number;
}

function sentences(it: ArchiveItem): string[] {
  const raw = `${it.summary} ${itemBodyText(it)}`;
  return Array.from(new Set(raw.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 25 && s.length < 400)));
}

function scorePassages(items: ArchiveItem[], query: string): Passage[] {
  const parsed = parseQuery(query);
  const weights = parsed.weights;
  const out: Passage[] = [];
  items.forEach((item, rank) => {
    sentences(item).forEach((s) => {
      const toks = tokenize(s);
      const set = new Set(toks);
      for (let i = 0; i < toks.length - 1; i++) set.add(`${toks[i]}_${toks[i + 1]}`);
      let score = 0;
      weights.forEach((w, t) => {
        if (set.has(t)) score += w;
      });
      if (score > 0) out.push({ text: s, item, score: score / (1 + rank * 0.25) });
    });
  });
  return out.sort((a, b) => b.score - a.score);
}

function attachmentsOf(it: ArchiveItem): ChatAttachment[] {
  const href = itemHref(it);
  if ('attachments' in it && it.attachments.length) return it.attachments.slice(0, 2).map((file) => ({ itemId: it.id, file, itemTitle: it.title, href }));
  if (it.type === 'dataset') return [{ itemId: it.id, file: { id: `${it.id}-csv`, name: `${it.slug}.csv`, kind: 'csv', sizeKb: Math.round(it.sizeMb * 1024) }, itemTitle: it.title, href }];
  if (it.type === 'publication') return [{ itemId: it.id, file: { id: `${it.id}-pdf`, name: `${it.slug}.pdf`, kind: 'pdf', sizeKb: 1800 }, itemTitle: it.title, href }];
  return [];
}

function followUps(query: string, top?: ArchiveItem): string[] {
  const out: string[] = [];
  if (top?.station) out.push(`Show photos from ${top.station[0].toUpperCase() + top.station.slice(1)}`);
  if (top?.expeditionId) {
    const e = findItem(top.expeditionId);
    if (e) out.push(`What else happened on ${e.type === 'expedition' ? e.number : e.title}?`);
  }
  if (top && top.type !== 'dataset') out.push(`Is there a dataset on ${top.tags[0]}?`);
  const g = GLOSSARY.find((x) => top?.tags.some((t) => x.term.toLowerCase().includes(t.toLowerCase())));
  if (g) out.push(`Explain “${g.term}” simply`);
  if (!out.length) out.push(...POPULAR_TOPICS.slice(0, 3));
  return Array.from(new Set(out.filter((f) => f.toLowerCase() !== query.toLowerCase()))).slice(0, 3);
}

const SUMMARY_INTENT = /\b(summar|about this|what is this|overview|tl;?dr|explain this|key (points|findings)|main points)/i;

function notFound(scope: 'all' | 'page', query: string): ChatAnswer {
  const concepts = parseQuery(query).concepts.map((c) => c.label);
  return {
    found: false,
    summary: scope === 'page' ? 'I couldn’t find this on the current page. Try switching the scope to “All” to search the whole archive.' : 'I couldn’t find this in the archive. I only answer from archive content, so here are some topics I can help with.',
    facts: [],
    citations: [],
    attachments: [],
    related: [],
    followUps: concepts.length ? concepts.slice(0, 3) : POPULAR_TOPICS.slice(0, 4),
    scope,
  };
}

export function answerQuestion(query: string, scope: 'all' | 'page', page: PageContext | null): ChatAnswer {
  const q = query.trim();
  if (!q) return notFound(scope, q);

  let pool: ArchiveItem[];
  if (scope === 'page' && page) {
    if (page.type === 'station') pool = publishedItems().filter((i) => i.station === page.id);
    else {
      const it = findItem(page.id) ?? allItems().find((i) => i.id === page.id);
      pool = it ? [it] : [];
    }
    if (!pool.length) return notFound('page', q);
    // Generic "summarise this page" requests: answer directly from the item's own content.
    if (SUMMARY_INTENT.test(q) && page.type !== 'station') {
      const it = pool[0];
      const facts = 'keyFindings' in it ? it.keyFindings : 'highlights' in it ? it.highlights : sentences(it).slice(1, 4);
      return {
        found: true,
        summary: it.summary,
        facts: facts.slice(0, 5),
        citations: [{ ref: { type: it.type, id: it.id }, title: it.title, href: itemHref(it) }],
        attachments: attachmentsOf(it),
        related: [],
        followUps: followUps(q, it),
        primaryHref: itemHref(it),
        scope,
      };
    }
    const refs: SourceRef[] = pool.map((i) => ({ type: i.type, id: i.id }));
    const res = SearchService.search(q, {}, { refs, includeUnpublished: true });
    pool = res.results.length ? res.results.map((r) => r.item) : pool;
  } else {
    const res = SearchService.search(q);
    // Prefer text-rich items; media only when the user asks for photos/videos.
    const wantsMedia = /\b(photo|picture|image|video)s?\b/i.test(q);
    const ranked = res.results.filter((r) => wantsMedia || (r.item.type !== 'photo' && r.item.type !== 'video'));
    if (!ranked.length || ranked[0].score < 0.2) return notFound('all', q);
    const cutoff = ranked[0].score * 0.55;
    pool = ranked.filter((r) => r.score >= cutoff).slice(0, 6).map((r) => r.item);
    if (pool.length < 4) pool = [...pool, ...ranked.slice(pool.length, 6).map((r) => r.item)];
  }

  // Passages come only from the strongest items (related row shows the rest).
  const passages = scorePassages(pool.slice(0, 3), q);
  if (!passages.length) return notFound(scope, q);

  // Station questions ("Bharati station", "tell me about Himadri") lead with the station profile.
  const nq = normalize(q.replace(/bharti|bharathi/gi, 'bharati'));
  const st = scope === 'all' ? STATIONS.find((s) => nq.includes(s.slug)) : undefined;
  if (st && nq.split(' ').length <= 6) {
    const top = pool[0];
    return {
      found: true,
      summary: `${st.name} station (${st.location}) — ${st.description}`,
      facts: [`Established: ${st.established} (demo timeline)`, ...st.facts.map((f) => `${f.label}: ${f.value}`)].slice(0, 5),
      citations: [
        { ref: { type: 'expedition', id: st.slug }, title: `${st.name} station page`, href: `/stations/${st.slug}` },
        ...pool.slice(0, 2).map((i) => ({ ref: { type: i.type, id: i.id }, title: i.title, href: itemHref(i) })),
      ],
      attachments: pool.slice(0, 2).flatMap(attachmentsOf).slice(0, 2),
      related: pool.slice(2, 5).map((i) => ({ ref: { type: i.type, id: i.id }, title: i.title, href: itemHref(i), type: i.type })),
      followUps: followUps(q, top),
      primaryHref: `/stations/${st.slug}`,
      scope,
    };
  }

  const top = passages[0].item;
  const used = new Set<string>();
  const pick = (n: number, from: Passage[]) => {
    const out: Passage[] = [];
    for (const p of from) {
      if (out.length >= n) break;
      if (used.has(p.text)) continue;
      used.add(p.text);
      out.push(p);
    }
    return out;
  };
  const summaryP = pick(2, passages);
  const factsP = pick(4, passages);
  const extraFindings = 'keyFindings' in top ? top.keyFindings.filter((f) => !used.has(f)).slice(0, Math.max(0, 3 - factsP.length)) : [];
  const citedItems = Array.from(new Map([...summaryP, ...factsP].map((p) => [p.item.id, p.item])).values()).slice(0, 4);
  const related = scope === 'all' ? pool.filter((i) => !citedItems.some((c) => c.id === i.id)).slice(0, 3) : [];

  return {
    found: true,
    summary: summaryP.map((p) => p.text).join(' '),
    facts: [...factsP.map((p) => p.text), ...extraFindings].slice(0, 5),
    citations: citedItems.map((i) => ({ ref: { type: i.type, id: i.id }, title: i.title, href: itemHref(i) })),
    attachments: citedItems.flatMap(attachmentsOf).slice(0, 3),
    related: related.map((i) => ({ ref: { type: i.type, id: i.id }, title: i.title, href: itemHref(i), type: i.type })),
    followUps: followUps(q, top),
    primaryHref: itemHref(top),
    scope,
  };
}
