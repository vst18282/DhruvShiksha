'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/** Tab state synced with ?tab= so sidebar links and deep links work. */
export function useTabParam(defaultTab: string): [string, (t: string) => void] {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = sp.get('tab') ?? defaultTab;
  const set = (t: string) => router.replace(t === defaultTab ? pathname : `${pathname}?tab=${t}`, { scroll: false });
  return [tab, set];
}
