'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { AudioLines, CheckCircle2, Database, FileArchive, FileSpreadsheet, FileText, Info, Rocket, UploadCloud, X } from 'lucide-react';
import type { AccessLevel, ArchiveItem, Dataset, Discipline, Licence, Region } from '@/types';
import { DashHeader } from './shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInvalidate } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { allItems, itemHref } from '@/lib/archive';
import { buildItem, kindOf, type UploadFileInfo, type UploadMeta } from '@/lib/upload';
import { ACCESS_META, DISCIPLINE_LABELS, REGION_META } from '@/lib/constants';
import { useAuthStore } from '@/store/auth';
import { useDataStore } from '@/store/data';
import { cn } from '@/lib/utils';

type Resource = 'dataset' | 'document' | 'audio' | 'other';

const RESOURCES: { id: Resource; label: string; hint: string; icon: typeof FileText; accept: string; tag: string }[] = [
  { id: 'dataset', label: 'Dataset', hint: 'CSV, NetCDF, JSON, spreadsheets or zipped data', icon: FileSpreadsheet, accept: '.csv,.nc,.zip,.txt,.json,.xlsx,.xls,.tsv', tag: 'dataset' },
  { id: 'document', label: 'Report or document', hint: 'PDF reports, field notes, papers', icon: FileText, accept: '.pdf,.doc,.docx,.txt,.odt', tag: 'report' },
  { id: 'audio', label: 'Sound recording', hint: 'WAV, MP3, FLAC or OGG field recordings', icon: AudioLines, accept: 'audio/*,.wav,.mp3,.flac,.ogg,.m4a', tag: 'audio' },
  { id: 'other', label: 'Other file', hint: 'Images, archives or anything else', icon: FileArchive, accept: '', tag: 'file' },
];

const LICENCES: Licence[] = ['CC-BY-4.0', 'CC-BY-NC-4.0', 'CC0', 'NCPOR-Restricted', 'All rights reserved'];
const ACCESS: AccessLevel[] = ['public', 'registered', 'restricted'];

const schema = z.object({
  title: z.string().trim().min(5, 'Title needs at least 5 characters'),
  summary: z.string().trim().min(20, 'Description needs at least 20 characters'),
  authors: z.array(z.string()).min(1, 'Add at least one author'),
  credit: z.string().trim().min(3, 'Credit line is required'),
});

const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
const extOf = (name: string) => name.split('.').pop()?.toUpperCase() ?? 'FILE';
const sizeLabel = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

async function readCsv(file: File): Promise<UploadFileInfo['csv']> {
  if (file.size > 2 * 1024 * 1024) return undefined;
  const lines = (await file.text()).split(/\r?\n/).filter(Boolean).slice(0, 51);
  if (!lines.length) return undefined;
  const split = (l: string) => l.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
  return { header: split(lines[0]), rows: lines.slice(1).map(split) };
}

/**
 * Builds a published Data catalogue entry. CSVs keep their parsed preview; other files (PDF, audio…)
 * get a one-row file description instead of invented numbers.
 */
function toDataset(resource: Resource, meta: UploadMeta, info: UploadFileInfo, ownerId: string): Dataset {
  const d = buildItem('dataset', { ...meta, tags: Array.from(new Set([...meta.tags, RESOURCES.find((r) => r.id === resource)!.tag])) }, [info], ownerId, 'published') as Dataset;
  if (info.csv) return d;
  return {
    ...d,
    format: extOf(info.name),
    variables: [
      { name: 'file', unit: '', description: 'Uploaded file', dataType: 'string' },
      { name: 'size_kb', unit: 'KB', description: 'File size', dataType: 'number' },
    ],
    sampleRows: [{ file: info.name, size_kb: Math.max(1, Math.round(info.size / 1024)) }],
    chart: { x: 'file', y: ['size_kb'] },
  };
}

export function ScientistPublish() {
  const user = useAuthStore((s) => s.user)!;
  const uploads = useDataStore((s) => s.uploads);
  const invalidate = useInvalidate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [resource, setResource] = useState<Resource>('dataset');
  const [file, setFile] = useState<{ file: File; info: UploadFileInfo } | null>(null);
  const [drag, setDrag] = useState(false);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [authors, setAuthors] = useState(user.name);
  const [tags, setTags] = useState('');
  const [region, setRegion] = useState<Region>('antarctica');
  const [discipline, setDiscipline] = useState<Discipline>('glaciology');
  const [year, setYear] = useState(new Date().getFullYear());
  const [licence, setLicence] = useState<Licence>('CC-BY-4.0');
  const [access, setAccess] = useState<AccessLevel>('public');
  const [credit, setCredit] = useState(`${user.name} / NCPOR (demo)`);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<ArchiveItem | null>(null);

  const recent = useMemo(
    () => allItems().filter((i) => i.type === 'dataset' && i.ownerId === user.id && i.userCreated && i.status === 'published').slice(0, 5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uploads, user.id, created],
  );
  const res = RESOURCES.find((r) => r.id === resource)!;

  const pick = async (f: File | undefined) => {
    if (!f) return;
    const kind = kindOf(f.name, f.type);
    const csv = kind === 'csv' ? await readCsv(f) : undefined;
    setFile({ file: f, info: { name: f.name, size: f.size, kind, csv } });
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
    setErrors((e) => ({ ...e, file: '' }));
  };

  const reset = () => {
    setCreated(null);
    setFile(null);
    setTitle('');
    setSummary('');
    setTags('');
    setErrors({});
  };

  const publish = async () => {
    const meta: UploadMeta = {
      title: title.trim(), summary: summary.trim(), keywords: [], tags: list(tags), region, discipline, year, authors: list(authors),
      accessLevel: access, licence, credit: credit.trim(),
    };
    const r = schema.safeParse(meta);
    const e: Record<string, string> = {};
    if (!r.success) r.error.issues.forEach((i) => (e[String(i.path[0])] = i.message));
    if (!file) e.file = 'Choose a file to publish';
    if (!Number.isInteger(year) || year < 1950 || year > new Date().getFullYear() + 1) e.year = 'Enter a valid year';
    setErrors(e);
    if (Object.keys(e).length || !file) return toast.error('Please fix the highlighted fields');

    setBusy(true);
    const item = toDataset(resource, meta, file.info, user.id);
    await api.upload(item);
    invalidate([['pipeline'], ['audit'], ['search'], ['home'], ['datasets']]);
    setBusy(false);
    setCreated(item);
    toast.success('Published to the Data catalogue', { description: 'It is live now. No approval needed.' });
  };

  const field = (id: string) => (errors[id] ? <p id={`${id}-err`} className="text-xs text-destructive">{errors[id]}</p> : null);

  return (
    <>
      <DashHeader
        title="Publish to Data"
        description="Add a dataset, report, sound recording or any file straight to the Data catalogue. Scientists publish here without approval. Files stay in your browser (demo)."
        actions={
          <Button variant="outline" asChild>
            <Link href="/data"><Database /> Open the Data catalogue</Link>
          </Button>
        }
      />

      {created ? (
        <div className="mx-auto max-w-2xl rounded-xl border bg-card p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" aria-hidden />
          <h2 className="mt-3 text-2xl font-semibold">Published to the Data catalogue</h2>
          <p className="mt-1 text-muted-foreground">It is live now and listed under Data in the top navigation. {ACCESS_META[created.accessLevel].description}.</p>
          <Link href={itemHref(created)} className="mt-5 flex items-center gap-2 rounded-md border p-3 text-left text-sm hover:bg-muted/50">
            <Badge variant="success">Published</Badge>
            <span className="flex-1 font-medium">{created.title}</span>
          </Link>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button asChild><Link href={itemHref(created)}>View entry</Link></Button>
            <Button variant="outline" asChild><Link href="/studio/data">All my Data items</Link></Button>
            <Button variant="ghost" onClick={reset}>Publish another</Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <form
            noValidate
            onSubmit={(ev) => {
              ev.preventDefault();
              publish();
            }}
            className="space-y-6"
          >
            <fieldset className="rounded-xl border bg-card p-5 md:p-6">
              <legend className="sr-only">What are you publishing?</legend>
              <p className="mb-4 text-sm font-semibold">1. What are you publishing?</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {RESOURCES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    aria-pressed={resource === r.id}
                    onClick={() => {
                      setResource(r.id);
                      setFile(null);
                    }}
                    className={cn('flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50', resource === r.id && 'border-primary bg-primary/5 ring-1 ring-primary/30')}
                  >
                    <span className={cn('flex h-9 w-9 items-center justify-center rounded-md', resource === r.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-primary')}>
                      <r.icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="text-sm font-medium">{r.label}</span>
                    <span className="text-xs leading-5 text-muted-foreground">{r.hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <section className="rounded-xl border bg-card p-5 md:p-6" aria-labelledby="pub-file">
              <p id="pub-file" className="mb-4 text-sm font-semibold">2. File</p>
              {file ? (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-primary"><res.icon className="h-5 w-5" aria-hidden /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{file.info.name}</p>
                    <p className="text-xs text-muted-foreground">{extOf(file.info.name)} · {sizeLabel(file.info.size)}{file.info.csv ? ` · ${file.info.csv.rows.length} preview rows parsed` : ''}</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setFile(null)} aria-label="Remove file"><X /></Button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
                  className={cn('flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors', drag ? 'border-primary bg-primary/5' : 'border-border', errors.file && 'border-destructive')}
                >
                  <UploadCloud className="h-9 w-9 text-primary" aria-hidden />
                  <p className="mt-2 text-sm font-medium">Drag & drop a file here</p>
                  <p className="text-xs text-muted-foreground">{res.hint}</p>
                  <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => inputRef.current?.click()}>Browse files</Button>
                  <input ref={inputRef} type="file" accept={res.accept || undefined} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} aria-label="Choose a file to publish" />
                </div>
              )}
              {field('file')}
            </section>

            <section className="rounded-xl border bg-card p-5 md:p-6" aria-labelledby="pub-meta">
              <p id="pub-meta" className="mb-4 text-sm font-semibold">3. Description</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="p-title">Title</Label>
                  <Input id="p-title" value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={!!errors.title} aria-describedby={errors.title ? 'title-err' : undefined} />
                  {field('title')}
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="p-sum">Description</Label>
                  <Textarea id="p-sum" rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What is in the file, how it was collected and how it can be used." aria-invalid={!!errors.summary} aria-describedby={errors.summary ? 'summary-err' : undefined} />
                  {field('summary')}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-auth">Authors <span className="font-normal text-muted-foreground">(comma separated)</span></Label>
                  <Input id="p-auth" value={authors} onChange={(e) => setAuthors(e.target.value)} aria-invalid={!!errors.authors} aria-describedby={errors.authors ? 'authors-err' : undefined} />
                  {field('authors')}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-tags">Tags <span className="font-normal text-muted-foreground">(comma separated)</span></Label>
                  <Input id="p-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="sea ice, Bharati, 2025" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-region">Region</Label>
                  <Select value={region} onValueChange={(v) => setRegion(v as Region)}>
                    <SelectTrigger id="p-region"><SelectValue /></SelectTrigger>
                    <SelectContent>{(Object.keys(REGION_META) as Region[]).map((r) => <SelectItem key={r} value={r}>{REGION_META[r].label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-disc">Discipline</Label>
                  <Select value={discipline} onValueChange={(v) => setDiscipline(v as Discipline)}>
                    <SelectTrigger id="p-disc"><SelectValue /></SelectTrigger>
                    <SelectContent>{(Object.keys(DISCIPLINE_LABELS) as Discipline[]).map((d) => <SelectItem key={d} value={d}>{DISCIPLINE_LABELS[d]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-year">Year</Label>
                  <Input id="p-year" type="number" inputMode="numeric" value={year} onChange={(e) => setYear(Number(e.target.value))} aria-invalid={!!errors.year} aria-describedby={errors.year ? 'year-err' : undefined} />
                  {field('year')}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-credit">Credit line</Label>
                  <Input id="p-credit" value={credit} onChange={(e) => setCredit(e.target.value)} aria-invalid={!!errors.credit} aria-describedby={errors.credit ? 'credit-err' : undefined} />
                  {field('credit')}
                </div>
              </div>
            </section>

            <section className="rounded-xl border bg-card p-5 md:p-6" aria-labelledby="pub-access">
              <p id="pub-access" className="mb-4 text-sm font-semibold">4. Access & licence</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="p-access">Who can download</Label>
                  <Select value={access} onValueChange={(v) => setAccess(v as AccessLevel)}>
                    <SelectTrigger id="p-access"><SelectValue /></SelectTrigger>
                    <SelectContent>{ACCESS.map((a) => <SelectItem key={a} value={a}>{ACCESS_META[a].label} · {ACCESS_META[a].description}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-lic">Licence</Label>
                  <Select value={licence} onValueChange={(v) => setLicence(v as Licence)}>
                    <SelectTrigger id="p-lic"><SelectValue /></SelectTrigger>
                    <SelectContent>{LICENCES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <p className="mr-auto flex items-center gap-1.5 text-xs text-muted-foreground"><Info className="h-3.5 w-3.5" aria-hidden /> Publishes immediately. No approval step.</p>
              <Button type="submit" variant="success" loading={busy}><Rocket /> Publish to Data</Button>
            </div>
          </form>

          <aside className="space-y-4">
            <div className="rounded-xl border bg-card p-5">
              <p className="text-sm font-semibold">How this differs from drafts</p>
              <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
                <li className="flex gap-2"><Database className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden /> Files published here go straight into the Data catalogue.</li>
                <li className="flex gap-2"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden /> Posts written in <Link href="/studio" className="font-medium text-primary hover:underline">Upload draft</Link> need a content manager or admin to approve them.</li>
              </ul>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Recently published</p>
                <Link href="/studio/data" className="text-xs font-medium text-primary hover:underline">See all</Link>
              </div>
              {recent.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Nothing yet. Your first entry will appear here.</p>
              ) : (
                <ul className="mt-3 divide-y">
                  {recent.map((i) => (
                    <li key={i.id} className="py-2">
                      <Link href={itemHref(i)} className="line-clamp-1 text-sm font-medium hover:text-primary hover:underline">{i.title}</Link>
                      <p className="text-xs text-muted-foreground">{(i as Dataset).format} · {new Date(i.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
