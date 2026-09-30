import { siFacebook, siInstagram, siThreads, siWhatsapp, siX, siYoutube } from 'simple-icons';
import type { PlatformId } from '@/types';
import { PLATFORM_META } from '@/lib/constants';
import { cn } from '@/lib/utils';

/**
 * Official platform logos. Paths come from the `simple-icons` package (CC0 SVG data; the logos
 * themselves remain trademarks of their owners and are used only to identify each platform).
 * LinkedIn was removed from simple-icons at LinkedIn's request, so its "in" mark is embedded
 * from LinkedIn's public brand assets.
 */
const LINKEDIN = {
  hex: '0A66C2',
  path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
};

const BRANDS: Record<PlatformId, { hex: string; path: string }> = {
  x: siX,
  instagram: siInstagram,
  linkedin: LINKEDIN,
  facebook: siFacebook,
  youtube: siYoutube,
  whatsapp: siWhatsapp,
  threads: siThreads,
};

/** Hex colour of the official logo (useful for accents such as chart bars). */
export const brandHex = (id: PlatformId) => `#${BRANDS[id].hex}`;

/**
 * Official logo for a platform. Black marks (X, Threads) use `currentColor` so they stay
 * visible in dark mode. Decorative by default; pass `title` to expose an accessible name.
 */
export function PlatformIcon({ id, className, title, monochrome }: { id: PlatformId; className?: string; title?: string; /** Draw in the current text colour instead of the brand colour. */ monochrome?: boolean }) {
  const b = BRANDS[id];
  const mono = monochrome || b.hex === '000000';
  return (
    <svg
      viewBox="0 0 24 24"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={cn('inline-block h-4 w-4 shrink-0', mono && !monochrome && 'text-foreground', className)}
      fill={mono ? 'currentColor' : `#${b.hex}`}
    >
      {title && <title>{title}</title>}
      <path d={b.path} />
    </svg>
  );
}

/** Logo + platform name, e.g. in lists and pop-ups. */
export function PlatformLabel({ id, className }: { id: PlatformId; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <PlatformIcon id={id} /> {PLATFORM_META[id].label}
    </span>
  );
}

/** Alias used by newer code. */
export const BrandIcon = PlatformIcon;

/** Larger logo on a neutral tile (account cards, profile headers). */
export function PlatformTile({ id, className, iconClassName }: { id: PlatformId; className?: string; iconClassName?: string }) {
  return (
    <span className={cn('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background shadow-sm', className)}>
      <PlatformIcon id={id} className={cn('h-5 w-5', iconClassName)} />
    </span>
  );
}
