'use client';

import { useState } from 'react';
import { Eye } from 'lucide-react';
import type { Audience } from '@/types';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/misc';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AUDIENCE_LABELS, VISIBILITY_PRESETS, normaliseVisibility, visibilityLabel } from '@/lib/visibility';

/** Audiences a manager can switch on/off. Content managers and admins always see everything. */
const CHOOSABLE: Audience[] = ['visitor', 'student', 'researcher', 'scientist'];
const ALWAYS: Audience[] = ['content_manager', 'admin'];

function presetIdOf(v: Audience[] | undefined): string {
  const n = normaliseVisibility(v);
  return VISIBILITY_PRESETS.find((p) => visibilityLabel(p.value) === visibilityLabel(n))?.id ?? 'custom';
}

/**
 * Who-can-see picker: presets (Everyone, Signed-in, Researchers & scientists, Staff) or a custom
 * set of roles. Emits `undefined` for "everyone".
 */
export function VisibilityControl({ value, onChange, id = 'visibility', label = 'Who can see this', disabled }: { value: Audience[] | undefined; onChange: (v: Audience[] | undefined) => void; id?: string; label?: string; disabled?: boolean }) {
  const [custom, setCustom] = useState(() => presetIdOf(value) === 'custom');
  const current = normaliseVisibility(value);
  const selectValue = custom ? 'custom' : presetIdOf(value);
  const checked = (a: Audience) => !current || current.includes(a);
  const toggle = (a: Audience, on: boolean) => {
    const base = current ?? [...CHOOSABLE, ...ALWAYS];
    const next = on ? Array.from(new Set([...base, a, ...ALWAYS])) : base.filter((x) => x !== a);
    onChange(normaliseVisibility(Array.from(new Set([...next, ...ALWAYS]))));
  };
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-1.5">
        <Eye className="h-4 w-4 text-muted-foreground" aria-hidden /> {label}
      </Label>
      <Select
        value={selectValue}
        disabled={disabled}
        onValueChange={(v) => {
          if (v === 'custom') return setCustom(true);
          setCustom(false);
          onChange(VISIBILITY_PRESETS.find((p) => p.id === v)?.value);
        }}
      >
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {VISIBILITY_PRESETS.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.label}
            </SelectItem>
          ))}
          <SelectItem value="custom">Custom…</SelectItem>
        </SelectContent>
      </Select>
      {custom && (
        <fieldset className="grid grid-cols-2 gap-2 rounded-md border p-2" disabled={disabled}>
          <legend className="sr-only">Roles that can see this</legend>
          {CHOOSABLE.map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm">
              <Checkbox checked={checked(a)} onCheckedChange={(c) => toggle(a, c === true)} aria-label={AUDIENCE_LABELS[a]} />
              {AUDIENCE_LABELS[a].replace(' (not logged in)', '')}
            </label>
          ))}
          <p className="col-span-2 text-[11px] text-muted-foreground">Content managers and admins always see everything.</p>
        </fieldset>
      )}
      <p className="text-xs text-muted-foreground">Visible to: {visibilityLabel(value)}</p>
    </div>
  );
}
