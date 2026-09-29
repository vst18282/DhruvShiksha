'use client';

import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, FileText, Sparkles } from 'lucide-react';
import type { ArchiveItem, SourceRef } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AiBadge } from '@/components/common';
import { Skeleton } from '@/components/skeletons';
import { SourceSelector } from './source-selector';
import { summarize, type SummaryResult } from '@/lib/mock-ai';
import { publishedItems } from '@/lib/archive';
import type { SourceMode } from '@/store/studio';

/** "Generate summary" dialog (reports & expeditions) — uses the same source selector as the Studio. */
export function GenerateSummaryButton({ item }: { item: ArchiveItem }) {
  const [open, setOpen] = useState(false);
  const cur: SourceRef = { type: item.type, id: item.id };
  const [mode, setMode] = useState<SourceMode>('current');
  const [selected, setSelected] = useState<SourceRef[]>([cur]);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<SummaryResult | null>(null);
  const [seed, setSeed] = useState(0);
  const sources = mode === 'current' ? [cur] : mode === 'all' && !selected.length ? publishedItems().filter((i) => i.type === 'report').map((i) => ({ type: i.type, id: i.id })) : selected;

  const run = async (s = seed) => {
    setBusy(true);
    setRes(null);
    try {
      setRes(await summarize(sources, s));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const copy = async (t: string) => {
    await navigator.clipboard?.writeText(t);
    toast.success('Copied');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Sparkles /> Generate summary
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Generate summary</DialogTitle>
          <DialogDescription>Plain-language, key-findings and “for kids” summaries built only from the selected sources.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 md:grid-cols-[260px_1fr]">
          <div className="space-y-3">
            <p className="text-sm font-medium">Sources</p>
            <SourceSelector mode={mode} onModeChange={setMode} currentRef={cur} selected={selected} onSelectedChange={setSelected} />
            <Button className="w-full" variant="aurora" onClick={() => run()} loading={busy} disabled={!sources.length}>
              <Sparkles /> {res ? 'Regenerate' : 'Generate'}
            </Button>
            {res && (
              <Button className="w-full" variant="ghost" size="sm" onClick={() => { const s = seed + 1; setSeed(s); run(s); }}>
                Try another variant
              </Button>
            )}
          </div>
          <div className="min-h-[280px] min-w-0">
            {busy && (
              <div className="space-y-2" role="status" aria-label="Generating summary">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
              </div>
            )}
            {!busy && !res && <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">Choose sources and click Generate.</p>}
            {res && !busy && (
              <div className="space-y-3">
                <AiBadge />
                <Tabs defaultValue="plain">
                  <TabsList>
                    <TabsTrigger value="plain">Plain language</TabsTrigger>
                    <TabsTrigger value="key">Key findings</TabsTrigger>
                    <TabsTrigger value="kids">For kids</TabsTrigger>
                  </TabsList>
                  <TabsContent value="plain">
                    <p className="text-sm leading-6">{res.plain}</p>
                    <Button size="sm" variant="ghost" onClick={() => copy(res.plain)}><Copy /> Copy</Button>
                  </TabsContent>
                  <TabsContent value="key">
                    <ul className="list-disc space-y-1 pl-5 text-sm">{res.keyFindings.map((k) => <li key={k}>{k}</li>)}</ul>
                    <Button size="sm" variant="ghost" onClick={() => copy(res.keyFindings.map((k) => `• ${k}`).join('\n'))}><Copy /> Copy</Button>
                  </TabsContent>
                  <TabsContent value="kids">
                    <p className="rounded-md bg-accent p-3 text-sm leading-6 text-accent-foreground">{res.forKids}</p>
                    <Button size="sm" variant="ghost" onClick={() => copy(res.forKids)}><Copy /> Copy</Button>
                  </TabsContent>
                </Tabs>
                <div className="border-t pt-2 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1 font-medium"><FileText className="h-3 w-3" aria-hidden /> Sources ({res.sources.length})</p>
                  <ul className="mt-1 space-y-0.5">{res.sources.slice(0, 5).map((s) => <li key={s.ref.id}>{s.text}</li>)}</ul>
                  <p className="mt-2">Model: demo-generator · review before sharing · demo data</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/studio?source=${item.type}:${item.id}`}>Turn into a post in the Studio →</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
