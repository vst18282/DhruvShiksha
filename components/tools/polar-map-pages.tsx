'use client';

import dynamic from 'next/dynamic';
import { ToolLayout, type ToolScience } from './tool-layout';
import { MapSwitch } from './map-switch';
import { MapSkeleton } from '@/components/skeletons';
import { GlobeView } from '@/components/maps/globe-view';

const PolarMap2D = dynamic(() => import('@/components/maps/polar-map-2d').then((m) => m.PolarMap2D), { ssr: false, loading: () => <MapSkeleton /> });

const SCIENCE: ToolScience = {
  expert:
    'Polar regions are poorly represented by cylindrical projections: Mercator stretches high latitudes to infinity. Polar stereographic projections (conformal, true-scale at a standard parallel) are the standard for sea-ice products such as passive-microwave concentration grids. The demo sea-ice edge here is a parametric contour, not a satellite-derived 15% concentration isoline.',
  general:
    'Flat maps always distort a round Earth. Near the poles the usual world map makes Antarctica look enormous, so polar scientists use “polar” projections that look straight down on the pole. The shaded ring shows a demo sea-ice edge that shifts with the year slider, and the lines trace where expedition ships and teams travelled.',
  class8:
    'Imagine looking at the Earth from right above the South Pole — that is what the polar map shows. The pins are India’s research stations, the coloured lines are the routes our teams took, and the white ring is floating sea ice (demo).',
};

const RELATED = [
  { label: 'Year-wise expedition stream', href: '/expeditions' },
  { label: 'Bharati station', href: '/stations/bharati' },
  { label: 'Antarctic sea-ice extent dataset', href: '/data/ds-antarctic-sea-ice-extent' },
  { label: 'Satellite & ice data tool', href: '/tools/satellite' },
];

export function PolarMap2DPage() {
  return (
    <ToolLayout
      title="Polar Map (2D)"
      intro="Explore India’s polar stations, expedition tracks, sea ice and Himalayan glaciers on polar projections — all drawn locally from open Natural Earth geometry."
      howTo={[
        'Pick a projection: South Polar, North Polar, Third Pole (Himalaya) or World.',
        'Drag to pan, scroll or use +/− to zoom; arrow keys work when the map is focused.',
        'Move the year slider or press Play to watch expeditions accumulate from 2008 to 2025.',
        'Click a station pin to open its expeditions, reports, datasets and photos.',
        'Toggle layers on the right; open “Table of points” for a screen-reader friendly list.',
      ]}
      science={SCIENCE}
      glossary={['sea-ice-extent', 'fast-ice', 'third-pole', 'glacier-snout']}
      related={RELATED}
    >
      <MapSwitch />
      <PolarMap2D />
    </ToolLayout>
  );
}

export function PolarMap3DPage() {
  return (
    <ToolLayout
      title="Polar Globe (3D)"
      intro="Spin a 3D Earth, fly to Antarctica, the Arctic or the Himalaya, and follow arcs from NCPOR in Goa to every station."
      howTo={[
        'Drag to rotate the globe and scroll to zoom. Toggle auto-rotate below.',
        'Use the “Fly to” buttons to jump to a polar region.',
        'Hover a pulsing marker for a tooltip; click it for the station panel.',
        'Switch to night mode, and toggle expedition tracks and arcs from Goa.',
        'In low-bandwidth mode (or without WebGL) the 2D map is shown instead.',
      ]}
      science={{
        expert: 'The globe uses an equirectangular texture wrapped on a UV sphere; lat/lon are mapped to Cartesian coordinates with φ = 90° − lat and θ = lon + 180°. Arcs are quadratic Bézier curves lifted proportionally to chord length; tracks are piecewise-normalised linear interpolations (approximate great circles).',
        general: 'A globe avoids the distortion of flat maps, so distances between Goa and the poles look right. The glowing arcs connect the headquarters to each station, and the thin lines show demo expedition routes.',
        class8: 'This is a digital globe you can spin! The dots are India’s stations, the glowing lines show the journey from Goa, and the thin lines are the paths ships took (demo).',
      }}
      glossary={['third-pole', 'aurora']}
      related={RELATED}
    >
      <MapSwitch />
      <GlobeView />
    </ToolLayout>
  );
}
