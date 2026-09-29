'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, CalendarDays, ClipboardCheck, FilePen, PenSquare, Share2 } from 'lucide-react';
import { useHydrated } from '@/store/hydration';
import { useCan, type Action } from '@/lib/permissions';
import { cn } from '@/lib/utils';

/** `full` = the tab needs an unconditional grant (not 'own' / 'draft' / 'science'). */
const ITEMS: { href: string; label: string; icon: typeof PenSquare; need: Action | null; full?: boolean }[] = [
  { href: '/studio', label: 'Composer', icon: PenSquare, need: null },
  { href: '/studio/drafts', label: 'Drafts', icon: FilePen, need: null },
  { href: '/studio/approvals', label: 'Approvals', icon: ClipboardCheck, need: 'approve_publish' },
  { href: '/studio/calendar', label: 'Calendar', icon: CalendarDays, need: null },
  { href: '/studio/accounts', label: 'Accounts', icon: Share2, need: 'manage_social_accounts', full: true },
  { href: '/studio/analytics', label: 'Analytics', icon: BarChart3, need: 'view_analytics', full: true },
];

export function StudioNav() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const { can, canFully } = useCan();
  if (!hydrated) return <div className="mb-4 h-10" />;
  return (
    <nav aria-label="Studio" className="no-scrollbar mb-5 flex gap-1 overflow-x-auto border-b">
      {ITEMS.filter((i) => !i.need || (i.full ? canFully(i.need) : can(i.need))).map((i) => {
        const active = pathname === i.href;
        return (
          <Link key={i.href} href={i.href} aria-current={active ? 'page' : undefined} className={cn('-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground', active ? 'border-primary text-foreground' : 'border-transparent')}>
            <i.icon className="h-4 w-4" aria-hidden /> {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
