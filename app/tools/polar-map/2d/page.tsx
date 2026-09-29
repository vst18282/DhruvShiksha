import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PolarMapFeature } from '@/components/maps/polar-map-feature';
import { MapSkeleton } from '@/components/skeletons';

export const metadata: Metadata = { title: 'Polar Map (2D)', description: 'Offline Leaflet map of India’s polar stations, expeditions and illustrative sea ice.' };

export default function Page() {
  return <Suspense fallback={<div className="container py-8"><MapSkeleton className="min-h-[560px] aspect-auto" /></div>}><PolarMapFeature mode="2d" /></Suspense>;
}
