'use client';

import * as React from 'react';
import { useId, useMemo } from 'react';
import type { ArtVariant } from '@/types';
import { cn, hashString, seededRandom } from '@/lib/utils';
import { imageForItem, imageForKey } from '@/lib/images';
import { findItem } from '@/lib/archive';
import { useUiStore } from '@/store/ui';

/** Real photo for a seed: page/station keys first, then archive items (matched by title). */
export function photoForSeed(seed: string): string | undefined {
  const keyed = imageForKey(seed);
  if (keyed) return keyed.src;
  const item = findItem(seed);
  return item ? imageForItem(item).src : undefined;
}

/**
 * PolarImage: shows a real photo when one is known for `seed` (an archive item id, a station slug
 * or a page key; see lib/images.ts), otherwise a deterministic procedural SVG illustration.
 * Pass `src` to force a specific image. Low-bandwidth mode always uses the lightweight SVG.
 */
interface PolarImageProps {
  variant?: ArtVariant;
  seed?: string;
  alt: string;
  className?: string;
  src?: string;
  /** Decorative images get aria-hidden and empty alt. */
  decorative?: boolean;
  /** Above-the-fold images load eagerly (e.g. page heroes). */
  priority?: boolean;
  children?: React.ReactNode;
}

const PALETTES: Record<ArtVariant, { sky: [string, string]; ground: [string, string]; accent: string }> = {
  aurora: { sky: ['#06142b', '#0B1F3A'], ground: ['#cfe6f7', '#8fbfe0'], accent: '#2DD4BF' },
  night: { sky: ['#030a18', '#10254a'], ground: ['#9fc3e0', '#5b86ad'], accent: '#8B5CF6' },
  ice: { sky: ['#9fd3f4', '#e8f4fd'], ground: ['#f5faff', '#bfe0f5'], accent: '#5BB5E8' },
  ocean: { sky: ['#7cc3ea', '#d9eefb'], ground: ['#1f5f95', '#0B1F3A'], accent: '#2DD4BF' },
  mountain: { sky: ['#f7c98b', '#fde7c7'], ground: ['#5b6b86', '#2b3a55'], accent: '#F59E0B' },
  station: { sky: ['#b8dcf5', '#f0f8ff'], ground: ['#f5faff', '#cde4f4'], accent: '#F59E0B' },
  penguin: { sky: ['#a9d6f2', '#eef7fe'], ground: ['#f5faff', '#d3e8f6'], accent: '#0B1F3A' },
  core: { sky: ['#0B1F3A', '#16365f'], ground: ['#bfe3fb', '#7fb8e0'], accent: '#5BB5E8' },
  ship: { sky: ['#8fc9ec', '#e4f2fc'], ground: ['#245f92', '#0f2f52'], accent: '#ef4444' },
};

function ridge(rand: () => number, baseY: number, amp: number, steps = 9): string {
  let d = `M0 ${baseY}`;
  for (let i = 1; i <= steps; i++) {
    const x = (800 / steps) * i;
    const y = baseY - rand() * amp;
    d += ` L${x.toFixed(0)} ${y.toFixed(0)}`;
  }
  return `${d} L800 500 L0 500 Z`;
}

export function PolarImage({ variant = 'ice', seed = 'polar', alt, className, src, decorative, priority, children }: PolarImageProps) {
  const uid = useId().replace(/:/g, '');
  const low = useUiStore((s) => s.lowBandwidth);
  const photo = useMemo(() => src ?? (low ? undefined : photoForSeed(seed)), [src, low, seed]);
  const p = PALETTES[variant];
  const art = useMemo(() => {
    const rand = seededRandom(hashString(seed + variant));
    const dark = variant === 'aurora' || variant === 'night' || variant === 'core';
    const stars = dark
      ? Array.from({ length: 40 }, () => ({ x: rand() * 800, y: rand() * 260, r: rand() * 1.4 + 0.3, o: rand() * 0.7 + 0.3 }))
      : [];
    const auroraBands = dark
      ? Array.from({ length: 3 }, (_, i) => {
          const y = 80 + i * 35 + rand() * 30;
          const c1 = 200 + rand() * 200;
          return `M-20 ${y} C ${c1} ${y - 80 - rand() * 60}, ${c1 + 250} ${y + 60}, 820 ${y - 40 - rand() * 40}`;
        })
      : [];
    const far = ridge(rand, 330, variant === 'mountain' ? 170 : 60, 11);
    const near = ridge(rand, 420, variant === 'mountain' ? 110 : 40, 7);
    const bergs =
      variant === 'ocean' || variant === 'ship'
        ? Array.from({ length: 3 }, () => ({ x: rand() * 700, w: 40 + rand() * 90, h: 20 + rand() * 40 }))
        : [];
    const penguins = variant === 'penguin' ? Array.from({ length: 7 }, () => ({ x: 120 + rand() * 560, y: 400 + rand() * 60, s: 0.7 + rand() * 0.6 })) : [];
    const layers = variant === 'core' ? Array.from({ length: 18 }, (_, i) => ({ y: 40 + i * 24, o: 0.25 + rand() * 0.6 })) : [];
    return { stars, auroraBands, far, near, bergs, penguins, layers, sunX: 150 + rand() * 500 };
  }, [seed, variant]);

  if (photo) {
    return (
      <div className={cn('relative overflow-hidden bg-muted', className)}>
        <img
          src={photo}
          alt={decorative ? '' : alt}
          aria-hidden={decorative || undefined}
          className="absolute inset-0 h-full w-full object-cover"
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          {...(priority ? { fetchPriority: 'high' as const } : {})}
        />
        {children}
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden bg-muted', className)}>
      <svg
        viewBox="0 0 800 500"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        role={decorative ? undefined : 'img'}
        aria-label={decorative ? undefined : alt}
        aria-hidden={decorative || undefined}
      >
        <defs>
          <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={p.sky[0]} />
            <stop offset="1" stopColor={p.sky[1]} />
          </linearGradient>
          <linearGradient id={`gnd-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={p.ground[0]} />
            <stop offset="1" stopColor={p.ground[1]} />
          </linearGradient>
          <linearGradient id={`aur-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2DD4BF" stopOpacity="0" />
            <stop offset="0.4" stopColor="#2DD4BF" stopOpacity="0.8" />
            <stop offset="0.7" stopColor="#8B5CF6" stopOpacity="0.7" />
            <stop offset="1" stopColor="#8B5CF6" stopOpacity="0" />
          </linearGradient>
          <filter id={`blur-${uid}`}>
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>
        <rect width="800" height="500" fill={`url(#sky-${uid})`} />
        {art.stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} />
        ))}
        {art.auroraBands.map((d, i) => (
          <path
            key={i}
            d={d}
            stroke={`url(#aur-${uid})`}
            strokeWidth={36 - i * 8}
            fill="none"
            filter={`url(#blur-${uid})`}
            className="motion-decor animate-aurora"
            style={{ animationDelay: `${i * 1.5}s` }}
          />
        ))}
        {(variant === 'mountain' || variant === 'ice' || variant === 'station') && (
          <circle cx={art.sunX} cy={variant === 'mountain' ? 140 : 110} r="38" fill="#fff" opacity="0.65" />
        )}
        {variant === 'core' ? (
          <g>
            <rect x="330" y="30" width="140" height="440" rx="14" fill={`url(#gnd-${uid})`} opacity="0.95" />
            {art.layers.map((l, i) => (
              <rect key={i} x="330" y={l.y} width="140" height="6" fill="#0B1F3A" opacity={l.o * 0.4} />
            ))}
          </g>
        ) : (
          <>
            <path d={art.far} fill={`url(#gnd-${uid})`} opacity="0.65" />
            <path d={art.near} fill={`url(#gnd-${uid})`} />
          </>
        )}
        {art.bergs.map((b, i) => (
          <path key={i} d={`M${b.x} 430 l${b.w * 0.3} -${b.h} l${b.w * 0.4} ${b.h * 0.3} l${b.w * 0.3} ${b.h * 0.7} Z`} fill="#f5faff" opacity="0.95" />
        ))}
        {variant === 'ship' && (
          <g transform="translate(470 400)">
            <path d="M0 0 h170 l-20 28 h-135 Z" fill="#b91c1c" />
            <rect x="40" y="-34" width="70" height="34" fill="#f5faff" />
            <rect x="60" y="-58" width="16" height="24" fill="#F59E0B" />
          </g>
        )}
        {variant === 'station' && (
          <g transform="translate(300 360)">
            <rect x="0" y="0" width="200" height="50" rx="4" fill="#F59E0B" />
            <rect x="12" y="12" width="20" height="14" fill="#0B1F3A" opacity="0.7" />
            <rect x="48" y="12" width="20" height="14" fill="#0B1F3A" opacity="0.7" />
            <rect x="84" y="12" width="20" height="14" fill="#0B1F3A" opacity="0.7" />
            <rect x="160" y="-40" width="4" height="40" fill="#0B1F3A" />
            <rect x="0" y="50" width="8" height="18" fill="#0B1F3A" />
            <rect x="192" y="50" width="8" height="18" fill="#0B1F3A" />
          </g>
        )}
        {art.penguins.map((pg, i) => (
          <g key={i} transform={`translate(${pg.x} ${pg.y}) scale(${pg.s})`}>
            <ellipse cx="0" cy="0" rx="10" ry="20" fill="#0B1F3A" />
            <ellipse cx="0" cy="4" rx="6" ry="14" fill="#fff" />
            <circle cx="0" cy="-20" r="7" fill="#0B1F3A" />
            <path d="M5 -20 l6 2 l-6 2 Z" fill="#F59E0B" />
          </g>
        ))}
      </svg>
      {children}
    </div>
  );
}
