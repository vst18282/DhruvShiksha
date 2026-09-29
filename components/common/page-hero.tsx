'use client';

import * as React from 'react';
import { IMAGE_LIBRARY, type ImageId } from '@/lib/images';
import { useUiStore } from '@/store/ui';
import { cn } from '@/lib/utils';

/**
 * Full-bleed page header used by the archive sections. It spans the whole width of the viewport
 * (so it is rendered outside the page container), carries an optional photograph behind a navy
 * gradient, and can show a cursive accent, a meta row and an action on the right.
 */
export function PageHero({
  eyebrow,
  title,
  script,
  description,
  image,
  action,
  meta,
  id,
  className,
}: {
  eyebrow?: string;
  title: string;
  /** Decorative cursive line printed after the title. */
  script?: string;
  description?: string;
  image?: ImageId;
  action?: React.ReactNode;
  meta?: React.ReactNode;
  id?: string;
  className?: string;
}) {
  const low = useUiStore((s) => s.lowBandwidth);
  return (
    <section className={cn('relative isolate overflow-hidden border-b border-white/10 bg-polar-navy text-white', className)}>
      {image && !low && (
        <img src={IMAGE_LIBRARY[image].src} alt="" aria-hidden className="absolute inset-0 -z-20 h-full w-full scale-105 object-cover opacity-80 blur-[1px]" />
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-polar-navy via-polar-navy/88 to-polar-navy/55" aria-hidden />
      <div className="absolute -right-20 -top-28 -z-10 h-72 w-72 rounded-full bg-polar-ice/25 blur-3xl" aria-hidden />
      <div className="absolute -bottom-24 left-1/3 -z-10 h-56 w-56 rounded-full bg-polar-teal/15 blur-3xl" aria-hidden />
      <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-polar-ice/70 to-transparent" aria-hidden />

      <div className="container relative py-9 md:py-12">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            {eyebrow && (
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-polar-ice">
                <span className="h-px w-8 bg-polar-ice/60" aria-hidden />
                {eyebrow}
              </p>
            )}
            <h1 id={id} className="mt-2.5 text-balance text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl">
              {title}
              {script && (
                <>
                  {' '}
                  <span className="font-script text-[1.15em] font-normal leading-none text-polar-teal">{script}</span>
                </>
              )}
            </h1>
            {description && <p className="mt-3 max-w-3xl text-[15px] leading-7 text-white/80">{description}</p>}
          </div>
          {action && <div className="shrink-0 lg:pb-1">{action}</div>}
        </div>
        {meta && <div className="mt-6 border-t border-white/15 pt-4">{meta}</div>}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-background/20" aria-hidden />
    </section>
  );
}

/** Small translucent chip for the hero meta row. */
export function HeroChip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[13px] font-medium text-white/90 backdrop-blur-sm', className)}>
      {children}
    </span>
  );
}
