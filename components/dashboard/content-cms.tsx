'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Columns2, Eye, FileText, Heading2, Heading3, LayoutTemplate, List, Megaphone, PenLine, Quote, Rocket, Save, Send, Ship, Star, Wand2, type LucideIcon } from 'lucide-react';
import type { Audience, Blog, Discipline, Expedition, Region } from '@/types';
import { MarkdownPreview } from './markdown-preview';
import { VisibilityControl } from '@/components/common/visibility-control';
import { StatusBadge } from '@/components/common';
import { MultiSelect } from '@/components/common/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/misc';
import { useInvalidate } from '@/hooks/use-queries';
import { audit } from '@/lib/mock-api';
import { itemsOfType } from '@/lib/archive';
import { DISCIPLINE_LABELS, REGION_META } from '@/lib/constants';
import { markdownToSections } from '@/lib/markdown';
import { useCan } from '@/lib/permissions';
import { useAuthStore } from '@/store/auth';
import { useDataStore } from '@/store/data';
import { cn, slugify } from '@/lib/utils';

const STARTER = `## Why this matters\nA short, friendly introduction to the topic.\n\n## What the team found\n- First key point (demo)\n- Second key point\n\n## Learn more\nLink readers to the related report and dataset.`;

type Mode = 'split' | 'write' | 'preview';

/** Markdown the preview understands: ## / ### headings, - lists and > quotes. */
const TOOLS: { label: string; icon: LucideIcon; prefix: string; sample: string }[] = [
  { label: 'Heading', icon: Heading2, prefix: '## ', sample: 'Section heading' },
  { label: 'Sub-heading', icon: Heading3, prefix: '### ', sample: 'Sub-heading' },
  { label: 'Bullet list', icon: List, prefix: '- ', sample: 'List item' },
  { label: 'Quote', icon: Quote, prefix: '> ', sample: 'A line worth quoting' },
];

function Panel({ id, title, icon: Icon, subtitle, className, children, action }: { id: string; title: string; icon: LucideIcon; subtitle?: string; className?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className={cn('rounded-xl border bg-card shadow-sm', className)}>
      <div className="flex items-center justify-between gap-3 border-b px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary"><Icon className="h-4 w-4" aria-hidden /></span>
          <div>
            <h2 id={id} className="text-sm font-semibold">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function ContentCms() {
  const user = useAuthStore((s) => s.user)!;
  const { canFully, can } = useCan();
  const direct = canFully('publish_direct');
  const defaultVisibility = useDataStore((s) => s.settings.defaultVisibility);
  const [visibleTo, setVisibleTo] = useState<Audience[] | undefined>(defaultVisibility ?? undefined);
  const { cmsBlogs, upsertCmsBlog, curation, updateCuration } = useDataStore();
  const invalidate = useInvalidate();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [md, setMd] = useState(STARTER);
  const [region, setRegion] = useState<Region>('antarctica');
  const [disc, setDisc] = useState<Discipline>('outreach');
  const [banner, setBanner] = useState(curation.banner);
  const [mode, setMode] = useState<Mode>('split');
  const area = useRef<HTMLTextAreaElement>(null);
  /** Last cursor/selection in the body; null until the writer has clicked into it. */
  const sel = useRef<[number, number] | null>(null);
  const remember = () => { const el = area.current; if (el) sel.current = [el.selectionStart, el.selectionEnd]; };
  const expeditions = itemsOfType<Expedition>('expedition');
  const blogs = itemsOfType<Blog>('blog');
  const featured = expeditions.find((e) => e.id === curation.featuredExpeditionId);
  const words = md.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(2, Math.round(words / 200));
  const regionColor = REGION_META[region].color;

  /**
   * Insert a markdown line prefix at the last cursor position (or on the selected text). Before
   * the body has been clicked into, it appends at the end. Always leaves the insert on its own line.
   */
  const insert = (prefix: string, sample: string) => {
    const el = area.current;
    const [start, end] = sel.current ?? [md.length, md.length];
    const selected = md.slice(start, end) || sample;
    const before = md.slice(0, start);
    const after = md.slice(end);
    const lead = before.length && !before.endsWith('\n') ? '\n' : '';
    const trail = after.length && !after.startsWith('\n') ? '\n' : '';
    const text = `${lead}${prefix}${selected}`;
    const next = before + text + trail + after;
    sel.current = [start + text.length, start + text.length];
    setMd(next);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = start + text.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const save = (status: 'draft' | 'in_review' | 'published') => {
    if (title.trim().length < 5) return toast.error('Please add a title (5+ characters)');
    const now = new Date().toISOString();
    const slug = `blog-cms-${slugify(title).slice(0, 40)}-${Date.now().toString(36)}`;
    const b: Blog = {
      id: slug, slug, type: 'blog', title, summary: summary || title, tags: ['outreach', 'cms'], region, discipline: disc, year: new Date().getFullYear(),
      authors: [user.name], accessLevel: 'public', licence: 'CC-BY-4.0', credit: 'NCPOR Outreach (demo)', createdAt: now, updatedAt: now, status, views: 0, downloads: 0,
      art: 'aurora', readingMinutes: minutes, versions: { general: markdownToSections(md) }, citations: [], glossaryTerms: [], attachments: [], userCreated: true, ownerId: user.id, visibleTo,
    };
    upsertCmsBlog(b);
    audit(status === 'published' ? 'published blog' : status === 'draft' ? 'saved blog draft' : 'sent blog for approval', 'blog', title, { itemId: slug });
    invalidate([['pipeline'], ['blogs'], ['audit'], ['home']]);
    toast.success(status === 'draft' ? 'Blog draft saved' : status === 'published' ? 'Blog published' : 'Blog sent for approval', { description: status === 'published' ? 'Live at /blog/' + slug : 'After approval it appears at /blog/' + slug });
    setTitle(''); setSummary(''); setMd(STARTER);
  };

  const preview = (
    <article className="h-full overflow-hidden rounded-lg border bg-background">
      <div className="h-20" style={{ background: `linear-gradient(120deg, ${regionColor}33, ${regionColor}0d 60%, transparent)` }} aria-hidden />
      <div className="-mt-8 px-5 pb-5">
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium" style={{ color: regionColor, borderColor: `${regionColor}55` }}>{REGION_META[region].label}</span>
          <span className="rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{DISCIPLINE_LABELS[disc]}</span>
        </div>
        <h3 className={cn('mt-3 text-2xl font-semibold leading-tight', !title && 'text-muted-foreground')}>{title || 'Untitled article'}</h3>
        {summary && <p className="mt-2 text-muted-foreground">{summary}</p>}
        <p className="mt-2 text-xs text-muted-foreground">{user.name} · {minutes} min read</p>
        <div className="mt-4 border-t pt-4"><MarkdownPreview md={md} /></div>
      </div>
    </article>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel
          id="editor"
          title="Blog & page editor"
          icon={PenLine}
          subtitle={`${words} words · ${minutes} min read`}
          action={
            <ToggleGroup type="single" value={mode} onValueChange={(v) => v && setMode(v as Mode)} aria-label="Editor layout">
              <ToggleGroupItem value="write" className="h-8 gap-1 text-xs"><PenLine className="h-3.5 w-3.5" /> Write</ToggleGroupItem>
              <ToggleGroupItem value="split" className="hidden h-8 gap-1 text-xs lg:inline-flex"><Columns2 className="h-3.5 w-3.5" /> Split</ToggleGroupItem>
              <ToggleGroupItem value="preview" className="h-8 gap-1 text-xs"><Eye className="h-3.5 w-3.5" /> Preview</ToggleGroupItem>
            </ToggleGroup>
          }
        >
          <div className="space-y-3">
            <div>
              <Label htmlFor="b-title" className="sr-only">Title</Label>
              <Input id="b-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Article title" className="h-12 border-0 border-b bg-transparent px-0 text-xl font-semibold shadow-none focus-visible:ring-0 focus-visible:ring-offset-0" />
            </div>
            <div>
              <Label htmlFor="b-sum" className="sr-only">Summary</Label>
              <Textarea id="b-sum" rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="One or two sentences shown on cards and in search results." className="resize-none bg-muted/30" />
            </div>
          </div>

          <div className={cn('mt-4 grid gap-4', mode === 'split' && 'lg:grid-cols-2')}>
            {mode !== 'preview' && (
              <div className="flex flex-col overflow-hidden rounded-lg border">
                <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 px-2 py-1.5" role="toolbar" aria-label="Formatting">
                  {TOOLS.map((t) => (
                    <Button key={t.label} type="button" size="sm" variant="ghost" className="h-7 gap-1.5 px-2 text-xs" onClick={() => insert(t.prefix, t.sample)} title={t.label} aria-label={`Insert ${t.label.toLowerCase()}`}>
                      <t.icon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t.label}</span>
                    </Button>
                  ))}
                  <span className="ml-auto pr-1 text-[11px] text-muted-foreground">Markdown</span>
                </div>
                <Label htmlFor="b-md" className="sr-only">Body (Markdown)</Label>
                <Textarea id="b-md" ref={area} value={md} onChange={(e) => { setMd(e.target.value); remember(); }} onSelect={remember} rows={18} className="min-h-[360px] flex-1 resize-y rounded-none border-0 font-mono text-xs leading-6 focus-visible:ring-0 focus-visible:ring-offset-0" />
              </div>
            )}
            {mode !== 'write' && <div className={cn(mode === 'split' ? 'max-h-[420px] overflow-y-auto' : '')}>{preview}</div>}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel id="b-settings" title="Article settings" icon={FileText}>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="b-reg">Region</Label>
                <Select value={region} onValueChange={(v) => setRegion(v as Region)}>
                  <SelectTrigger id="b-reg"><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(REGION_META) as Region[]).map((r) => <SelectItem key={r} value={r}><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: REGION_META[r].color }} aria-hidden />{REGION_META[r].label}</span></SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-disc">Discipline</Label>
                <Select value={disc} onValueChange={(v) => setDisc(v as Discipline)}>
                  <SelectTrigger id="b-disc"><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(DISCIPLINE_LABELS) as Discipline[]).map((d) => <SelectItem key={d} value={d}>{DISCIPLINE_LABELS[d]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {can('set_visibility') && <VisibilityControl id="b-vis" value={visibleTo} onChange={setVisibleTo} />}
            </div>
          </Panel>

          <Panel id="b-publish" title="Publish" icon={Rocket} subtitle={direct ? 'Your articles go live immediately' : 'Articles need approval first'}>
            <div className="space-y-2">
              {direct ? (
                <Button className="w-full" variant="success" onClick={() => save('published')}><Rocket /> Publish now</Button>
              ) : (
                <Button className="w-full" onClick={() => save('in_review')}><Send /> Send for approval</Button>
              )}
              <Button className="w-full" variant="outline" onClick={() => save('draft')}><Save /> Save draft</Button>
              <Button className="w-full" variant="ghost" asChild><Link href="/studio?output=blog"><Wand2 /> Generate with AI in Studio</Link></Button>
            </div>
          </Panel>

          <Panel id="b-list" title="CMS articles" icon={LayoutTemplate} subtitle={`${cmsBlogs.length} written here`}>
            {cmsBlogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Articles you save or publish appear here.</p>
            ) : (
              <ul className="-my-2 divide-y">
                {cmsBlogs.map((b) => (
                  <li key={b.id} className="py-2.5">
                    <div className="flex items-center gap-2"><StatusBadge status={b.status} /><span className="text-[11px] text-muted-foreground">{new Date(b.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {b.readingMinutes} min</span></div>
                    <Link href={`/blog/${b.slug}`} className="mt-1 line-clamp-2 block text-sm font-medium hover:text-primary hover:underline">{b.title}</Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <Panel id="cur" title="Homepage curation" icon={Star} subtitle="What visitors see first on the landing page" action={<Button variant="ghost" size="sm" asChild><Link href="/">View homepage →</Link></Button>}>
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
            <Label htmlFor="c-exp" className="flex items-center gap-2"><Ship className="h-4 w-4 text-primary" aria-hidden /> Featured expedition</Label>
            <Select value={curation.featuredExpeditionId} onValueChange={(v) => { updateCuration({ featuredExpeditionId: v }); invalidate([['home']]); toast.success('Homepage updated'); }}>
              <SelectTrigger id="c-exp"><SelectValue /></SelectTrigger>
              <SelectContent>{expeditions.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
            {featured && (
              <div className="rounded-md border bg-card p-3 text-xs">
                <p className="font-medium text-foreground">{featured.name}</p>
                <p className="mt-0.5 text-muted-foreground">{featured.startDate} → {featured.endDate} · {featured.teamSize} members</p>
                <Badge variant="secondary" className="mt-2">{REGION_META[featured.region].label}</Badge>
              </div>
            )}
          </div>
          <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
            <Label className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" aria-hidden /> Featured blogs <span className="ml-auto text-xs font-normal text-muted-foreground">{curation.featuredBlogIds.length}/6</span></Label>
            <MultiSelect label="Featured blogs" options={blogs.map((b) => ({ value: b.id, label: b.title }))} value={curation.featuredBlogIds} onChange={(v) => { updateCuration({ featuredBlogIds: v.slice(0, 6) }); invalidate([['home']]); }} />
            <ol className="space-y-1 text-xs text-muted-foreground">
              {curation.featuredBlogIds.slice(0, 6).map((id, i) => (
                <li key={id} className="flex gap-2"><span className="w-4 font-semibold text-foreground">{i + 1}</span><span className="line-clamp-1">{blogs.find((b) => b.id === id)?.title ?? id}</span></li>
              ))}
            </ol>
          </div>
          <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
            <Label htmlFor="c-banner" className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" aria-hidden /> Banner text</Label>
            <div className="flex gap-2">
              <Input id="c-banner" value={banner} onChange={(e) => setBanner(e.target.value)} />
              <Button onClick={() => { updateCuration({ banner }); invalidate([['home']]); toast.success('Banner updated'); }}>Save</Button>
            </div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Preview</p>
            <p className="flex items-start gap-2 rounded-md border border-polar-amber/40 bg-polar-amber/15 px-3 py-2 text-xs">
              <Megaphone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-polar-amber" aria-hidden /> {banner || 'No banner'}
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
