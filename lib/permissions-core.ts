import type { Role } from '@/types';

/**
 * Pure permission model (no store access — safe for middleware, tests and server code).
 *
 * Effective permissions = BASE table → workflow settings (System settings › Workflow)
 * → per-cell overrides (System settings › Permission editor). Locked cells can never change.
 *
 * Grant values: true = allowed, false = denied, 'own' = only own items, 'draft' = may draft
 * and send for approval, 'science' = science-accuracy review only, 'limited' = partial.
 */
export type Action =
  | 'view_public'
  | 'download_open'
  | 'download_registered'
  | 'request_restricted'
  | 'upload'
  | 'edit_metadata'
  | 'use_studio'
  | 'approve_publish'
  | 'publish_direct'
  | 'set_visibility'
  | 'moderate_questions'
  | 'manage_social_accounts'
  | 'manage_users'
  | 'view_analytics'
  | 'view_audit_log'
  | 'bookmarks';

export type Grant = boolean | 'own' | 'draft' | 'science' | 'limited';
export type Subject = Role | 'visitor';
export type PermissionTable = Record<Action, Record<Subject, Grant>>;
export type Overrides = Partial<Record<Action, Partial<Record<Subject, Grant>>>>;

export const SUBJECTS: Subject[] = ['visitor', 'student', 'researcher', 'scientist', 'content_manager', 'admin'];
export const ACTIONS: Action[] = [
  'view_public',
  'download_open',
  'download_registered',
  'request_restricted',
  'bookmarks',
  'upload',
  'edit_metadata',
  'use_studio',
  'approve_publish',
  'publish_direct',
  'set_visibility',
  'moderate_questions',
  'manage_social_accounts',
  'view_analytics',
  'view_audit_log',
  'manage_users',
];

const row = (visitor: Grant, student: Grant, researcher: Grant, scientist: Grant, content_manager: Grant, admin: Grant): Record<Subject, Grant> => ({
  visitor,
  student,
  researcher,
  scientist,
  content_manager,
  admin,
});

/** Baseline table. Admin runs the system; content creation belongs to scientists, researchers and content managers. */
export const BASE_PERMISSIONS: PermissionTable = {
  view_public: row(true, true, true, true, true, true),
  download_open: row('limited', true, true, true, true, true),
  download_registered: row(false, true, true, true, true, true),
  request_restricted: row(false, false, true, true, true, true),
  bookmarks: row(false, true, true, true, true, true),
  upload: row(false, false, true, true, true, false),
  edit_metadata: row(false, false, 'own', 'own', true, true),
  use_studio: row(false, false, false, 'draft', true, false),
  approve_publish: row(false, false, false, 'science', true, false),
  publish_direct: row(false, false, false, false, true, false),
  set_visibility: row(false, false, false, false, true, true),
  moderate_questions: row(false, false, false, false, true, false),
  manage_social_accounts: row(false, false, false, false, true, true),
  view_analytics: row(false, false, 'own', 'own', true, true),
  view_audit_log: row(false, false, false, false, 'limited', true),
  manage_users: row(false, false, false, false, false, true),
};

export const ACTION_LABELS: Record<Action, string> = {
  view_public: 'View public content',
  download_open: 'Download open files',
  download_registered: 'Download registered-only files',
  request_restricted: 'Request restricted data',
  bookmarks: 'Bookmarks, collections, saved searches',
  upload: 'Upload to the archive',
  edit_metadata: 'Edit metadata',
  use_studio: 'Write posts (Content Studio)',
  approve_publish: 'Approve and publish',
  publish_direct: 'Publish without approval',
  set_visibility: 'Change who can see content',
  moderate_questions: 'Moderate ask-a-scientist questions',
  manage_social_accounts: 'Manage social accounts',
  view_analytics: 'View analytics',
  view_audit_log: 'View audit log',
  manage_users: 'Manage users',
};

/** Allowed values per action (keeps the editor meaningful). */
export const GRANT_OPTIONS: Record<Action, Grant[]> = {
  view_public: [true],
  download_open: [true, 'limited', false],
  download_registered: [true, false],
  request_restricted: [true, false],
  bookmarks: [true, false],
  upload: [true, false],
  edit_metadata: [true, 'own', false],
  use_studio: [true, 'draft', false],
  approve_publish: [true, 'science', false],
  publish_direct: [true, false],
  set_visibility: [true, false],
  moderate_questions: [true, false],
  manage_social_accounts: [true, false],
  view_analytics: [true, 'own', false],
  view_audit_log: [true, 'limited', false],
  manage_users: [true, false],
};

export const GRANT_LABELS: Record<string, string> = {
  true: 'Allowed',
  false: 'Denied',
  own: 'Own items only',
  draft: 'Draft only',
  science: 'Science review only',
  limited: 'Limited',
};
export const grantKey = (g: Grant) => String(g);
export const parseGrant = (k: string): Grant => (k === 'true' ? true : k === 'false' ? false : (k as Grant));

/** Cells that can never change, so the admin cannot lock the system (or themselves) out. */
export function isLocked(action: Action, subject: Subject): boolean {
  if (action === 'view_public') return true;
  if (subject === 'admin' && (action === 'manage_users' || action === 'view_audit_log' || action === 'set_visibility')) return true;
  if (subject === 'visitor' && action !== 'download_open') return true; // visitors can only read; downloads of open files are adjustable
  return false;
}

/* --------------------------------- Workflow -------------------------------- */

/** Workflow options (Scientist + Content manager only, per product decision). */
export interface Workflow {
  scientistUpload: boolean;
  scientistDraftPosts: boolean;
  scientistScienceReview: boolean;
  scienceReviewRequired: boolean;
  cmApprove: boolean;
  cmDirectPublish: boolean;
  cmSocial: boolean;
  cmAnalytics: boolean;
  cmModerate: boolean;
}

export const DEFAULT_WORKFLOW: Workflow = {
  scientistUpload: true,
  scientistDraftPosts: true,
  scientistScienceReview: true,
  scienceReviewRequired: false,
  cmApprove: true,
  cmDirectPublish: true,
  cmSocial: true,
  cmAnalytics: true,
  cmModerate: true,
};

export interface WorkflowOption {
  key: keyof Workflow;
  role: 'scientist' | 'content_manager';
  label: string;
  help: string;
  /** Permission cell this option controls; rules without a cell only change behaviour. */
  cell?: { action: Action; on: Grant; off: Grant };
}

export const WORKFLOW_OPTIONS: WorkflowOption[] = [
  { key: 'scientistUpload', role: 'scientist', label: 'Scientists can upload to the archive', help: 'Reports, datasets, publications, media and expeditions.', cell: { action: 'upload', on: true, off: false } },
  { key: 'scientistDraftPosts', role: 'scientist', label: 'Scientists can draft posts', help: 'They can write posts and send them to a content manager for approval.', cell: { action: 'use_studio', on: 'draft', off: false } },
  { key: 'scientistScienceReview', role: 'scientist', label: 'Scientists can review science accuracy', help: 'Scientists can mark posts as “science-accurate” in the review queue.', cell: { action: 'approve_publish', on: 'science', off: false } },
  { key: 'scienceReviewRequired', role: 'scientist', label: 'Require a science review before approval', help: 'Content managers cannot approve a post until a scientist has marked it science-accurate.' },
  { key: 'cmApprove', role: 'content_manager', label: 'Content managers can approve & publish', help: 'Approve drafts and uploads from scientists and researchers.', cell: { action: 'approve_publish', on: true, off: false } },
  { key: 'cmDirectPublish', role: 'content_manager', label: 'Content manager posts publish without approval', help: 'Their own posts and uploads go live immediately.', cell: { action: 'publish_direct', on: true, off: false } },
  { key: 'cmSocial', role: 'content_manager', label: 'Content managers can manage social accounts', help: 'Connect, revoke and remove social media accounts.', cell: { action: 'manage_social_accounts', on: true, off: false } },
  { key: 'cmAnalytics', role: 'content_manager', label: 'Content managers can view analytics', help: 'Reach, engagement and per-account performance.', cell: { action: 'view_analytics', on: true, off: false } },
  { key: 'cmModerate', role: 'content_manager', label: 'Content managers moderate questions', help: 'Answer or reject ask-a-scientist questions.', cell: { action: 'moderate_questions', on: true, off: false } },
];

export type CellSource = 'base' | 'workflow' | 'override' | 'locked';

export interface ResolvedCell {
  value: Grant;
  source: CellSource;
  /** Value the workflow alone would produce (when the cell is workflow-controlled). */
  workflowValue?: Grant;
  workflowKey?: keyof Workflow;
}

export function workflowCell(action: Action, subject: Subject, wf: Workflow): { value: Grant; key: keyof Workflow } | null {
  const opt = WORKFLOW_OPTIONS.find((o) => o.cell?.action === action && o.role === subject);
  if (!opt || !opt.cell) return null;
  return { value: wf[opt.key] ? opt.cell.on : opt.cell.off, key: opt.key };
}

export function resolveCell(action: Action, subject: Subject, wf: Workflow, overrides: Overrides, base: PermissionTable = BASE_PERMISSIONS): ResolvedCell {
  const baseValue = base[action][subject];
  if (isLocked(action, subject)) return { value: baseValue, source: 'locked' };
  const w = workflowCell(action, subject, wf);
  const o = overrides[action]?.[subject];
  if (o !== undefined && GRANT_OPTIONS[action].includes(o)) return { value: o, source: 'override', workflowValue: w?.value, workflowKey: w?.key };
  if (w) return { value: w.value, source: 'workflow', workflowValue: w.value, workflowKey: w.key };
  return { value: baseValue, source: 'base' };
}

export function effectivePermissions(wf: Workflow, overrides: Overrides, base: PermissionTable = BASE_PERMISSIONS): PermissionTable {
  const out = {} as PermissionTable;
  for (const a of ACTIONS) {
    out[a] = {} as Record<Subject, Grant>;
    for (const s of SUBJECTS) out[a][s] = resolveCell(a, s, wf, overrides, base).value;
  }
  return out;
}

/** Science review is enforced only when required AND scientists are actually allowed to review. */
export function scienceReviewEnforced(wf: Workflow, table: PermissionTable): boolean {
  return wf.scienceReviewRequired && table.approve_publish.scientist === 'science';
}

/* ---------------------------------- Routes --------------------------------- */

/** Dashboards stay role-based (each role has its own). Other areas use permissions client-side. */
export const ROUTE_ROLES: { prefix: string; roles: Role[] }[] = [
  { prefix: '/dashboard/admin', roles: ['admin'] },
  { prefix: '/dashboard/scientist', roles: ['scientist', 'admin'] },
  { prefix: '/dashboard/content', roles: ['content_manager', 'admin'] },
  { prefix: '/dashboard/researcher', roles: ['researcher', 'admin'] },
  { prefix: '/dashboard/student', roles: ['student', 'admin'] },
  { prefix: '/dashboard', roles: ['admin', 'scientist', 'content_manager', 'researcher', 'student'] },
  // Studio and Upload require login only here; the page checks the (editable) permissions.
  { prefix: '/studio', roles: ['admin', 'scientist', 'content_manager', 'researcher', 'student'] },
  { prefix: '/upload', roles: ['admin', 'scientist', 'content_manager', 'researcher', 'student'] },
];

export function rolesForPath(pathname: string): Role[] | null {
  const r = ROUTE_ROLES.find((x) => pathname === x.prefix || pathname.startsWith(x.prefix + '/'));
  return r ? r.roles : null;
}

export function dashboardPathFor(role: Role): string {
  return role === 'content_manager' ? '/dashboard/content' : `/dashboard/${role}`;
}
