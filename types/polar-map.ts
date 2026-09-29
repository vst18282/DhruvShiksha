import type { ArtVariant, Region } from '@/types';

export type PolarPointId = 'maitri' | 'bharati' | 'dakshin-gangotri' | 'himadri' | 'himansh' | 'ncpor-goa';
export type PolarPointType = 'station' | 'headquarters' | 'historic' | 'field-site';
export type PolarPointStatus = 'active' | 'historic' | 'seasonal';
export type PolarProjection = 'south' | 'north' | 'himalaya' | 'world';
export type PolarLayer = 'points' | 'tracks' | 'seaIce' | 'arcs';

export interface PolarClimateSnapshot {
  label: string;
  value: string;
  note: string;
  series: number[];
}

export interface PolarPointCounts {
  expeditions: number;
  reports: number;
  datasets: number;
  photos: number;
}

export interface PolarPoint {
  id: PolarPointId;
  name: string;
  type: PolarPointType;
  status: PolarPointStatus;
  region: Region | 'india';
  coordinates: { lat: number; lng: number };
  established: number;
  tagline: string;
  summary: string;
  facts: { label: string; value: string }[];
  counts: PolarPointCounts;
  climate: PolarClimateSnapshot;
  art: ArtVariant;
  imageSeed: string;
  links: {
    overview?: string;
    expeditions: { label: string; href: string }[];
    data: { label: string; href: string }[];
    media: { label: string; href: string }[];
  };
}

export interface PolarTrack {
  id: string;
  name: string;
  region: Region;
  year: number;
  coordinates: [number, number][]; // [longitude, latitude]
  color: string;
}

export interface PolarArc {
  id: string;
  from: PolarPointId;
  to: PolarPointId;
  color: string;
}
