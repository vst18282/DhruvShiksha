/**
 * MOCK AI SERVICE (frontend-only, deterministic).
 * Builds posts / articles / press notes / newsletters / summaries from the *real demo fields*
 * of the selected sources using templates + rule-based transforms (tone, difficulty,
 * scientific level, length, platform limits, special notes). `seed` rotates phrasings so
 * "Regenerate" yields a different variant.
 *
 * SWAP POINT — to use a real LLM set USE_MOCK_AI = false and implement `callRealModel`:
 *   const res = await fetch('/api/generate', { method: 'POST', body: JSON.stringify(req) });
 *   return (await res.json()) as GeneratedPiece[];
 * Keep the same GenerateRequest/GeneratedPiece contract so the Studio UI needs no changes.
 */
import type { ArchiveItem, LanguageCode, PlatformId, SourceRef } from '@/types';
import { findRef, itemHref } from '@/lib/archive';
import { itemBodyText } from '@/lib/search';
import { tokenize } from '@/lib/search/text';
import { BLOG_TRANSLATIONS } from '@/data/translations';
import { GLOSSARY } from '@/data/glossary';
import { LANGUAGES, PLATFORM_META, STATION_NAMES, REGION_META } from '@/lib/constants';
import { slugify } from '@/lib/utils';
import type { Citation, FactCheckRow, GeneratedArticle, GeneratedPiece, GenerateRequest, RephraseMode, SummaryResult, Tone } from './types';

export * from './types';
export const USE_MOCK_AI = true;
export const MODEL_NAME = 'demo-generator';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------ Source facts ------------------------------ */

interface Facts {
  ref: SourceRef;
  item: ArchiveItem;
  title: string;
  summary: string;
  findings: string[];
  sentences: string[];
  place: string;
  href: string;
  topicKey: string;
}

function topicKeyOf(id: string) {
  return id.replace(/^(rep|blog|pub|ds|photo|video|event)-/, '').replace(/-\d+$/, '');
}

function factsOf(ref: SourceRef): Facts | null {
  const item = findRef(ref);
  if (!item) return null;
  const findings =
    'keyFindings' in item && item.keyFindings.length
      ? item.keyFindings
      : 'highlights' in item && item.highlights.length
        ? item.highlights
        : itemBodyText(item).split(/(?<=[.!?])\s+/).filter((s) => s.length > 30).slice(0, 3);
  const sentences = `${item.summary} ${itemBodyText(item)}`.split(/(?<=[.!?])\s+/).filter((s) => s.length > 20);
  const place = item.station ? `${STATION_NAMES[item.station]} station` : REGION_META[item.region].label;
  return { ref, item, title: item.title, summary: item.summary, findings, sentences, place, href: `https://dhruvshiksha.demo${itemHref(item)}`, topicKey: topicKeyOf(item.id) };
}

/* ------------------------------ Word transforms ----------------------------- */

const JARGON: [RegExp, string, string][] = [
  [/\bablation\b/gi, 'surface melting', 'ablation'],
  [/\bfast[- ]ice\b/gi, 'sea ice fixed to the coast', 'fast ice'],
  [/δ18O|d18O/g, 'an oxygen “thermometer” in the ice', 'δ18O'],
  [/\bmass balance\b/gi, 'ice budget', 'mass balance'],
  [/\bkatabatic\b/gi, 'downhill', 'katabatic'],
  [/\bphytoplankton\b/gi, 'tiny ocean plants', 'phytoplankton'],
  [/\bzooplankton\b/gi, 'tiny drifting animals', 'zooplankton'],
  [/\baerosols?\b/gi, 'tiny particles in the air', 'aerosol'],
  [/\balbedo\b/gi, 'how much sunlight snow reflects', 'albedo'],
  [/\bpalaeoclimate\b/gi, 'past climate', 'palaeoclimate'],
  [/\bpermafrost\b/gi, 'frozen ground', 'permafrost'],
  [/\bgeomagnetic\b/gi, 'magnetic', 'geomagnetic'],
  [/\bpsychrophiles?\b/gi, 'cold-loving microbes', 'psychrophile'],
  [/\bpCO₂\b/g, 'carbon dioxide level', 'pCO₂'],
  [/\bCTD\b/g, 'ocean sensor', 'CTD'],
  [/\bGNSS\b/g, 'GPS', 'GNSS'],
  [/\bmetamorphic\b/gi, 'heat-changed', 'metamorphic'],
];

const ANALOGIES: [string, string][] = [
  ['ice core', 'It works a bit like reading the rings of a tree.'],
  ['sea ice', 'Think of it as a frozen lid on the ocean.'],
  ['glacier', 'A glacier is like a very slow river made of ice.'],
  ['krill', 'For whales, krill are like a giant bowl of popcorn.'],
  ['penguin', 'Penguins use pebbles the way we use bricks.'],
  ['aurora', 'It is like the sky’s own light show.'],
  ['ozone', 'Ozone is Earth’s sunscreen.'],
  ['black carbon', 'Dark snow melts faster, just like a black T-shirt feels hotter in the sun.'],
];

function transformJargon(text: string, level: 0 | 1 | 2, includeTerms: boolean): string {
  if (level === 0) return text;
  let out = text;
  for (const [re, simple] of JARGON) {
    out = out.replace(re, (m) => (level === 1 && includeTerms ? `${m} (${simple})` : level === 1 ? m : simple));
  }
  return out;
}

function simplifySentence(s: string, difficulty: GenerateRequest['difficulty']): string {
  let out = s.replace(/\s*\((?:demo|demo values?|demo findings?)\)/gi, ' (demo)');
  if (difficulty === 'class5' || difficulty === 'class8') {
    out = out
      .replace(/approximately|roughly/gi, 'about')
      .replace(/significant(ly)?/gi, 'big')
      .replace(/coincided with/gi, 'happened at the same time as')
      .replace(/indicative/gi, 'a first guess');
    // Split long sentences at commas for younger readers.
    if (out.length > 120 && out.includes(', ')) out = out.replace(/, (?=[a-z])/, '. ').replace(/\. ([a-z])/, (_, c: string) => `. ${c.toUpperCase()}`);
  }
  return out;
}

const EMOJI: Record<string, string[]> = {
  ice: ['🧊', '❄️'],
  penguin: ['🐧'],
  ocean: ['🌊', '🐋'],
  mountain: ['🏔️'],
  aurora: ['🌌', '✨'],
  core: ['🧊', '⏳'],
  station: ['🏠', '🛰️'],
  ship: ['🚢', '🌊'],
  night: ['🌌'],
};
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2728}\u{1F1E6}-\u{1F1FF}]\u{FE0F}?/gu;

export function stripEmojis(s: string) {
  return s.replace(EMOJI_RE, '').replace(/[ \t]{2,}/g, ' ').replace(/ +\n/g, '\n').trim();
}

/* --------------------------------- Hooks --------------------------------- */

const HOOKS: Record<Tone, ((f: Facts) => string)[]> = {
  Formal: [(f) => `New findings from ${f.place}: ${f.title}.`, (f) => `NCPOR shares results from ${f.place}.`, (f) => `Research update — ${f.title}.`],
  Friendly: [(f) => `Ever wondered what’s happening at ${f.place}?`, (f) => `Here’s something cool from ${f.place}!`, (f) => `Grab a cup of chai — here’s news from ${f.place}.`],
  Inspiring: [(f) => `Science at the edge of the world: ${f.title}.`, (f) => `Every measurement at ${f.place} tells a story about our changing planet.`, () => `Curiosity took our teams to the coldest places on Earth.`],
  Educational: [(f) => `Did you know? Scientists at ${f.place} are studying this right now.`, (f) => `Let’s learn something new from ${f.place}.`, () => `Here’s a quick science lesson from the poles.`],
  'News/Announcement': [(f) => `Just released: ${f.title}.`, (f) => `Announcement: new results from ${f.place}.`, (f) => `Out now on DhruvShiksha — ${f.title}.`],
  Playful: [() => `Ice, data and a little bit of adventure — here’s the scoop!`, (f) => `Plot twist from ${f.place}…`, () => `Breaking (the ice) news!`],
};

const WHY: Record<Tone, string[]> = {
  Formal: ['These observations support long-term monitoring of polar change.', 'The results strengthen India’s contribution to polar science.'],
  Friendly: ['Pretty amazing, right?', 'Small numbers, big story!'],
  Inspiring: ['Every data point brings us closer to understanding our planet.', 'This is why polar science matters for all of us.'],
  Educational: ['Why it matters: changes at the poles affect sea level, weather and ecosystems.', 'Why it matters: long records help us test climate models.'],
  'News/Announcement': ['Full details are now available in the archive.', 'Data and reports are open for exploration.'],
  Playful: ['Who knew ice could be this exciting?', 'Science: 1, winter: 0.'],
};

function pick<T>(arr: T[], seed: number, offset = 0): T {
  return arr[(seed + offset) % arr.length];
}

/* ------------------------------- Special notes ------------------------------ */

function parseNotes(notes: string) {
  const mentions = Array.from(notes.matchAll(/mention\s+([^,.;\n]+)/gi)).map((m) => m[1].trim());
  const tags = Array.from(notes.matchAll(/@[\w.]+/g)).map((m) => m[0]);
  const avoidJargon = /avoid (technical )?jargon|no jargon|simple words/i.test(notes);
  const includes = Array.from(notes.matchAll(/include\s+([^.;\n]+)/gi)).map((m) => m[1].trim());
  return { mentions, tags, avoidJargon, includes };
}

/* --------------------------------- Hashtags -------------------------------- */

function hashtagsFor(facts: Facts[], platform?: PlatformId): string[] {
  const base = ['#PolarScience', '#NCPOR'];
  const fromTags = facts.flatMap((f) => f.item.tags.slice(0, 4)).map((t) => '#' + t.replace(/[^A-Za-z0-9]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : '')).replace(/^./, (c) => c.toUpperCase()));
  const region = facts.map((f) => '#' + REGION_META[f.item.region].label.replace(/\s+/g, ''));
  const all = Array.from(new Set([...base, ...region, ...fromTags])).filter((h) => h.length > 3 && h.length < 26);
  const max = platform === 'instagram' ? 12 : platform === 'linkedin' ? 4 : platform === 'x' || platform === 'threads' ? 3 : 5;
  return all.slice(0, max);
}

export function suggestHashtags(sources: SourceRef[]): string[] {
  return hashtagsFor(sources.map(factsOf).filter((f): f is Facts => !!f), 'instagram');
}

/* ------------------------------ Core composer ------------------------------ */

interface Draft {
  sentences: string[];
  stylistic: Set<string>;
}

function composeCore(req: GenerateRequest, facts: Facts[], seed: number): Draft {
  const notes = parseNotes(req.attachments.specialNotes);
  const level: 0 | 1 | 2 = notes.avoidJargon ? 2 : req.difficulty === 'class5' ? 2 : req.scientificLevel;
  const f0 = facts[0];
  const stylistic = new Set<string>();
  const out: string[] = [];
  const hook = pick(HOOKS[req.tone], seed)(f0);
  out.push(hook);
  stylistic.add(hook);

  const nFind = req.length === 'short' ? 1 : req.length === 'medium' ? 2 : 3;
  const pool = facts.flatMap((f) => f.findings.map((x) => ({ f, x })));
  const rotated = [...pool.slice(seed % Math.max(1, pool.length)), ...pool.slice(0, seed % Math.max(1, pool.length))];
  const chosen = rotated.slice(0, nFind);
  if (req.length !== 'short' || req.outputType !== 'social') out.push(transformJargon(simplifySentence(f0.summary, req.difficulty), level, req.includeTerms));
  chosen.forEach(({ x }) => out.push(transformJargon(simplifySentence(x, req.difficulty), level, req.includeTerms)));

  if (req.difficulty === 'class5' || req.difficulty === 'class8' || level === 2) {
    const an = ANALOGIES.find(([k]) => facts.some((f) => f.item.tags.some((t) => t.includes(k))));
    if (an) {
      out.push(an[1]);
      stylistic.add(an[1]);
    }
  }
  if (req.difficulty === 'expert' && level === 0 && 'sections' in f0.item) {
    const m = f0.item.sections.find((s) => /method/i.test(s.heading));
    if (m) out.push(`Methods: ${m.body}`);
  }
  if (req.length === 'long' || req.outputType !== 'social') {
    const why = pick(WHY[req.tone], seed, 1);
    out.push(why);
    stylistic.add(why);
  }
  const vn = req.attachments.voiceNotes.find((v) => v.transcript.trim());
  if (vn && req.length !== 'short') {
    const q = `In the scientist’s own words: “${vn.transcript.trim().split(/(?<=[.!?])\s+/)[0]}”`;
    out.push(q);
  }
  notes.includes.forEach((inc) => out.push(`${inc[0].toUpperCase()}${inc.slice(1)}.`));
  notes.mentions.forEach((m) => {
    const s = req.tone === 'Formal' || req.tone === 'News/Announcement' ? `With thanks to ${m}.` : `Big shout-out to ${m}!`;
    out.push(s);
    stylistic.add(s);
  });
  if (req.options.cta) {
    const cta = `Read more on DhruvShiksha: ${f0.href}`;
    out.push(cta);
    stylistic.add(cta);
  }
  if (notes.tags.length) {
    const t = notes.tags.join(' ');
    out.push(t);
    stylistic.add(t);
  }
  if (req.options.citations) {
    const src = `Source: ${facts.map((f) => `${f.title} (NCPOR, ${f.item.year})`).join('; ')}. Demo data.`;
    out.push(src);
    stylistic.add(src);
  }
  return { sentences: out, stylistic };
}

function addEmojis(text: string, facts: Facts[], seed: number): string {
  const set = Array.from(new Set(facts.flatMap((f) => EMOJI[f.item.art] ?? ['🌍'])));
  const lines = text.split('\n');
  lines[0] = `${pick(set, seed)} ${lines[0]}`;
  return lines.join('\n').replace(/(!|\?)(\s|$)/, `$1 ${pick(set, seed, 1)}$2`);
}

/* ------------------------------ Platform shaping ----------------------------- */

function shapeForPlatform(d: Draft, platform: PlatformId, req: GenerateRequest, facts: Facts[], seed: number): { text: string; parts?: string[]; hashtags: string[] } {
  const tags = req.options.hashtags ? hashtagsFor(facts, platform) : [];
  const limit = PLATFORM_META[platform].limit;
  let s = [...d.sentences];
  if (platform === 'linkedin' && req.tone !== 'Formal') s[0] = `${facts[0].title} — ${s[0]}`;
  const join = (arr: string[]) => (req.options.emojis ? addEmojis(arr.join(platform === 'linkedin' || platform === 'facebook' ? '\n\n' : ' '), facts, seed) : arr.join(platform === 'linkedin' || platform === 'facebook' ? '\n\n' : ' '));
  const withTags = (t: string) => (tags.length ? `${t}\n\n${tags.join(' ')}` : t);

  switch (platform) {
    case 'x':
    case 'threads': {
      const full = withTags(join(s));
      if (full.length <= limit) return { text: full, hashtags: tags };
      if (req.options.thread) {
        const parts: string[] = [];
        let cur = '';
        for (const sent of s) {
          if ((cur + ' ' + sent).trim().length > limit - 12) {
            if (cur) parts.push(cur.trim());
            cur = sent;
          } else cur = `${cur} ${sent}`;
        }
        if (cur) parts.push(cur.trim());
        if (tags.length) parts[parts.length - 1] = `${parts[parts.length - 1]} ${tags.join(' ')}`.slice(0, limit - 8);
        const numbered = parts.map((p, i) => `${i + 1}/${parts.length} ${p}`);
        if (req.options.emojis) numbered[0] = addEmojis(numbered[0], facts, seed);
        return { text: numbered.join('\n\n'), parts: numbered, hashtags: tags };
      }
      // Trim sentences from the end (keep hook + first finding) to fit.
      while (s.length > 2 && withTags(join(s)).length > limit) s = s.slice(0, -1);
      let t = withTags(join(s));
      if (t.length > limit) t = t.slice(0, limit - 1) + '…';
      return { text: t, hashtags: tags };
    }
    case 'instagram': {
      const slides = [s[0], ...s.slice(1, -1).slice(0, 4), 'Swipe up via the link in bio to explore the data 🔗'].map((x, i, a) => `Slide ${i + 1}/${a.length}: ${x}`);
      const caption = `${join(s)}\n.\n.\n${tags.join(' ')}`;
      return { text: caption.slice(0, limit), parts: slides, hashtags: tags };
    }
    case 'youtube': {
      const desc = `${join(s)}\n\nChapters\n0:00 Introduction\n0:45 ${facts[0].item.type === 'report' && 'sections' in facts[0].item ? facts[0].item.sections[1]?.heading ?? 'The science' : 'The science'}\n1:40 What we found\n2:30 Why it matters\n\nLinks\n${facts.map((f) => `• ${f.title}: ${f.href}`).join('\n')}\n\n${tags.slice(0, 3).join(' ')}`;
      return { text: desc.slice(0, limit), hashtags: tags.slice(0, 3) };
    }
    case 'whatsapp': {
      const t = `*${facts[0].title}*\n\n${join(s.filter((x) => !x.startsWith('Source:')).slice(0, 4))}`;
      return { text: t.slice(0, limit), hashtags: [] };
    }
    default: {
      const t = withTags(join(s));
      return { text: t.slice(0, limit), hashtags: tags };
    }
  }
}

/* ----------------------------- Other output types ---------------------------- */

function buildArticle(req: GenerateRequest, facts: Facts[], seed: number): GeneratedArticle {
  const d = composeCore({ ...req, options: { ...req.options, cta: false, citations: false } }, facts, seed);
  const f0 = facts[0];
  const glossaryTerms = GLOSSARY.filter((g) => facts.some((f) => f.item.tags.some((t) => g.term.toLowerCase().includes(t) || t.includes(g.term.toLowerCase())))).slice(0, 5).map((g) => g.term);
  const title = req.tone === 'Playful' ? `${f0.place}: ${f0.title.split(':')[0]} — the fun version` : req.tone === 'News/Announcement' ? `New from ${f0.place}: ${f0.title}` : f0.title.length > 70 ? `${f0.title.slice(0, 67)}…` : f0.title;
  const sections = [
    { heading: 'What happened', body: d.sentences.slice(1, 3).join(' ') },
    { heading: 'What the team found', body: facts.flatMap((f) => f.findings).slice(0, 3).map((x) => transformJargon(simplifySentence(x, req.difficulty), req.scientificLevel, req.includeTerms)).join(' ') },
    { heading: 'Why it matters', body: pick(WHY[req.tone], seed, 1) + ' ' + (facts[1]?.summary ?? '') },
  ];
  if (req.length === 'long') sections.push({ heading: 'How the science was done', body: 'sections' in f0.item ? f0.item.sections.find((s) => /method/i.test(s.heading))?.body ?? f0.summary : f0.summary });
  return {
    title,
    intro: d.sentences[0] + ' ' + f0.summary,
    sections,
    keyFacts: facts.flatMap((f) => f.findings).slice(0, 4),
    glossaryTerms,
    imageSuggestions: [`Wide shot of ${f0.place}`, `Close-up of instruments used in “${f0.title.split(':')[0]}”`, 'Infographic of the key numbers (demo)'],
    seo: {
      metaTitle: `${title} | DhruvShiksha`.slice(0, 60),
      metaDescription: f0.summary.slice(0, 155),
      slug: slugify(title).slice(0, 60),
      keywords: Array.from(new Set(facts.flatMap((f) => f.item.tags))).slice(0, 8),
    },
  };
}

function articleToText(a: GeneratedArticle): string {
  return [`# ${a.title}`, a.intro, ...a.sections.map((s) => `## ${s.heading}\n${s.body}`), `## Key facts\n${a.keyFacts.map((k) => `- ${k}`).join('\n')}`].join('\n\n');
}

function buildPress(req: GenerateRequest, facts: Facts[], seed: number): string {
  const f0 = facts[0];
  const d = composeCore({ ...req, tone: 'Formal', options: { ...req.options, emojis: false, cta: false, citations: false } }, facts, seed);
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  return [
    `PRESS NOTE (DEMO)`,
    `${f0.title}`,
    `Goa, ${date} — ${d.sentences.slice(1, 3).join(' ')}`,
    facts.flatMap((f) => f.findings).slice(0, 3).map((x) => `• ${x}`).join('\n'),
    `“These observations help us understand how the polar regions are changing,” said ${f0.item.authors[0]} (demo quote).`,
    `About NCPOR: The National Centre for Polar and Ocean Research, Goa, under the Ministry of Earth Sciences, coordinates India’s polar and ocean research. (Demo boilerplate.)`,
    `Media contact: media@ncpor.demo`,
  ].join('\n\n');
}

function buildNewsletter(req: GenerateRequest, facts: Facts[], seed: number): string {
  const d = composeCore({ ...req, options: { ...req.options, citations: false } }, facts, seed);
  return [
    `Subject: ${pick(['This month at the poles', 'Fresh from the ice', 'Your polar science digest'], seed)} — ${facts[0].title.split(':')[0]}`,
    `Hello polar explorer,`,
    d.sentences.slice(0, 3).join(' '),
    ...facts.slice(0, 3).map((f) => `▸ ${f.title}\n${f.summary}\nRead: ${f.href}`),
    `Until next time — the DhruvShiksha team (demo).`,
  ].join('\n\n');
}

/* --------------------------------- Translation ------------------------------- */

const LANG_CTA: Partial<Record<LanguageCode, string>> = { hi: 'पूरा लेख पढ़ें:', mr: 'पूर्ण लेख वाचा:' };
const LANG_HOOK: Partial<Record<LanguageCode, string[]>> = {
  hi: ['ध्रुवों से नई जानकारी!', 'क्या आप जानते हैं?', 'विज्ञान की नई खोज:'],
  mr: ['ध्रुवांवरून नवी माहिती!', 'तुम्हाला माहीत आहे का?', 'विज्ञानातील नवा शोध:'],
};

function translate(en: string, lang: LanguageCode, facts: Facts[], seed: number, limit: number): { text: string; translated: 'hand-written demo' | 'placeholder' } {
  if (lang === 'hi' || lang === 'mr') {
    const tr = facts.map((f) => BLOG_TRANSLATIONS[f.topicKey]?.[lang]).find(Boolean);
    if (tr) {
      const text = [`${pick(LANG_HOOK[lang]!, seed)} ${tr.title}`, tr.summary, tr.sections[1]?.body ?? tr.sections[0]?.body, `${LANG_CTA[lang]} ${facts[0].href}`].filter(Boolean).join('\n\n');
      return { text: text.slice(0, limit), translated: 'hand-written demo' };
    }
  }
  const label = LANGUAGES.find((l) => l.code === lang)?.label ?? lang;
  return { text: `[${label} — demo translation placeholder, please verify]\n${en}`.slice(0, limit), translated: 'placeholder' };
}

/* --------------------------------- Fact check -------------------------------- */

export function factCheck(text: string, sources: SourceRef[], stylistic: Set<string> = new Set()): FactCheckRow[] {
  const facts = sources.map(factsOf).filter((f): f is Facts => !!f);
  const corpus = facts.flatMap((f) => f.sentences.map((s) => ({ f, s, toks: new Set(tokenize(s)) })));
  const sentences = text
    .replace(/^\s*(Slide \d+\/\d+:|\d+\/\d+)\s*/gm, '')
    .split(/(?<=[.!?”])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12 && !/^#/.test(s) && !/^(Chapters|Links|Subject:|PRESS NOTE)/.test(s));
  return sentences.map((sentence) => {
    const clean = stripEmojis(sentence);
    const isStyle = Array.from(stylistic).some((st) => clean.includes(stripEmojis(st).slice(0, 30))) || /^(Read more|Source:|Media contact|About NCPOR|Hello|Until next time|Big shout-out|With thanks|https?:)/.test(clean);
    const toks = tokenize(clean);
    let best: { f: Facts; s: string; score: number } | null = null;
    for (const c of corpus) {
      if (!toks.length) break;
      const inter = toks.filter((t) => c.toks.has(t)).length;
      const score = inter / toks.length;
      if (!best || score > best.score) best = { f: c.f, s: c.s, score };
    }
    const conf = best?.score ?? 0;
    const status: FactCheckRow['status'] = conf >= 0.5 ? 'supported' : conf >= 0.28 ? 'partial' : isStyle ? 'stylistic' : 'unsupported';
    return {
      sentence,
      status,
      confidence: Math.round(conf * 100) / 100,
      source: best && conf >= 0.28 ? { ref: best.f.ref, title: best.f.title, passage: best.s } : undefined,
    };
  });
}

/* ---------------------------------- Public API -------------------------------- */

async function callRealModel(_req: GenerateRequest): Promise<GeneratedPiece[]> {
  throw new Error('Real model not configured. Set USE_MOCK_AI = true or implement callRealModel().');
}

export async function generate(req: GenerateRequest): Promise<GeneratedPiece[]> {
  if (!USE_MOCK_AI) return callRealModel(req);
  await wait(1000 + Math.random() * 1500);
  const facts = req.sources.map(factsOf).filter((f): f is Facts => !!f);
  if (!facts.length) throw new Error('Select at least one source item.');
  const seed = req.seed ?? 0;
  const citations: Citation[] = facts.map((f) => ({ ref: f.ref, title: f.title, text: `${f.title} (NCPOR, ${f.item.year})` }));
  const altTexts = req.attachments.imageIds.map((id) => {
    const m = findRef({ type: 'photo', id });
    return m && (m.type === 'photo' || m.type === 'video') ? m.altText : `Image related to ${facts[0].title}`;
  });
  const meta = { model: MODEL_NAME, createdAt: new Date().toISOString(), settings: req };
  const pieces: GeneratedPiece[] = [];
  const targets: (PlatformId | undefined)[] = req.outputType === 'social' ? (req.platforms.length ? req.platforms : ['x']) : [undefined];

  for (const lang of req.languages.length ? req.languages : (['en'] as LanguageCode[])) {
    for (const platform of targets) {
      let text: string;
      let hashtags: string[] = [];
      let parts: string[] | undefined;
      let article: GeneratedArticle | undefined;
      let stylistic = new Set<string>();
      if (req.outputType === 'social' && platform) {
        const d = composeCore(req, facts, seed);
        stylistic = d.stylistic;
        const shaped = shapeForPlatform(d, platform, req, facts, seed);
        ({ text, hashtags, parts } = shaped);
      } else if (req.outputType === 'blog') {
        article = buildArticle(req, facts, seed);
        text = articleToText(article);
      } else if (req.outputType === 'press') text = buildPress(req, facts, seed);
      else if (req.outputType === 'newsletter') text = buildNewsletter(req, facts, seed);
      else {
        const s = summarizeSync(req.sources, seed);
        text = `${s.plain}\n\nKey findings:\n${s.keyFindings.map((k) => `• ${k}`).join('\n')}\n\nFor kids: ${s.forKids}`;
      }
      const fc = factCheck(text, req.sources, stylistic);
      if (lang !== 'en') {
        const limit = platform ? PLATFORM_META[platform].limit : 20000;
        const tr = translate(text, lang, facts, seed, limit);
        pieces.push({ id: `${lang}-${platform ?? req.outputType}-${seed}`, platform, language: lang, text: tr.text, hashtags, parts: tr.translated === 'hand-written demo' ? undefined : parts, article, citations, factCheck: fc, altTexts, translated: tr.translated, meta });
      } else {
        pieces.push({ id: `${lang}-${platform ?? req.outputType}-${seed}`, platform, language: lang, text, hashtags, parts, article, citations, factCheck: fc, altTexts, meta });
      }
    }
  }
  return pieces;
}

/** Pure rephrase transforms on an existing piece (section 13.5). */
export function rephrase(piece: GeneratedPiece, mode: RephraseMode): GeneratedPiece {
  const facts = piece.meta.settings.sources.map(factsOf).filter((f): f is Facts => !!f);
  const limit = piece.platform ? PLATFORM_META[piece.platform].limit : 20000;
  const lines = piece.text.split('\n');
  const tagLine = lines.filter((l) => /^#/.test(l.trim())).join(' ');
  const body = lines.filter((l) => !/^#/.test(l.trim())).join('\n').trim();
  const sents = body.split(/(?<=[.!?”])\s+/);
  let t = body;
  switch (mode) {
    case 'shorter':
      t = sents.slice(0, Math.max(1, Math.ceil(sents.length * 0.6))).join(' ');
      break;
    case 'longer': {
      const extra = facts.flatMap((f) => f.findings).find((x) => !body.includes(x.slice(0, 30)));
      t = `${body} ${extra ?? facts[0]?.summary ?? ''}`.trim();
      break;
    }
    case 'simpler':
      t = sents.map((s) => transformJargon(simplifySentence(s, 'class8'), 2, false)).join(' ');
      break;
    case 'formal':
      t = stripEmojis(body).replace(/!+/g, '.').replace(/\b(cool|awesome|pretty amazing|big shout-out)\b/gi, 'notable').replace(/Grab a cup of chai — /i, '');
      break;
    case 'exciting':
      t = sents.map((s, i) => (i === 0 ? s.replace(/\.$/, '!') : s)).join(' ').replace(/^/, 'Big news from the poles! ');
      break;
    case 'scientific': {
      const m = facts[0] && 'sections' in facts[0].item ? facts[0].item.sections.find((s) => /method/i.test(s.heading)) : undefined;
      t = `${body}${m ? ` Methods: ${m.body}` : ''} (Demo values; see source report for uncertainties.)`;
      break;
    }
    case 'add-emojis':
      t = addEmojis(body, facts.length ? facts : [], Date.now() % 3);
      break;
    case 'remove-emojis':
      t = stripEmojis(body);
      break;
  }
  const text = (tagLine && mode !== 'remove-emojis' ? `${t}\n\n${tagLine}` : tagLine ? `${t}\n\n${tagLine}` : t).slice(0, limit);
  return { ...piece, id: `${piece.id}-${mode}-${Date.now().toString(36)}`, text, factCheck: factCheck(text, piece.meta.settings.sources), meta: { ...piece.meta, createdAt: new Date().toISOString() } };
}

/** Translate an existing English piece into another language (demo). */
export function translatePiece(piece: GeneratedPiece, lang: LanguageCode): GeneratedPiece {
  const facts = piece.meta.settings.sources.map(factsOf).filter((f): f is Facts => !!f);
  const limit = piece.platform ? PLATFORM_META[piece.platform].limit : 20000;
  const tr = translate(piece.text, lang, facts, 0, limit);
  return { ...piece, id: `${lang}-${piece.platform ?? 'x'}-${Date.now().toString(36)}`, language: lang, text: tr.text, translated: tr.translated, parts: undefined };
}

function summarizeSync(sources: SourceRef[], seed = 0): SummaryResult {
  const facts = sources.map(factsOf).filter((f): f is Facts => !!f);
  const plain = facts.slice(0, 4).map((f) => transformJargon(simplifySentence(f.summary, 'highschool'), 1, true)).join(' ');
  const keyFindings = Array.from(new Set(facts.flatMap((f) => f.findings))).slice(0, 6);
  const analogy = ANALOGIES.find(([k]) => facts.some((f) => f.item.tags.some((t) => t.includes(k))))?.[1] ?? 'Scientists measure things carefully so we can understand our planet.';
  const f0 = facts[0];
  const forKids = f0 ? `${pick(['Guess what?', 'Here’s a fun fact!', 'Did you know?'], seed)} Scientists at ${f0.place} studied ${f0.item.tags[0] ?? 'the ice'}. ${transformJargon(simplifySentence(f0.findings[0] ?? f0.summary, 'class5'), 2, false)} ${analogy}` : '';
  return { plain, keyFindings, forKids, sources: facts.map((f) => ({ ref: f.ref, title: f.title, text: `${f.title} (NCPOR, ${f.item.year})` })) };
}

export async function summarize(sources: SourceRef[], seed = 0): Promise<SummaryResult> {
  await wait(900 + Math.random() * 1200);
  if (!sources.length) throw new Error('Select at least one source.');
  return summarizeSync(sources, seed);
}
