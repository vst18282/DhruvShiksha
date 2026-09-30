'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';

/** Pages a visitor may open from the landing page without an account. */
const OPEN_PATHS = ['/', '/login', '/register'];

/** Static files (sitemap.xml, images, …) and Next internals are never gated. */
const isOpenPath = (pathname: string) => OPEN_PATHS.includes(pathname) || pathname.startsWith('/_next/') || /\.[a-z0-9]+$/i.test(pathname);

const loginUrl = (next: string) => `/login?next=${encodeURIComponent(next)}`;

/**
 * Everything behind the landing page is part of the signed-in portal. While the landing page is
 * mounted, any link a visitor follows into the portal (hero, cards, tools, footer…) is swapped
 * for the login screen, which returns them to that page once they have logged in or signed up.
 *
 * Returns `go(href)` for programmatic navigation (e.g. the search box) with the same rule.
 * This is a UX gate on a frontend-only demo, not an access-control boundary.
 */
export function useLandingGate() {
  const router = useRouter();

  const go = useCallback(
    (href: string) => {
      const url = new URL(href, window.location.href);
      if (useAuthStore.getState().user || url.origin !== window.location.origin || isOpenPath(url.pathname)) {
        router.push(href);
        return;
      }
      toast('Log in or sign up to continue', { description: 'That part of DhruvShiksha needs an account.' });
      router.push(loginUrl(url.pathname + url.search + url.hash));
    },
    [router],
  );

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // Primary clicks, or middle clicks (auxclick). Right-click must keep its context menu.
      if (e.type === 'click' ? e.button !== 0 : e.button !== 1) return;
      if (e.defaultPrevented || useAuthStore.getState().user) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || isOpenPath(url.pathname)) return;

      // Capture phase on the document runs before React's handlers, so next/link never navigates.
      e.preventDefault();
      e.stopPropagation();
      const dest = loginUrl(url.pathname + url.search + url.hash);
      if (e.type === 'auxclick' || e.ctrlKey || e.metaKey || e.shiftKey || a.target === '_blank') {
        window.open(dest, '_blank', 'noopener');
        return;
      }
      toast('Log in or sign up to continue', { description: 'That part of DhruvShiksha needs an account.' });
      router.push(dest);
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('auxclick', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('auxclick', onClick, true);
    };
  }, [router]);

  return go;
}
