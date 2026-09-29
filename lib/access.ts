import type { AccessRequest, ArchiveItem, Role, User } from '@/types';
import { grant as liveGrant, type Action, type Grant } from '@/lib/permissions';
import { useDataStore } from '@/store/data';

export type AccessAction = 'download' | 'login' | 'request' | 'pending' | 'declined' | 'embargo' | 'not-allowed' | 'disabled';

export interface AccessState {
  canDownload: boolean;
  action: AccessAction;
  message: string;
}

export interface AccessOptions {
  /** Global switch from System settings › Content & engagement. */
  allowDownloads: boolean;
  /** Content managers may open embargoed items (System settings › Embargo). */
  cmCanViewEmbargoed: boolean;
  /** Permission lookup (defaults to the live, admin-editable table). */
  grant: (role: Role | null, action: Action) => Grant;
}

export function currentAccessOptions(): AccessOptions {
  const s = typeof window === 'undefined' ? null : useDataStore.getState().settings;
  return { allowDownloads: s?.allowDownloads ?? true, cmCanViewEmbargoed: s?.cmCanViewEmbargoed ?? false, grant: liveGrant };
}

type ItemLike = Pick<ArchiveItem, 'id' | 'accessLevel' | 'embargoUntil' | 'ownerId'>;

/**
 * Decide whether the current user may download an item (demo rules):
 * - downloads switched off globally → nobody (owners/admins still can, to manage files)
 * - public → roles with “Download open files”; registered → signed-in roles with “Download registered-only files”
 * - restricted → owner/admin or an approved access request
 * - embargoed → blocked until the date (owner/admin exempt; content managers when allowed in settings)
 */
export function accessState(item: ItemLike, user: User | null, requests: AccessRequest[], now = new Date(), opts: AccessOptions = currentAccessOptions()): AccessState {
  const role = user?.role ?? null;
  const privileged = !!user && (user.role === 'admin' || user.id === item.ownerId);
  if (!opts.allowDownloads && !privileged) return { canDownload: false, action: 'disabled', message: 'Downloads are temporarily turned off by the administrator' };
  const g = (a: Action) => opts.grant(role, a);

  switch (item.accessLevel) {
    case 'public':
      if (g('download_open') === false) return user ? { canDownload: false, action: 'not-allowed', message: 'Your role cannot download files' } : { canDownload: false, action: 'login', message: 'Log in to download this item' };
      return { canDownload: true, action: 'download', message: 'Open access' };
    case 'registered':
      if (!user) return { canDownload: false, action: 'login', message: 'Log in to download this item' };
      if (g('download_registered') === false) return { canDownload: false, action: 'not-allowed', message: 'Your role cannot download registered-only files' };
      return { canDownload: true, action: 'download', message: 'Available to registered users' };
    case 'embargoed': {
      const active = isEmbargoActiveAt(item, now);
      const cmPreview = !!user && user.role === 'content_manager' && opts.cmCanViewEmbargoed;
      if (!active) {
        if (!privileged && g('download_open') === false) return { canDownload: false, action: 'not-allowed', message: 'Embargo has ended, but your role cannot download files' };
        return { canDownload: true, action: 'download', message: 'Embargo has ended' };
      }
      if (privileged) return { canDownload: true, action: 'download', message: 'You can access this embargoed item as owner/admin' };
      if (cmPreview) return { canDownload: true, action: 'download', message: 'Early access for content managers (embargo still active: do not publish yet)' };
      return { canDownload: false, action: 'embargo', message: `Embargoed until ${new Date(item.embargoUntil!).toLocaleDateString('en-IN', { dateStyle: 'medium' })}` };
    }
    case 'restricted': {
      if (privileged) return { canDownload: true, action: 'download', message: 'You have owner/admin access' };
      if (!user) return { canDownload: false, action: 'login', message: 'Log in to request access' };
      const mine = requests.filter((r) => r.itemId === item.id && r.requesterId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      if (mine?.status === 'approved') return { canDownload: true, action: 'download', message: 'Access granted' };
      if (mine?.status === 'pending') return { canDownload: false, action: 'pending', message: 'Your access request is pending review' };
      if (g('request_restricted') === false) return { canDownload: false, action: 'not-allowed', message: 'Your role cannot request restricted data' };
      if (mine?.status === 'declined') return { canDownload: false, action: 'declined', message: 'Your previous request was declined. You may submit a new one' };
      return { canDownload: false, action: 'request', message: 'Restricted: request access from the data owner' };
    }
  }
}

/* --------------------------------- Embargo --------------------------------- */

export function isEmbargoActiveAt(item: Pick<ArchiveItem, 'accessLevel' | 'embargoUntil'>, now = new Date()): boolean {
  return item.accessLevel === 'embargoed' && !!item.embargoUntil && new Date(item.embargoUntil) > now;
}

/** Whole days until the embargo lifts (0 when already lifted). */
export function embargoDaysLeft(until: string, now = new Date()): number {
  return Math.max(0, Math.ceil((new Date(until).getTime() - now.getTime()) / 86_400_000));
}

/** Add months to a date, clamping the day (31 Jan + 1 month → 28/29 Feb). Returns yyyy-mm-dd. */
export function addMonthsIso(from: Date | string, months: number): string {
  const d = new Date(from);
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, last));
  return target.toISOString().slice(0, 10);
}

/** Months between two dates (rounded up), used to enforce the maximum embargo length. */
export function monthsBetween(from: Date | string, to: Date | string): number {
  const a = new Date(from);
  const b = new Date(to);
  let m = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() > a.getUTCDate()) m += 1;
  return m;
}

export const EMBARGO_PRESETS = [3, 6, 12, 24];

/** Clamp an embargo length to 1..max months. */
export function clampEmbargoMonths(months: number, max: number): number {
  if (!Number.isFinite(months)) return 1;
  return Math.min(Math.max(1, Math.round(months)), Math.max(1, max));
}
