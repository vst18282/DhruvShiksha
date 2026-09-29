'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/misc';
import { useUiStore } from '@/store/ui';
import { useHydration } from '@/store/hydration';
import { usePageContextStore } from '@/store/page-context';
import { rehydrateAll } from '@/store/rehydrate';

/** Rehydrates persisted zustand stores after mount (avoids SSR mismatch). */
function StoreHydrator() {
  const setHydrated = useHydration((s) => s.setHydrated);
  useEffect(() => {
    rehydrateAll().then(setHydrated);
  }, [setHydrated]);
  return null;
}

/** Applies accessibility / bandwidth settings to <html>. */
function SettingsApplier() {
  const { textSize, highContrast, lowBandwidth, lang } = useUiStore();
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.textsize = textSize;
    el.classList.toggle('hc', highContrast);
    el.classList.toggle('lowbw', lowBandwidth);
    el.lang = lang;
  }, [textSize, highContrast, lowBandwidth, lang]);
  return null;
}

/** Resets chatbot page context on route change (detail pages re-register on mount). */
function PageContextReset() {
  const pathname = usePathname();
  const set = usePageContextStore((s) => s.set);
  const prev = React.useRef(pathname);
  useEffect(() => {
    if (prev.current !== pathname) {
      prev.current = pathname;
      set(null);
    }
  }, [pathname, set]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 } },
      }),
  );
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={client}>
        <TooltipProvider delayDuration={200}>
          <StoreHydrator />
          <SettingsApplier />
          <PageContextReset />
          {children}
          <Toaster richColors closeButton position="bottom-left" toastOptions={{ className: 'font-sans' }} />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
