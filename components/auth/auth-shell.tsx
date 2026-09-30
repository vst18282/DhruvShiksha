import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Wordmark } from '@/components/layout/wordmark';
import { DemoBadge } from '@/components/common';
import { Button } from '@/components/ui/button';
import { AuthSwitch, AuthSwitchLinks, ContinueNotice } from './auth-switch';
import { IMAGE_LIBRARY } from '@/lib/images';

/**
 * Shared frame for the auth screens: an icy-mountain photograph under the same navy gradient and
 * teal/ice glows the rest of the portal uses, with the form on a raised card. The site navigation
 * bar and the chatbot are suppressed on these routes (see CHROMELESS_ROUTES).
 */
export function AuthShell({
  mode,
  title,
  subtitle,
  children,
}: {
  mode: 'login' | 'register';
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden bg-polar-navy text-white">
      <img
        src={IMAGE_LIBRARY['sea-ice-mountains'].src}
        alt=""
        aria-hidden
        className="absolute inset-0 -z-20 h-full w-full scale-105 object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-polar-navy/85 via-polar-navy/80 to-polar-navy" aria-hidden />
      <div className="absolute -right-24 -top-32 -z-10 h-80 w-80 rounded-full bg-polar-ice/25 blur-3xl" aria-hidden />
      <div className="absolute -bottom-28 left-1/4 -z-10 h-72 w-72 rounded-full bg-polar-teal/15 blur-3xl" aria-hidden />

      <header className="container flex shrink-0 items-center justify-between gap-3 py-5">
        <Wordmark href="/" subtitleClassName="text-white/70" />
        <Button asChild variant="outline" size="sm" className="shrink-0 gap-1.5 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to landing
          </Link>
        </Button>
      </header>

      <div className="container flex flex-1 items-center justify-center py-6 md:py-10">
        <div className="w-full max-w-5xl rounded-2xl border border-white/15 bg-background/95 p-6 text-foreground shadow-2xl backdrop-blur md:p-8">
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-primary">
                <span className="h-px w-8 bg-primary/50" aria-hidden />
                DhruvShiksha
              </p>
              <h1 className="mt-2 text-balance text-3xl font-bold leading-tight tracking-tight md:text-4xl">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{subtitle}</p>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
              <Suspense fallback={<AuthSwitchLinks mode={mode} next={null} />}>
                <AuthSwitch mode={mode} />
              </Suspense>
              <DemoBadge />
            </div>
          </div>
          <Suspense fallback={null}>
            <ContinueNotice />
          </Suspense>
          {children}
        </div>
      </div>

      <p className="container pb-6 text-center text-xs text-white/60">
        Frontend-only demo for NCPOR, Ministry of Earth Sciences. Sessions stay in your browser; nothing is sent to a server.
      </p>
    </div>
  );
}
