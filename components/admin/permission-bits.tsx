'use client';

import { Check, Lock, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { GRANT_LABELS, grantKey, type CellSource, type Grant, type Subject } from '@/lib/permissions';
import { ROLE_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';

export const SUBJECT_LABELS: Record<Subject, string> = { visitor: 'Visitor', ...ROLE_LABELS };

/** Compact visual for one grant value. */
export function GrantValue({ g }: { g: Grant }) {
  if (g === true) return <Check className="mx-auto h-4 w-4 text-success" aria-label="Allowed" />;
  if (g === false) return <X className="mx-auto h-4 w-4 text-muted-foreground" aria-label="Denied" />;
  return (
    <Badge variant="warning" className="whitespace-nowrap">
      {GRANT_LABELS[grantKey(g)]}
    </Badge>
  );
}

export const SOURCE_META: Record<CellSource, { label: string; className: string; short: string }> = {
  base: { label: 'Default', className: '', short: '' },
  workflow: { label: 'Set by a workflow option', className: 'bg-primary', short: 'W' },
  override: { label: 'Edited in the permission table (overrides workflow)', className: 'bg-polar-amber', short: 'E' },
  locked: { label: 'Locked (cannot be changed)', className: '', short: '' },
};

/** Small marker shown in a cell's corner explaining where its value comes from. */
export function SourceMarker({ source }: { source: CellSource }) {
  if (source === 'locked') return <Lock className="h-3 w-3 text-muted-foreground" aria-label={SOURCE_META.locked.label} />;
  if (source === 'base') return null;
  return <span className={cn('inline-block h-2 w-2 rounded-full', SOURCE_META[source].className)} title={SOURCE_META[source].label} aria-label={SOURCE_META[source].label} role="img" />;
}

export function SourceLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legend">
      <li className="inline-flex items-center gap-1.5">
        <SourceMarker source="workflow" /> Set by workflow option
      </li>
      <li className="inline-flex items-center gap-1.5">
        <SourceMarker source="override" /> Edited in permission table
      </li>
      <li className="inline-flex items-center gap-1.5">
        <SourceMarker source="locked" /> Locked
      </li>
    </ul>
  );
}
