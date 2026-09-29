'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import type { SourceRef } from '@/types';
import { generate, type GenerateRequest } from '@/lib/mock-ai';
import { useStudioStore, type StudioSettings } from '@/store/studio';

export function buildRequest(st: StudioSettings, sources: SourceRef[], imageIds: string[], voices: { id: string; name: string; durationSec: number; transcript: string }[], seed: number): GenerateRequest {
  return {
    sources,
    outputType: st.outputType,
    platforms: st.platforms,
    languages: st.languages,
    tone: st.tone,
    difficulty: st.difficulty,
    scientificLevel: st.scientificLevel,
    includeTerms: st.includeTerms,
    length: st.length,
    options: { emojis: st.emojis, hashtags: st.hashtags, cta: st.cta, citations: st.citations, thread: st.thread },
    attachments: { reportIds: sources.filter((s) => s.type === 'report').map((s) => s.id), imageIds, voiceNotes: voices, specialNotes: st.specialNotes },
    seed,
  };
}

/** Runs the (mock) generator with current Studio settings and records a version. */
export function useGenerate(sources: SourceRef[]) {
  return useCallback(
    async (mode: 'generate' | 'regenerate') => {
      const s = useStudioStore.getState();
      if (!sources.length) return toast.error('Select at least one source first');
      if (s.settings.outputType === 'social' && !s.settings.platforms.length) return toast.error('Choose at least one platform');
      const seed = mode === 'regenerate' ? s.nextSeed() : s.seed;
      s.setGenerating(true);
      try {
        const req = buildRequest(
          s.settings,
          sources,
          s.images.filter((i) => i.galleryId).map((i) => i.galleryId!),
          s.voices.filter((v) => v.status === 'ready').map((v) => ({ id: v.id, name: v.name, durationSec: v.durationSec, transcript: v.transcript })),
          seed,
        );
        let pieces = await generate(req);
        // Merge user-picked hashtags into every piece.
        const extra = s.settings.hashtags ? s.settings.extraHashtags : [];
        if (extra.length) pieces = pieces.map((p) => (p.platform && p.platform !== 'whatsapp' ? { ...p, hashtags: Array.from(new Set([...p.hashtags, ...extra])), text: `${p.text} ${extra.filter((h) => !p.text.includes(h)).join(' ')}`.trim() } : p));
        s.pushVersion(pieces, mode === 'regenerate' ? `Variant #${seed + 1}` : 'Generated');
        toast.success(`${pieces.length} output${pieces.length > 1 ? 's' : ''} generated`, { description: 'AI draft — review before sending for approval.' });
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        s.setGenerating(false);
      }
    },
    [sources],
  );
}
