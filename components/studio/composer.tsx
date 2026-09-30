'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Eye, PenLine, SlidersHorizontal } from 'lucide-react';
import type { ContentType, LanguageCode, OutputType, SourceRef } from '@/types';
import { ControlsPanel } from './controls-panel';
import { EditorPanel } from './editor-panel';
import { PublishPanel } from './publish-panel';
import { DashHeader } from '@/components/dashboard/shell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useStudioStore, effectiveSources, DEFAULT_SETTINGS } from '@/store/studio';
import { useDataStore } from '@/store/data';
import { useAuthStore } from '@/store/auth';
import { useCan } from '@/lib/permissions';
import { findRef, publishedItems } from '@/lib/archive';
import { factCheck, MODEL_NAME } from '@/lib/mock-ai';
import type { GeneratedPiece } from '@/lib/mock-ai/types';
import { buildRequest } from './use-generate';
import { useMediaQuery } from '@/hooks/use-count-up';
import { cn } from '@/lib/utils';

/** Three-panel Content Studio composer (collapses to steps below lg). */
export function Composer() {
  const sp = useSearchParams();
  const st = useStudioStore();
  const posts = useDataStore((s) => s.posts);
  const settings = useDataStore((s) => s.settings);
  const wide = useMediaQuery('(min-width: 1280px)');
  const lg = useMediaQuery('(min-width: 1024px)');
  const [step, setStep] = useState('sources');
  const perms = useCan();
  const draftOnly = perms.grant('use_studio') === 'draft';
  const user = useAuthStore((s) => s.user);

  // Deep links: ?source=type:id · ?post=id · ?note=… · ?output=blog
  useEffect(() => {
    const source = sp.get('source');
    const postId = sp.get('post');
    const note = sp.get('note');
    const output = sp.get('output') as OutputType | null;
    const s = useStudioStore.getState();
    if (postId) {
      const p = posts.find((x) => x.id === postId);
      if (p) {
        s.reset();
        s.setSelected(p.sources);
        s.setSourceMode('selected');
        s.updateSettings({ outputType: p.outputType, platforms: p.platforms.length ? p.platforms : DEFAULT_SETTINGS.platforms, accountIds: p.accountIds, languages: Array.from(new Set((p.variants ?? [{ language: p.language }]).map((v) => v.language))) });
        const req = buildRequest({ ...useStudioStore.getState().settings }, p.sources, [], [], 0);
        const pieces: GeneratedPiece[] = (p.variants?.filter((v) => !v.accountId) ?? [{ platform: p.platforms[0], language: p.language, text: p.text, hashtags: p.hashtags }]).map((v, i) => ({
          id: `loaded-${i}-${p.id}`,
          platform: v.platform,
          language: v.language,
          text: v.text,
          hashtags: v.hashtags,
          citations: p.sources.map((r) => ({ ref: r, title: findRef(r)?.title ?? r.id, text: findRef(r)?.title ?? r.id })),
          factCheck: factCheck(v.text, p.sources),
          meta: { model: MODEL_NAME, createdAt: p.updatedAt, settings: req },
        }));
        s.pushVersion(pieces, 'Loaded draft');
        p.variants?.filter((v) => v.accountId).forEach((v) => s.setOverride(`${v.accountId}:${v.language}`, v.text));
        s.setPost(p.id, p.status, p.scheduledAt ?? null);
        return;
      }
    }
    if (source) {
      const [type, id] = source.split(':');
      const ref: SourceRef = { type: type as ContentType, id };
      if (findRef(ref)) {
        s.setCurrentRef(ref);
        s.setSourceMode('current');
      }
    }
    if (note) s.updateSettings({ specialNotes: note });
    if (output) s.updateSettings({ outputType: output });
    if (!source && !postId && !s.selected.length) {
      s.setSelected([{ type: 'report', id: 'rep-bharati-sea-ice' }]);
    }
    s.updateSettings({ tone: (settings.aiDefaultTone as typeof DEFAULT_SETTINGS.tone) ?? 'Educational', ...(settings.aiDefaultLanguage && !s.outputs.length ? { languages: [settings.aiDefaultLanguage as LanguageCode] } : {}) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  const allReports = useMemo(() => publishedItems().filter((i) => i.type === 'report').map((i) => ({ type: i.type, id: i.id })), []);
  const sources = effectiveSources(st, allReports);

  // For scientists this page is the "Upload draft" section: every post they write goes to approval.
  const scientist = user?.role === 'scientist';
  const manager = user?.role === 'content_manager';
  const header = (
    <DashHeader
      title={scientist ? 'Upload draft' : 'Content Studio'}
      description={
        scientist
          ? 'Write a post draft from the archive and send it for approval. A content manager or admin reviews it before it goes live.'
          : 'Generate website and social content from the archive — AI drafts with mandatory human approval.'
      }
      actions={draftOnly ? <Badge variant="warning">Draft-only mode: you can generate and send for approval</Badge> : undefined}
    />
  );

  if (!lg) {
    return (
      <>
        {header}
        <Tabs value={step} onValueChange={setStep}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sources"><SlidersHorizontal /> 1. Setup</TabsTrigger>
            <TabsTrigger value="write"><PenLine /> 2. Write</TabsTrigger>
            <TabsTrigger value="preview"><Eye /> 3. Publish</TabsTrigger>
          </TabsList>
          <TabsContent value="sources"><ControlsPanel sources={sources} /></TabsContent>
          <TabsContent value="write"><EditorPanel sources={sources} /></TabsContent>
          <TabsContent value="preview"><PublishPanel sources={sources} /></TabsContent>
        </Tabs>
      </>
    );
  }

  // Content managers and scientists (Upload draft): structured layout with a working centre column.
  if (manager || scientist) {
    // Content managers: setup on the left (scrolls on its own), work in the centre. The publishing
    // rail only appears once there is something to preview and publish.
    const ready = st.outputs.length > 0;
    return (
      <>
        {header}
        <div className={cn('grid gap-5', ready && wide ? 'grid-cols-[300px_minmax(0,1fr)_340px]' : 'grid-cols-[320px_minmax(0,1fr)]')}>
          <aside aria-label="Sources and controls" className="min-w-0">
            <div className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-xl pr-1">
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">1 · Setup</p>
              <ControlsPanel sources={sources} />
            </div>
          </aside>
          <section aria-label="Editor and outputs" className="min-w-0">
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">2 · {ready ? 'Review & edit' : 'Generate'}</p>
            <EditorPanel sources={sources} />
            {ready && !wide && (
              <div className="mt-6">
                <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">3 · Preview & publish</p>
                <PublishPanel sources={sources} />
              </div>
            )}
          </section>
          {ready && wide && (
            <aside aria-label="Previews and publishing" className="min-w-0">
              <div className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1">
                <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">3 · Preview & publish</p>
                <PublishPanel sources={sources} />
              </div>
            </aside>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      <div className={wide ? 'grid grid-cols-[300px_minmax(0,1fr)_340px] gap-4' : 'grid grid-cols-[300px_minmax(0,1fr)] gap-4'}>
        <aside aria-label="Sources and controls" className="min-w-0">
          <ControlsPanel sources={sources} />
        </aside>
        <section aria-label="Editor and outputs" className="min-w-0">
          <EditorPanel sources={sources} />
          {!wide && (
            <div className="mt-6">
              <PublishPanel sources={sources} />
            </div>
          )}
        </section>
        {wide && (
          <aside aria-label="Previews and publishing" className="min-w-0">
            <PublishPanel sources={sources} />
          </aside>
        )}
      </div>
    </>
  );
}
