'use client';

import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/skeletons';
import { useAuthStore } from '@/store/auth';
import { useApi, useInvalidate } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const role = useAuthStore((s) => s.user?.role);
  const invalidate = useInvalidate();
  const { data, isLoading } = useApi(['notifications', role], () => api.getNotifications(role!), !!role);
  const unread = data?.filter((n) => !n.read) ?? [];
  const markAll = async () => {
    await api.markRead(unread.map((n) => n.id));
    invalidate([['notifications']]);
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ''}`}>
          <Bell />
          {unread.length > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
              {unread.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unread.length > 0 && (
            <Button variant="ghost" size="sm" onClick={markAll}>
              <CheckCheck /> Mark all read
            </Button>
          )}
        </div>
        <ul className="max-h-80 overflow-y-auto" aria-live="polite">
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="space-y-2 border-b p-4">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-full" />
              </li>
            ))}
          {data?.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">You’re all caught up.</li>}
          {data?.map((n) => (
            <li key={n.id} className={cn('border-b last:border-0', !n.read && 'bg-primary/5')}>
              <Link href={n.link ?? '#'} className="block px-4 py-3 hover:bg-muted" onClick={() => api.markRead([n.id]).then(() => invalidate([['notifications']]))}>
                <p className="flex items-center gap-2 text-sm font-medium">
                  {!n.read && <span className="h-2 w-2 rounded-full bg-primary" aria-label="Unread" />}
                  {n.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(n.at), { addSuffix: true })}</p>
              </Link>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
