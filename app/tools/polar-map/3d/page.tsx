import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PolarMapFeature } from '@/components/maps/polar-map-feature';
import { GlobeSkeleton } from '@/components/skeletons';

export const metadata: Metadata = { title: 'Polar Globe (3D)', description: 'Offline react-globe.gl view of India’s polar stations, expeditions and illustrative sea ice.' };

export default function Page() {
  return <Suspense fallback={<div className="container py-8"><GlobeSkeleton className="min-h-[560px] aspect-auto" /></div>}><PolarMapFeature mode="3d" /></Suspense>;
}
