import Image from 'next/image';
import Link from 'next/link';
import { PORTAL_HOME } from '@/lib/nav';
import { cn } from '@/lib/utils';

/** DhruvShiksha wordmark: mountain + open-book logo (transparent PNG) beside the site name. */
export function Wordmark({
  className,
  compact,
  subtitleClassName,
  href = PORTAL_HOME,
}: {
  className?: string;
  compact?: boolean;
  subtitleClassName?: string;
  /** Defaults to the portal home (Explore); the landing page passes `/`. */
  href?: string;
}) {
  return (
    <Link href={href} className={cn('group flex items-center gap-2.5 rounded-md', className)} aria-label="DhruvShiksha home">
      <Image src="/brand/logo.png" alt="" width={640} height={322} priority className="h-9 w-auto shrink-0" aria-hidden />
      <span className="leading-tight">
        <span className="block text-base font-bold tracking-tight">DhruvShiksha</span>
        {!compact && <span className={cn('block text-[11px] font-medium text-muted-foreground', subtitleClassName)}>NCPOR · Demo portal</span>}
      </span>
    </Link>
  );
}
