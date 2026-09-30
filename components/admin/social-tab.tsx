'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { ChevronRight, Link2Off, Plug } from 'lucide-react';
import type { PlatformId, SocialAccount } from '@/types';
import { PlatformIcon, PlatformTile } from '@/components/studio/platform-icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from '@/components/skeletons';
import { useApi, useInvalidate } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { PLATFORM_META } from '@/lib/constants';
import { accountStats } from '@/lib/social';
import { formatCompact } from '@/lib/utils';

const PLATFORMS = Object.keys(PLATFORM_META) as PlatformId[];

/** Governance view of every connected account, grouped by platform. Click an account for its profile page. */
export function SocialTab() {
  const { data, isPending } = useApi(['accounts'], api.getAccounts);
  const posts = useApi(['posts'], api.getPosts);
  const invalidate = useInvalidate();
  const toggle = async (a: SocialAccount) => {
    await api.saveAccount({ ...a, connected: !a.connected, connectedAt: a.connected ? a.connectedAt : new Date().toISOString().slice(0, 10) });
    toast.success(`${a.handle} ${a.connected ? 'revoked' : 'reconnected'} (demo)`);
    invalidate([['accounts'], ['audit']]);
  };
  if (isPending) return <TableSkeleton rows={6} />;
  const accounts = data ?? [];
  const connected = accounts.filter((a) => a.connected).length;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>
          {accounts.length} accounts · {connected} connected · {accounts.length - connected} revoked
        </span>
        <span className="ml-auto flex flex-wrap gap-3">
          {PLATFORMS.filter((p) => accounts.some((a) => a.platform === p)).map((p) => (
            <span key={p} className="inline-flex items-center gap-1">
              <PlatformIcon id={p} title={PLATFORM_META[p].label} /> {accounts.filter((a) => a.platform === p).length}
            </span>
          ))}
        </span>
      </div>
      {/* One card per platform in a two-column grid, so platforms sit evenly left and right. */}
      <div className="grid items-start gap-4 md:grid-cols-2">
        {PLATFORMS.filter((p) => accounts.some((a) => a.platform === p)).map((p) => {
          const list = accounts.filter((a) => a.platform === p);
          return (
            <section key={p} aria-labelledby={`sg-${p}`} className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <header className="flex items-center gap-3 border-b bg-muted/30 px-4 py-3">
                <PlatformTile id={p} className="h-9 w-9" iconClassName="h-4 w-4" />
                <div className="min-w-0 flex-1">
                  <h2 id={`sg-${p}`} className="text-sm font-semibold">{PLATFORM_META[p].label}</h2>
                  <p className="text-[11px] text-muted-foreground">
                    {list.length} account{list.length === 1 ? '' : 's'} · {formatCompact(list.reduce((n, a) => n + a.followers, 0))} followers
                  </p>
                </div>
              </header>
              <ul className="divide-y">
                {list.map((a) => {
                  const s = accountStats(posts.data ?? [], a);
                  return (
                    <li key={a.id} className="group relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link href={`/dashboard/admin/social/${a.id}`} className="min-w-0 font-medium after:absolute after:inset-0 after:content-[''] hover:text-primary">
                            <span className="line-clamp-1">{a.displayName}</span>
                          </Link>
                          <Badge variant={a.connected ? 'success' : 'muted'} className="shrink-0">{a.connected ? 'Connected' : 'Revoked'}</Badge>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {a.handle} · {formatCompact(a.followers)} followers · {a.purpose}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {s.published} published · {formatCompact(s.reach)} reach · {s.rate}% engagement
                        </p>
                      </div>
                      {/* relative + z-10 keeps the button clickable above the card-wide link */}
                      <Button size="sm" variant={a.connected ? 'outline' : 'default'} className="relative z-10 shrink-0" onClick={() => toggle(a)} aria-label={`${a.connected ? 'Revoke' : 'Reconnect'} ${a.handle}`}>
                        {a.connected ? (
                          <>
                            <Link2Off /> Revoke
                          </>
                        ) : (
                          <>
                            <Plug /> Reconnect
                          </>
                        )}
                      </Button>
                      <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" aria-hidden />
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
