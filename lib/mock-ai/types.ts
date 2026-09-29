import type { LanguageCode, OutputType, PlatformId, SourceRef } from '@/types';

export type Tone = 'Formal' | 'Friendly' | 'Inspiring' | 'Educational' | 'News/Announcement' | 'Playful';
export type Difficulty = 'class5' | 'class8' | 'highschool' | 'undergrad' | 'expert';
export type Length = 'short' | 'medium' | 'long';

export interface VoiceNote {
  id: string;
  name: string;
  durationSec: number;
  transcript: string;
}

export interface Citation {
  ref: SourceRef;
  title: string;
  text: string;
}

export interface FactCheckRow {
  sentence: string;
  status: 'supported' | 'partial' | 'unsupported' | 'stylistic';
  confidence: number;
  source?: { ref: SourceRef; title: string; passage: string };
}

export interface GenerateRequest {
  sources: SourceRef[];
  outputType: OutputType;
  platforms: PlatformId[];
  languages: LanguageCode[];
  tone: Tone;
  difficulty: Difficulty;
  /** 0 scientific, 1 balanced, 2 non-scientific */
  scientificLevel: 0 | 1 | 2;
  includeTerms: boolean;
  length: Length;
  options: { emojis: boolean; hashtags: boolean; cta: boolean; citations: boolean; thread: boolean };
  attachments: { reportIds: string[]; imageIds: string[]; voiceNotes: VoiceNote[]; specialNotes: string };
  seed?: number;
}

export interface ArticleSection {
  heading: string;
  body: string;
}

export interface GeneratedArticle {
  title: string;
  intro: string;
  sections: ArticleSection[];
  keyFacts: string[];
  glossaryTerms: string[];
  imageSuggestions: string[];
  seo: { metaTitle: string; metaDescription: string; slug: string; keywords: string[] };
}

export interface GeneratedPiece {
  id: string;
  platform?: PlatformId;
  language: LanguageCode;
  text: string;
  hashtags: string[];
  altTexts?: string[];
  citations: Citation[];
  factCheck: FactCheckRow[];
  /** X thread parts or Instagram carousel slides */
  parts?: string[];
  article?: GeneratedArticle;
  translated?: 'hand-written demo' | 'placeholder';
  meta: { model: string; createdAt: string; settings: GenerateRequest };
}

export type RephraseMode =
  | 'shorter'
  | 'longer'
  | 'simpler'
  | 'formal'
  | 'exciting'
  | 'scientific'
  | 'add-emojis'
  | 'remove-emojis';

export interface SummaryResult {
  plain: string;
  keyFindings: string[];
  forKids: string;
  sources: Citation[];
}
