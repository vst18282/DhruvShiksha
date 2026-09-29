import type { Section } from '@/types';
import { slugify } from '@/lib/utils';

/** Minimal markdown → sections parser for the CMS editor (## headings split sections). */
export function markdownToSections(md: string): Section[] {
  const parts = md.split(/^##\s+/m);
  const out: Section[] = [];
  parts.forEach((p, i) => {
    const t = p.trim();
    if (!t) return;
    if (i === 0 && !md.trimStart().startsWith('##')) {
      out.push({ id: 'intro', heading: 'Introduction', body: t });
      return;
    }
    const [head, ...rest] = t.split('\n');
    out.push({ id: slugify(head) || `s${i}`, heading: head.trim(), body: rest.join('\n').trim() });
  });
  return out;
}

/** Tiny safe renderer: returns blocks for React to render (no dangerouslySetInnerHTML). */
export type MdBlock = { kind: 'h2' | 'h3' | 'p' | 'li' | 'quote'; text: string };

export function markdownBlocks(md: string): MdBlock[] {
  return md
    .split(/\n+/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim())
    .map((l) => {
      if (l.startsWith('### ')) return { kind: 'h3', text: l.slice(4) };
      if (l.startsWith('## ')) return { kind: 'h2', text: l.slice(3) };
      if (/^[-*]\s+/.test(l)) return { kind: 'li', text: l.replace(/^[-*]\s+/, '') };
      if (l.startsWith('> ')) return { kind: 'quote', text: l.slice(2) };
      return { kind: 'p', text: l };
    });
}
