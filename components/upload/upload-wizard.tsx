'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Database,
  FileText,
  Compass,
  Save,
  Send,
  Rocket,
  Image as ImageIcon,
  Layers,
  Sparkles,
  Trash2,
  UploadCloud,
  Video,
} from 'lucide-react';
import type { AccessLevel, ArchiveItem, Audience, ContentType, Discipline, EventItem, Licence, Region, StationSlug } from '@/types';
import { DashHeader } from '@/components/dashboard/shell';
import { AccessBadge, AiBadge, FileCard } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox, Progress, RadioGroup, RadioGroupItem, Switch } from '@/components/ui/misc';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/skeletons';
import { suggestMetadata, findDuplicates, fileBase, type SuggestedMeta } from '@/lib/mock-ai/suggest';
import { buildItem, kindOf, type UploadFileInfo, type UploadMeta } from '@/lib/upload';
import { api } from '@/lib/mock-api';
import { useInvalidate } from '@/hooks/use-queries';
import { useAuthStore } from '@/store/auth';
import { useDataStore } from '@/store/data';
import { ACCESS_META, CONTENT_TYPE_LABELS, DISCIPLINE_LABELS, REGION_META, STATION_NAMES } from '@/lib/constants';
import { EXPEDITIONS } from '@/data/expeditions';
import { itemHref } from '@/lib/archive';
import { useCan } from '@/lib/permissions';
import { EMBARGO_PRESETS, addMonthsIso, clampEmbargoMonths, monthsBetween } from '@/lib/access';
import { VisibilityControl } from '@/components/common/visibility-control';
import { visibilityLabel } from '@/lib/visibility';
import { dashboardPathFor } from '@/lib/permissions-core';
import { cn } from '@/lib/utils';

const TYPES: { id: ContentType; label: string; icon: React.ComponentType<{ className?: string }>; accept: string; hint: string }[] = [
  { id: 'report', label: 'Report', icon: FileText, accept: '.pdf,.doc,.docx,.txt', hint: 'Expedition, survey or technical report (PDF)' },
  { id: 'dataset', label: 'Dataset', icon: Database, accept: '.csv,.nc,.zip,.txt', hint: 'CSV previews are parsed in-browser' },
  { id: 'publication', label: 'Publication', icon: BookOpen, accept: '.pdf', hint: 'Journal article or preprint' },
  { id: 'photo', label: 'Photo', icon: ImageIcon, accept: 'image/*', hint: 'JPG / PNG — AI suggests tags & alt text' },
  { id: 'video', label: 'Video', icon: Video, accept: 'video/*', hint: 'MP4 — transcript is simulated' },
  { id: 'event', label: 'Activity', icon: CalendarDays, accept: 'image/*,.pdf', hint: 'Workshop, MoU, outreach, lecture…' },
  { id: 'expedition', label: 'Expedition', icon: Compass, accept: '.pdf,.doc,.docx,.txt,.csv,image/*', hint: 'Expedition record: dates, vessel, team and objectives' },
];
const STEPS = ['Type', 'Files', 'Metadata', 'Access', 'Review'];
const CHUNK = 256 * 1024;

interface UpFile {
  id: string;
  file: File;
  url?: string;
  progress: number;
  info: UploadFileInfo;
  expeditionId?: string;
}

const metaSchema = z.object({
  title: z.string().min(5, 'Title needs at least 5 characters'),
  summary: z.string().min(20, 'Summary needs at least 20 characters'),
  authors: z.array(z.string()).min(1, 'Add at least one author'),
  credit: z.string().min(3, 'Credit line is required'),
});

async function parseCsv(file: File): Promise<UploadFileInfo['csv']> {
  if (file.size > 2 * 1024 * 1024) return undefined;
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(Boolean).slice(0, 51);
  if (!lines.length) return undefined;
  const split = (l: string) => l.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
  return { header: split(lines[0]), rows: lines.slice(1).map(split) };
}

export function UploadWizard() {
  const user = useAuthStore((s) => s.user)!;
  const settings = useDataStore((s) => s.settings);
  const invalidate = useInvalidate();
  const [step, setStep] = useState(0);
  const [type, setType] = useState<ContentType | null>(null);
  const [files, setFiles] = useState<UpFile[]>([]);
  const [bulk, setBulk] = useState(false);
  const [drag, setDrag] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [sugg, setSugg] = useState<SuggestedMeta | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<ArchiveItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { can, canFully } = useCan();
  // Content managers publish their own uploads directly; everyone else sends them for review.
  const direct = canFully('publish_direct');
  const canSetVisibility = can('set_visibility');
  const maxEmbargo = settings.maxEmbargoMonths;
  const embargoFor = (months: number) => addMonthsIso(new Date(), clampEmbargoMonths(months, maxEmbargo));
  const defaultEmbargo = embargoFor(settings.defaultEmbargoMonths);
  const maxEmbargoDate = addMonthsIso(new Date(), maxEmbargo);
  const [submittedAs, setSubmittedAs] = useState<'draft' | 'in_review' | 'published'>('in_review');
  const [meta, setMeta] = useState<UploadMeta>({
    title: '', summary: '', keywords: [], tags: [], region: 'antarctica', discipline: 'glaciology', year: new Date().getFullYear(), authors: [user.name],
    accessLevel: 'public', embargoUntil: defaultEmbargo, licence: settings.defaultLicence as Licence, credit: `${user.name} / NCPOR (demo)`,
    visibleTo: settings.defaultVisibility ?? undefined,
  });
  const set = <K extends keyof UploadMeta>(k: K, v: UploadMeta[K]) => setMeta((m) => ({ ...m, [k]: v }));

  // Simulated chunked upload progress for all incomplete files.
  useEffect(() => {
    if (!files.some((f) => f.progress < 100)) return;
    const t = setInterval(() => {
      setFiles((fs) => fs.map((f) => (f.progress >= 100 ? f : { ...f, progress: Math.min(100, f.progress + Math.max(3, (CHUNK / Math.max(f.file.size, CHUNK)) * 100 * (0.6 + Math.random()))) })));
    }, 180);
    return () => clearInterval(t);
  }, [files]);

  // Revoke object URLs on unmount (files are only kept in memory).
  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const addFiles = useCallback(async (list: FileList | File[]) => {
    const arr = Array.from(list);
    const next: UpFile[] = [];
    for (const file of arr) {
      const kind = kindOf(file.name, file.type);
      const url = kind === 'image' || kind === 'video' ? URL.createObjectURL(file) : undefined;
      if (url) urls.current.push(url);
      const csv = kind === 'csv' ? await parseCsv(file) : undefined;
      next.push({ id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 6)}`, file, url, progress: 0, info: { name: file.name, size: file.size, kind, csv } });
    }
    setFiles((f) => [...f, ...next]);
    if (next.length > 1) setBulk(true);
  }, []);

  const runSuggest = () => {
    if (!type) return;
    setSuggesting(true);
    setTimeout(() => {
      const s = suggestMetadata(files.map((f) => f.file.name), type);
      setSugg(s);
      setMeta((m) => ({ ...m, title: s.title, summary: s.extractedSummary ? `${s.summary}` : s.summary, keywords: s.keywords, tags: s.tags, region: s.region, station: s.station, discipline: s.discipline, expeditionId: s.expeditionId, altText: s.altText }));
      setConfirmed(false);
      setSuggesting(false);
    }, 1200);
  };

  const validate = (): boolean => {
    if (step === 0 && !type) return (toast.error('Choose a content type'), false);
    if (step === 1) {
      if (!files.length) return (toast.error('Add at least one file'), false);
      if (files.some((f) => f.progress < 100)) return (toast.error('Please wait for uploads to finish'), false);
    }
    if (step === 2) {
      const r = metaSchema.safeParse(meta);
      const e: Record<string, string> = {};
      if (!r.success) r.error.issues.forEach((i) => (e[String(i.path[0])] = i.message));
      if (sugg && !confirmed) e.confirm = 'Please confirm the AI-suggested fields';
      if ((type === 'photo' || type === 'video') && (!meta.altText || meta.altText.length < 10)) e.altText = 'Alt text (10+ characters) is required for accessibility';
      setErrors(e);
      if (Object.keys(e).length) return (toast.error('Please fix the highlighted fields'), false);
    }
    if (step === 3 && meta.accessLevel === 'embargoed') {
      if (!meta.embargoUntil || new Date(meta.embargoUntil) <= new Date()) {
        setErrors({ embargo: 'Embargo date must be in the future' });
        return false;
      }
      if (meta.embargoUntil > maxEmbargoDate || monthsBetween(new Date(), meta.embargoUntil) > maxEmbargo) {
        setErrors({ embargo: `Embargoes can last at most ${maxEmbargo} months (until ${maxEmbargoDate})` });
        return false;
      }
    }
    return true;
  };

  const next = () => {
    if (!validate()) return;
    setErrors({});
    if (step === 1 && !sugg) runSuggest();
    setStep((s) => Math.min(4, s + 1));
  };

  const submit = async (status: 'draft' | 'in_review' | 'published') => {
    if (!type) return;
    if (status === 'published' && !direct) return toast.error('Your role cannot publish without approval');
    setSubmitting(true);
    const items = bulk && files.length > 1
      ? files.map((f) => buildItem(type, { ...meta, title: `${meta.title} — ${fileBase(f.file.name)}`, expeditionId: f.expeditionId ?? meta.expeditionId }, [f.info], user.id, status))
      : [buildItem(type, meta, files.map((f) => f.info), user.id, status)];
    for (const it of items) await api.upload(it);
    invalidate([['pipeline'], ['audit'], ['search'], ['home']]);
    setSubmittedAs(status);
    setCreated(items);
    setSubmitting(false);
    const n = `${items.length} item${items.length > 1 ? 's' : ''}`;
    toast.success(status === 'draft' ? `${n} saved as draft` : status === 'published' ? `${n} published` : `${n} submitted for review`);
  };

  const dupes = step >= 1 ? Array.from(new Map(files.flatMap((f) => findDuplicates(f.file.name)).map((d) => [d.item.id, d])).values()).slice(0, 3) : [];
  const titleDupes = step === 2 && meta.title.length > 8 ? findDuplicates(meta.title, 2).filter((d) => d.sim > 0.6) : [];

  if (created.length) {
    return (
      <>
        <DashHeader title="Upload Centre" />
        <div className="mx-auto max-w-2xl rounded-lg border bg-card p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" aria-hidden />
          <h2 className="mt-3 text-2xl font-semibold">{submittedAs === 'draft' ? 'Saved as draft' : submittedAs === 'published' ? 'Published' : 'Submitted for review'}</h2>
          <p className="mt-1 text-muted-foreground">
            {submittedAs === 'draft'
              ? 'Only you and staff can see it. Open it from your dashboard and submit it when ready.'
              : submittedAs === 'published'
                ? `It is live in the archive now. Visible to: ${visibilityLabel(meta.visibleTo)}.`
                : 'Status is now In review. Once a content manager approves, the item appears in the public archive for everyone.'}
          </p>
          <ul className="mt-5 space-y-2 text-left">
            {created.map((c) => (
              <li key={c.id} className="flex items-center gap-2 rounded-md border p-3 text-sm">
                <Badge variant={submittedAs === 'published' ? 'success' : submittedAs === 'draft' ? 'muted' : 'warning'}>{submittedAs === 'published' ? 'Published' : submittedAs === 'draft' ? 'Draft' : 'In review'}</Badge>
                <Link href={itemHref(c)} className="flex-1 hover:underline">{c.title}</Link>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {can('approve_publish') ? <Button asChild><Link href="/studio/approvals">View approval queue</Link></Button> : <Button asChild><Link href={dashboardPathFor(user.role)}>Go to my dashboard</Link></Button>}
            <Button variant="outline" onClick={() => { setCreated([]); setFiles([]); setStep(0); setType(null); setSugg(null); setMeta((m) => ({ ...m, title: '', summary: '' })); }}>Upload another</Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <DashHeader title="Upload Centre" description={direct ? "Add reports, datasets, expeditions, media and activities. Your uploads publish directly. Files stay in your browser (demo)." : "Add reports, datasets, expeditions, media and activities. A content manager reviews them before they go live. Files stay in your browser (demo)."} />
      <ol className="mb-6 flex flex-wrap items-center gap-2" aria-label="Upload steps">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span aria-current={i === step ? 'step' : undefined} className={cn('flex h-7 items-center gap-2 rounded-full border px-3 text-xs font-medium', i === step && 'border-primary bg-primary text-primary-foreground', i < step && 'border-success text-success')}>
              {i < step ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : <span>{i + 1}</span>} {s}
            </span>
            {i < STEPS.length - 1 && <span className="h-px w-4 bg-border" aria-hidden />}
          </li>
        ))}
      </ol>

      <div className="rounded-lg border bg-card p-5 md:p-6">
        {step === 0 && (
          <fieldset>
            <legend className="mb-4 text-lg font-semibold">What are you uploading?</legend>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TYPES.map((t) => (
                <button key={t.id} type="button" onClick={() => setType(t.id)} aria-pressed={type === t.id} className={cn('flex items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50', type === t.id && 'border-primary ring-2 ring-primary/30')}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-primary"><t.icon className="h-5 w-5" /></span>
                  <span><span className="block font-medium">{t.label}</span><span className="text-xs text-muted-foreground">{t.hint}</span></span>
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {step === 1 && type && (
          <div className="space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
              className={cn('flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition-colors', drag ? 'border-primary bg-primary/5' : 'border-border')}
            >
              <UploadCloud className="h-10 w-10 text-primary" aria-hidden />
              <p className="mt-2 font-medium">Drag & drop files here</p>
              <p className="text-sm text-muted-foreground">Multiple files allowed · {TYPES.find((t) => t.id === type)?.hint}</p>
              <Button variant="outline" className="mt-4" onClick={() => inputRef.current?.click()}>Browse files</Button>
              <input ref={inputRef} type="file" multiple accept={TYPES.find((t) => t.id === type)?.accept} className="sr-only" onChange={(e) => e.target.files && addFiles(e.target.files)} aria-label="Choose files to upload" />
            </div>
            <div className="flex items-center gap-3">
              <Switch id="bulk" checked={bulk} onCheckedChange={setBulk} />
              <Label htmlFor="bulk" className="flex items-center gap-1.5"><Layers className="h-4 w-4" aria-hidden /> Bulk mode — one archive item per file, grouped by expedition</Label>
            </div>
            {dupes.length > 0 && (
              <div role="alert" className="rounded-md border border-polar-amber/50 bg-polar-amber/10 p-3 text-sm">
                <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4 text-polar-amber" aria-hidden /> Possible duplicates found</p>
                <ul className="mt-1 list-disc pl-6">{dupes.map((d) => <li key={d.item.id}><Link href={itemHref(d.item)} className="hover:underline">{d.item.title}</Link> <span className="text-muted-foreground">({Math.round(d.sim * 100)}% similar)</span></li>)}</ul>
              </div>
            )}
            <ul className="space-y-2" aria-live="polite">
              {files.map((f) => {
                const chunks = Math.max(1, Math.ceil(f.file.size / CHUNK));
                return (
                  <li key={f.id} className="rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      {f.url && f.info.kind === 'image' ? <img src={f.url} alt="" className="h-12 w-12 rounded object-cover" /> : null}
                      <FileCard file={{ id: f.id, name: f.file.name, kind: f.info.kind, sizeKb: Math.round(f.file.size / 1024) }} className="flex-1 border-0 p-0" />
                      {bulk && (
                        <Select value={f.expeditionId ?? 'none'} onValueChange={(v) => setFiles((fs) => fs.map((x) => (x.id === f.id ? { ...x, expeditionId: v === 'none' ? undefined : v } : x)))}>
                          <SelectTrigger className="h-8 w-40" aria-label={`Expedition for ${f.file.name}`}><SelectValue placeholder="Expedition" /></SelectTrigger>
                          <SelectContent><SelectItem value="none">No expedition</SelectItem>{EXPEDITIONS.map((e) => <SelectItem key={e.id} value={e.id}>{e.number}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                      <Button variant="ghost" size="icon" aria-label={`Remove ${f.file.name}`} onClick={() => setFiles((fs) => fs.filter((x) => x.id !== f.id))}><Trash2 /></Button>
                    </div>
                    <Progress value={f.progress} className="mt-2" aria-label={`Upload progress for ${f.file.name}`} indicatorClassName={f.progress >= 100 ? 'bg-success' : undefined} />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {f.progress >= 100 ? 'Uploaded (kept in memory only)' : `Uploading chunk ${Math.min(chunks, Math.ceil((f.progress / 100) * chunks) || 1)} of ${chunks}…`}
                      {f.info.csv && ` · CSV detected: ${f.info.csv.header.length} columns, ${f.info.csv.rows.length} preview rows`}
                    </p>
                  </li>
                );
              })}
            </ul>
            {bulk && files.length > 1 && (
              <p className="text-sm text-muted-foreground">
                Grouping: {Object.entries(files.reduce<Record<string, number>>((a, f) => ((a[f.expeditionId ?? 'Unassigned'] = (a[f.expeditionId ?? 'Unassigned'] ?? 0) + 1), a), {})).map(([k, n]) => `${k.toUpperCase()} (${n})`).join(' · ')}
              </p>
            )}
          </div>
        )}

        {step === 2 && type && (
          <div className="space-y-5">
            {suggesting ? (
              <div className="space-y-3" role="status" aria-label="Generating AI suggestions">
                <p className="flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4 animate-pulse text-polar-violet" aria-hidden /> Reading files and suggesting metadata…</p>
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <>
                {sugg && (
                  <div className="flex flex-wrap items-center gap-3 rounded-md border border-polar-violet/30 bg-polar-violet/5 p-3">
                    <AiBadge label="Suggested by AI, please confirm" />
                    <span className="text-xs text-muted-foreground">Confidence {Math.round(sugg.confidence * 100)}% (simulated)</span>
                    <Button size="sm" variant="ghost" onClick={runSuggest}><Sparkles /> Re-suggest</Button>
                    <label className="ml-auto flex items-center gap-2 text-sm font-medium">
                      <Checkbox checked={confirmed} onCheckedChange={(c) => setConfirmed(c === true)} aria-describedby={errors.confirm ? 'confirm-err' : undefined} /> I have reviewed the suggested fields
                    </label>
                    {errors.confirm && <p id="confirm-err" className="w-full text-xs text-destructive">{errors.confirm}</p>}
                  </div>
                )}
                {sugg?.extractedSummary && (
                  <div className="rounded-md border bg-muted/40 p-3 text-sm"><p className="font-medium">Extracted summary preview</p><p className="text-muted-foreground">{sugg.extractedSummary}</p></div>
                )}
                {titleDupes.length > 0 && (
                  <p role="alert" className="flex items-center gap-2 rounded-md bg-polar-amber/10 p-2 text-sm"><AlertTriangle className="h-4 w-4 text-polar-amber" aria-hidden /> A similar title exists: <Link href={itemHref(titleDupes[0].item)} className="underline">{titleDupes[0].item.title}</Link></p>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="m-title">Title {sugg && <Sparkles className="inline h-3 w-3 text-polar-violet" aria-label="AI suggested" />}</Label>
                    <Input id="m-title" value={meta.title} onChange={(e) => set('title', e.target.value)} aria-invalid={!!errors.title} />
                    {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="m-sum">Summary {sugg && <Sparkles className="inline h-3 w-3 text-polar-violet" aria-label="AI suggested" />}</Label>
                    <Textarea id="m-sum" rows={3} value={meta.summary} onChange={(e) => set('summary', e.target.value)} aria-invalid={!!errors.summary} />
                    {errors.summary && <p className="text-xs text-destructive">{errors.summary}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="m-kw">Keywords (comma separated)</Label>
                    <Input id="m-kw" value={meta.keywords.join(', ')} onChange={(e) => set('keywords', e.target.value.split(',').map((x) => x.trim()).filter(Boolean))} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="m-tags">Tags (comma separated)</Label>
                    <Input id="m-tags" value={meta.tags.join(', ')} onChange={(e) => set('tags', e.target.value.split(',').map((x) => x.trim()).filter(Boolean))} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="m-reg">Region</Label>
                    <Select value={meta.region} onValueChange={(v) => set('region', v as Region)}><SelectTrigger id="m-reg"><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(REGION_META) as Region[]).map((r) => <SelectItem key={r} value={r}>{REGION_META[r].label}</SelectItem>)}</SelectContent></Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="m-st">Station</Label>
                    <Select value={meta.station ?? 'none'} onValueChange={(v) => set('station', v === 'none' ? undefined : (v as StationSlug))}><SelectTrigger id="m-st"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None / ship-based</SelectItem>{(Object.keys(STATION_NAMES) as StationSlug[]).map((s) => <SelectItem key={s} value={s}>{STATION_NAMES[s]}</SelectItem>)}</SelectContent></Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="m-disc">Discipline</Label>
                    <Select value={meta.discipline} onValueChange={(v) => set('discipline', v as Discipline)}><SelectTrigger id="m-disc"><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(DISCIPLINE_LABELS) as Discipline[]).map((d) => <SelectItem key={d} value={d}>{DISCIPLINE_LABELS[d]}</SelectItem>)}</SelectContent></Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="m-exp">Expedition</Label>
                    <Select value={meta.expeditionId ?? 'none'} onValueChange={(v) => set('expeditionId', v === 'none' ? undefined : v)}><SelectTrigger id="m-exp"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Not linked</SelectItem>{EXPEDITIONS.map((e) => <SelectItem key={e.id} value={e.id}>{e.number} — {e.year}</SelectItem>)}</SelectContent></Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="m-year">Year</Label>
                    <Input id="m-year" type="number" min={1980} max={2030} value={meta.year} onChange={(e) => set('year', Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="m-auth">Authors (comma separated)</Label>
                    <Input id="m-auth" value={meta.authors.join(', ')} onChange={(e) => set('authors', e.target.value.split(',').map((x) => x.trim()).filter(Boolean))} aria-invalid={!!errors.authors} />
                    {errors.authors && <p className="text-xs text-destructive">{errors.authors}</p>}
                  </div>
                  {(type === 'photo' || type === 'video') && (
                    <div className="space-y-1 md:col-span-2">
                      <Label htmlFor="m-alt">Alt text {sugg?.altText && <Sparkles className="inline h-3 w-3 text-polar-violet" aria-label="AI suggested" />}</Label>
                      <Textarea id="m-alt" rows={2} value={meta.altText ?? ''} onChange={(e) => set('altText', e.target.value)} aria-invalid={!!errors.altText} />
                      {errors.altText && <p className="text-xs text-destructive">{errors.altText}</p>}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {files.filter((f) => f.url && f.info.kind === 'image').map((f) => <img key={f.id} src={f.url} alt={meta.altText || 'Uploaded image preview'} className="h-20 w-28 rounded object-cover" />)}
                      </div>
                      <p className="text-xs text-muted-foreground">Suggested tags: {sugg?.tags.map((t) => <Badge key={t} variant="aurora" className="mr-1">{t}</Badge>)}</p>
                    </div>
                  )}
                  {type === 'event' && (
                    <>
                      <div className="space-y-1">
                        <Label htmlFor="m-et">Activity type</Label>
                        <Select value={meta.eventType ?? 'Workshop'} onValueChange={(v) => set('eventType', v as EventItem['eventType'])}><SelectTrigger id="m-et"><SelectValue /></SelectTrigger><SelectContent>{['Workshop', 'MoU', 'School outreach', 'Lecture', 'Visit', 'Award', 'Conference'].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>
                      </div>
                      <div className="space-y-1"><Label htmlFor="m-date">Date</Label><Input id="m-date" type="date" value={meta.date ?? ''} onChange={(e) => set('date', e.target.value)} /></div>
                      <div className="space-y-1 md:col-span-2"><Label htmlFor="m-venue">Venue</Label><Input id="m-venue" value={meta.venue ?? ''} onChange={(e) => set('venue', e.target.value)} /></div>
                    </>
                  )}
                  {type === 'expedition' && (
                    <>
                      <div className="space-y-1"><Label htmlFor="m-start">Start date</Label><Input id="m-start" type="date" value={meta.date ?? ''} onChange={(e) => set('date', e.target.value)} /></div>
                      <div className="space-y-1"><Label htmlFor="m-end">End date</Label><Input id="m-end" type="date" value={meta.endDate ?? ''} min={meta.date} onChange={(e) => set('endDate', e.target.value)} /></div>
                      <div className="space-y-1"><Label htmlFor="m-vessel">Vessel / base</Label><Input id="m-vessel" value={meta.vessel ?? ''} onChange={(e) => set('vessel', e.target.value)} placeholder="e.g. research vessel (demo)" /></div>
                      <div className="space-y-1"><Label htmlFor="m-obj">Objectives (one per line)</Label><Textarea id="m-obj" rows={3} value={(meta.objectives ?? []).join('\n')} onChange={(e) => set('objectives', e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))} /></div>
                    </>
                  )}
                  {type === 'publication' && (
                    <div className="space-y-1 md:col-span-2"><Label htmlFor="m-j">Journal</Label><Input id="m-j" value={meta.journal ?? ''} onChange={(e) => set('journal', e.target.value)} /></div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <fieldset>
              <legend className="mb-2 font-semibold">Access level</legend>
              <RadioGroup value={meta.accessLevel} onValueChange={(v) => set('accessLevel', v as AccessLevel)} className="grid gap-2 sm:grid-cols-2">
                {(Object.keys(ACCESS_META) as AccessLevel[]).map((a) => (
                  <label key={a} className={cn('flex cursor-pointer items-start gap-3 rounded-lg border p-3', meta.accessLevel === a && 'border-primary ring-1 ring-primary')}>
                    <RadioGroupItem value={a} className="mt-1" />
                    <span><AccessBadge level={a} /><span className="mt-1 block text-sm text-muted-foreground">{ACCESS_META[a].description}</span></span>
                  </label>
                ))}
              </RadioGroup>
            </fieldset>
            {meta.accessLevel === 'embargoed' && (
              <div className="space-y-2 rounded-lg border border-polar-amber/40 bg-polar-amber/5 p-4">
                <p id="emb-len" className="text-sm font-medium">Embargo length</p>
                <div className="flex flex-wrap gap-2" role="group" aria-labelledby="emb-len">
                  {EMBARGO_PRESETS.filter((m) => m <= maxEmbargo).map((m) => {
                    const d = embargoFor(m);
                    return (
                      <Button key={m} size="sm" type="button" variant={meta.embargoUntil === d ? 'default' : 'outline'} aria-pressed={meta.embargoUntil === d} onClick={() => set('embargoUntil', d)}>
                        {m} months
                      </Button>
                    );
                  })}
                </div>
                <div className="max-w-xs space-y-1">
                  <Label htmlFor="emb-date">Or pick a date</Label>
                  <Input id="emb-date" type="date" value={meta.embargoUntil ?? ''} min={new Date().toISOString().slice(0, 10)} max={maxEmbargoDate} onChange={(e) => set('embargoUntil', e.target.value)} aria-invalid={!!errors.embargo} />
                </div>
                {errors.embargo && <p className="text-xs text-destructive">{errors.embargo}</p>}
                <p className="text-xs text-muted-foreground">Default {settings.defaultEmbargoMonths} months · maximum {maxEmbargo} months (admin settings). Files stay locked until the date; you and admins keep access.</p>
              </div>
            )}
            <div className="max-w-md">
              {canSetVisibility ? (
                <VisibilityControl id="up-vis" value={meta.visibleTo} onChange={(v: Audience[] | undefined) => set('visibleTo', v)} />
              ) : (
                <p className="text-sm text-muted-foreground">Visible to: <strong>{visibilityLabel(meta.visibleTo)}</strong>. Content managers can change who sees it after publishing.</p>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="lic">Licence</Label>
                <Select value={meta.licence} onValueChange={(v) => set('licence', v as Licence)}><SelectTrigger id="lic"><SelectValue /></SelectTrigger><SelectContent>{(['CC-BY-4.0', 'CC-BY-NC-4.0', 'CC0', 'NCPOR-Restricted', 'All rights reserved'] as Licence[]).map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="credit">Credit line</Label>
                <Input id="credit" value={meta.credit} onChange={(e) => set('credit', e.target.value)} aria-invalid={!!errors.credit} />
              </div>
            </div>
          </div>
        )}

        {step === 4 && type && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Review & submit</h2>
            <dl className="grid gap-3 text-sm md:grid-cols-2">
              {[
                ['Type', CONTENT_TYPE_LABELS[type].singular],
                ['Files', `${files.length} file(s)${bulk && files.length > 1 ? ' — bulk: one item per file' : ''}`],
                ['Title', meta.title],
                ['Region / station', `${REGION_META[meta.region].label}${meta.station ? ` · ${STATION_NAMES[meta.station]}` : ''}`],
                ['Discipline', DISCIPLINE_LABELS[meta.discipline]],
                ['Expedition', meta.expeditionId?.toUpperCase() ?? '—'],
                ['Authors', meta.authors.join(', ')],
                ['Tags', meta.tags.join(', ')],
                ['Access', `${ACCESS_META[meta.accessLevel].label}${meta.accessLevel === 'embargoed' ? ` until ${meta.embargoUntil}` : ''}`],
                ['Licence / credit', `${meta.licence} · ${meta.credit}`],
                ['Visible to', visibilityLabel(meta.visibleTo)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-md border p-3"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-0.5 font-medium">{v}</dd></div>
              ))}
            </dl>
            <p className="rounded-md bg-muted p-3 text-sm">{meta.summary}</p>
            <p className="text-sm text-muted-foreground">
              {direct ? 'As a content manager your upload publishes immediately. You can also save it as a draft.' : 'On submit, status becomes In review and a content manager approves it. Or save it as a draft and submit later.'}
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-between border-t pt-4">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}><ArrowLeft /> Back</Button>
          {step < 4 ? (
            <Button onClick={next} disabled={suggesting}>Next <ArrowRight /></Button>
          ) : (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => submit('draft')} disabled={submitting}><Save /> Save as draft</Button>
              {direct ? (
                <Button variant="success" onClick={() => submit('published')} loading={submitting}><Rocket /> Publish now</Button>
              ) : (
                <Button variant="success" onClick={() => submit('in_review')} loading={submitting}><Send /> Submit for review</Button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
