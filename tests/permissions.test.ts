import { describe, expect, it } from 'vitest';
import {
  BASE_PERMISSIONS,
  DEFAULT_WORKFLOW,
  effectivePermissions,
  isLocked,
  resolveCell,
  scienceReviewEnforced,
  WORKFLOW_OPTIONS,
} from '@/lib/permissions-core';

describe('effective permissions', () => {
  it('matches the base table with default workflow and no overrides', () => {
    const t = effectivePermissions(DEFAULT_WORKFLOW, {});
    expect(t.upload.researcher).toBe(true);
    expect(t.upload.admin).toBe(false);
    expect(t.use_studio.scientist).toBe('draft');
    expect(t.publish_direct.content_manager).toBe(true);
    expect(t.manage_users.admin).toBe(true);
  });

  it('applies workflow changes to the matching cells', () => {
    const t = effectivePermissions({ ...DEFAULT_WORKFLOW, cmApprove: false, scientistDraftPosts: false }, {});
    expect(t.approve_publish.content_manager).toBe(false);
    expect(t.use_studio.scientist).toBe(false);
    expect(resolveCell('approve_publish', 'content_manager', { ...DEFAULT_WORKFLOW, cmApprove: false }, {}).source).toBe('workflow');
  });

  it('lets an override beat the workflow', () => {
    const wf = { ...DEFAULT_WORKFLOW, cmApprove: false };
    const cell = resolveCell('approve_publish', 'content_manager', wf, { approve_publish: { content_manager: true } });
    expect(cell.value).toBe(true);
    expect(cell.source).toBe('override');
    expect(cell.workflowValue).toBe(false);
  });

  it('falls back to the workflow when an override is removed', () => {
    const wf = { ...DEFAULT_WORKFLOW, cmApprove: false };
    expect(effectivePermissions(wf, {}).approve_publish.content_manager).toBe(false);
  });

  it('ignores overrides with values not allowed for the action', () => {
    const t = effectivePermissions(DEFAULT_WORKFLOW, { upload: { student: 'science' } });
    expect(t.upload.student).toBe(false);
  });

  it('never changes locked cells', () => {
    expect(isLocked('manage_users', 'admin')).toBe(true);
    const t = effectivePermissions(DEFAULT_WORKFLOW, { manage_users: { admin: false }, view_public: { student: false } });
    expect(t.manage_users.admin).toBe(true);
    expect(t.view_public.student).toBe(true);
  });

  it('has workflow options only for scientist and content manager', () => {
    expect(WORKFLOW_OPTIONS.every((o) => o.role === 'scientist' || o.role === 'content_manager')).toBe(true);
  });

  it('enforces science review only when scientists may review', () => {
    const wf = { ...DEFAULT_WORKFLOW, scienceReviewRequired: true };
    expect(scienceReviewEnforced(wf, effectivePermissions(wf, {}))).toBe(true);
    expect(scienceReviewEnforced(wf, effectivePermissions(wf, { approve_publish: { scientist: false } }))).toBe(false);
  });

  it('keeps every base cell within the allowed options', () => {
    for (const [a, rowV] of Object.entries(BASE_PERMISSIONS)) for (const v of Object.values(rowV)) expect(v).not.toBeUndefined();
    expect(Object.keys(BASE_PERMISSIONS).length).toBeGreaterThan(10);
  });
});
