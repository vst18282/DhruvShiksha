import type { Expedition, Region, StationSlug, TeamMember, ArtVariant, Discipline } from '@/types';
import { seededRandom } from '@/lib/utils';

/**
 * ~20 fictional demo expeditions across 2008–2025.
 * Numbers, dates, people and highlights are illustrative only.
 */
const GOA: [number, number] = [73.81, 15.41];
const CAPE_TOWN: [number, number] = [18.42, -33.92];
const MAURITIUS: [number, number] = [57.5, -20.2];
const MAITRI: [number, number] = [11.73, -70.77];
const BHARATI: [number, number] = [76.19, -69.41];
const OSLO: [number, number] = [10.75, 59.91];
const TROMSO: [number, number] = [18.95, 69.65];
const NY_ALESUND: [number, number] = [11.93, 78.92];
const DELHI: [number, number] = [77.21, 28.61];
const MANALI: [number, number] = [77.19, 32.24];
const HIMANSH: [number, number] = [77.61, 32.41];

const TRACKS: Record<string, [number, number][]> = {
  maitri: [GOA, [60, -5], [35, -25], CAPE_TOWN, [15, -50], [12, -65], MAITRI],
  bharati: [GOA, [70, -10], MAURITIUS, [62, -40], [70, -58], [74, -66], BHARATI],
  himadri: [DELHI, [45, 45], OSLO, TROMSO, [15, 75], NY_ALESUND],
  himansh: [DELHI, [77.0, 30.3], MANALI, [77.4, 32.35], HIMANSH],
  southern_ocean: [GOA, [68, -5], MAURITIUS, [57.5, -40], [57.5, -52], [65, -60], [80, -55], [78, -35], [75, -10], GOA],
  indian_ocean: [GOA, [70, 5], [72, -5], [80, -10], [88, -2], [85, 8], [80.3, 13.1]],
};

const FIRST = ['Anil', 'Priya', 'Rahul', 'Sneha', 'Kiran', 'Deepa', 'Arjun', 'Kavya', 'Sanjay', 'Neha', 'Rohan', 'Ishita', 'Vivek', 'Lakshmi', 'Manoj', 'Pooja', 'Tenzin', 'Ayesha', 'Nikhil', 'Ritu'];
const LAST = ['Sharma', 'Iyer', 'Das', 'Patil', 'Nair', 'Gupta', 'Singh', 'Rao', 'Bhat', 'Joshi', 'Mehta', 'Reddy', 'Negi', 'Khan', 'Pillai', 'Sen'];
const ROLES = ['Glaciologist', 'Oceanographer', 'Meteorologist', 'Biologist', 'Geologist', 'Atmospheric scientist', 'Medical officer', 'Communications engineer', 'Logistics lead', 'Field assistant'];
const INSTITUTES = ['NCPOR Goa (demo)', 'Partner University (demo)', 'IMD (demo)', 'Survey partner (demo)', 'Defence logistics (demo)', 'Geological institute (demo)'];

function team(seed: number, size: number): TeamMember[] {
  const r = seededRandom(seed);
  return Array.from({ length: Math.min(size, 10) }, (_, i) => ({
    name: `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`,
    role: i === 0 ? 'Expedition leader' : ROLES[Math.floor(r() * ROLES.length)],
    institute: INSTITUTES[Math.floor(r() * INSTITUTES.length)],
  }));
}

interface Row {
  id: string;
  number: string;
  name: string;
  region: Region;
  station?: StationSlug;
  track: keyof typeof TRACKS;
  start: string;
  end: string;
  teamSize: number;
  discipline: Discipline;
  vessel?: string;
  art: ArtVariant;
  objectives: string[];
  highlights: string[];
  tags: string[];
}

const ROWS: Row[] = [
  { id: 'isea-28', number: '28th ISEA', name: '28th Indian Scientific Expedition to Antarctica', region: 'antarctica', station: 'maitri', track: 'maitri', start: '2008-11-20', end: '2009-03-30', teamSize: 72, discipline: 'atmospheric_science', vessel: 'MV Polar Demo', art: 'station', objectives: ['Ozone and UV monitoring', 'Lake sampling in Schirmacher Oasis', 'Station resupply'], highlights: ['Daily ozone soundings through the spring ozone-hole season', 'Resupply of 1,200 t of cargo (demo)'], tags: ['ozone', 'maitri', 'resupply'] },
  { id: 'arc-2008', number: 'Arctic-I', name: 'First Indian Arctic Campaign at Himadri', region: 'arctic', station: 'himadri', track: 'himadri', start: '2008-06-10', end: '2008-09-15', teamSize: 12, discipline: 'biology', art: 'aurora', objectives: ['Set up Himadri laboratory', 'Phytoplankton sampling in Kongsfjorden'], highlights: ['First season of plankton time-series (demo)', 'Laboratory commissioned'], tags: ['himadri', 'kongsfjorden', 'plankton'] },
  { id: 'isea-30', number: '30th ISEA', name: '30th Indian Scientific Expedition to Antarctica', region: 'antarctica', station: 'maitri', track: 'maitri', start: '2010-11-18', end: '2011-03-28', teamSize: 68, discipline: 'biology', vessel: 'MV Polar Demo', art: 'ice', objectives: ['Limnology of oasis lakes', 'Geological mapping', 'Meteorology'], highlights: ['Microbial mats sampled from 18 lakes (demo)', 'New geological map sheet'], tags: ['lakes', 'schirmacher', 'microbes'] },
  { id: 'soe-2011', number: 'SOE-3', name: 'Southern Ocean Expedition 2011', region: 'southern_ocean', track: 'southern_ocean', start: '2011-01-05', end: '2011-02-25', teamSize: 38, discipline: 'oceanography', vessel: 'RV Himsagar (demo)', art: 'ship', objectives: ['Map Southern Ocean fronts', 'CTD profiling to 2,000 m', 'Plankton nets'], highlights: ['62 CTD stations along 57.5° E (demo)', 'Subtropical and polar fronts located'], tags: ['fronts', 'sst', 'ctd'] },
  { id: 'isea-31', number: '31st ISEA', name: '31st Indian Scientific Expedition to Antarctica', region: 'antarctica', station: 'bharati', track: 'bharati', start: '2011-11-25', end: '2012-04-02', teamSize: 90, discipline: 'geology', vessel: 'MV Polar Demo', art: 'station', objectives: ['Commission Bharati station', 'Geology of Larsemann Hills'], highlights: ['Bharati station commissioned (demo)', 'Rock samples from 40 outcrops'], tags: ['bharati', 'geology', 'larsemann hills'] },
  { id: 'him-2013', number: 'HIM-1', name: 'Chandra Basin Glacier Survey 2013', region: 'himalaya', track: 'himansh', start: '2013-06-01', end: '2013-09-30', teamSize: 14, discipline: 'glaciology', art: 'mountain', objectives: ['Glacier snout mapping', 'Install mass-balance stakes'], highlights: ['Six glaciers mapped with GPS (demo)', 'Baseline for glacier retreat study'], tags: ['chandra', 'glacier', 'retreat'] },
  { id: 'arc-2014', number: 'Arctic-VII', name: 'Kongsfjorden Ocean Observatory Campaign', region: 'arctic', station: 'himadri', track: 'himadri', start: '2014-07-01', end: '2014-09-20', teamSize: 10, discipline: 'oceanography', art: 'ocean', objectives: ['Deploy moored observatory', 'Water-column profiling'], highlights: ['Year-round mooring deployed in Kongsfjorden (demo)', 'Atlantic water signal recorded'], tags: ['mooring', 'kongsfjorden', 'atlantic water'] },
  { id: 'isea-34', number: '34th ISEA', name: '34th Indian Scientific Expedition to Antarctica', region: 'antarctica', station: 'bharati', track: 'bharati', start: '2014-11-22', end: '2015-03-25', teamSize: 84, discipline: 'biology', vessel: 'MV Polar Demo', art: 'penguin', objectives: ['Adélie penguin census', 'Coastal ecology', 'Sea-ice observations'], highlights: ['First Adélie census from Bharati (demo)', 'Drone photo-counts of 3 colonies'], tags: ['penguin', 'adélie', 'census'] },
  { id: 'him-2016', number: 'HIM-4', name: 'Himansh Station Establishment Campaign', region: 'himalaya', station: 'himansh', track: 'himansh', start: '2016-05-15', end: '2016-10-10', teamSize: 18, discipline: 'glaciology', art: 'mountain', objectives: ['Set up Himansh field station', 'Meltwater discharge gauging'], highlights: ['Himansh station established (demo)', 'First season of discharge data'], tags: ['himansh', 'meltwater', 'hydrology'] },
  { id: 'soe-2017', number: 'SOE-9', name: 'Southern Ocean Krill Survey 2017', region: 'southern_ocean', track: 'southern_ocean', start: '2017-01-10', end: '2017-03-05', teamSize: 42, discipline: 'biology', vessel: 'RV Himsagar (demo)', art: 'ship', objectives: ['Krill and zooplankton net tows', 'Acoustic biomass survey'], highlights: ['Krill swarms mapped acoustically (demo)', '120 net tows completed'], tags: ['krill', 'zooplankton', 'food web'] },
  { id: 'isea-37', number: '37th ISEA', name: '37th Indian Scientific Expedition to Antarctica', region: 'antarctica', station: 'maitri', track: 'maitri', start: '2017-11-28', end: '2018-03-30', teamSize: 76, discipline: 'glaciology', vessel: 'MV Polar Demo', art: 'core', objectives: ['Shallow ice-core drilling', 'Emperor penguin observations', 'Meteorology'], highlights: ['110 m ice core recovered (demo)', 'Emperor penguins sighted on fast ice'], tags: ['ice core', 'emperor penguin', 'dronning maud land'] },
  { id: 'arc-2019', number: 'Arctic-XII', name: 'Svalbard Glacier Mass-Balance Campaign', region: 'arctic', station: 'himadri', track: 'himadri', start: '2019-04-20', end: '2019-09-30', teamSize: 11, discipline: 'glaciology', art: 'ice', objectives: ['Stake and snow-pit measurements', 'GPR ice-thickness survey'], highlights: ['Negative mass balance for 5th straight year (demo)', 'GPR survey of 12 km'], tags: ['mass balance', 'svalbard', 'glacier'] },
  { id: 'isea-39', number: '39th ISEA', name: '39th Indian Scientific Expedition to Antarctica', region: 'antarctica', station: 'bharati', track: 'bharati', start: '2019-11-20', end: '2020-03-15', teamSize: 70, discipline: 'glaciology', vessel: 'MV Polar Demo', art: 'ice', objectives: ['Sea-ice thickness monitoring', 'Glacier ablation stakes near Bharati', 'Resupply'], highlights: ['Sea-ice buoy array deployed (demo)', 'Early fast-ice break-up recorded'], tags: ['sea ice', 'ablation', 'bharati'] },
  { id: 'ioc-2021', number: 'IOC-2', name: 'Indian Ocean Heat Content Cruise 2021', region: 'indian_ocean', track: 'indian_ocean', start: '2021-03-01', end: '2021-04-10', teamSize: 30, discipline: 'oceanography', vessel: 'RV Himsagar (demo)', art: 'ocean', objectives: ['Upper-ocean heat content', 'Argo float deployment'], highlights: ['15 Argo floats deployed (demo)', 'Warm anomaly mapped south of equator'], tags: ['monsoon', 'ocean heat', 'argo'] },
  { id: 'him-2021', number: 'HIM-9', name: 'Himalayan Snow & Black Carbon Campaign', region: 'himalaya', station: 'himansh', track: 'himansh', start: '2021-05-10', end: '2021-10-05', teamSize: 16, discipline: 'atmospheric_science', art: 'mountain', objectives: ['Snow albedo and impurities', 'Aerosol sampling'], highlights: ['Black carbon measured on 4 glaciers (demo)', 'Albedo drop linked to dust events'], tags: ['black carbon', 'snow', 'albedo'] },
  { id: 'isea-41', number: '41st ISEA', name: '41st Indian Scientific Expedition to Antarctica', region: 'antarctica', station: 'maitri', track: 'maitri', start: '2021-11-25', end: '2022-03-28', teamSize: 64, discipline: 'meteorology', vessel: 'MV Polar Demo', art: 'station', objectives: ['Weather station network', 'Soil microbiology', 'Station upkeep'], highlights: ['Six new automatic weather stations (demo)', 'Cold-adapted bacteria isolated'], tags: ['weather', 'microbes', 'maitri'] },
  { id: 'arc-2023', number: 'Arctic-XVI', name: 'Arctic Aerosol & Sea-Ice Campaign 2023', region: 'arctic', station: 'himadri', track: 'himadri', start: '2023-03-15', end: '2023-09-10', teamSize: 12, discipline: 'atmospheric_science', art: 'aurora', objectives: ['Black carbon and aerosols', 'Sea-ice edge observations'], highlights: ['Spring Arctic haze sampled (demo)', 'Sea-ice edge tracked by satellite'], tags: ['aerosol', 'arctic haze', 'sea ice'] },
  { id: 'isea-43', number: '43rd ISEA', name: '43rd Indian Scientific Expedition to Antarctica', region: 'antarctica', station: 'bharati', track: 'bharati', start: '2023-11-22', end: '2024-03-20', teamSize: 66, discipline: 'geospace', vessel: 'MV Polar Demo', art: 'aurora', objectives: ['Geomagnetic observatory upgrade', 'Sea-ice satellite validation'], highlights: ['All-sky aurora camera installed (demo)', 'Ground truth for satellite sea-ice products'], tags: ['aurora', 'geomagnetism', 'sea ice'] },
  { id: 'soe-2024', number: 'SOE-13', name: 'Southern Ocean Carbon Expedition 2024', region: 'southern_ocean', track: 'southern_ocean', start: '2024-01-08', end: '2024-03-01', teamSize: 40, discipline: 'climate', vessel: 'RV Himsagar (demo)', art: 'ship', objectives: ['Surface ocean CO₂', 'Nutrients and chlorophyll'], highlights: ['Continuous pCO₂ measured for 9,000 km (demo)', 'Strong uptake zone near polar front'], tags: ['carbon', 'co2', 'southern ocean'] },
  { id: 'him-2025', number: 'HIM-13', name: 'Spiti Permafrost & Rock Glacier Survey', region: 'himalaya', station: 'himansh', track: 'himansh', start: '2025-06-01', end: '2025-09-30', teamSize: 15, discipline: 'geology', art: 'mountain', objectives: ['Map rock glaciers', 'Install permafrost boreholes'], highlights: ['42 rock glaciers mapped (demo)', 'Two 10 m boreholes instrumented'], tags: ['permafrost', 'rock glacier', 'spiti'] },
];

export const EXPEDITIONS: Expedition[] = ROWS.map((r, i) => {
  const year = Number(r.start.slice(0, 4));
  const members = team(i * 97 + 13, r.teamSize);
  const regionWord = r.region === 'antarctica' ? 'Antarctic' : r.region === 'arctic' ? 'Arctic' : r.region === 'himalaya' ? 'Himalayan' : 'ocean';
  return {
    id: r.id,
    type: 'expedition',
    slug: r.id,
    number: r.number,
    name: r.name,
    title: r.name,
    summary: `${r.number}: a ${regionWord} expedition focused on ${r.objectives.slice(0, 2).join(' and ').toLowerCase()}. ${r.highlights[0]}.`,
    tags: [...r.tags, regionWord.toLowerCase(), 'expedition', 'indian polar research'],
    region: r.region,
    station: r.station,
    discipline: r.discipline,
    year,
    expeditionId: r.id,
    authors: [members[0].name],
    accessLevel: 'public',
    licence: 'CC-BY-4.0',
    credit: 'NCPOR (demo)',
    createdAt: r.end,
    updatedAt: r.end,
    status: 'published',
    views: 1200 + ((i * 733) % 9000),
    downloads: 80 + ((i * 97) % 900),
    art: r.art,
    startDate: r.start,
    endDate: r.end,
    leader: members[0].name,
    team: members,
    teamSize: r.teamSize,
    objectives: r.objectives,
    vessel: r.vessel,
    track: TRACKS[r.track],
    highlights: r.highlights,
    timeline: [
      { date: r.start, title: 'Departure', text: r.vessel ? `Team embarks on ${r.vessel}.` : 'Team departs for the field.' },
      { date: shift(r.start, 12), title: 'Arrival at field site', text: r.station ? `Arrival at ${cap(r.station)} and site set-up.` : 'Arrival in the survey area.' },
      { date: shift(r.start, 40), title: 'Main science phase', text: r.objectives[0] + '.' },
      { date: shift(r.end, -10), title: 'Wrap-up', text: 'Samples packed, instruments serviced.' },
      { date: r.end, title: 'Return', text: 'Team returns; data handed to the archive.' },
    ],
  };
});

function shift(date: string, days: number) {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function cap(s: string) {
  return s[0].toUpperCase() + s.slice(1);
}
