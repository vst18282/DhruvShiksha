import { feature, mesh } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { FeatureCollection, Geometry, MultiLineString } from 'geojson';
import landTopo from 'world-atlas/land-110m.json';
import countriesTopo from 'world-atlas/countries-110m.json';

/** Local world geometry (no network). world-atlas ships Natural Earth 1:110m TopoJSON. */
type LandTopo = Topology<{ land: GeometryCollection }>;
type CountriesTopo = Topology<{ countries: GeometryCollection; land: GeometryCollection }>;

let _land: FeatureCollection<Geometry> | null = null;
let _countries: FeatureCollection<Geometry> | null = null;
let _borders: MultiLineString | null = null;

export function getLand(): FeatureCollection<Geometry> {
  if (!_land) {
    const t = landTopo as unknown as LandTopo;
    _land = feature(t, t.objects.land) as unknown as FeatureCollection<Geometry>;
  }
  return _land;
}

export function getCountries(): FeatureCollection<Geometry> {
  if (!_countries) {
    const t = countriesTopo as unknown as CountriesTopo;
    _countries = feature(t, t.objects.countries) as unknown as FeatureCollection<Geometry>;
  }
  return _countries;
}

export function getBorders(): MultiLineString {
  if (!_borders) {
    const t = countriesTopo as unknown as CountriesTopo;
    _borders = mesh(t, t.objects.countries, (a, b) => a !== b) as MultiLineString;
  }
  return _borders;
}
