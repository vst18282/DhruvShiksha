'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { CloudSnow } from 'lucide-react';
import { ErrorState } from '@/components/common';
import { Button } from '@/components/ui/button';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container py-16">
      <ErrorState
        icon={<CloudSnow className="h-6 w-6" />}
        title="A blizzard blew through this page"
        description="Something unexpected happened while loading. Your demo data is safe — try again or head back home."
        action={
          <>
            <Button onClick={reset}>Try again</Button>
            <Button variant="outline" asChild>
              <Link href="/">Go home</Link>
            </Button>
          </>
        }
      />
    </div>
  );
}
