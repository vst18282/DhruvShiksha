'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { ErrorState } from '@/components/common';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { ROLE_LABELS } from '@/lib/constants';
import { dashboardPathFor } from '@/lib/permissions';

/** Friendly "You don't have access" state used by guarded routes and components. */
export function Forbidden({ need, className }: { need?: string; className?: string }) {
  const user = useAuthStore((s) => s.user);
  return (
    <ErrorState
      className={className}
      icon={<ShieldAlert className="h-6 w-6" />}
      title="You don’t have access"
      description={
        user
          ? `Your current role (${ROLE_LABELS[user.role]}) can’t open this area${need ? `: it needs the “${need}” permission` : ''}. Use the role switcher in the account menu to try another demo role.`
          : 'Please log in with a demo account that has access to this area.'
      }
      action={
        <>
          {user ? (
            <Button asChild>
              <Link href={dashboardPathFor(user.role)}>Go to my dashboard</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/login">Log in</Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/">Home</Link>
          </Button>
        </>
      }
    />
  );
}
