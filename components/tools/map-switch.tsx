'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Globe2, Map } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Segmented control that switches between the separate 2D map and 3D globe routes. */
export function MapSwitch() {
  const p = usePathname();
  const items = [
    { href: '/tools/polar-map/2d', label: '2D map', icon: Map },
    { href: '/tools/polar-map/3d', label: '3D globe', icon: Globe2 },
  ];
  return (
    <nav aria-label="Map mode" className="mb-4 inline-flex rounded-md bg-muted p-1">
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={p === i.href ? 'page' : undefined} className={cn('inline-flex h-8 items-center gap-1.5 rounded-sm px-3 text-sm font-medium text-muted-foreground', p === i.href && 'bg-background text-foreground shadow-sm')}>
          <i.icon className="h-4 w-4" aria-hidden /> {i.label}
        </Link>
      ))}
    </nav>
  );
}
