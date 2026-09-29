'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bot, Mic, MicOff, Send, Trash2, X } from 'lucide-react';
import { AnswerCard } from './answer-card';
import { ChatMessageSkeleton } from '@/components/skeletons';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/misc';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/misc';
import { useChatStore } from '@/store/chat';
import { usePageContextStore } from '@/store/page-context';
import { useUiStore } from '@/store/ui';
import { useHydrated } from '@/store/hydration';
import { answerQuestion, POPULAR_TOPICS } from '@/lib/chat/answer';
import type { ChatMessage } from '@/lib/chat/types';
import { cn } from '@/lib/utils';

/* Minimal Web Speech API typing (feature-detected at runtime). */
interface SpeechRec {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechCtor = new () => SpeechRec;

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/** Floating suggestion bubbles (recent + popular) shown above the input. */
function Bubbles({ onPick }: { onPick: (q: string) => void }) {
  const recent = useUiStore((s) => s.recentTopics);
  const items = Array.from(new Set([...recent.slice(0, 3), ...POPULAR_TOPICS])).slice(0, 9);
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-card to-transparent" aria-hidden />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-card to-transparent" aria-hidden />
      <ul className="no-scrollbar flex gap-1.5 overflow-x-auto px-3 py-2" aria-label="Suggested topics">
        {items.map((t, i) => (
          <li key={t} className="shrink-0">
            <button
              type="button"
              onClick={() => onPick(t)}
              className={cn(
                'motion-decor animate-float rounded-full border px-2.5 py-1 text-xs shadow-sm transition-colors hover:border-primary hover:text-primary',
                recent.includes(t) ? 'border-polar-violet/40 bg-polar-violet/10' : 'bg-background',
              )}
              style={{ animationDelay: `${(i % 5) * 0.6}s` }}
            >
              {recent.includes(t) && <span className="sr-only">Recent: </span>}
              {t}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChatbotLauncher() {
  const hydrated = useHydrated();
  const pathname = usePathname();
  const { open, setOpen, toggle, messages, add, update, clear } = useChatStore();
  const page = usePageContextStore((s) => s.current);
  const addRecentTopic = useUiStore((s) => s.addRecentTopic);
  const [scope, setScope] = useState<'all' | 'page'>('all');
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechOk, setSpeechOk] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<SpeechRec | null>(null);

  // Default scope: "Current page" on detail pages, "All" elsewhere; resets on route/page change.
  useEffect(() => setScope(page ? 'page' : 'all'), [page]);
  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
    setSpeechOk(!!(w.SpeechRecognition ?? w.webkitSpeechRecognition));
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'Escape' && useChatStore.getState().open) {
        setOpen(false);
        fabRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle, setOpen]);
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, thinking]);

  const ask = useCallback(
    async (q: string) => {
      const text = q.trim();
      if (!text || thinking) return;
      setInput('');
      add({ id: uid(), role: 'user', text, at: new Date().toISOString() });
      addRecentTopic(text.length > 40 ? text.slice(0, 40) + '…' : text);
      setThinking(true);
      const id = uid();
      try {
        // Simulated latency so the typing indicator is visible.
        await new Promise((r) => setTimeout(r, 600 + Math.random() * 700));
        const answer = answerQuestion(text, scope, scope === 'page' ? page : null);
        add({ id, role: 'assistant', text: answer.summary, answer, at: new Date().toISOString() });
      } catch {
        add({ id, role: 'assistant', text: 'Something went wrong while searching the archive. Please try again.', error: true, at: new Date().toISOString() });
      } finally {
        setThinking(false);
      }
    },
    [thinking, add, addRecentTopic, scope, page],
  );

  const voice = () => {
    const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new Ctor();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    rec.onresult = (e) => setInput(e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  if (!hydrated) return null;
  const inDash = /^\/(dashboard|studio|upload)/.test(pathname);
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="chat-panel"
        aria-label={open ? 'Close Ask the Archive chat' : 'Open Ask the Archive chat (Ctrl+/)'}
        className={cn(
          'fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-polar-glacier to-polar-violet text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50 sm:right-6',
          inDash ? 'bottom-20 lg:bottom-6' : 'bottom-6',
          open && 'hidden sm:flex',
        )}
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>

      {open && (
        <section
          id="chat-panel"
          role="dialog"
          aria-modal="false"
          aria-label="Ask the Archive"
          className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-card shadow-2xl sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[min(680px,calc(100vh-8rem))] sm:w-[420px] sm:rounded-xl sm:border"
        >
          <header className="flex items-center gap-2 border-b bg-gradient-to-r from-polar-navy to-[#123a63] px-4 py-3 text-white">
            <Bot className="h-5 w-5 text-polar-teal" aria-hidden />
            <div className="flex-1">
              <h2 className="text-sm font-semibold">Ask the Archive</h2>
              <p className="text-[11px] text-white/70">Answers only from PolarVerse content · demo</p>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/10" onClick={clear} aria-label="Clear chat" disabled={!messages.length}>
              <Trash2 />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/10" onClick={() => { setOpen(false); fabRef.current?.focus(); }} aria-label="Close chat">
              <X />
            </Button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-3" aria-live="polite" aria-relevant="additions">
            {messages.length === 0 && !thinking && (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Hi! Ask me about expeditions, stations, datasets or polar science.</p>
                <p className="mt-1">Try a topic below{page ? `, or ask about “${page.title}”` : ''}.</p>
              </div>
            )}
            {messages.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="flex justify-end">
                  <p className="max-w-[85%] rounded-lg rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">{m.text}</p>
                </div>
              ) : (
                <div key={m.id} className="flex gap-2">
                  <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-primary" aria-hidden>
                    <Bot className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    {m.error || !m.answer ? (
                      <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                        {m.text}
                        {lastUser && (
                          <Button size="sm" variant="outline" className="mt-2" onClick={() => ask(lastUser.text)}>
                            Retry
                          </Button>
                        )}
                      </div>
                    ) : (
                      <AnswerCard msg={m} onFollowUp={ask} onFeedback={(f) => update(m.id, { feedback: m.feedback === f ? undefined : f })} />
                    )}
                  </div>
                </div>
              ),
            )}
            {thinking && (
              <div role="status" aria-label="Searching the archive">
                <ChatMessageSkeleton />
                <p className="ml-9 mt-1 text-xs text-muted-foreground">Searching the archive…</p>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t bg-card">
            <Bubbles onPick={ask} />
            <div className="flex flex-wrap items-center gap-2 px-3 pb-2">
              <ToggleGroup type="single" value={scope} onValueChange={(v) => v && setScope(v as 'all' | 'page')} aria-label="Search scope" className="p-0.5">
                <ToggleGroupItem value="all" className="h-7 px-2.5 text-xs">All</ToggleGroupItem>
                {page ? (
                  <ToggleGroupItem value="page" className="h-7 px-2.5 text-xs">Current page</ToggleGroupItem>
                ) : (
                  <Tooltip content="Open a report, blog, expedition, dataset, event or station page to ask about it">
                    <span tabIndex={0} className="inline-flex h-7 cursor-not-allowed items-center rounded-sm px-2.5 text-xs text-muted-foreground opacity-50" aria-disabled="true">
                      Current page
                    </span>
                  </Tooltip>
                )}
              </ToggleGroup>
              {scope === 'page' && page && (
                <span className="inline-flex min-w-0 max-w-[220px] items-center rounded-full bg-accent px-2 py-0.5 text-[11px] text-accent-foreground">
                  <span className="truncate">Searching in: {page.title}</span>
                </span>
              )}
            </div>
            <form
              className="flex items-end gap-2 px-3 pb-3"
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
            >
              <label htmlFor="chat-input" className="sr-only">
                Ask a question
              </label>
              <textarea
                id="chat-input"
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    ask(input);
                  }
                }}
                placeholder={scope === 'page' && page ? 'Ask about this page…' : 'Ask the archive…'}
                className="max-h-28 min-h-10 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {speechOk && (
                <Button type="button" size="icon" variant={listening ? 'destructive' : 'outline'} onClick={voice} aria-label={listening ? 'Stop voice input' : 'Voice input'} aria-pressed={listening}>
                  {listening ? <MicOff /> : <Mic />}
                </Button>
              )}
              <Button type="submit" size="icon" disabled={!input.trim() || thinking} aria-label="Send">
                <Send />
              </Button>
            </form>
          </div>
        </section>
      )}
    </>
  );
}
