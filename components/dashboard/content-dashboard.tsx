'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CalendarDays, FilePlus2, Megaphone, PenSquare, Repeat2, Share2, Sparkles, Star, Wand2 } from 'lucide-react';
import type { Audience, Blog, Discipline, Region } from '@/types';
import { DashHeader } from './shell';
import { useTabParam } from './use-tab';
import { MarkdownPreview } from './markdown-preview';
import { ApprovalQueue } from '@/components/approvals/approval-queue';
import { ModerationQueue } from '@/components/moderation/moderation-queue';
import { MyUploads } from '@/components/upload/my-uploads';
import { EmbargoNotice } from '@/components/archive/embargo-notice';
import { VisibilityManager } from '@/components/visibility/visibility-manager';
import { VisibilityControl } from '@/components/common/visibility-control';
import { Forbidden } from '@/components/common/forbidden';
import { useCan } from '@/lib/permissions';
import { AreaTrend, BarSimple, ChartCard } from '@/components/charts/lazy';
import { EmptyState, Stat, StatusBadge } from '@/components/common';
import { MultiSelect } from '@/components/common/client';
import { PlatformIcon } from '@/components/studio/platform-icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatSkeleton } from '@/components/skeletons';
import { useApi, useInvalidate } from '@/hooks/use-queries';
import { api, audit } from '@/lib/mock-api';
import { itemsOfType, itemHref, publishedItems } from '@/lib/archive';
import { DISCIPLINE_LABELS, REGION_META, SPECIAL_DAYS } from '@/lib/constants';
import { markdownToSections } from '@/lib/markdown';
import { useDataStore } from '@/store/data';
import { useAuthStore } from '@/store/auth';
import { slugify } from '@/lib/utils';
import type { Expedition } from '@/types';

function upcomingSpecialDays(n = 4) {
  const now = new Date();
  return SPECIAL_DAYS.map((d) => {
    let dt = new Date(now.getFullYear(), d.month - 1, d.day);
    if (dt < now) dt = new Date(now.getFullYear() + 1, d.month - 1, d.day);
    return { ...d, date: dt, days: Math.ceil((dt.getTime() - now.getTime()) / 86_400_000) };
  })
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, n);
}

function Overview() {
  const { can, canFully } = useCan();
  const posts = useApi(['posts'], api.getPosts);
  const analytics = useApi(['analytics'], api.getAnalytics);
  const now = new Date();
  const scheduled = (posts.data ?? []).filter((p) => p.status === 'scheduled' && p.scheduledAt).sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!));
  const today = scheduled.filter((p) => new Date(p.scheduledAt!).toDateString() === now.toDateString());
  const next7 = scheduled.filter((p) => new Date(p.scheduledAt!).getTime() - now.getTime() < 7 * 86_400_000 * 5).slice(0, 5);
  const evergreen = useMemo(() => publishedItems().filter((i) => i.year <= 2020 && (i.type === 'blog' || i.type === 'report')).sort((a, b) => b.views - a.views).slice(0, 4), []);
  const pending = (posts.data ?? []).filter((p) => p.status === 'in_review').length;
  const published = (posts.data ?? []).filter((p) => p.status === 'published');
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {posts.isPending ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />) : (
          <>
            <Stat label="Awaiting approval" value={pending} />
            <Stat label="Scheduled" value={scheduled.length} />
            <Stat label="Published (30 days)" value={published.length} />
            <Stat label="Total reach" value={published.reduce((a, p) => a + (p.metrics?.reach ?? 0), 0)} delta={14} />
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Quick actions">
        <Button variant="aurora" asChild><Link href="/studio"><PenSquare /> New post</Link></Button>
        <Button variant="outline" asChild><Link href="/studio?source=report:rep-bharati-sea-ice"><Wand2 /> Generate from report</Link></Button>
        <Button variant="outline" asChild><Link href="/studio/calendar"><CalendarDays /> Schedule</Link></Button>
        {canFully('manage_social_accounts') && <Button variant="outline" asChild><Link href="/studio/accounts"><Share2 /> Manage accounts</Link></Button>}
        <Button variant="outline" asChild><Link href="/dashboard/content?tab=cms"><FilePlus2 /> Write a blog</Link></Button>
      </div>

      {can('approve_publish') && (
        <section aria-labelledby="queue">
          <div className="mb-3 flex items-center justify-between"><h2 id="queue" className="text-lg font-semibold">Approval queue</h2><Link href="/studio/approvals" className="text-sm text-primary hover:underline">Full queue →</Link></div>
          <p className="mb-3 text-sm text-muted-foreground">Drafts and uploads from scientists and researchers. Your own posts and uploads publish directly.</p>
          <ApprovalQueue />
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border bg-card p-4" aria-labelledby="cal">
          <div className="mb-3 flex items-center justify-between"><h2 id="cal" className="text-sm font-semibold">Upcoming schedule</h2><Link href="/studio/calendar" className="text-xs text-primary hover:underline">Calendar →</Link></div>
          <p className="mb-2 text-xs text-muted-foreground">Today: {today.length ? `${today.length} post(s)` : 'no posts scheduled'}</p>
          {next7.length === 0 ? <EmptyState title="Nothing scheduled" /> : (
            <ul className="space-y-2">
              {next7.map((p) => (
                <li key={p.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                  <span className="flex gap-0.5">{p.platforms.map((pl) => <PlatformIcon key={pl} id={pl} />)}</span>
                  <span className="line-clamp-1 flex-1">{p.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{new Date(p.scheduledAt!).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <ChartCard title="Social reach (12 months)">{analytics.data && <AreaTrend data={analytics.data.monthly} x="month" ys={[{ key: 'reach', name: 'Reach' }, { key: 'engagement', name: 'Engagement', color: '#8B5CF6' }]} label="Social reach and engagement" />}</ChartCard>
        <ChartCard title="Reach by platform">{analytics.data && <BarSimple data={analytics.data.byPlatform} x="platform" ys={[{ key: 'reach', name: 'Reach' }, { key: 'engagement', name: 'Engagement' }]} label="Reach by platform" />}</ChartCard>
        <section className="rounded-lg border bg-card p-4" aria-labelledby="top">
          <h2 id="top" className="mb-3 text-sm font-semibold">Top posts</h2>
          <ol className="space-y-2 text-sm">
            {[...published].sort((a, b) => (b.metrics?.reach ?? 0) - (a.metrics?.reach ?? 0)).slice(0, 5).map((p, i) => (
              <li key={p.id} className="flex items-center gap-2"><span className="w-5 font-semibold text-muted-foreground">{i + 1}</span><span className="line-clamp-1 flex-1">{p.title}</span><span className="text-xs tabular-nums text-muted-foreground">{p.metrics?.reach.toLocaleString('en-IN')} reach</span></li>
            ))}
          </ol>
        </section>
      </div>

      <EmbargoNotice scope="all" />
      <MyUploads />

      <section aria-labelledby="sugg" className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-gradient-to-br from-polar-amber/10 to-transparent p-4">
          <h2 id="sugg" className="mb-3 flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-polar-amber" aria-hidden /> Suggested: special days</h2>
          <ul className="space-y-2">
            {upcomingSpecialDays().map((d) => (
              <li key={d.name} className="flex items-center justify-between gap-2 rounded-md border bg-card p-2 text-sm">
                <span><strong>{d.name}</strong> <span className="text-muted-foreground">· {d.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} (in {d.days} days)</span></span>
                <Button size="sm" variant="outline" asChild><Link href={`/studio?note=${encodeURIComponent(`Post for ${d.name}`)}`}>Draft</Link></Button>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Repeat2 className="h-4 w-4 text-primary" aria-hidden /> Evergreen content worth re-sharing</h2>
          <ul className="space-y-2">
            {evergreen.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                <Link href={itemHref(i)} className="line-clamp-1 hover:text-primary">{i.title}</Link>
                <Button size="sm" variant="ghost" asChild><Link href={`/studio?source=${i.type}:${i.id}`}>Re-share</Link></Button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

const STARTER = `## Why this matters\nA short, friendly introduction to the topic.\n\n## What the team found\n- First key point (demo)\n- Second key point\n\n## Learn more\nLink readers to the related report and dataset.`;

function Cms() {
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
  const expeditions = itemsOfType<Expedition>('expedition');
  const blogs = itemsOfType<Blog>('blog');

  const save = (status: 'draft' | 'in_review' | 'published') => {
    if (title.trim().length < 5) return toast.error('Please add a title (5+ characters)');
    const now = new Date().toISOString();
    const slug = `blog-cms-${slugify(title).slice(0, 40)}-${Date.now().toString(36)}`;
    const b: Blog = {
      id: slug, slug, type: 'blog', title, summary: summary || title, tags: ['outreach', 'cms'], region, discipline: disc, year: new Date().getFullYear(),
      authors: [user.name], accessLevel: 'public', licence: 'CC-BY-4.0', credit: 'NCPOR Outreach (demo)', createdAt: now, updatedAt: now, status, views: 0, downloads: 0,
      art: 'aurora', readingMinutes: Math.max(2, Math.round(md.split(/\s+/).length / 200)), versions: { general: markdownToSections(md) }, citations: [], glossaryTerms: [], attachments: [], userCreated: true, ownerId: user.id, visibleTo,
    };
    upsertCmsBlog(b);
    audit(status === 'published' ? 'published blog' : status === 'draft' ? 'saved blog draft' : 'sent blog for approval', 'blog', title, { itemId: slug });
    invalidate([['pipeline'], ['blogs'], ['audit'], ['home']]);
    toast.success(status === 'draft' ? 'Blog draft saved' : status === 'published' ? 'Blog published' : 'Blog sent for approval', { description: status === 'published' ? 'Live at /blog/' + slug : 'After approval it appears at /blog/' + slug });
    setTitle(''); setSummary(''); setMd(STARTER);
  };

  return (
    <div className="space-y-8">
      <section aria-labelledby="editor" className="rounded-lg border bg-card p-5">
        <h2 id="editor" className="mb-4 text-lg font-semibold">Blog & page editor</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1"><Label htmlFor="b-title">Title</Label><Input id="b-title" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="b-sum">Summary</Label><Input id="b-sum" value={summary} onChange={(e) => setSummary(e.target.value)} /></div>
          <div className="space-y-1">
            <Label htmlFor="b-reg">Region</Label>
            <Select value={region} onValueChange={(v) => setRegion(v as Region)}><SelectTrigger id="b-reg"><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(REGION_META) as Region[]).map((r) => <SelectItem key={r} value={r}>{REGION_META[r].label}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="b-disc">Discipline</Label>
            <Select value={disc} onValueChange={(v) => setDisc(v as Discipline)}><SelectTrigger id="b-disc"><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(DISCIPLINE_LABELS) as Discipline[]).map((d) => <SelectItem key={d} value={d}>{DISCIPLINE_LABELS[d]}</SelectItem>)}</SelectContent></Select>
          </div>
        </div>
        {can('set_visibility') && (
          <div className="mt-3 max-w-sm">
            <VisibilityControl id="b-vis" value={visibleTo} onChange={setVisibleTo} />
          </div>
        )}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="b-md">Body (Markdown: ## heading, - list, &gt; quote)</Label>
            <Textarea id="b-md" value={md} onChange={(e) => setMd(e.target.value)} rows={14} className="font-mono text-xs" />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">Live preview</p>
            <div className="h-[330px] overflow-y-auto rounded-md border bg-background p-4">
              <h2 className="text-xl font-semibold">{title || 'Untitled article'}</h2>
              {summary && <p className="mt-1 text-muted-foreground">{summary}</p>}
              <MarkdownPreview md={md} />
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => save('draft')}>Save draft</Button>
          {direct ? <Button onClick={() => save('published')}>Publish now</Button> : <Button onClick={() => save('in_review')}>Send for approval</Button>}
          <Button variant="ghost" asChild><Link href="/studio?output=blog"><Wand2 /> Generate with AI in Studio</Link></Button>
        </div>
        {cmsBlogs.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-sm font-semibold">CMS articles</p>
            <ul className="space-y-2">
              {cmsBlogs.map((b) => (
                <li key={b.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                  <StatusBadge status={b.status} />
                  <span className="flex-1">{b.title}</span>
                  <Link href={`/blog/${b.slug}`} className="text-primary hover:underline">Preview</Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section aria-labelledby="cur" className="rounded-lg border bg-card p-5">
        <h2 id="cur" className="mb-4 flex items-center gap-2 text-lg font-semibold"><Star className="h-5 w-5 text-polar-amber" aria-hidden /> Homepage curation</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="c-exp">Featured expedition</Label>
            <Select value={curation.featuredExpeditionId} onValueChange={(v) => { updateCuration({ featuredExpeditionId: v }); invalidate([['home']]); toast.success('Homepage updated'); }}>
              <SelectTrigger id="c-exp"><SelectValue /></SelectTrigger>
              <SelectContent>{expeditions.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Featured blogs</Label>
            <MultiSelect label="Featured blogs" options={blogs.map((b) => ({ value: b.id, label: b.title }))} value={curation.featuredBlogIds} onChange={(v) => { updateCuration({ featuredBlogIds: v.slice(0, 6) }); invalidate([['home']]); }} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="c-banner" className="flex items-center gap-1"><Megaphone className="h-4 w-4" aria-hidden /> Banner text</Label>
            <div className="flex gap-2">
              <Input id="c-banner" value={banner} onChange={(e) => setBanner(e.target.value)} />
              <Button onClick={() => { updateCuration({ banner }); invalidate([['home']]); toast.success('Banner updated'); }}>Save</Button>
            </div>
          </div>
        </div>
        <Button variant="link" className="mt-2 px-0" asChild><Link href="/">View homepage →</Link></Button>
      </section>
    </div>
  );
}

export function ContentDashboard() {
  const [tab, setTab] = useTabParam('overview');
  const { can } = useCan();
  return (
    <>
      <DashHeader title="Outreach & media" description="Publish directly, review contributions, plan the calendar, moderate questions and curate the homepage." />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cms">Blog editor & curation</TabsTrigger>
          {can('moderate_questions') && <TabsTrigger value="moderation">Moderation</TabsTrigger>}
          {can('set_visibility') && <TabsTrigger value="visibility">Visibility</TabsTrigger>}
        </TabsList>
        <TabsContent value="overview"><Overview /></TabsContent>
        <TabsContent value="cms"><Cms /></TabsContent>
        <TabsContent value="moderation">{can('moderate_questions') ? <ModerationQueue /> : <Forbidden need="Moderate ask-a-scientist questions" />}</TabsContent>
        <TabsContent value="visibility">{can('set_visibility') ? <VisibilityManager /> : <Forbidden need="Change who can see content" />}</TabsContent>
      </Tabs>
    </>
  );
}
