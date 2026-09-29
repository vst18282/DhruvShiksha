import type { Station } from '@/types';

/** Station facts are illustrative demo values. Coordinates are approximate. */
export const STATIONS: Station[] = [
  {
    slug: 'maitri',
    name: 'Maitri',
    region: 'antarctica',
    location: 'Schirmacher Oasis, Dronning Maud Land, East Antarctica',
    lat: -70.77,
    lon: 11.73,
    established: 1989,
    elevationM: 117,
    art: 'station',
    description:
      'Maitri sits on the rocky Schirmacher Oasis, surrounded by freshwater lakes and the continental ice sheet. It is a year-round base for meteorology, geology, lake biology and upper-atmosphere studies.',
    facts: [
      { label: 'Wintering team (demo)', value: '~25 members' },
      { label: 'Summer capacity (demo)', value: '~65 members' },
      { label: 'Distance from coast', value: '~100 km' },
      { label: 'Nearest lakes', value: '100+ glacial lakes' },
    ],
    timeline: [
      { year: 1989, text: 'Station commissioned (demo timeline).' },
      { year: 2008, text: 'Upgraded meteorological observatory installed.' },
      { year: 2015, text: 'Energy-efficient living module added.' },
      { year: 2022, text: 'Automatic weather station network expanded.' },
    ],
  },
  {
    slug: 'bharati',
    name: 'Bharati',
    region: 'antarctica',
    location: 'Larsemann Hills, Prydz Bay, East Antarctica',
    lat: -69.41,
    lon: 76.19,
    established: 2012,
    elevationM: 35,
    art: 'station',
    description:
      'Bharati is a modern, container-built station on a promontory in the Larsemann Hills. Its coastal location suits studies of sea ice, ocean–ice interaction, penguin colonies, geology and geospace.',
    facts: [
      { label: 'Built with', value: 'Pre-fabricated shipping containers' },
      { label: 'Wintering team (demo)', value: '~24 members' },
      { label: 'Special focus', value: 'Coastal processes & geospace' },
      { label: 'Satellite ground station', value: 'Yes (demo)' },
    ],
    timeline: [
      { year: 2012, text: 'Station commissioned (demo timeline).' },
      { year: 2015, text: 'First Adélie colony census from Bharati.' },
      { year: 2020, text: 'Sea-ice monitoring buoy array deployed.' },
      { year: 2024, text: 'Magnetometer and all-sky camera upgraded.' },
    ],
  },
  {
    slug: 'himadri',
    name: 'Himadri',
    region: 'arctic',
    location: 'Ny-Ålesund, Svalbard, Norway',
    lat: 78.92,
    lon: 11.93,
    established: 2008,
    elevationM: 8,
    art: 'aurora',
    description:
      'Himadri is India’s Arctic research station in the international science village of Ny-Ålesund. Teams study glaciers, the Kongsfjorden fjord, aerosols and Arctic ecosystems.',
    facts: [
      { label: 'Latitude', value: '78.9° N' },
      { label: 'Research village', value: 'Ny-Ålesund (international)' },
      { label: 'Key site', value: 'Kongsfjorden' },
      { label: 'Season', value: 'Year-round campaigns (demo)' },
    ],
    timeline: [
      { year: 2008, text: 'Station opened (demo timeline).' },
      { year: 2014, text: 'Moored ocean observatory in Kongsfjorden.' },
      { year: 2019, text: 'Glacier mass-balance stake network expanded.' },
      { year: 2023, text: 'Aerosol monitoring lab upgraded.' },
    ],
  },
  {
    slug: 'himansh',
    name: 'Himansh',
    region: 'himalaya',
    location: 'Chandra basin, Lahaul–Spiti, Himachal Pradesh',
    lat: 32.41,
    lon: 77.61,
    established: 2016,
    elevationM: 4080,
    art: 'mountain',
    description:
      'Himansh is a high-altitude field station above 4,000 m in the Chandra basin. It supports glacier monitoring, meltwater hydrology and weather observations in the Himalaya — the “Third Pole”.',
    facts: [
      { label: 'Altitude', value: '~4,080 m' },
      { label: 'Glaciers monitored (demo)', value: '6' },
      { label: 'Season', value: 'May – October' },
      { label: 'Focus', value: 'Glaciers & water resources' },
    ],
    timeline: [
      { year: 2016, text: 'Field station established (demo timeline).' },
      { year: 2018, text: 'Discharge gauging station on the Chandra river.' },
      { year: 2021, text: 'Snow and black-carbon sampling programme.' },
      { year: 2025, text: 'Permafrost temperature boreholes installed.' },
    ],
  },
];

export const NCPOR_HQ = { name: 'NCPOR, Goa (HQ)', lat: 15.41, lon: 73.81 };
