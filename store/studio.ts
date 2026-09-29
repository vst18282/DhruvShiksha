'use client';

import { create } from 'zustand';
import type { LanguageCode, OutputType, PlatformId, SourceRef, Status } from '@/types';
import type { Difficulty, GeneratedPiece, Length, Tone } from '@/lib/mock-ai/types';

/**
 * In-memory Content Studio state (not persisted: images/voice notes are object URLs).
 * Saved drafts are persisted as SocialPost records via the mock API.
 */
export type SourceMode = 'current' | 'selected' | 'all';

export interface StudioImage {
  id: string;
  name: string;
  url: string;
  altText: string;
  suggestedAlt: string;
  galleryId?: string;
}

export interface StudioVoice {
  id: string;
  name: string;
  url: string;
  durationSec: number;
  transcript: string;
  status: 'transcribing' | 'ready';
  peaks: number[];
}

export interface Version {
  id: string;
  label: string;
  at: string;
  outputs: GeneratedPiece[];
}

export interface StudioSettings {
  outputType: OutputType;
  languages: LanguageCode[];
  tone: Tone;
  difficulty: Difficulty;
  scientificLevel: 0 | 1 | 2;
  includeTerms: boolean;
  length: Length;
  emojis: boolean;
  hashtags: boolean;
  cta: boolean;
  citations: boolean;
  thread: boolean;
  platforms: PlatformId[];
  accountIds: string[];
  specialNotes: string;
  extraHashtags: string[];
}

interface StudioState {
  sourceMode: SourceMode;
  currentRef: SourceRef | null;
  selected: SourceRef[];
  settings: StudioSettings;
  images: StudioImage[];
  voices: StudioVoice[];
  outputs: GeneratedPiece[];
  history: Version[];
  historyIndex: number;
  seed: number;
  generating: boolean;
  postId: string | null;
  postStatus: Status;
  scheduledAt: string | null;
  overrides: Record<string, string>;
  setSourceMode: (m: SourceMode) => void;
  setCurrentRef: (r: SourceRef | null) => void;
  setSelected: (r: SourceRef[]) => void;
  updateSettings: (p: Partial<StudioSettings>) => void;
  addImage: (i: StudioImage) => void;
  updateImage: (id: string, p: Partial<StudioImage>) => void;
  removeImage: (id: string) => void;
  addVoice: (v: StudioVoice) => void;
  updateVoice: (id: string, p: Partial<StudioVoice>) => void;
  removeVoice: (id: string) => void;
  setGenerating: (v: boolean) => void;
  pushVersion: (outputs: GeneratedPiece[], label: string) => void;
  editPiece: (id: string, text: string) => void;
  replacePiece: (id: string, next: GeneratedPiece, label: string) => void;
  addPiece: (p: GeneratedPiece, label: string) => void;
  undo: () => void;
  redo: () => void;
  goto: (i: number) => void;
  nextSeed: () => number;
  setPost: (id: string | null, status: Status, scheduledAt?: string | null) => void;
  setOverride: (key: string, text: string | null) => void;
  reset: () => void;
}

export const DEFAULT_SETTINGS: StudioSettings = {
  outputType: 'social',
  languages: ['en'],
  tone: 'Educational',
  difficulty: 'class8',
  scientificLevel: 1,
  includeTerms: true,
  length: 'medium',
  emojis: true,
  hashtags: true,
  cta: true,
  citations: true,
  thread: true,
  platforms: ['x', 'instagram', 'linkedin'],
  accountIds: ['acc-x-main', 'acc-ig-main', 'acc-li-main'],
  specialNotes: '',
  extraHashtags: [],
};

const initial = () => ({
  sourceMode: 'selected' as SourceMode,
  currentRef: null as SourceRef | null,
  selected: [] as SourceRef[],
  settings: DEFAULT_SETTINGS,
  images: [] as StudioImage[],
  voices: [] as StudioVoice[],
  outputs: [] as GeneratedPiece[],
  history: [] as Version[],
  historyIndex: -1,
  seed: 0,
  generating: false,
  postId: null as string | null,
  postStatus: 'draft' as Status,
  scheduledAt: null as string | null,
  overrides: {} as Record<string, string>,
});

export const useStudioStore = create<StudioState>()((set, get) => ({
  ...initial(),
  setSourceMode: (sourceMode) => set({ sourceMode }),
  setCurrentRef: (currentRef) => set({ currentRef }),
  setSelected: (selected) => set({ selected }),
  updateSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
  addImage: (i) => set((s) => ({ images: [...s.images, i] })),
  updateImage: (id, p) => set((s) => ({ images: s.images.map((x) => (x.id === id ? { ...x, ...p } : x)) })),
  removeImage: (id) => set((s) => ({ images: s.images.filter((x) => x.id !== id) })),
  addVoice: (v) => set((s) => ({ voices: [...s.voices, v] })),
  updateVoice: (id, p) => set((s) => ({ voices: s.voices.map((x) => (x.id === id ? { ...x, ...p } : x)) })),
  removeVoice: (id) => set((s) => ({ voices: s.voices.filter((x) => x.id !== id) })),
  setGenerating: (generating) => set({ generating }),
  pushVersion: (outputs, label) =>
    set((s) => {
      const history = [...s.history.slice(0, s.historyIndex + 1), { id: `v${Date.now()}`, label, at: new Date().toISOString(), outputs }].slice(-30);
      return { outputs, history, historyIndex: history.length - 1 };
    }),
  editPiece: (id, text) => set((s) => ({ outputs: s.outputs.map((p) => (p.id === id ? { ...p, text } : p)) })),
  replacePiece: (id, next, label) => {
    const outputs = get().outputs.map((p) => (p.id === id ? next : p));
    get().pushVersion(outputs, label);
  },
  addPiece: (p, label) => get().pushVersion([...get().outputs, p], label),
  undo: () => set((s) => (s.historyIndex > 0 ? { historyIndex: s.historyIndex - 1, outputs: s.history[s.historyIndex - 1].outputs } : s)),
  redo: () => set((s) => (s.historyIndex < s.history.length - 1 ? { historyIndex: s.historyIndex + 1, outputs: s.history[s.historyIndex + 1].outputs } : s)),
  goto: (i) => set((s) => (s.history[i] ? { historyIndex: i, outputs: s.history[i].outputs } : s)),
  nextSeed: () => {
    const seed = get().seed + 1;
    set({ seed });
    return seed;
  },
  setPost: (postId, postStatus, scheduledAt = null) => set({ postId, postStatus, scheduledAt }),
  setOverride: (key, text) =>
    set((s) => {
      const o = { ...s.overrides };
      if (text === null) delete o[key];
      else o[key] = text;
      return { overrides: o };
    }),
  reset: () => {
    get().images.forEach((i) => i.url.startsWith('blob:') && URL.revokeObjectURL(i.url));
    get().voices.forEach((v) => URL.revokeObjectURL(v.url));
    set(initial());
  },
}));

/** Resolve the effective source list from the selector mode. */
export function effectiveSources(s: Pick<StudioState, 'sourceMode' | 'currentRef' | 'selected'>, allReports: SourceRef[]): SourceRef[] {
  if (s.sourceMode === 'current') return s.currentRef ? [s.currentRef] : [];
  if (s.sourceMode === 'all') return s.selected.length ? s.selected : allReports;
  return s.selected;
}
