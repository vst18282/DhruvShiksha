'use client';

import { Check, FileText, Globe2, Languages, Megaphone, MessageSquareText, Ruler, Send, SlidersHorizontal, Sparkles, type LucideIcon } from 'lucide-react';
import type { SourceRef } from '@/types';
import { PlatformIcon } from './platform-icon';
import { Button } from '@/components/ui/button';
import { useStudioStore } from '@/store/studio';
import { findRef } from '@/lib/archive';
import { CONTENT_TYPE_LABELS, LANGUAGES, PLATFORM_META } from '@/lib/constants';
import { cn } from '@/lib/utils';

const OUTPUT_LABEL: Record<string, string> = { social: 'Social posts', blog: 'Blog article', press: 'Press release', summary: 'Summary', newsletter: 'Newsletter' };

function Tile({ icon: Icon, label, children, className }: { icon: LucideIcon; label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-background/70 p-3', className)}>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"><Icon className="h-3.5 w-3.5" aria-hidden /> {label}</p>
      <div className="mt-1.5 text-sm">{children}</div>
    </div>
  );
}

/**
 * Fills the Studio's centre column before anything is generated: a summary of the current setup
 * (so the choices made on the left are visible where you work) and one clear Generate action.
 */
export function StudioLaunchpad({ sources, onGenerate, generating, quiet = false }: { sources: SourceRef[]; onGenerate: () => void; generating: boolean; /** Single-hue styling (scientists' Upload draft). */ quiet?: boolean }) {
  const settings = useStudioStore((s) => s.settings);
  const social = settings.outputType === 'social';
  const items = sources.map((r) => ({ ref: r, item: findRef(r) })).filter((x) => x.item);
  const steps = [
    { label: 'Pick sources', done: items.length > 0 },
    { label: 'Tune settings', done: true },
    { label: 'Generate & review', done: false },
    { label: 'Publish or schedule', done: false },
  ];

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className={cn('relative border-b px-6 py-6', quiet ? 'bg-muted/30' : 'bg-gradient-to-br from-primary/10 via-polar-violet/5 to-transparent')}>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"><Sparkles className="h-5 w-5" aria-hidden /></span>
        <h2 className="mt-3 text-xl font-semibold tracking-tight">Ready to create</h2>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">Check the setup below, then generate. Every output is an AI draft that you review, fact-check and approve before it goes anywhere.</p>
        <ol className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Steps">
          {steps.map((s, i) => (
            <li key={s.label} className={cn('flex items-center gap-2 rounded-lg border bg-background/80 px-2.5 py-2 text-xs', i === 2 && 'border-primary/40 ring-1 ring-primary/20')}>
              <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold', s.done ? (quiet ? 'bg-primary/15 text-primary' : 'bg-success text-white') : i === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                {s.done ? <Check className="h-3 w-3" aria-hidden /> : i + 1}
              </span>
              <span className="truncate font-medium">{s.label}</span>
              <span className="sr-only">{s.done ? '(done)' : i === 2 ? '(next)' : ''}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-3 p-6 sm:grid-cols-2 xl:grid-cols-3">
        <Tile icon={FileText} label={`Sources (${items.length})`} className="sm:col-span-2 xl:col-span-3">
          {items.length === 0 ? (
            <p className="text-muted-foreground">No sources yet. Pick one or more archive items in <span className="font-medium text-foreground">Sources</span> on the left.</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {items.slice(0, 6).map(({ ref, item }) => (
                <li key={`${ref.type}:${ref.id}`} className="inline-flex max-w-full items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs">
                  <span className="shrink-0 font-semibold text-primary">{CONTENT_TYPE_LABELS[ref.type].singular}</span>
                  <span className="truncate">{item!.title}</span>
                </li>
              ))}
              {items.length > 6 && <li className="rounded-full bg-muted px-2.5 py-1 text-xs">+{items.length - 6} more</li>}
            </ul>
          )}
        </Tile>
        <Tile icon={social ? Megaphone : Globe2} label="Output">{OUTPUT_LABEL[settings.outputType] ?? settings.outputType}</Tile>
        <Tile icon={Languages} label="Languages">{settings.languages.map((l) => LANGUAGES.find((x) => x.code === l)?.label ?? l).join(', ')}</Tile>
        <Tile icon={MessageSquareText} label="Tone">{settings.tone}</Tile>
        <Tile icon={Ruler} label="Length"><span className="capitalize">{settings.length}</span></Tile>
        {social && (
          <Tile icon={Send} label="Platforms" className="sm:col-span-2">
            {settings.platforms.length === 0 ? (
              <span className="text-muted-foreground">No platforms chosen</span>
            ) : (
              <span className="flex flex-wrap gap-1.5">
                {settings.platforms.map((p) => (
                  <span key={p} className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2 py-0.5 text-xs"><PlatformIcon id={p} className="h-3.5 w-3.5" /> {PLATFORM_META[p].label}</span>
                ))}
              </span>
            )}
          </Tile>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 border-t bg-muted/20 px-6 py-6 text-center">
        <Button size="lg" variant={quiet ? 'default' : 'aurora'} onClick={onGenerate} loading={generating} disabled={!sources.length} className="min-w-56">
          <Sparkles /> Generate drafts
        </Button>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><SlidersHorizontal className="h-3.5 w-3.5" aria-hidden /> Change anything on the left; this summary updates as you go.</p>
      </div>
    </div>
  );
}
