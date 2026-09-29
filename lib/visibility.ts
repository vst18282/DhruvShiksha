import type { Audience, Role } from '@/types';

/**
 * Per-role visibility (pure helpers). Content is visible to everyone unless `visibleTo`
 * lists specific audiences. Admins and content managers always see everything (they manage
 * visibility), and owners always see their own items.
 */
export const AUDIENCES: Audience[] = ['visitor', 'student', 'researcher', 'scientist', 'content_manager', 'admin'];

export const AUDIENCE_LABELS: Record<Audience, string> = {
  visitor: 'Visitors (not logged in)',
  student: 'Students',
  researcher: 'Researchers',
  scientist: 'Scientists',
  content_manager: 'Content managers',
  admin: 'Admins',
};

export const VISIBILITY_PRESETS: { id: string; label: string; value: Audience[] | undefined }[] = [
  { id: 'all', label: 'Everyone (public)', value: undefined },
  { id: 'signed-in', label: 'Signed-in users only', value: ['student', 'researcher', 'scientist', 'content_manager', 'admin'] },
  { id: 'research', label: 'Researchers & scientists', value: ['researcher', 'scientist', 'content_manager', 'admin'] },
  { id: 'staff', label: 'NCPOR staff only', value: ['scientist', 'content_manager', 'admin'] },
];

export interface Visible {
  visibleTo?: Audience[];
  ownerId?: string;
}

/** Normalise: undefined or a list containing every audience means "everyone". */
export function normaliseVisibility(v: Audience[] | undefined | null): Audience[] | undefined {
  if (!v) return undefined;
  const set = AUDIENCES.filter((a) => v.includes(a));
  return set.length === AUDIENCES.length ? undefined : set;
}

export function isPublicToAll(item: Visible): boolean {
  return normaliseVisibility(item.visibleTo) === undefined;
}

export function isVisibleTo(item: Visible, role: Role | null | undefined, userId?: string): boolean {
  if (role === 'admin' || role === 'content_manager') return true;
  if (userId && item.ownerId && item.ownerId === userId) return true;
  const v = normaliseVisibility(item.visibleTo);
  if (!v) return true;
  return v.includes(role ?? 'visitor');
}

export function visibilityLabel(v: Audience[] | undefined): string {
  const n = normaliseVisibility(v);
  if (!n) return 'Everyone';
  const preset = VISIBILITY_PRESETS.find((p) => p.value && p.value.length === n.length && p.value.every((a) => n.includes(a)));
  if (preset) return preset.label;
  if (!n.length) return 'Hidden (managers only)';
  return n.map((a) => AUDIENCE_LABELS[a].replace(' (not logged in)', '')).join(', ');
}
