'use client';

import type { LanguageCode, OutputType, PlatformId } from '@/types';
import { SourceSelector } from './source-selector';
import { ImageAttachments, VoiceNotes } from './attachments';
import { PlatformIcon } from './platform-icon';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/input';
import { Checkbox, Slider, Switch } from '@/components/ui/misc';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/misc';
import { MultiSelect } from '@/components/common/client';
import { LANGUAGES, PLATFORM_META } from '@/lib/constants';
import { useStudioStore } from '@/store/studio';
import { useDataStore } from '@/store/data';
import { suggestHashtags } from '@/lib/mock-ai';
import type { Difficulty, Length, Tone } from '@/lib/mock-ai/types';
import { findRef } from '@/lib/archive';
import type { SourceRef } from '@/types';
import { cn } from '@/lib/utils';

const TONES: Tone[] = ['Formal', 'Friendly', 'Inspiring', 'Educational', 'News/Announcement', 'Playful'];
const DIFF: { v: Difficulty; l: string }[] = [
  { v: 'class5', l: 'Class 5' },
  { v: 'class8', l: 'Class 8' },
  { v: 'highschool', l: 'High school' },
  { v: 'undergrad', l: 'Undergraduate' },
  { v: 'expert', l: 'Expert' },
];
const OUTPUTS: { v: OutputType; l: string }[] = [
  { v: 'social', l: 'Social posts' },
  { v: 'blog', l: 'Blog / web article' },
  { v: 'press', l: 'Press note' },
  { v: 'newsletter', l: 'Newsletter' },
  { v: 'summary', l: 'Summary' },
];
const SCI = ['Scientific', 'Balanced', 'Non-scientific'];

export function ControlsPanel({ sources }: { sources: SourceRef[] }) {
  const s = useStudioStore();
  const set = s.updateSettings;
  const st = s.settings;
  const accounts = useDataStore((d) => d.accounts).filter((a) => a.connected);
  const platforms = Array.from(new Set(accounts.map((a) => a.platform)));
  const suggested = sources.length ? suggestHashtags(sources) : [];
  const firstTitle = sources[0] ? findRef(sources[0])?.title : undefined;

  const toggleAccount = (id: string, platform: PlatformId) => {
    const on = st.accountIds.includes(id);
    const accountIds = on ? st.accountIds.filter((x) => x !== id) : [...st.accountIds, id];
    const stillHas = accounts.some((a) => a.platform === platform && accountIds.includes(a.id));
    set({ accountIds, platforms: on ? (stillHas ? st.platforms : st.platforms.filter((p) => p !== platform)) : Array.from(new Set([...st.platforms, platform])) });
  };

  return (
    <div className="space-y-1">
      <Accordion type="multiple" defaultValue={['sources', 'settings', 'platforms']} className="rounded-lg border bg-card px-4">
        <AccordionItem value="sources">
          <AccordionTrigger className="text-sm">Sources ({sources.length})</AccordionTrigger>
          <AccordionContent>
            <SourceSelector mode={s.sourceMode} onModeChange={s.setSourceMode} currentRef={s.currentRef} selected={s.selected} onSelectedChange={s.setSelected} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="settings">
          <AccordionTrigger className="text-sm">Generation settings</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="st-out">Output type</Label>
              <Select value={st.outputType} onValueChange={(v) => set({ outputType: v as OutputType })}>
                <SelectTrigger id="st-out"><SelectValue /></SelectTrigger>
                <SelectContent>{OUTPUTS.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Languages</Label>
              <MultiSelect<LanguageCode> label="Languages" options={LANGUAGES.map((l) => ({ value: l.code, label: `${l.label} · ${l.native}` }))} value={st.languages} onChange={(v) => set({ languages: v.length ? v : ['en'] })} />
              <p className="text-[11px] text-muted-foreground">Hindi & Marathi have hand-written demo translations for featured items; others show a labelled placeholder.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="st-tone">Tone</Label>
                <Select value={st.tone} onValueChange={(v) => set({ tone: v as Tone })}>
                  <SelectTrigger id="st-tone"><SelectValue /></SelectTrigger>
                  <SelectContent>{TONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="st-diff">Difficulty</Label>
                <Select value={st.difficulty} onValueChange={(v) => set({ difficulty: v as Difficulty })}>
                  <SelectTrigger id="st-diff"><SelectValue /></SelectTrigger>
                  <SelectContent>{DIFF.map((d) => <SelectItem key={d.v} value={d.v}>{d.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label id="sci-label">Style: {SCI[st.scientificLevel]}</Label>
              <Slider min={0} max={2} step={1} value={[st.scientificLevel]} onValueChange={(v) => set({ scientificLevel: v[0] as 0 | 1 | 2 })} aria-labelledby="sci-label" thumbLabels={['Scientific to non-scientific']} />
              <div className="flex justify-between text-[11px] text-muted-foreground">{SCI.map((x) => <span key={x}>{x}</span>)}</div>
              <label className="flex items-center gap-2 pt-1 text-xs">
                <Checkbox checked={st.includeTerms} onCheckedChange={(c) => set({ includeTerms: c === true })} /> Include scientific terms with explanations
              </label>
            </div>
            <div className="space-y-1">
              <Label>Length</Label>
              <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label="Length">
                {(['short', 'medium', 'long'] as Length[]).map((l) => (
                  <button key={l} type="button" role="radio" aria-checked={st.length === l} onClick={() => set({ length: l })} className={cn('rounded-md border py-1.5 text-xs capitalize', st.length === l && 'border-primary bg-primary/10 font-medium')}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {([['emojis', 'Emojis'], ['hashtags', 'Hashtags'], ['cta', 'Call to action'], ['citations', 'Source line'], ['thread', 'X thread']] as const).map(([k, l]) => (
                <label key={k} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5">
                  {l}
                  <Switch checked={st[k]} onCheckedChange={(v) => set({ [k]: v })} aria-label={l} className="scale-75" />
                </label>
              ))}
            </div>
            {st.hashtags && suggested.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium">Suggested hashtags</p>
                <div className="flex flex-wrap gap-1">
                  {suggested.map((h) => {
                    const on = st.extraHashtags.includes(h);
                    return (
                      <button key={h} type="button" aria-pressed={on} onClick={() => set({ extraHashtags: on ? st.extraHashtags.filter((x) => x !== h) : [...st.extraHashtags, h] })} className={cn('rounded-full border px-2 py-0.5 text-[11px]', on ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted')}>
                        {h}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="attachments">
          <AccordionTrigger className="text-sm">Attachments & notes ({s.images.length + s.voices.length})</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Images</p><ImageAttachments sourceTitle={firstTitle} /></div>
            <div><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Voice notes</p><VoiceNotes sourceTitle={firstTitle} /></div>
            <div className="space-y-1">
              <Label htmlFor="notes">Special notes</Label>
              <Textarea id="notes" rows={3} value={st.specialNotes} onChange={(e) => set({ specialNotes: e.target.value })} placeholder="e.g. mention Team Bharati, avoid technical jargon, tag @partner" className="text-xs" />
              <p className="text-[11px] text-muted-foreground">Understood: “mention …”, “include …”, “avoid jargon”, “@handles”.</p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {st.outputType === 'social' && (
          <AccordionItem value="platforms">
            <AccordionTrigger className="text-sm">Platforms & accounts ({st.accountIds.length})</AccordionTrigger>
            <AccordionContent className="space-y-3">
              {platforms.map((p) => {
                const accs = accounts.filter((a) => a.platform === p);
                const on = st.platforms.includes(p);
                return (
                  <fieldset key={p} className="rounded-md border p-2">
                    <legend className="px-1">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <Checkbox checked={on} onCheckedChange={(c) => set({ platforms: c ? [...st.platforms, p] : st.platforms.filter((x) => x !== p), accountIds: c ? Array.from(new Set([...st.accountIds, accs[0]?.id].filter(Boolean) as string[])) : st.accountIds.filter((id) => !accs.some((a) => a.id === id)) })} />
                        <PlatformIcon id={p} /> {PLATFORM_META[p].label}
                      </label>
                    </legend>
                    <ul className="space-y-1 pl-6">
                      {accs.map((a) => (
                        <li key={a.id}>
                          <label className="flex items-center gap-2 text-xs">
                            <Checkbox checked={st.accountIds.includes(a.id)} onCheckedChange={() => toggleAccount(a.id, p)} />
                            <span className="font-medium">{a.displayName}</span> <span className="text-muted-foreground">{a.handle}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </fieldset>
                );
              })}
              {(['threads'] as PlatformId[]).filter((p) => !platforms.includes(p)).map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={st.platforms.includes(p)} onCheckedChange={(c) => set({ platforms: c ? [...st.platforms, p] : st.platforms.filter((x) => x !== p) })} />
                  <PlatformIcon id={p} /> {PLATFORM_META[p].label} <span className="text-xs text-muted-foreground">(preview only — no account)</span>
                </label>
              ))}
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}
