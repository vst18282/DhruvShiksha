/** Text utilities for the lightweight semantic search: normalisation, stemming, fuzzy matching. */

export const STOPWORDS = new Set(
  'a an the of in on at near about around what why when where which who how to for and or with from by do does did are is was were be been i me my we our show find tell give any some there it its this that these those can could should would will please get me look looking info information into over under than then also just more most very much many all'.split(
    ' ',
  ),
);

/** Lowercase, strip diacritics (Adélie → adelie, δ → d), collapse punctuation. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/δ/g, 'd')
    .replace(/₂/g, '2')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\u0900-\u097f\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Very light English stemmer (good enough for demo relevance). */
export function stem(w: string): string {
  if (w.length <= 3) return w;
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
  if (w.endsWith('ing') && w.length > 5) {
    const b = w.slice(0, -3);
    return b.length > 2 && b[b.length - 1] === b[b.length - 2] ? b.slice(0, -1) : b;
  }
  if (w.endsWith('ed') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('es') && /(ches|shes|sses|xes)$/.test(w)) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is')) return w.slice(0, -1);
  return w;
}

export function tokenize(s: string, keepStopwords = false): string[] {
  return normalize(s)
    .split(' ')
    .filter((t) => t && (keepStopwords || !STOPWORDS.has(t)))
    .map(stem);
}

export function levenshtein(a: string, b: string, max = 3): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let cur = i;
    let rowMin = cur;
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      cur = Math.min(prev[j] + 1, cur + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
      prev[j] = cur;
      if (cur < rowMin) rowMin = cur;
    }
    if (rowMin > max) return max + 1;
  }
  return prev[b.length];
}

export function trigrams(w: string): Set<string> {
  const s = `  ${w} `;
  const out = new Set<string>();
  for (let i = 0; i < s.length - 2; i++) out.add(s.slice(i, i + 3));
  return out;
}

export function trigramSimilarity(a: string, b: string): number {
  const A = trigrams(a);
  const B = trigrams(b);
  let inter = 0;
  A.forEach((g) => {
    if (B.has(g)) inter++;
  });
  return inter / (A.size + B.size - inter);
}

/** Escape a string for RegExp. */
export function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
