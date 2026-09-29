import type { Attachment, ContentType, SourceRef } from '@/types';

export interface ChatCitation {
  ref: SourceRef;
  title: string;
  href: string;
}

export interface ChatAttachment {
  itemId: string;
  file: Attachment;
  itemTitle: string;
  href: string;
}

export interface ChatAnswer {
  found: boolean;
  summary: string;
  facts: string[];
  citations: ChatCitation[];
  attachments: ChatAttachment[];
  related: { ref: SourceRef; title: string; href: string; type: ContentType }[];
  followUps: string[];
  primaryHref?: string;
  scope: 'all' | 'page';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  answer?: ChatAnswer;
  at: string;
  feedback?: 'up' | 'down';
  error?: boolean;
}
