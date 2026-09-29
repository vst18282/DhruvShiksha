'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wordmark } from './wordmark';
import { FOOTER_LINKS } from '@/lib/nav';
import { useT } from '@/lib/i18n';
import { DemoBadge } from '@/components/common';
import { cn } from '@/lib/utils';

export function SiteFooter() {
  const t = useT();
  const pathname = usePathname();
  const compact = pathname.startsWith('/dashboard') || pathname.startsWith('/studio') || pathname.startsWith('/upload');
  return (
    <footer className={cn('border-t bg-card', compact && 'pb-16 lg:pb-0')} role="contentinfo">
      {!compact && (
        <div className="container grid gap-10 py-12 md:grid-cols-[1.3fr_repeat(3,1fr)]">
          <div>
            <Wordmark />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">{t('footer.tagline')}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              A demonstration portal concept for the National Centre for Polar and Ocean Research (NCPOR), Goa — Ministry of Earth Sciences.
            </p>
          </div>
          {FOOTER_LINKS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-sm font-semibold">{col.title}</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-muted-foreground hover:text-foreground hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      )}
      <div className="border-t">
        <div className="container flex flex-col items-center justify-between gap-2 py-4 text-xs text-muted-foreground sm:flex-row">
          <p>© 2026 PolarVerse concept · All content is fictional demo data and not real scientific findings.</p>
          <div className="flex items-center gap-3">
            <Link href="/about#accessibility" className="hover:underline">
              Accessibility
            </Link>
            <Link href="/sitemap.xml" className="hover:underline">
              Sitemap
            </Link>
            <DemoBadge />
          </div>
        </div>
      </div>
    </footer>
  );
}
