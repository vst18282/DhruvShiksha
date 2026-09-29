'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Bookmark,
  BookmarkCheck,
  Check,
  Clock,
  Copy,
  Download,
  FolderPlus,
  Link2,
  Lock,
  Mail,
  PenSquare,
  Quote,
  Share2,
} from 'lucide-react';
import type { ArchiveItem, Attachment } from '@/types';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip } from '@/components/ui/misc';
import { FileCard } from '@/components/common';
import { PlatformIcon } from '@/components/studio/platform-icon';
import { useAuthStore } from '@/store/auth';
import { useUserStore } from '@/store/user';
import { useDataStore } from '@/store/data';
import { useHydrated } from '@/store/hydration';
import { useCan } from '@/lib/permissions';
import { accessState } from '@/lib/access';
import { downloadItem } from '@/lib/downloads';
import { toApa, toBibtex, toRis } from '@/lib/cite';
import { refOf } from '@/lib/archive';
import { api } from '@/lib/mock-api';
import { downloadTextFile } from '@/lib/utils';

/* ------------------------------ Bookmark ------------------------------ */

export function BookmarkButton({ item, size = 'sm' }: { item: ArchiveItem; size?: 'sm' | 'icon' }) {
  const hydrated = useHydrated();
  const user = useAuthStore((s) => s.user);
  const bookmarks = useUserStore((s) => s.bookmarks);
  const toggle = useUserStore((s) => s.toggleBookmark);
  const collections = useUserStore((s) => s.collections);
  const toggleIn = useUserStore((s) => s.toggleInCollection);
  const create = useUserStore((s) => s.createCollection);
  const { can } = useCan();
  const ref = refOf(item);
  const on = hydrated && bookmarks.some((b) => b.id === item.id);
  if (!hydrated) return <Button variant="outline" size={size === 'icon' ? 'icon' : 'sm'} disabled aria-label="Bookmark" />;
  if (!user || !can('bookmarks'))
    return (
      <Tooltip content="Log in to bookmark and build collections">
        <Button variant="outline" size={size === 'icon' ? 'icon' : 'sm'} asChild>
          <Link href="/login" aria-label="Log in to bookmark">
            <Bookmark /> {size !== 'icon' && 'Bookmark'}
          </Link>
        </Button>
      </Tooltip>
    );
  return (
    <div className="inline-flex">
      <Button
        variant={on ? 'secondary' : 'outline'}
        size={size === 'icon' ? 'icon' : 'sm'}
        aria-pressed={on}
        className="rounded-r-none"
        onClick={() => {
          const added = toggle(ref);
          toast.success(added ? 'Bookmarked' : 'Bookmark removed');
        }}
      >
        {on ? <BookmarkCheck /> : <Bookmark />} {size !== 'icon' && (on ? 'Saved' : 'Bookmark')}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size={size === 'icon' ? 'icon' : 'sm'} className="-ml-px rounded-l-none px-2" aria-label="Add to collection">
            <FolderPlus />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Add to collection</DropdownMenuLabel>
          {collections.map((c) => (
            <DropdownMenuCheckboxItem key={c.id} checked={c.items.some((x) => x.id === item.id)} onCheckedChange={() => toggleIn(c.id, ref)}>
              {c.name}
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              const id = create(`New collection ${collections.length + 1}`);
              toggleIn(id, ref);
              toast.success('Collection created — rename it from your dashboard');
            }}
          >
            <FolderPlus /> New collection
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/* -------------------------------- Cite -------------------------------- */

export function CiteDialog({ item, trigger }: { item: ArchiveItem; trigger?: React.ReactNode }) {
  const formats = [
    { id: 'apa', label: 'APA', text: toApa(item), ext: 'txt' },
    { id: 'bibtex', label: 'BibTeX', text: toBibtex(item), ext: 'bib' },
    { id: 'ris', label: 'RIS', text: toRis(item), ext: 'ris' },
  ];
  const [copied, setCopied] = useState<string | null>(null);
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Quote /> Cite
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cite this {item.type}</DialogTitle>
          <DialogDescription>Demo citation — DOIs use a test prefix and do not resolve.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="apa">
          <TabsList>
            {formats.map((f) => (
              <TabsTrigger key={f.id} value={f.id}>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {formats.map((f) => (
            <TabsContent key={f.id} value={f.id}>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/50 p-3 font-mono text-xs">{f.text}</pre>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    await navigator.clipboard?.writeText(f.text);
                    setCopied(f.id);
                    toast.success(`${f.label} citation copied`);
                    setTimeout(() => setCopied(null), 1500);
                  }}
                >
                  {copied === f.id ? <Check /> : <Copy />} Copy {f.label}
                </Button>
                <Button size="sm" variant="outline" onClick={() => downloadTextFile(`${item.slug}.${f.ext}`, f.text)}>
                  <Download /> Download .{f.ext}
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------- Share ------------------------------- */

export function ShareButtons({ title, path }: { title: string; path?: string }) {
  const [url, setUrl] = useState('');
  const hydrated = useHydrated();
  const showShare = useDataStore((s) => s.settings.showShare);
  useEffect(() => setUrl(typeof window !== 'undefined' ? window.location.origin + (path ?? window.location.pathname) : ''), [path]);
  const enc = encodeURIComponent;
  if (hydrated && !showShare) return null; // turned off in System settings › Content & engagement
  const links = [
    { label: 'Share on X', href: `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`, platform: 'x' as const },
    { label: 'Share on LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`, platform: 'linkedin' as const },
    { label: 'Share on Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, platform: 'facebook' as const },
    { label: 'Share on WhatsApp', href: `https://wa.me/?text=${enc(`${title} ${url}`)}`, platform: 'whatsapp' as const },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 /> Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={async () => {
            await navigator.clipboard?.writeText(url);
            toast.success('Link copied');
          }}
        >
          <Link2 /> Copy link
        </DropdownMenuItem>
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <DropdownMenuItem onSelect={() => navigator.share({ title, url }).catch(() => undefined)}>
            <Share2 /> Share via device…
          </DropdownMenuItem>
        )}
        {links.map((l) => (
          <DropdownMenuItem key={l.label} asChild>
            <a href={l.href} target="_blank" rel="noopener noreferrer">
              <PlatformIcon id={l.platform} />
              {l.label}
            </a>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem asChild>
          <a href={`mailto:?subject=${enc(title)}&body=${enc(url)}`}>
            <Mail /> Email
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* --------------------------- Embargo countdown -------------------------- */

export function EmbargoCountdown({ until }: { until: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  if (now === null) return null;
  const ms = new Date(until).getTime() - now;
  if (ms <= 0) return <span className="text-sm text-success">Embargo ended</span>;
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  return (
    <span className="inline-flex items-center gap-1.5 text-sm" aria-live="polite">
      <Clock className="h-4 w-4 text-polar-amber" aria-hidden />
      Opens in <strong className="tabular-nums">{d}</strong> days <strong className="tabular-nums">{h}</strong> h
    </span>
  );
}

/* --------------------------- Request access ---------------------------- */

const reqSchema = z.object({
  institution: z.string().min(2, 'Institution is required'),
  purpose: z.string().min(20, 'Please describe your intended use (at least 20 characters)'),
  agree: z.literal(true, { errorMap: () => ({ message: 'You must accept the data use terms' }) }),
});

export function RequestAccessDialog({ item, children }: { item: ArchiveItem; children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof reqSchema>>({ resolver: zodResolver(reqSchema), defaultValues: { institution: user?.org ?? '', purpose: '' } });
  const onSubmit = async (v: z.infer<typeof reqSchema>) => {
    if (!user) return;
    await api.requestAccess({ itemId: item.id, itemType: item.type, itemTitle: item.title, requesterId: user.id, requesterName: user.name, purpose: v.purpose, institution: v.institution });
    toast.success('Access request submitted', { description: 'The data owner will review it. Track status in your dashboard.' });
    reset();
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request access</DialogTitle>
          <DialogDescription className="line-clamp-2">{item.title}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="ra-inst">Institution</Label>
            <Input id="ra-inst" aria-invalid={!!errors.institution} {...register('institution')} />
            {errors.institution && <p className="text-xs text-destructive">{errors.institution.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ra-purpose">Purpose of use</Label>
            <Textarea id="ra-purpose" rows={4} aria-invalid={!!errors.purpose} placeholder="e.g. Comparing coastal δ18O records for my thesis chapter…" {...register('purpose')} />
            {errors.purpose && <p className="text-xs text-destructive">{errors.purpose.message}</p>}
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]" checked={watch('agree') === true} onChange={(e) => setValue('agree', e.target.checked as true, { shouldValidate: true })} />
            I agree to cite the dataset and not redistribute it without permission (demo terms).
          </label>
          {errors.agree && <p className="text-xs text-destructive">{errors.agree.message}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Submit request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------- Access / download panel ----------------------- */

export function AccessPanel({ item, files }: { item: ArchiveItem; files?: Attachment[] }) {
  const hydrated = useHydrated();
  const user = useAuthStore((s) => s.user);
  const requests = useDataStore((s) => s.accessRequests);
  const record = useUserStore((s) => s.recordDownload);
  // Subscribe so the panel re-renders when permissions or download/embargo settings change (accessState reads them).
  useCan();
  useDataStore((s) => s.settings.allowDownloads);
  useDataStore((s) => s.settings.cmCanViewEmbargoed);
  if (!hydrated) return <div className="skeleton h-24 w-full" />;
  const st = accessState(item, user, requests);
  const doDownload = (f?: Attachment) => {
    if (!downloadItem(item, f)) return;
    record(refOf(item), item.title);
    toast.success('Download started (demo file)');
  };
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        {!st.canDownload && <Lock className="h-4 w-4" aria-hidden />} {st.message}
      </p>
      {item.accessLevel === 'embargoed' && item.embargoUntil && !st.canDownload && <EmbargoCountdown until={item.embargoUntil} />}
      {st.canDownload ? (
        files && files.length ? (
          <div className="space-y-2">
            {files.map((f) => (
              <FileCard
                key={f.id}
                file={f}
                actions={
                  <Button size="icon" variant="ghost" onClick={() => doDownload(f)} aria-label={`Download ${f.name}`}>
                    <Download />
                  </Button>
                }
              />
            ))}
          </div>
        ) : (
          <Button onClick={() => doDownload()} className="w-full">
            <Download /> Download {item.type === 'dataset' ? 'CSV (demo)' : '(demo)'}
          </Button>
        )
      ) : st.action === 'login' ? (
        <Button asChild className="w-full">
          <Link href="/login">Log in to continue</Link>
        </Button>
      ) : st.action === 'request' || st.action === 'declined' ? (
        <RequestAccessDialog item={item}>
          <Button className="w-full">
            <Lock /> Request access
          </Button>
        </RequestAccessDialog>
      ) : st.action === 'pending' ? (
        <Button disabled variant="secondary" className="w-full">
          <Clock /> Request pending
        </Button>
      ) : null}
    </div>
  );
}

/* -------------------------- Generate post (Studio) ------------------------- */

export function GeneratePostButton({ item }: { item: ArchiveItem }) {
  const hydrated = useHydrated();
  const user = useAuthStore((s) => s.user);
  const { can } = useCan();
  if (!hydrated || !user || !can('use_studio')) return null;
  return (
    <Button variant="aurora" size="sm" asChild>
      <Link href={`/studio?source=${item.type}:${item.id}`}>
        <PenSquare /> Generate post
      </Link>
    </Button>
  );
}
