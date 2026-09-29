import type { Role } from '@/types';
import type { Action } from './permissions-core';

export type NavIcon =
  | 'overview'
  | 'users'
  | 'approvals'
  | 'audit'
  | 'accounts'
  | 'moderation'
  | 'settings'
  | 'studio'
  | 'upload'
  | 'calendar'
  | 'analytics'
  | 'drafts'
  | 'cms'
  | 'search'
  | 'collections'
  | 'access'
  | 'cite'
  | 'api'
  | 'learning'
  | 'bookmarks'
  | 'ask'
  | 'downloads'
  | 'health'
  | 'roles'
  | 'activity'
  | 'system'
  | 'publishing'
  | 'updates';

export interface NavItem {
  label: string;
  href: string;
  icon: NavIcon;
  /** Hide the link unless the (editable) permission table grants this action. */
  need?: Action;
  /** Require an unconditional grant (not 'own' / 'draft' / 'science'). */
  full?: boolean;
}

const settings: NavItem = { label: 'Settings', href: '/dashboard/settings', icon: 'settings' };
const updates: NavItem = { label: 'Updates feed', href: '/updates', icon: 'updates' };
const upload: NavItem = { label: 'Upload Centre', href: '/upload', icon: 'upload', need: 'upload' };

/** Admin runs the system: no composer and no upload (content belongs to scientists, researchers and content managers). */
export const DASHBOARD_NAV: Record<Role, NavItem[]> = {
  admin: [
    { label: 'Overview', href: '/dashboard/admin', icon: 'overview' },
    { label: 'Users', href: '/dashboard/admin?tab=users', icon: 'users' },
    { label: 'Roles & permissions', href: '/dashboard/admin?tab=roles', icon: 'roles' },
    { label: 'Content manager activity', href: '/dashboard/admin?tab=activity', icon: 'activity' },
    { label: 'Audit log', href: '/dashboard/admin?tab=audit', icon: 'audit' },
    { label: 'Social governance', href: '/dashboard/admin?tab=social', icon: 'accounts' },
    { label: 'Content health', href: '/dashboard/admin?tab=health', icon: 'health' },
    { label: 'System settings', href: '/dashboard/admin?tab=system', icon: 'system' },
    { label: 'Publishing & Insights', href: '/dashboard/admin?tab=publishing', icon: 'publishing' },
    settings,
  ],
  scientist: [
    { label: 'Overview', href: '/dashboard/scientist', icon: 'overview' },
    upload,
    { label: 'Studio (drafts)', href: '/studio', icon: 'studio', need: 'use_studio' },
    { label: 'My drafts', href: '/studio/drafts', icon: 'drafts', need: 'use_studio' },
    { label: 'Science review', href: '/studio/approvals', icon: 'approvals', need: 'approve_publish' },
    updates,
    settings,
  ],
  content_manager: [
    { label: 'Overview', href: '/dashboard/content', icon: 'overview' },
    { label: 'Approval queue', href: '/studio/approvals', icon: 'approvals', need: 'approve_publish' },
    { label: 'Content Studio', href: '/studio', icon: 'studio', need: 'use_studio' },
    { label: 'Drafts', href: '/studio/drafts', icon: 'drafts', need: 'use_studio' },
    { label: 'Calendar', href: '/studio/calendar', icon: 'calendar', need: 'use_studio' },
    { label: 'Accounts', href: '/studio/accounts', icon: 'accounts', need: 'manage_social_accounts', full: true },
    { label: 'Analytics', href: '/studio/analytics', icon: 'analytics', need: 'view_analytics', full: true },
    { label: 'Moderation', href: '/dashboard/content?tab=moderation', icon: 'moderation', need: 'moderate_questions' },
    { label: 'Visibility', href: '/dashboard/content?tab=visibility', icon: 'access', need: 'set_visibility' },
    { label: 'Blog editor & curation', href: '/dashboard/content?tab=cms', icon: 'cms' },
    upload,
    updates,
    settings,
  ],
  researcher: [
    { label: 'Overview', href: '/dashboard/researcher', icon: 'overview' },
    upload,
    { label: 'Saved searches', href: '/dashboard/researcher?tab=searches', icon: 'search' },
    { label: 'Collections', href: '/dashboard/researcher?tab=collections', icon: 'collections' },
    { label: 'Access requests', href: '/dashboard/researcher?tab=access', icon: 'access' },
    { label: 'Citation manager', href: '/dashboard/researcher?tab=cite', icon: 'cite' },
    { label: 'API keys', href: '/dashboard/researcher?tab=api', icon: 'api' },
    updates,
    settings,
  ],
  student: [
    { label: 'Overview', href: '/dashboard/student', icon: 'overview' },
    { label: 'Learning', href: '/learn', icon: 'learning' },
    { label: 'Bookmarks', href: '/dashboard/student?tab=bookmarks', icon: 'bookmarks' },
    { label: 'Ask a scientist', href: '/dashboard/student?tab=ask', icon: 'ask' },
    { label: 'Downloads', href: '/dashboard/student?tab=downloads', icon: 'downloads' },
    updates,
    settings,
  ],
};
