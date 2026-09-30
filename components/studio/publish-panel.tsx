'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { CalendarClock, Check, CheckCircle2, Circle, Copy, ExternalLink, Pencil, Rocket, Save, Send, ShieldCheck, X } from 'lucide-react';
import type { Audience, LanguageCode, PlatformId, SocialPost, SourceRef } from '@/types';
import { PlatformPreview, PreviewLabel } from './previews';
import { PlatformIcon } from './platform-icon';
import { StatusBadge } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStudioStore } from '@/store/studio';
import { useDataStore } from '@/store/data';
import { useAuthStore } from '@/store/auth';
import { useCan } from '@/lib/permissions';
import { VisibilityControl } from '@/components/common/visibility-control';
import { visibilityLabel } from '@/lib/visibility';
import { api } from '@/lib/mock-api';
import { useInvalidate } from '@/hooks/use-queries';
import { findRef } from '@/lib/archive';
import { LANGUAGES, PLATFORM_META } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function PublishPanel({ sources }: { sources: SourceRef[] }) {
  const st = useStudioStore();
  const accounts = useDataStore((s) => s.accounts);
  const user = useAuthStore((s) => s.user)!;
  const invalidate = useInvalidate();
  const perms = useCan();
  // Content managers publish their own posts directly; other roles need approval first.
  const direct = perms.canFully('publish_direct');
  const canPublish = direct || perms.canFully('approve_publish');
  const ready = (s: SocialPost['status']) => (direct ? s !== 'published' : s === 'approved' || s === 'scheduled');
  const [lang, setLang] = useState<LanguageCode>('en');
  const defaultVisibility = useDataStore((s) => s.settings.defaultVisibility);
  const existingPost = useDataStore((s) => (st.postId ? s.posts.find((p) => p.id === st.postId) : undefined));
  const [visibleTo, setVisibleTo] = useState<Audience[] | undefined>(() => existingPost?.visibleTo ?? defaultVisibility ?? undefined);
  const [description, setDescription] = useState(() => existingPost?.description ?? '');
  const [editAcc, setEditAcc] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [when, setWhen] = useState(() => {
    const d = new Date(Date.now() + 86_400_000);
    d.setHours(18, 30, 0, 0);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [results, setResults] = useState<{ account: string; platform: PlatformId; url: string }[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const langs = Array.from(new Set(st.outputs.map((o) => o.language)));
  const activeLang = langs.includes(lang) ? lang : langs[0] ?? 'en';
  const selectedAccounts = accounts.filter((a) => st.settings.accountIds.includes(a.id) && st.settings.platforms.includes(a.platform));
  const pieceFor = (p: PlatformId) => st.outputs.find((o) => o.language === activeLang && o.platform === p);
  const social = st.settings.outputType === 'social';
  const previewTargets = social ? [...selectedAccounts.map((a) => ({ acc: a, platform: a.platform })), ...st.settings.platforms.filter((p) => !selectedAccounts.some((a) => a.platform === p)).map((p) => ({ acc: undefined, platform: p }))] : [];

  const checks = useMemo(() => {
    const unsupported = st.outputs.reduce((a, o) => a + o.factCheck.filter((f) => f.status === 'unsupported').length, 0);
    const overLimit = st.outputs.filter((o) => o.platform && o.text.length > PLATFORM_META[o.platform].limit).length;
    return [
      { ok: sources.length > 0, label: `Sources attached (${sources.length})` },
      { ok: st.outputs.length > 0, label: 'Content generated / written' },
      { ok: overLimit === 0, label: overLimit ? `${overLimit} output(s) over character limit` : 'Within platform character limits' },
      { ok: unsupported === 0, label: unsupported ? `${unsupported} sentence(s) without a source` : 'Every claim traced to a source' },
      { ok: st.images.every((i) => i.altText.trim().length >= 10), label: st.images.length ? 'Alt text on every image' : 'No images (alt text n/a)' },
      { ok: !social || selectedAccounts.length > 0, label: social ? `Accounts selected (${selectedAccounts.length})` : 'Output type needs no accounts' },
      { ok: true, label: 'AI-generated label will be attached' },
    ];
  }, [st.outputs, st.images, sources.length, social, selectedAccounts.length]);

  const buildPost = (status: SocialPost['status'], extra?: Partial<SocialPost>): SocialPost => {
    const now = new Date().toISOString();
    const first = st.outputs.find((o) => o.language === 'en') ?? st.outputs[0];
    const src = sources[0] ? findRef(sources[0]) : undefined;
    const existing = st.postId ? useDataStore.getState().posts.find((p) => p.id === st.postId) : undefined;
    return {
      id: st.postId ?? `post-${Date.now().toString(36)}`,
      title: first?.article?.title ?? existing?.title ?? src?.title ?? 'Untitled post',
      text: first?.text ?? existing?.text ?? '',
      outputType: st.settings.outputType,
      platforms: social ? st.settings.platforms : [],
      accountIds: social ? selectedAccounts.map((a) => a.id) : [],
      language: first?.language ?? 'en',
      status,
      scheduledAt: extra?.scheduledAt ?? existing?.scheduledAt,
      publishedAt: existing?.publishedAt,
      createdBy: existing?.createdBy ?? user.name,
      createdByRole: existing?.createdByRole ?? user.role,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      sources,
      hashtags: first?.hashtags ?? [],
      comments: existing?.comments ?? [],
      aiGenerated: true,
      variants: st.outputs.map((o) => ({ platform: o.platform, language: o.language, text: o.text, hashtags: o.hashtags })).concat(
        Object.entries(st.overrides).map(([k, text]) => {
          const [accountId, language] = k.split(':');
          const a = accounts.find((x) => x.id === accountId);
          return { platform: a?.platform, language: language as LanguageCode, text, hashtags: [], accountId };
        }),
      ),
      media: [...st.images.map((i) => ({ kind: 'image' as const, name: i.name, altText: i.altText })), ...st.voices.map((v) => ({ kind: 'voice' as const, name: v.name, transcript: v.transcript }))],
      visibleTo,
      description: description.trim() || undefined,
      ...extra,
    };
  };

  const save = async (status: SocialPost['status'], label: string, extra?: Partial<SocialPost>) => {
    if (!st.outputs.length) return toast.error('Generate or write content first');
    setBusy(label);
    const post = buildPost(status, extra);
    await api.savePost(post);
    st.setPost(post.id, status, post.scheduledAt ?? null);
    invalidate([['posts'], ['audit'], ['feed']]);
    setBusy(null);
    return post;
  };

  const blockers = checks.filter((c) => !c.ok);
  const status = st.postStatus;

  return (
    <div className="space-y-4">
      <section aria-labelledby="pv" className="rounded-lg border bg-card p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 id="pv" className="text-sm font-semibold">Live previews</h2>
          {langs.length > 1 && (
            <Select value={activeLang} onValueChange={(v) => setLang(v as LanguageCode)}>
              <SelectTrigger className="h-8 w-32 text-xs" aria-label="Preview language"><SelectValue /></SelectTrigger>
              <SelectContent>{langs.map((l) => <SelectItem key={l} value={l}>{LANGUAGES.find((x) => x.code === l)?.label}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
        {!st.outputs.length ? (
          <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">Previews appear after generation.</p>
        ) : !social ? (
          <p className="text-xs text-muted-foreground">{st.settings.outputType === 'blog' ? 'Blog article preview is shown in the editor. Save it as a blog draft to preview the real /blog page.' : 'This output type is previewed in the editor.'}</p>
        ) : (
          <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            <PreviewLabel />
            {previewTargets.map(({ acc, platform }) => {
              const piece = pieceFor(platform);
              if (!piece) return null;
              const key = `${acc?.id ?? platform}:${activeLang}`;
              const text = st.overrides[key] ?? piece.text;
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <PlatformIcon id={platform} /> {acc ? acc.displayName : `${PLATFORM_META[platform].label} (no account)`}
                    {st.overrides[key] && <span className="rounded bg-polar-amber/20 px-1 text-foreground">custom</span>}
                    {acc && (
                      <button type="button" className="ml-auto inline-flex items-center gap-1 text-primary hover:underline" onClick={() => setEditAcc(editAcc === key ? null : key)}>
                        <Pencil className="h-3 w-3" aria-hidden /> {editAcc === key ? 'Done' : 'Customize'}
                      </button>
                    )}
                  </div>
                  {editAcc === key ? (
                    <div className="space-y-1">
                      <Textarea rows={6} value={text} onChange={(e) => st.setOverride(key, e.target.value)} aria-label={`Custom text for ${acc?.displayName}`} className="text-xs" />
                      <Button size="sm" variant="ghost" onClick={() => st.setOverride(key, null)}>Reset to shared text</Button>
                    </div>
                  ) : (
                    <PlatformPreview platform={platform} text={text} parts={piece.parts} images={st.images} account={acc} lang={activeLang} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="chk" className="rounded-lg border bg-card p-3">
        <h2 id="chk" className="mb-2 text-sm font-semibold">Pre-publish checklist</h2>
        <ul className="space-y-1.5 text-xs">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center gap-2">
              {c.ok ? <CheckCircle2 className="h-4 w-4 text-success" aria-label="Done" /> : <Circle className="h-4 w-4 text-polar-amber" aria-label="Needs attention" />}
              <span className={cn(!c.ok && 'font-medium')}>{c.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="pub" className="space-y-2 rounded-lg border bg-card p-3">
        <div className="flex items-center justify-between">
          <h2 id="pub" className="text-sm font-semibold">Approval & publishing</h2>
          <StatusBadge status={status} />
        </div>
        <p className="text-[11px] text-muted-foreground">{direct ? 'Your posts publish directly: no approval needed.' : canPublish ? 'Nothing publishes without approval. You can approve, schedule and publish.' : 'Nothing publishes without approval. Your role can draft and send for approval.'}</p>
        <div className="space-y-1">
          <Label htmlFor="pp-desc" className="text-xs">Short description (shown to reviewers and admins)</Label>
          <Input id="pp-desc" value={description} maxLength={180} onChange={(e) => setDescription(e.target.value)} placeholder="One line about this post" className="h-8 text-xs" />
        </div>
        {perms.can('set_visibility') ? (
          <VisibilityControl id="pp-vis" label="Who can see it on the Updates feed" value={visibleTo} onChange={setVisibleTo} />
        ) : (
          <p className="text-[11px] text-muted-foreground">Updates feed visibility: {visibilityLabel(visibleTo)}</p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" loading={busy === 'save'} onClick={async () => { if (await save('draft', 'save')) toast.success('Draft saved'); }}><Save /> Save draft</Button>
          {!direct && <Button size="sm" loading={busy === 'send'} disabled={status === 'in_review' || status === 'approved' || status === 'scheduled' || status === 'published'} onClick={async () => { if (blockers.some((b) => b.label.includes('Sources') || b.label.includes('generated'))) return toast.error('Add sources and content first'); if (await save('in_review', 'send')) toast.success('Sent for approval', { description: 'Reviewers will see it in the approval queue.' }); }}><Send /> Send for approval</Button>}
          {canPublish && (
            <>
              {!direct && <Button size="sm" variant="success" loading={busy === 'approve'} disabled={status !== 'in_review'} onClick={async () => { if (await save('approved', 'approve')) toast.success('Approved'); }}><ShieldCheck /> Approve</Button>}
              <Button size="sm" variant="outline" disabled={!ready(status)} onClick={() => setScheduleOpen(true)}><CalendarClock /> Schedule</Button>
              <Button
                size="sm"
                variant="aurora"
                className="col-span-2"
                loading={busy === 'publish'}
                disabled={!ready(status)}
                onClick={async () => {
                  const r = Math.random;
                  const reach = Math.round(5000 + r() * 30000);
                  const p = await save('published', 'publish', { publishedAt: new Date().toISOString(), metrics: { reach, impressions: reach * 2, engagement: Math.round(reach * 0.05), clicks: Math.round(reach * 0.01) } });
                  if (!p) return;
                  setResults(social ? selectedAccounts.map((a) => ({ account: a.displayName, platform: a.platform, url: `https://${a.platform}.example/${a.handle.replace(/[@\s]/g, '')}/status/${Date.now().toString(36)}` })) : [{ account: 'DhruvShiksha website', platform: 'x', url: '/blog' }]);
                }}
              >
                <Rocket /> Publish now
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="col-span-2"
            disabled={!st.outputs.length}
            onClick={async () => {
              const post = { ...buildPost('draft'), id: `post-${Date.now().toString(36)}`, title: `${buildPost('draft').title} (copy)`, comments: [], scheduledAt: undefined, publishedAt: undefined, metrics: undefined };
              await api.savePost(post);
              st.setPost(post.id, 'draft');
              invalidate([['posts']]);
              toast.success('Duplicated as a new draft');
            }}
          >
            <Copy /> Duplicate
          </Button>
        </div>
        {st.scheduledAt && status === 'scheduled' && <p className="text-xs">Scheduled for {new Date(st.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST</p>}
        {st.postId && <Link href="/studio/drafts" className="text-xs text-primary hover:underline">View in drafts →</Link>}
      </section>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule post</DialogTitle><DialogDescription>Times are in India Standard Time (IST, UTC+5:30).</DialogDescription></DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="when">Date & time (IST)</Label>
            <Input id="when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} min={new Date().toISOString().slice(0, 16)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button onClick={async () => { const iso = new Date(`${when}:00+05:30`).toISOString(); if (new Date(iso) < new Date()) return toast.error('Pick a future time'); if (await save('scheduled', 'schedule', { scheduledAt: iso })) { toast.success('Post scheduled'); setScheduleOpen(false); } }}>
              <CalendarClock /> Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!results} onOpenChange={(o) => !o && setResults(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Published (simulated)</DialogTitle><DialogDescription>No real network calls were made. Results are recorded in post history and the audit log.</DialogDescription></DialogHeader>
          <ul className="space-y-2">
            {results?.map((r) => (
              <li key={r.account} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                <Check className="h-4 w-4 text-success" aria-hidden />
                <PlatformIcon id={r.platform} />
                <span className="flex-1">{r.account}</span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">demo link <ExternalLink className="h-3 w-3" aria-hidden /></span>
              </li>
            ))}
          </ul>
          <DialogFooter><Button onClick={() => setResults(null)}><X /> Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
