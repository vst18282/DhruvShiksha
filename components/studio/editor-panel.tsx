'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  GitCompare,
  History,
  Languages,
  Plus,
  Redo2,
  RefreshCcw,
  Sparkles,
  Undo2,
  Wand2,
  X,
} from 'lucide-react';
import type { Blog, LanguageCode, SourceRef } from '@/types';
import type { GeneratedPiece, RephraseMode, Tone } from '@/lib/mock-ai/types';
import { rephrase, translatePiece, generate, factCheck } from '@/lib/mock-ai';
import { useStudioStore } from '@/store/studio';
import { useDataStore } from '@/store/data';
import { useAuthStore } from '@/store/auth';
import { useGenerate } from './use-generate';
import { PlatformIcon } from './platform-icon';
import { AiBadge, EmptyState } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/misc';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PostPreviewSkeleton, Skeleton } from '@/components/skeletons';
import { LANGUAGES, PLATFORM_META, CONTENT_TYPE_LABELS } from '@/lib/constants';
import { findRef } from '@/lib/archive';
import { slugify } from '@/lib/utils';
import { cn } from '@/lib/utils';

const REPHRASE: { m: RephraseMode; l: string }[] = [
  { m: 'shorter', l: 'Shorter' },
  { m: 'longer', l: 'Longer' },
  { m: 'simpler', l: 'Simpler' },
  { m: 'formal', l: 'More formal' },
  { m: 'exciting', l: 'More exciting' },
  { m: 'scientific', l: 'More scientific' },
  { m: 'add-emojis', l: 'Add emojis' },
  { m: 'remove-emojis', l: 'Remove emojis' },
];
const TONES: Tone[] = ['Formal', 'Friendly', 'Inspiring', 'Educational', 'News/Announcement', 'Playful'];
const langLabel = (c: LanguageCode) => LANGUAGES.find((l) => l.code === c)?.label ?? c;

/** Typing (streaming-like) reveal for freshly generated text. */
function TypingText({ text, onDone }: { text: string; onDone: () => void }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? text.length : 0);
  useEffect(() => {
    if (reduce) {
      onDone();
      return;
    }
    const step = Math.max(3, Math.round(text.length / 60));
    const t = setInterval(() => setN((x) => (x + step >= text.length ? (clearInterval(t), onDone(), text.length) : x + step)), 25);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return (
    <div className="min-h-[180px] whitespace-pre-wrap rounded-md border bg-background p-3 text-sm leading-6" aria-busy="true">
      {text.slice(0, n)}
      <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-primary align-middle" aria-hidden />
    </div>
  );
}

function setHashtagsInText(text: string, tags: string[]) {
  const body = text
    .split('\n')
    .filter((l) => !/^\s*#\w/.test(l))
    .join('\n')
    .replace(/(\s#[\w]+)+\s*$/, '')
    .trimEnd();
  return tags.length ? `${body}\n\n${tags.join(' ')}` : body;
}

function FactCheckPanel({ piece }: { piece: GeneratedPiece }) {
  const rows = piece.factCheck;
  const bad = rows.filter((r) => r.status === 'unsupported').length;
  const Icon = ({ s }: { s: string }) => (s === 'supported' ? <CheckCircle2 className="h-4 w-4 text-success" aria-label="Supported" /> : s === 'partial' ? <CircleHelp className="h-4 w-4 text-polar-amber" aria-label="Partially supported" /> : s === 'stylistic' ? <Sparkles className="h-4 w-4 text-muted-foreground" aria-label="Stylistic" /> : <AlertTriangle className="h-4 w-4 text-destructive" aria-label="Unsupported" />);
  return (
    <section aria-labelledby={`fc-${piece.id}`} className="rounded-lg border bg-card p-3">
      <h3 id={`fc-${piece.id}`} className="mb-2 flex items-center gap-2 text-sm font-semibold">
        Fact-check {bad > 0 ? <Badge variant="destructive">{bad} without source</Badge> : <Badge variant="success">All claims sourced</Badge>}
      </h3>
      {piece.translated && <p className="mb-2 text-xs text-muted-foreground">Checked against the English source text; verify the translation separately.</p>}
      <ul className="max-h-64 space-y-2 overflow-y-auto pr-1 text-xs">
        {rows.map((r, i) => (
          <li key={i} className={cn('rounded-md border p-2', r.status === 'unsupported' && 'border-destructive/40 bg-destructive/5')}>
            <div className="flex gap-2">
              <Icon s={r.status} />
              <p className="flex-1">{r.sentence}</p>
            </div>
            <div className="mt-1 flex items-center gap-2 pl-6">
              <Progress value={r.confidence * 100} className="h-1.5 w-20" aria-label={`Confidence ${Math.round(r.confidence * 100)}%`} indicatorClassName={r.confidence >= 0.5 ? 'bg-success' : r.confidence >= 0.28 ? 'bg-polar-amber' : 'bg-destructive'} />
              <span className="text-muted-foreground">{Math.round(r.confidence * 100)}%</span>
              {r.source ? (
                <Popover>
                  <PopoverTrigger className="text-primary hover:underline">View source</PopoverTrigger>
                  <PopoverContent className="w-80 text-xs">
                    <p className="font-semibold">{r.source.title}</p>
                    <blockquote className="mt-1 border-l-2 border-primary pl-2 italic">{r.source.passage}</blockquote>
                    <Link href={CONTENT_TYPE_LABELS[r.source.ref.type].href(r.source.ref.id)} target="_blank" className="mt-2 inline-block text-primary hover:underline">Open source →</Link>
                  </PopoverContent>
                </Popover>
              ) : (
                <span className="text-muted-foreground">{r.status === 'stylistic' ? 'Style / call-to-action' : 'No supporting passage — edit or remove'}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ArticleView({ piece }: { piece: GeneratedPiece }) {
  const a = piece.article!;
  const user = useAuthStore((s) => s.user)!;
  const upsert = useDataStore((s) => s.upsertCmsBlog);
  const [saved, setSaved] = useState<string | null>(null);
  const save = () => {
    const src = piece.meta.settings.sources.map((r) => findRef(r)).filter(Boolean);
    const f = src[0];
    const now = new Date().toISOString();
    const slug = `blog-ai-${slugify(a.seo.slug).slice(0, 40)}-${Date.now().toString(36)}`;
    const b: Blog = {
      id: slug, slug, type: 'blog', title: a.title, summary: a.seo.metaDescription, tags: a.seo.keywords, region: f?.region ?? 'antarctica', station: f?.station, discipline: f?.discipline ?? 'outreach', year: new Date().getFullYear(), expeditionId: f?.expeditionId,
      authors: [user.name], accessLevel: 'public', licence: 'CC-BY-4.0', credit: 'NCPOR Outreach (demo) · AI-assisted draft', createdAt: now, updatedAt: now, status: 'in_review', views: 0, downloads: 0, art: f?.art ?? 'aurora',
      readingMinutes: 4, versions: { general: [{ id: 'intro', heading: 'Introduction', body: a.intro }, ...a.sections.map((s, i) => ({ id: `s${i}`, heading: s.heading, body: s.body }))] },
      citations: piece.citations.map((c) => c.text), glossaryTerms: [], attachments: [], userCreated: true, ownerId: user.id,
    };
    upsert(b);
    setSaved(slug);
    toast.success('Saved as blog draft (in review)', { description: 'Approve it in the queue to publish at /blog/…' });
  };
  return (
    <div className="space-y-3 rounded-md border bg-background p-4 text-sm">
      <h3 className="text-xl font-semibold">{a.title}</h3>
      <p className="text-muted-foreground">{a.intro}</p>
      {a.sections.map((s) => (
        <div key={s.heading}>
          <h4 className="font-semibold">{s.heading}</h4>
          <p className="leading-6">{s.body}</p>
        </div>
      ))}
      <div className="rounded-md bg-accent p-3 text-accent-foreground">
        <p className="font-semibold">Key facts</p>
        <ul className="list-disc pl-5">{a.keyFacts.map((k) => <li key={k}>{k}</li>)}</ul>
      </div>
      <div className="grid gap-2 text-xs md:grid-cols-3">
        <div><p className="font-semibold">Glossary terms</p><p className="text-muted-foreground">{a.glossaryTerms.join(', ') || '—'}</p></div>
        <div><p className="font-semibold">Image suggestions</p><ul className="text-muted-foreground">{a.imageSuggestions.map((x) => <li key={x}>• {x}</li>)}</ul></div>
        <div><p className="font-semibold">SEO</p><p className="text-muted-foreground">{a.seo.metaTitle}<br />/{a.seo.slug}<br />{a.seo.metaDescription}</p></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={save}>Save as blog draft</Button>
        {saved && <Button size="sm" variant="outline" asChild><Link href={`/blog/${saved}`}>Preview /blog page</Link></Button>}
      </div>
    </div>
  );
}

function PieceEditor({ piece, typing, onTyped }: { piece: GeneratedPiece; typing: boolean; onTyped: () => void }) {
  const { editPiece, replacePiece, addPiece, outputs } = useStudioStore();
  const [tagInput, setTagInput] = useState('');
  const [busy, setBusy] = useState(false);
  const limit = piece.platform ? PLATFORM_META[piece.platform].limit : null;
  const over = limit !== null && piece.text.length > limit;
  const doRephrase = (m: RephraseMode) => replacePiece(piece.id, rephrase(piece, m), `Rephrase: ${m}`);
  const changeTone = async (tone: Tone) => {
    setBusy(true);
    const req = { ...piece.meta.settings, tone, languages: [piece.language], platforms: piece.platform ? [piece.platform] : [], seed: (piece.meta.settings.seed ?? 0) + 7 };
    const [np] = await generate(req);
    if (np) replacePiece(piece.id, { ...np, id: `${piece.id}-tone-${Date.now().toString(36)}` }, `Tone → ${tone}`);
    setBusy(false);
  };
  const translateTo = (lang: LanguageCode) => {
    if (outputs.some((p) => p.language === lang && p.platform === piece.platform)) return toast.info(`A ${langLabel(lang)} version already exists`);
    addPiece(translatePiece(piece, lang), `Translate → ${langLabel(lang)}`);
    toast.success(`${langLabel(lang)} version added`, { description: 'Demo translation — please verify.' });
  };
  const tags = piece.hashtags;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <AiBadge />
        {piece.translated && <Badge variant="warning">{piece.translated === 'placeholder' ? 'Demo translation placeholder — verify' : 'Demo translation — verify'}</Badge>}
        <div className="ml-auto flex flex-wrap gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={busy || typing}><Wand2 /> Rephrase <ChevronDown /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {REPHRASE.map((r) => <DropdownMenuItem key={r.m} onSelect={() => doRephrase(r.m)}>{r.l}</DropdownMenuItem>)}
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Change tone…</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>{TONES.map((t) => <DropdownMenuItem key={t} onSelect={() => changeTone(t)}>{t}</DropdownMenuItem>)}</DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={typing}><Languages /> Translate</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
              <DropdownMenuLabel>Translate this output to…</DropdownMenuLabel>
              {LANGUAGES.filter((l) => l.code !== piece.language).map((l) => <DropdownMenuItem key={l.code} onSelect={() => translateTo(l.code)}>{l.label} · {l.native}</DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {piece.article ? (
        <ArticleView piece={piece} />
      ) : typing ? (
        <TypingText text={piece.text} onDone={onTyped} />
      ) : (
        <div>
          <label htmlFor={`ed-${piece.id}`} className="sr-only">Edit output</label>
          <Textarea
            id={`ed-${piece.id}`}
            lang={piece.language}
            value={piece.text}
            onChange={(e) => editPiece(piece.id, e.target.value)}
            onBlur={() => editPiece(piece.id, piece.text)}
            rows={10}
            className={cn('text-sm leading-6', over && 'border-destructive focus-visible:ring-destructive')}
            aria-describedby={`cc-${piece.id}`}
          />
          <div className="mt-1 flex items-center justify-between text-xs">
            <span id={`cc-${piece.id}`} className={cn('tabular-nums', over ? 'font-semibold text-destructive' : 'text-muted-foreground')}>
              {piece.text.length}{limit ? ` / ${limit}` : ''} characters{over && ' — over the platform limit'}
            </span>
            <Button size="sm" variant="ghost" className="h-7" onClick={() => { const fc = factCheck(piece.text, piece.meta.settings.sources); replacePiece(piece.id, { ...piece, factCheck: fc }, 'Manual edit'); toast.success('Edit saved to history & re-checked'); }}>
              Save edit & re-check
            </Button>
          </div>
        </div>
      )}

      {piece.parts && piece.parts.length > 1 && !typing && (
        <details className="rounded-md border p-2 text-xs">
          <summary className="cursor-pointer font-medium">{piece.platform === 'instagram' ? `Carousel slides (${piece.parts.length})` : `Thread (${piece.parts.length} posts)`}</summary>
          <ol className="mt-2 space-y-1">{piece.parts.map((p, i) => <li key={i} className="rounded bg-muted/60 p-2">{p}</li>)}</ol>
        </details>
      )}

      {piece.platform && !typing && (
        <div className="space-y-1">
          <p className="text-xs font-medium">Hashtags</p>
          <div className="flex flex-wrap items-center gap-1">
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                {t}
                <button type="button" aria-label={`Remove ${t}`} onClick={() => { const nt = tags.filter((x) => x !== t); replacePiece(piece.id, { ...piece, hashtags: nt, text: setHashtagsInText(piece.text, nt) }, 'Hashtags edited'); }}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <form className="inline-flex gap-1" onSubmit={(e) => { e.preventDefault(); const v = tagInput.trim().replace(/^#?/, '#').replace(/\s+/g, ''); if (v.length < 2 || tags.includes(v)) return; const nt = [...tags, v]; replacePiece(piece.id, { ...piece, hashtags: nt, text: setHashtagsInText(piece.text, nt) }, 'Hashtags edited'); setTagInput(''); }}>
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="#add" className="h-7 w-24 text-xs" aria-label="Add hashtag" />
              <Button type="submit" size="icon" variant="ghost" className="h-7 w-7" aria-label="Add hashtag"><Plus /></Button>
            </form>
          </div>
        </div>
      )}

      {!typing && <FactCheckPanel piece={piece} />}

      <details className="rounded-md border p-2 text-xs text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">AI transparency</summary>
        <dl className="mt-2 grid grid-cols-[110px_1fr] gap-1">
          <dt>Model</dt><dd>{piece.meta.model} (mock, deterministic)</dd>
          <dt>Created</dt><dd>{new Date(piece.meta.createdAt).toLocaleString('en-IN')}</dd>
          <dt>Settings</dt><dd>{piece.meta.settings.outputType} · {piece.meta.settings.tone} · {piece.meta.settings.difficulty} · level {piece.meta.settings.scientificLevel} · {piece.meta.settings.length} · seed {piece.meta.settings.seed ?? 0}</dd>
          <dt>Sources</dt><dd>{piece.citations.map((c) => c.title).join('; ')}</dd>
          {piece.altTexts && piece.altTexts.length > 0 && (<><dt>Alt texts</dt><dd>{piece.altTexts.join(' | ')}</dd></>)}
        </dl>
      </details>
    </div>
  );
}

export function EditorPanel({ sources }: { sources: SourceRef[] }) {
  const { outputs, generating, history, historyIndex, undo, redo, goto, settings } = useStudioStore();
  const run = useGenerate(sources);
  const [typed, setTyped] = useState<Set<string>>(new Set());
  const [compare, setCompare] = useState(false);
  const langs = useMemo(() => Array.from(new Set(outputs.map((p) => p.language))), [outputs]);
  const [lang, setLang] = useState<LanguageCode>('en');
  const [plat, setPlat] = useState<string>('');
  useEffect(() => {
    if (langs.length && !langs.includes(lang)) setLang(langs[0]);
  }, [langs, lang]);
  // Mark previous-version pieces as already typed.
  useEffect(() => {
    if (history[historyIndex]?.label !== 'Generated' && !history[historyIndex]?.label.startsWith('Variant')) setTyped(new Set(outputs.map((o) => o.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyIndex]);
  const inLang = outputs.filter((p) => p.language === lang);
  const current = inLang.find((p) => (p.platform ?? p.meta.settings.outputType) === plat) ?? inLang[0];
  const prev = history[historyIndex - 1]?.outputs.find((p) => p.language === current?.language && p.platform === current?.platform);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="aurora" onClick={() => run('generate')} loading={generating} disabled={!sources.length}>
          <Sparkles /> {outputs.length ? 'Generate again' : 'Generate'}
        </Button>
        <Button variant="outline" onClick={() => run('regenerate')} disabled={generating || !outputs.length}>
          <RefreshCcw /> Reiterate (new variant)
        </Button>
        <div className="ml-auto flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={undo} disabled={historyIndex <= 0} aria-label="Undo"><Undo2 /></Button>
          <Button size="icon" variant="ghost" onClick={redo} disabled={historyIndex >= history.length - 1} aria-label="Redo"><Redo2 /></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={!history.length}><History /> v{historyIndex + 1}/{history.length}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-72 w-64 overflow-y-auto">
              <DropdownMenuLabel>Version history</DropdownMenuLabel>
              {history.map((h, i) => (
                <DropdownMenuItem key={h.id} onSelect={() => goto(i)} className={cn(i === historyIndex && 'bg-muted')}>
                  <span className="flex-1">v{i + 1} · {h.label}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(h.at).toLocaleTimeString('en-IN')}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="ghost" onClick={() => setCompare(true)} disabled={!prev}><GitCompare /> Compare</Button>
        </div>
      </div>

      {generating && (
        <div className="space-y-3 rounded-lg border bg-card p-4" role="status" aria-label="Generating">
          <p className="flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4 animate-pulse text-polar-violet" aria-hidden /> Drafting {settings.languages.length} language(s) × {settings.outputType === 'social' ? settings.platforms.length : 1} output(s)…</p>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <PostPreviewSkeleton />
        </div>
      )}

      {!generating && !outputs.length && (
        <EmptyState icon={<Sparkles className="h-6 w-6" />} title="Nothing generated yet" description="Pick sources and settings on the left, then click Generate. Every output is an AI draft that must be reviewed and approved." />
      )}

      {!generating && outputs.length > 0 && current && (
        <Tabs value={lang} onValueChange={(v) => setLang(v as LanguageCode)}>
          <TabsList>
            {langs.map((l) => <TabsTrigger key={l} value={l} lang={l}>{langLabel(l)}</TabsTrigger>)}
          </TabsList>
          {langs.map((l) => (
            <TabsContent key={l} value={l} className="space-y-3">
              {settings.outputType === 'social' || outputs.some((p) => p.platform) ? (
                <div className="flex flex-wrap gap-1" role="tablist" aria-label="Platform">
                  {outputs.filter((p) => p.language === l).map((p) => {
                    const key = p.platform ?? p.meta.settings.outputType;
                    const active = (current.platform ?? current.meta.settings.outputType) === key;
                    return (
                      <button key={p.id} role="tab" aria-selected={active} type="button" onClick={() => setPlat(key)} className={cn('inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs', active && 'border-primary bg-primary/10 font-medium')}>
                        {p.platform && <PlatformIcon id={p.platform} />} {p.platform ? PLATFORM_META[p.platform].label : key}
                        {p.platform && p.text.length > PLATFORM_META[p.platform].limit && <AlertTriangle className="h-3 w-3 text-destructive" aria-label="Over limit" />}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <PieceEditor key={current.id} piece={current} typing={!typed.has(current.id)} onTyped={() => setTyped((s) => new Set(s).add(current.id))} />
            </TabsContent>
          ))}
        </Tabs>
      )}

      <Dialog open={compare} onOpenChange={setCompare}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Compare with previous version</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div><p className="mb-1 text-xs font-semibold text-muted-foreground">Previous (v{historyIndex})</p><pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-xs">{prev?.text}</pre></div>
            <div><p className="mb-1 text-xs font-semibold text-muted-foreground">Current (v{historyIndex + 1})</p><pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md border bg-accent/40 p-3 text-xs">{current?.text}</pre></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
