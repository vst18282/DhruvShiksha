'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PolarLayer, PolarPointId, PolarProjection } from '@/types/polar-map';

export type PolarLayers = Record<PolarLayer, boolean>;

interface PolarMapState {
  projection: PolarProjection;
  year: number;
  layers: PolarLayers;
  selectedId: PolarPointId | null;
  setProjection: (projection: PolarProjection) => void;
  setYear: (year: number) => void;
  setLayer: (layer: PolarLayer, visible: boolean) => void;
  setSelected: (selectedId: PolarPointId | null) => void;
  reset: () => void;
}

const DEFAULT_LAYERS: PolarLayers = { points: true, tracks: true, seaIce: true, arcs: true };
const initial = { projection: 'south' as PolarProjection, year: 2025, layers: DEFAULT_LAYERS, selectedId: null };

/** Shared durable state used by both the Leaflet map and react-globe.gl globe. */
export const usePolarMapStore = create<PolarMapState>()(
  persist(
    (set) => ({
      ...initial,
      setProjection: (projection) => set({ projection }),
      setYear: (year) => set({ year: Math.max(2008, Math.min(2025, Math.round(year))) }),
      setLayer: (layer, visible) => set((s) => ({ layers: { ...s.layers, [layer]: visible } })),
      setSelected: (selectedId) => set({ selectedId }),
      reset: () => set({ ...initial, layers: { ...DEFAULT_LAYERS } }),
    }),
    {
      name: 'pv-polar-map',
      skipHydration: true,
      partialize: (s) => ({ projection: s.projection, year: s.year, layers: s.layers, selectedId: s.selectedId }),
    },
  ),
);
