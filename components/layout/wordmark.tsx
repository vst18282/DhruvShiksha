import Link from 'next/link';
import { cn } from '@/lib/utils';

/** Placeholder wordmark — intentionally NOT the real NCPOR/MoES logo. */
export function Wordmark({ className, compact, subtitleClassName }: { className?: string; compact?: boolean; subtitleClassName?: string }) {
  return (
    <Link href="/" className={cn('group flex items-center gap-2.5 rounded-md', className)} aria-label="PolarVerse home">
      <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden>
        <defs>
          <linearGradient id="wm-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5BB5E8" />
            <stop offset="0.6" stopColor="#2DD4BF" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="10" fill="#0B1F3A" />
        <path d="M6 28 L14 16 L19 22 L25 12 L34 28 Z" fill="url(#wm-g)" />
        <path d="M5 11 C 14 5, 24 13, 35 7" stroke="#2DD4BF" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.9" />
        <circle cx="30" cy="30" r="1.4" fill="#F5FAFF" />
      </svg>
      <span className="leading-tight">
        <span className="block text-base font-bold tracking-tight">PolarVerse</span>
        {!compact && <span className={cn('block text-[11px] font-medium text-muted-foreground', subtitleClassName)}>NCPOR · Demo portal</span>}
      </span>
    </Link>
  );
}
