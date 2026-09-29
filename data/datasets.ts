import type { Dataset, DatasetVariable } from '@/types';
import { TOPICS } from './topics';
import { seededRandom } from '@/lib/utils';

/** Demo dataset definitions: variables + a deterministic row generator per topic. */
type Gen = (i: number, r: () => number) => Record<string, number | string>;
interface Spec {
  vars: [string, string, string, DatasetVariable['dataType']][];
  x: string;
  y: string[];
  n: number;
  gen: Gen;
  coverage: string;
  format: string;
  bbox: [number, number, number, number];
}

const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
const date = (start: string, i: number) => {
  const d = new Date(start + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + i);
  return d.toISOString().slice(0, 10);
};

const SPECS: Record<string, Spec> = {
  'bharati-sea-ice': {
    vars: [['date', '', 'Observation date (UTC)', 'date'], ['ice_thickness_m', 'm', 'Fast-ice thickness at buoy B3', 'number'], ['snow_depth_m', 'm', 'Snow depth on ice', 'number'], ['air_temp_c', '°C', 'Air temperature at 2 m', 'number']],
    x: 'date', y: ['ice_thickness_m', 'snow_depth_m'], n: 40, coverage: '2019-11-20 to 2020-01-08', format: 'CSV', bbox: [75.5, -69.6, 76.6, -69.2],
    gen: (i, r) => ({ date: date('2019-11-20', i), ice_thickness_m: round(1.7 - i * 0.03 - r() * 0.05), snow_depth_m: round(0.25 - i * 0.004 + r() * 0.02), air_temp_c: round(-6 + i * 0.15 + r() * 2 - 1, 1) }),
  },
  'adelie-census': {
    vars: [['year', '', 'Breeding season', 'number'], ['colony_a_pairs', 'pairs', 'Colony A breeding pairs', 'number'], ['colony_b_pairs', 'pairs', 'Colony B breeding pairs', 'number'], ['chicks_per_nest', 'ratio', 'Chicks per nest at crèche', 'number']],
    x: 'year', y: ['colony_a_pairs', 'colony_b_pairs'], n: 10, coverage: '2015–2024', format: 'CSV', bbox: [75.9, -69.5, 76.5, -69.3],
    gen: (i, r) => ({ year: 2015 + i, colony_a_pairs: Math.round(2100 + Math.sin(i) * 180 + r() * 90), colony_b_pairs: Math.round(1700 + Math.cos(i) * 150 + r() * 80), chicks_per_nest: round(0.8 + r() * 0.3) }),
  },
  'ice-core-dml': {
    vars: [['depth_m', 'm', 'Depth below surface', 'number'], ['age_ad', 'year AD', 'Layer-counted age', 'number'], ['d18o_permil', '‰', 'Oxygen isotope ratio δ18O', 'number'], ['accumulation_m_we', 'm w.e.', 'Annual accumulation', 'number']],
    x: 'age_ad', y: ['d18o_permil'], n: 45, coverage: 'AD 1610–2017', format: 'CSV / NetCDF', bbox: [11.0, -71.0, 12.5, -70.5],
    gen: (i, r) => ({ depth_m: round(i * 2.5, 1), age_ad: 2017 - Math.round(i * 9), d18o_permil: round(-23 - Math.sin(i / 5) * 0.8 - (i / 45) * 0.6 + r() * 0.5), accumulation_m_we: round(0.32 - i * 0.0008 + r() * 0.05, 3) }),
  },
  'schirmacher-lakes': {
    vars: [['lake_id', '', 'Lake identifier', 'string'], ['max_depth_m', 'm', 'Maximum depth', 'number'], ['water_temp_c', '°C', 'Surface water temperature', 'number'], ['conductivity_us_cm', 'µS/cm', 'Specific conductivity', 'number']],
    x: 'lake_id', y: ['conductivity_us_cm'], n: 18, coverage: 'Jan–Feb 2011', format: 'CSV', bbox: [11.3, -70.8, 11.9, -70.7],
    gen: (i, r) => ({ lake_id: `L${String(i + 1).padStart(2, '0')}`, max_depth_m: round(2 + r() * 12, 1), water_temp_c: round(0.5 + r() * 5, 1), conductivity_us_cm: Math.round(40 + r() * 400) }),
  },
  'maitri-met': {
    vars: [['year', '', 'Year', 'number'], ['mean_temp_c', '°C', 'Annual mean air temperature', 'number'], ['max_wind_ms', 'm/s', 'Maximum gust', 'number'], ['blizzard_days', 'days', 'Number of blizzard days', 'number']],
    x: 'year', y: ['mean_temp_c'], n: 21, coverage: '2002–2022', format: 'CSV', bbox: [11.6, -70.8, 11.8, -70.7],
    gen: (i, r) => ({ year: 2002 + i, mean_temp_c: round(-10.4 + i * 0.02 + r() * 0.8 - 0.4, 1), max_wind_ms: round(38 + r() * 12, 1), blizzard_days: Math.round(22 + r() * 14) }),
  },
  'ozone-maitri': {
    vars: [['day_of_year', '', 'Day of year 2008', 'number'], ['total_ozone_du', 'DU', 'Total column ozone', 'number'], ['uv_index', '', 'Surface UV index (noon)', 'number']],
    x: 'day_of_year', y: ['total_ozone_du'], n: 36, coverage: 'Aug–Dec 2008', format: 'CSV', bbox: [11.6, -70.8, 11.8, -70.7],
    gen: (i, r) => ({ day_of_year: 220 + i * 4, total_ozone_du: Math.round(300 - Math.sin((i / 36) * Math.PI) * 140 + r() * 15), uv_index: round(1 + Math.sin((i / 36) * Math.PI) * 7 + r(), 1) }),
  },
  kongsfjorden: {
    vars: [['date', '', 'Date', 'date'], ['temp_c', '°C', 'Water temperature at 80 m', 'number'], ['salinity_psu', 'PSU', 'Salinity at 80 m', 'number']],
    x: 'date', y: ['temp_c'], n: 36, coverage: '2014-07 to 2015-06', format: 'NetCDF', bbox: [11.0, 78.85, 12.5, 79.05],
    gen: (i, r) => ({ date: date('2014-07-01', i * 10), temp_c: round(1.5 + Math.sin(i / 4) * 1.2 + (i > 18 && i < 26 ? 1.1 : 0) + r() * 0.3), salinity_psu: round(34.6 + r() * 0.4) }),
  },
  'svalbard-glacier': {
    vars: [['year', '', 'Hydrological year', 'number'], ['winter_balance_m_we', 'm w.e.', 'Winter balance', 'number'], ['summer_balance_m_we', 'm w.e.', 'Summer balance', 'number'], ['net_balance_m_we', 'm w.e.', 'Net annual balance', 'number']],
    x: 'year', y: ['net_balance_m_we', 'winter_balance_m_we'], n: 12, coverage: '2008–2019', format: 'CSV', bbox: [11.6, 78.88, 11.8, 78.92],
    gen: (i, r) => {
      const w = round(0.7 + r() * 0.3);
      const s = round(-1.1 - i * 0.03 - r() * 0.4);
      return { year: 2008 + i, winter_balance_m_we: w, summer_balance_m_we: s, net_balance_m_we: round(w + s) };
    },
  },
  'arctic-aerosol': {
    vars: [['month', '', 'Month (2023)', 'string'], ['black_carbon_ng_m3', 'ng/m³', 'Monthly mean black carbon', 'number'], ['particles_cm3', '#/cm³', 'Particle number concentration', 'number']],
    x: 'month', y: ['black_carbon_ng_m3'], n: 7, coverage: 'Mar–Sep 2023', format: 'CSV', bbox: [11.8, 78.9, 12.0, 78.95],
    gen: (i, r) => ({ month: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'][i], black_carbon_ng_m3: Math.round([62, 85, 48, 20, 12, 15, 24][i] + r() * 6), particles_cm3: Math.round(180 + r() * 120) }),
  },
  'chandra-glacier': {
    vars: [['year', '', 'Survey year', 'number'], ['snout_retreat_m', 'm', 'Cumulative snout retreat since 2013', 'number'], ['glacier_area_km2', 'km²', 'Glacier area', 'number']],
    x: 'year', y: ['snout_retreat_m'], n: 12, coverage: '2013–2024', format: 'CSV / Shapefile', bbox: [77.3, 32.2, 77.8, 32.6],
    gen: (i, r) => ({ year: 2013 + i, snout_retreat_m: Math.round(i * 18 + r() * 6), glacier_area_km2: round(15.2 - i * 0.06 - r() * 0.02) }),
  },
  'himansh-meltwater': {
    vars: [['date', '', 'Date', 'date'], ['discharge_m3s', 'm³/s', 'Daily mean discharge', 'number'], ['air_temp_c', '°C', 'Daily mean air temperature', 'number']],
    x: 'date', y: ['discharge_m3s'], n: 45, coverage: 'Jun–Sep 2016', format: 'CSV', bbox: [77.5, 32.35, 77.7, 32.45],
    gen: (i, r) => ({ date: date('2016-06-10', i * 2), discharge_m3s: round(4 + Math.sin((i / 45) * Math.PI) * 16 + r() * 2.5, 1), air_temp_c: round(3 + Math.sin((i / 45) * Math.PI) * 7 + r(), 1) }),
  },
  'himalaya-black-carbon': {
    vars: [['week', '', 'Week of season', 'number'], ['black_carbon_ng_g', 'ng/g', 'Black carbon in surface snow', 'number'], ['albedo', '', 'Broadband snow albedo', 'number']],
    x: 'week', y: ['albedo'], n: 20, coverage: 'May–Sep 2021', format: 'CSV', bbox: [77.4, 32.2, 77.8, 32.5],
    gen: (i, r) => ({ week: i + 1, black_carbon_ng_g: Math.round(40 + i * 6 + r() * 30), albedo: round(0.82 - i * 0.012 - r() * 0.04) }),
  },
  'spiti-permafrost': {
    vars: [['depth_m', 'm', 'Borehole depth', 'number'], ['temp_c', '°C', 'Ground temperature (Aug 2025)', 'number']],
    x: 'depth_m', y: ['temp_c'], n: 11, coverage: 'Aug 2025', format: 'CSV', bbox: [77.8, 32.0, 78.3, 32.4],
    gen: (i, r) => ({ depth_m: i, temp_c: round(6 - i * 1.6 + (i > 3 ? i * 0.9 : 0) + r() * 0.2 - 2) }),
  },
  'krill-survey': {
    vars: [['station', '', 'Station ID', 'string'], ['latitude', '°', 'Latitude', 'number'], ['krill_density_g_m2', 'g/m²', 'Acoustic krill density', 'number'], ['zooplankton_mg_m3', 'mg/m³', 'Zooplankton biomass', 'number']],
    x: 'latitude', y: ['krill_density_g_m2'], n: 24, coverage: 'Jan–Mar 2017', format: 'CSV', bbox: [55, -66, 60, -45],
    gen: (i, r) => ({ station: `K${i + 1}`, latitude: round(-45 - i * 0.85, 1), krill_density_g_m2: round(Math.max(0, (i - 8) * 3 + r() * 10), 1), zooplankton_mg_m3: round(20 + i * 2 + r() * 12, 1) }),
  },
  'so-fronts': {
    vars: [['latitude', '°', 'Latitude along 57.5° E', 'number'], ['sst_c', '°C', 'Sea surface temperature', 'number'], ['salinity_psu', 'PSU', 'Surface salinity', 'number']],
    x: 'latitude', y: ['sst_c'], n: 30, coverage: 'Jan–Feb 2011', format: 'CSV', bbox: [56, -66, 59, -20],
    gen: (i, r) => {
      const lat = -20 - i * 1.5;
      const sst = lat > -40 ? 24 + (lat + 20) * 0.35 : lat > -50 ? 10 + (lat + 40) * 0.6 : 3 + (lat + 50) * 0.25;
      return { latitude: round(lat, 1), sst_c: round(sst + r() * 0.6, 1), salinity_psu: round(35.4 - i * 0.05 + r() * 0.1) };
    },
  },
  'so-carbon': {
    vars: [['latitude', '°', 'Latitude', 'number'], ['pco2_sea_uatm', 'µatm', 'Seawater pCO₂', 'number'], ['pco2_air_uatm', 'µatm', 'Atmospheric pCO₂', 'number']],
    x: 'latitude', y: ['pco2_sea_uatm', 'pco2_air_uatm'], n: 28, coverage: 'Jan–Mar 2024', format: 'CSV', bbox: [55, -62, 82, -10],
    gen: (i, r) => ({ latitude: round(-10 - i * 1.8, 1), pco2_sea_uatm: Math.round(410 - Math.max(0, i - 12) * 3.2 + r() * 8), pco2_air_uatm: Math.round(418 + r() * 2) }),
  },
  'io-heat': {
    vars: [['month', '', 'Month', 'string'], ['heat_anomaly_1e8_j_m2', '10⁸ J/m²', 'Upper 300 m heat content anomaly', 'number'], ['sst_c', '°C', 'Mean SST', 'number']],
    x: 'month', y: ['heat_anomaly_1e8_j_m2'], n: 12, coverage: '2021', format: 'NetCDF', bbox: [60, -15, 95, 15],
    gen: (i, r) => ({ month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i], heat_anomaly_1e8_j_m2: round(2 + Math.sin(i / 2) * 3 + r() * 1.5, 1), sst_c: round(28.4 + Math.sin(i / 2) * 0.8 + r() * 0.3, 1) }),
  },
  'bharati-aurora': {
    vars: [['hour_utc', 'h', 'Hour (UTC) on storm day', 'number'], ['bz_nt', 'nT', 'IMF Bz', 'number'], ['kp', '', 'Planetary Kp index', 'number'], ['h_component_nt', 'nT', 'Magnetometer H deviation', 'number']],
    x: 'hour_utc', y: ['h_component_nt'], n: 24, coverage: '2024 winter', format: 'CSV / IAGA-2002', bbox: [76.1, -69.45, 76.25, -69.38],
    gen: (i, r) => ({ hour_utc: i, bz_nt: round(-2 - Math.sin((i / 24) * Math.PI) * 12 + r() * 2, 1), kp: round(Math.min(9, 2 + Math.sin((i / 24) * Math.PI) * 5 + r()), 1), h_component_nt: Math.round(-Math.sin((i / 24) * Math.PI) * 420 + r() * 40) }),
  },
  'antarctic-sea-ice-extent': {
    vars: [['year', '', 'Year', 'number'], ['max_extent_mkm2', 'million km²', 'Winter maximum extent', 'number'], ['min_extent_mkm2', 'million km²', 'Summer minimum extent', 'number']],
    x: 'year', y: ['max_extent_mkm2', 'min_extent_mkm2'], n: 18, coverage: '2007–2024', format: 'CSV', bbox: [-180, -80, 180, -55],
    gen: (i, r) => ({ year: 2007 + i, max_extent_mkm2: round(18.8 + Math.sin(i) * 0.3 - (i > 14 ? 1.2 : 0) + r() * 0.2), min_extent_mkm2: round(3.0 + Math.cos(i) * 0.3 - (i > 14 ? 0.8 : 0) + r() * 0.2) }),
  },
  'arctic-sea-ice': {
    vars: [['year', '', 'Year', 'number'], ['september_extent_mkm2', 'million km²', 'September mean extent', 'number']],
    x: 'year', y: ['september_extent_mkm2'], n: 20, coverage: '2004–2023', format: 'CSV', bbox: [-180, 60, 180, 90],
    gen: (i, r) => ({ year: 2004 + i, september_extent_mkm2: round(6.0 - i * 0.08 + Math.sin(i * 1.7) * 0.4 + r() * 0.2) }),
  },
};

const ACCESS: Record<string, Pick<Dataset, 'accessLevel' | 'embargoUntil' | 'licence'>> = {
  'ice-core-dml': { accessLevel: 'restricted', licence: 'NCPOR-Restricted' },
  'so-carbon': { accessLevel: 'embargoed', embargoUntil: '2027-03-01', licence: 'CC-BY-4.0' },
  'bharati-aurora': { accessLevel: 'registered', licence: 'CC-BY-NC-4.0' },
  'spiti-permafrost': { accessLevel: 'embargoed', embargoUntil: '2026-12-15', licence: 'CC-BY-4.0' },
  'adelie-census': { accessLevel: 'restricted', licence: 'NCPOR-Restricted' },
};

export const DATASETS: Dataset[] = TOPICS.filter((t) => SPECS[t.key]).map((t, idx) => {
  const s = SPECS[t.key];
  const r = seededRandom(idx * 31 + 7);
  const rows = Array.from({ length: s.n }, (_, i) => s.gen(i, r));
  const acc = ACCESS[t.key] ?? { accessLevel: 'public' as const, licence: 'CC-BY-4.0' as const };
  return {
    id: `ds-${t.key}`,
    type: 'dataset',
    slug: `ds-${t.key}`,
    title: `Dataset: ${t.title}`,
    summary: `Demo dataset supporting “${t.title}”. Variables: ${s.vars.map((v) => v[0]).join(', ')}.`,
    tags: [...t.tags, 'dataset'],
    region: t.region,
    station: t.station,
    discipline: t.discipline,
    year: t.year,
    expeditionId: t.expeditionId,
    authors: t.authors,
    ...acc,
    credit: `${t.authors[0]} / NCPOR (demo)`,
    createdAt: `${t.year}-06-15`,
    updatedAt: `${Math.min(t.year + 1, 2026)}-01-10`,
    status: 'published',
    views: 300 + ((idx * 211) % 3000),
    downloads: 40 + ((idx * 73) % 600),
    ownerId: t.authors.includes('Dr. Vikram Menon') ? 'u-scientist' : undefined,
    art: t.art,
    doi: `10.5555/pv.ds.${t.year}.${String(idx + 1).padStart(3, '0')}`,
    format: s.format,
    sizeMb: Math.round((2 + r() * 180) * 10) / 10,
    temporalCoverage: s.coverage,
    spatialExtent: { minLon: s.bbox[0], minLat: s.bbox[1], maxLon: s.bbox[2], maxLat: s.bbox[3] },
    variables: s.vars.map(([name, unit, description, dataType]) => ({ name, unit, description, dataType })),
    sampleRows: rows,
    keyFindings: t.findings.slice(0, 2),
    chart: { x: s.x, y: s.y },
  };
});
