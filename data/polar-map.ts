import { EXPEDITIONS } from '@/data/expeditions';
import { REGION_META } from '@/lib/constants';
import type { PolarArc, PolarPoint, PolarPointId, PolarTrack } from '@/types/polar-map';

/**
 * Approximate, illustrative locations for the Polar Map. Every number and count is demo data.
 * Add new records here; docs/polar-map-data.md describes the point and track workflow.
 */
export const POLAR_POINTS: PolarPoint[] = [
  {
    id: 'maitri',
    name: 'Maitri Station',
    type: 'station',
    status: 'active',
    region: 'antarctica',
    coordinates: { lat: -70.77, lng: 11.73 },
    established: 1989,
    tagline: 'A year-round laboratory in the Schirmacher Oasis.',
    summary:
      'Maitri is India’s long-running Antarctic base among the ice-free hills and freshwater lakes of the Schirmacher Oasis. Teams work on atmosphere, geology, limnology and long-term environmental observations.',
    facts: [
      { label: 'Elevation', value: '117 m' },
      { label: 'Winter team', value: '~25 (demo)' },
      { label: 'Setting', value: 'Schirmacher Oasis' },
      { label: 'Focus', value: 'Atmosphere & lakes' },
    ],
    counts: { expeditions: 7, reports: 18, datasets: 23, photos: 96 },
    climate: { label: 'Monthly air temperature', value: '−18.4 °C', note: 'Illustrative annual profile', series: [-9, -13, -18, -23, -27, -28, -29, -27, -24, -18, -12, -9] },
    art: 'station',
    imageSeed: 'maitri',
    links: {
      overview: '/stations/maitri',
      expeditions: [{ label: '39th Indian Scientific Expedition', href: '/expeditions/isea-39' }],
      data: [{ label: 'Ozone soundings at Maitri', href: '/data/ds-ozone-maitri' }],
      media: [{ label: 'Maitri station gallery', href: '/gallery?station=maitri' }],
    },
  },
  {
    id: 'bharati',
    name: 'Bharati Station',
    type: 'station',
    status: 'active',
    region: 'antarctica',
    coordinates: { lat: -69.41, lng: 76.19 },
    established: 2012,
    tagline: 'Coastal science at the edge of Prydz Bay.',
    summary:
      'Bharati is India’s modern coastal Antarctic station in the Larsemann Hills. Its position supports work on ocean–ice exchange, sea ice, geology, biology and upper-atmosphere processes.',
    facts: [
      { label: 'Elevation', value: '35 m' },
      { label: 'Winter team', value: '~24 (demo)' },
      { label: 'Setting', value: 'Larsemann Hills' },
      { label: 'Focus', value: 'Coast & geospace' },
    ],
    counts: { expeditions: 6, reports: 16, datasets: 27, photos: 112 },
    climate: { label: 'Monthly air temperature', value: '−14.1 °C', note: 'Illustrative annual profile', series: [-5, -8, -13, -18, -21, -22, -23, -22, -19, -14, -8, -5] },
    art: 'station',
    imageSeed: 'bharati',
    links: {
      overview: '/stations/bharati',
      expeditions: [{ label: '43rd Indian Scientific Expedition', href: '/expeditions/isea-43' }],
      data: [{ label: 'Antarctic sea-ice extent', href: '/data/ds-antarctic-sea-ice-extent' }],
      media: [{ label: 'Bharati station gallery', href: '/gallery?station=bharati' }],
    },
  },
  {
    id: 'dakshin-gangotri',
    name: 'Dakshin Gangotri',
    type: 'historic',
    status: 'historic',
    region: 'antarctica',
    coordinates: { lat: -70.08, lng: 12.0 },
    established: 1983,
    tagline: 'India’s first Antarctic station, preserved in the ice.',
    summary:
      'Dakshin Gangotri established India’s permanent scientific presence in Antarctica. The station was later decommissioned after ice accumulation, and its legacy continues through India’s newer polar bases.',
    facts: [
      { label: 'Role', value: 'First Indian station' },
      { label: 'Status', value: 'Decommissioned' },
      { label: 'Setting', value: 'Queen Maud Land' },
      { label: 'Legacy', value: 'Historic site' },
    ],
    counts: { expeditions: 3, reports: 8, datasets: 4, photos: 31 },
    climate: { label: 'Illustrative snow accumulation', value: '0.8 m/yr', note: 'Demo profile, not measured', series: [3, 4, 5, 7, 9, 11, 12, 11, 9, 7, 5, 4] },
    art: 'ice',
    imageSeed: 'station-snow',
    links: {
      expeditions: [{ label: 'Browse early expedition stories', href: '/expeditions' }],
      data: [{ label: 'Antarctic archive', href: '/explore?q=Dakshin%20Gangotri' }],
      media: [{ label: 'Historic polar media', href: '/gallery' }],
    },
  },
  {
    id: 'himadri',
    name: 'Himadri Station',
    type: 'station',
    status: 'active',
    region: 'arctic',
    coordinates: { lat: 78.92, lng: 11.93 },
    established: 2008,
    tagline: 'India’s observatory in the international Arctic village.',
    summary:
      'Himadri operates from Ny-Ålesund in Svalbard, where international teams observe Arctic glaciers, fjords, aerosols and ecosystems. Its position connects atmospheric, ocean and cryosphere records.',
    facts: [
      { label: 'Elevation', value: '8 m' },
      { label: 'Village', value: 'Ny-Ålesund' },
      { label: 'Key site', value: 'Kongsfjorden' },
      { label: 'Focus', value: 'Arctic systems' },
    ],
    counts: { expeditions: 4, reports: 13, datasets: 19, photos: 84 },
    climate: { label: 'Monthly air temperature', value: '−5.7 °C', note: 'Illustrative annual profile', series: [-13, -14, -12, -8, -2, 4, 7, 6, 2, -4, -9, -12] },
    art: 'aurora',
    imageSeed: 'himadri',
    links: {
      overview: '/stations/himadri',
      expeditions: [{ label: 'Arctic Aerosol & Sea-Ice Campaign', href: '/expeditions/arc-2023' }],
      data: [{ label: 'Kongsfjorden observations', href: '/explore?q=Kongsfjorden' }],
      media: [{ label: 'Arctic media', href: '/gallery?station=himadri' }],
    },
  },
  {
    id: 'himansh',
    name: 'Himansh Station',
    type: 'field-site',
    status: 'seasonal',
    region: 'himalaya',
    coordinates: { lat: 32.41, lng: 77.61 },
    established: 2016,
    tagline: 'A high-altitude field station in the Chandra basin.',
    summary:
      'Himansh supports seasonal glacier, snow, permafrost and meltwater observations above 4,000 metres in Lahaul–Spiti. The field site helps connect Himalayan cryosphere change to downstream water resources.',
    facts: [
      { label: 'Elevation', value: '4,080 m' },
      { label: 'Season', value: 'May–October' },
      { label: 'Basin', value: 'Chandra' },
      { label: 'Focus', value: 'Glaciers & water' },
    ],
    counts: { expeditions: 4, reports: 11, datasets: 21, photos: 73 },
    climate: { label: 'Monthly air temperature', value: '−1.8 °C', note: 'Illustrative high-altitude profile', series: [-16, -14, -10, -5, 0, 5, 8, 7, 3, -3, -9, -14] },
    art: 'mountain',
    imageSeed: 'himansh',
    links: {
      overview: '/stations/himansh',
      expeditions: [{ label: 'Spiti Permafrost Survey', href: '/expeditions/him-2025' }],
      data: [{ label: 'Rock glaciers and permafrost', href: '/data/ds-spiti-permafrost' }],
      media: [{ label: 'Himalayan media', href: '/gallery?station=himansh' }],
    },
  },
  {
    id: 'ncpor-goa',
    name: 'NCPOR Headquarters',
    type: 'headquarters',
    status: 'active',
    region: 'india',
    coordinates: { lat: 15.41, lng: 73.81 },
    established: 1998,
    tagline: 'The coordinating home of India’s polar programme.',
    summary:
      'NCPOR headquarters in Goa coordinates expeditions, logistics, laboratories and scientific data stewardship. The arcs on this map begin here and connect the programme to every polar station.',
    facts: [
      { label: 'Location', value: 'Vasco da Gama, Goa' },
      { label: 'Role', value: 'Programme coordination' },
      { label: 'Facilities', value: 'Labs & repositories' },
      { label: 'Coverage', value: 'Three polar regions' },
    ],
    counts: { expeditions: 20, reports: 64, datasets: 58, photos: 210 },
    climate: { label: 'Monthly air temperature', value: '27.1 °C', note: 'Illustrative coastal profile', series: [26, 27, 28, 29, 30, 28, 27, 27, 27, 28, 28, 27] },
    art: 'ocean',
    imageSeed: 'earth-ocean',
    links: {
      overview: '/about',
      expeditions: [{ label: 'All expeditions', href: '/expeditions' }],
      data: [{ label: 'Data catalogue', href: '/data' }],
      media: [{ label: 'Media gallery', href: '/gallery' }],
    },
  },
];

const TRACK_IDS = ['isea-28', 'isea-31', 'arc-2014', 'him-2016', 'soe-2024', 'him-2025'];
export const POLAR_TRACKS: PolarTrack[] = EXPEDITIONS.filter((e) => TRACK_IDS.includes(e.id)).map((e) => ({
  id: e.id,
  name: e.name,
  region: e.region,
  year: e.year,
  coordinates: e.track,
  color: REGION_META[e.region].color,
}));

export const POLAR_ARCS: PolarArc[] = POLAR_POINTS.filter((p) => p.id !== 'ncpor-goa').map((p) => ({
  id: `goa-${p.id}`,
  from: 'ncpor-goa',
  to: p.id,
  color: p.region === 'india' ? '#F59E0B' : REGION_META[p.region].color,
}));

export const POLAR_POINT_BY_ID = Object.fromEntries(POLAR_POINTS.map((p) => [p.id, p])) as Record<PolarPointId, PolarPoint>;
