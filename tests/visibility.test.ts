import { describe, expect, it } from 'vitest';
import { AUDIENCES, isPublicToAll, isVisibleTo, normaliseVisibility, visibilityLabel } from '@/lib/visibility';

describe('per-role visibility', () => {
  it('treats undefined and the full audience list as everyone', () => {
    expect(normaliseVisibility(undefined)).toBeUndefined();
    expect(normaliseVisibility([...AUDIENCES])).toBeUndefined();
    expect(isPublicToAll({})).toBe(true);
    expect(visibilityLabel(undefined)).toBe('Everyone');
  });

  it('hides limited content from roles outside the audience', () => {
    const item = { visibleTo: ['researcher', 'scientist', 'content_manager', 'admin'] as const };
    const v = { visibleTo: [...item.visibleTo] };
    expect(isVisibleTo(v, null)).toBe(false); // visitor
    expect(isVisibleTo(v, 'student')).toBe(false);
    expect(isVisibleTo(v, 'researcher')).toBe(true);
    expect(visibilityLabel(v.visibleTo)).toBe('Researchers & scientists');
  });

  it('always lets admins, content managers and owners see content', () => {
    const hidden = { visibleTo: [] as never[], ownerId: 'u-scientist' };
    expect(isVisibleTo(hidden, 'admin')).toBe(true);
    expect(isVisibleTo(hidden, 'content_manager')).toBe(true);
    expect(isVisibleTo(hidden, 'scientist', 'u-scientist')).toBe(true);
    expect(isVisibleTo(hidden, 'scientist', 'u-other')).toBe(false);
  });

  it('labels custom audiences by role', () => {
    expect(visibilityLabel(['visitor', 'student', 'content_manager', 'admin'])).toContain('Visitors');
  });
});
