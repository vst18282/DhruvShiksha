import type { Role } from '@/types';
import { PORTAL_HOME } from '@/lib/nav';
import { dashboardPathFor, rolesForPath } from '@/lib/permissions-core';

/** Staff roles start on their own dashboard; researchers and students start on Explore. */
const DASHBOARD_FIRST: Role[] = ['admin', 'scientist', 'content_manager'];

/** The first page a role sees after logging in or signing up. */
export function homePathFor(role: Role): string {
  return DASHBOARD_FIRST.includes(role) ? dashboardPathFor(role) : PORTAL_HOME;
}

/** Only same-site relative paths are accepted as `?next=` targets (no open redirects). */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null;
  return next;
}

/**
 * Where to send a user once they are signed in: the page they were trying to open (`?next=`),
 * provided their role may see it, otherwise their role's home page.
 */
export function postAuthPath(role: Role, next: string | null | undefined): string {
  const target = safeNext(next);
  if (target) {
    const allowed = rolesForPath(target.split(/[?#]/)[0]);
    if (!allowed || allowed.includes(role)) return target;
  }
  return homePathFor(role);
}
