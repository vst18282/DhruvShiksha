'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Hourglass } from 'lucide-react';
import { allItems, itemHref } from '@/lib/archive';
import { embargoDaysLeft, isEmbargoActiveAt } from '@/lib/access';
import { useAuthStore } from '@/store/auth';
import { useDataStore } from '@/store/data';

/**
 * Heads-up for embargoes lifting soon (within the admin's warning window).
 * `scope="mine"` = items the user owns (scientists, researchers); `"all"` = every item (content managers).
 */
export function EmbargoNotice({ scope = 'mine' }: { scope?: 'mine' | 'all' }) {
  const user = useAuthStore((s) => s.user);
  const warnDays = useDataStore((s) => s.settings.embargoWarningDays);
  const uploads = useDataStore((s) => s.uploads);
  const patches = useDataStore((s) => s.patches);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  const soon = useMemo(
    () =>
      !now || !user
        ? []
        : allItems()
            .filter((i) => (scope === 'all' || i.ownerId === user.id) && isEmbargoActiveAt(i, now) && embargoDaysLeft(i.embargoUntil!, now) <= warnDays)
            .sort((a, b) => a.embargoUntil!.localeCompare(b.embargoUntil!)),
    // allItems() is memoised on uploads/patches
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [now, user?.id, scope, warnDays, uploads, patches],
  );
  if (!soon.length || !now) return null;
  return (
    <section role="status" aria-label="Embargoes lifting soon" className="rounded-lg border border-polar-amber/50 bg-polar-amber/10 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Hourglass className="h-4 w-4 text-polar-amber" aria-hidden /> {soon.length} embargo{soon.length > 1 ? 'es' : ''} lifting within {warnDays} days
      </p>
      <ul className="mt-2 space-y-1 text-sm">
        {soon.map((i) => (
          <li key={i.id} className="flex flex-wrap justify-between gap-2">
            <Link href={itemHref(i)} className="hover:text-primary hover:underline">
              {i.title}
            </Link>
            <span className="text-xs text-muted-foreground">
              opens {new Date(i.embargoUntil!).toLocaleDateString('en-IN', { dateStyle: 'medium' })} · {embargoDaysLeft(i.embargoUntil!, now)} days
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">{scope === 'all' ? 'Plan launch posts for these items.' : 'Check the files and metadata before they become public.'}</p>
    </section>
  );
}
