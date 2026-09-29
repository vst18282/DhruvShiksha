import type { Blog, EventItem, MediaItem, Publication, Report, Section, Attachment, ArtVariant, Region, StationSlug, Discipline } from '@/types';
import { TOPICS } from './topics';
import { BLOG_TRANSLATIONS } from './translations';
import { EXPEDITIONS } from './expeditions';
import { DATASETS } from './datasets';
import { seededRandom } from '@/lib/utils';

/* ================================ REPORTS ================================ */

const REPORT_ACCESS: Record<string, Pick<Report, 'accessLevel' | 'embargoUntil' | 'licence'>> = {
  'spiti-permafrost': { accessLevel: 'embargoed', embargoUntil: '2026-12-15', licence: 'CC-BY-4.0' },
  'antarctic-microbes': { accessLevel: 'restricted', licence: 'NCPOR-Restricted' },
  'ice-core-dml': { accessLevel: 'registered', licence: 'CC-BY-NC-4.0' },
};

const sec = (id: string, heading: string, body: string): Section => ({ id, heading, body });

const TOPIC_REPORTS: Report[] = TOPICS.map((t, i) => {
  const acc = REPORT_ACCESS[t.key] ?? { accessLevel: 'public' as const, licence: 'CC-BY-4.0' as const };
  const attachments: Attachment[] = [
    { id: `att-${t.key}-pdf`, name: `${t.key}-report.pdf`, kind: 'pdf', sizeKb: 2400 + i * 131 },
    { id: `att-${t.key}-csv`, name: `${t.key}-appendix-data.csv`, kind: 'csv', sizeKb: 180 + i * 17 },
  ];
  if (i % 3 === 0) attachments.push({ id: `att-${t.key}-img`, name: `${t.key}-figures.zip`, kind: 'zip', sizeKb: 8200 + i * 300 });
  return {
    id: `rep-${t.key}`,
    type: 'report',
    slug: `rep-${t.key}`,
    title: t.title,
    summary: t.summary,
    tags: t.tags,
    region: t.region,
    station: t.station,
    discipline: t.discipline,
    year: t.year,
    expeditionId: t.expeditionId,
    authors: t.authors,
    ...acc,
    credit: 'NCPOR (demo)',
    createdAt: `${t.year}-05-20`,
    updatedAt: `${t.year}-07-02`,
    status: 'published',
    views: 900 + ((i * 377) % 6000),
    downloads: 60 + ((i * 131) % 1200),
    ownerId: t.authors.includes('Dr. Vikram Menon') ? 'u-scientist' : undefined,
    art: t.art,
    reportType: i % 4 === 0 ? 'Survey report' : i % 4 === 1 ? 'Technical report' : 'Expedition report',
    pages: 18 + ((i * 7) % 60),
    keyFindings: t.findings,
    sections: [
      sec('summary', 'Executive summary', t.summary),
      ...t.sections.map((s, j) => sec(`s${j + 1}`, s.heading, s.body)),
      sec('methods', 'Methods', t.methods ?? 'Standard field protocols of the expedition science programme were followed; see appendix for instrument details (demo).'),
      sec('recommendations', 'Recommendations', 'Continue long-term monitoring, share data openly after quality control, and integrate results with satellite observations and models.'),
    ],
    attachments,
  };
});

const ANNUAL_REPORTS: Report[] = [2019, 2021, 2023, 2025].map((y, i) => ({
  id: `rep-annual-${y}`,
  type: 'report',
  slug: `rep-annual-${y}`,
  title: `NCPOR Annual Report ${y}–${String(y + 1).slice(2)} (demo)`,
  summary: `Overview of polar and ocean expeditions, research highlights, outreach and infrastructure for ${y}–${y + 1}. All numbers are demo values.`,
  tags: ['annual report', 'overview', 'outreach', 'infrastructure'],
  region: 'antarctica' as Region,
  discipline: 'outreach' as Discipline,
  year: y,
  authors: ['NCPOR (demo)'],
  accessLevel: 'public',
  licence: 'CC-BY-4.0',
  credit: 'NCPOR (demo)',
  createdAt: `${y + 1}-06-30`,
  updatedAt: `${y + 1}-06-30`,
  status: 'published',
  views: 3000 + i * 800,
  downloads: 700 + i * 150,
  art: 'station' as ArtVariant,
  reportType: 'Annual report',
  pages: 120 + i * 8,
  keyFindings: ['Four stations operated through the year (demo).', 'Over 40 outreach events reached schools across India (demo).', 'Data archive grew by 18% (demo).'],
  sections: [
    sec('overview', 'Overview', 'This annual report summarises Antarctic, Arctic, Himalayan and ocean activities.'),
    sec('highlights', 'Research highlights', 'Highlights include sea-ice monitoring near Bharati, glacier surveys in the Chandra basin and Southern Ocean cruises.'),
    sec('outreach', 'Outreach', 'School lectures, museum exhibitions and online quizzes brought polar science to students.'),
  ],
  attachments: [{ id: `att-annual-${y}`, name: `annual-report-${y}.pdf`, kind: 'pdf', sizeKb: 12800 }],
}));

const EXPEDITION_REPORTS: Report[] = ['isea-28', 'isea-34'].map((id, i) => {
  const e = EXPEDITIONS.find((x) => x.id === id)!;
  return {
    id: `rep-exp-${id}`,
    type: 'report',
    slug: `rep-exp-${id}`,
    title: `${e.number} — Expedition summary report`,
    summary: `Logistics, science programme and outcomes of the ${e.name}. ${e.highlights.join(' ')}`,
    tags: [...e.tags, 'logistics', 'summary'],
    region: e.region,
    station: e.station,
    discipline: e.discipline,
    year: e.year,
    expeditionId: e.id,
    authors: [e.leader],
    accessLevel: 'public',
    licence: 'CC-BY-4.0',
    credit: 'NCPOR (demo)',
    createdAt: e.endDate,
    updatedAt: e.endDate,
    status: 'published',
    views: 1500 + i * 300,
    downloads: 220 + i * 40,
    art: e.art,
    reportType: 'Expedition report',
    pages: 64,
    keyFindings: e.highlights,
    sections: [sec('overview', 'Overview', e.summary), sec('objectives', 'Objectives', e.objectives.join('. ') + '.'), sec('logistics', 'Logistics', `Team of ${e.teamSize} members${e.vessel ? ` aboard ${e.vessel}` : ''}.`)],
    attachments: [{ id: `att-exp-${id}`, name: `${id}-summary.pdf`, kind: 'pdf', sizeKb: 5400 }],
  };
});

export const REPORTS: Report[] = [...TOPIC_REPORTS, ...ANNUAL_REPORTS, ...EXPEDITION_REPORTS];

/* ============================= PUBLICATIONS ============================= */

const JOURNALS = ['Journal of Polar Demo Science', 'Cryosphere Letters (Demo)', 'Indian Journal of Ocean Demo Research', 'Antarctic Demo Review', 'Himalayan Earth Demo Studies'];

export const PUBLICATIONS: Publication[] = [
  ...TOPICS.map((t, i): Publication => ({
    id: `pub-${t.key}`,
    type: 'publication',
    slug: `pub-${t.key}`,
    title: `${t.title.replace(/,? \d{4}(–\d{2})?$/, '')}: observations and implications`,
    summary: t.summary,
    abstract: `${t.summary} ${t.findings.join(' ')} We discuss the implications for long-term monitoring. (Demo abstract — not a real publication.)`,
    tags: t.tags,
    region: t.region,
    station: t.station,
    discipline: t.discipline,
    year: Math.min(t.year + 1, 2026),
    expeditionId: t.expeditionId,
    authors: t.authors,
    accessLevel: 'public',
    licence: 'CC-BY-4.0',
    credit: JOURNALS[i % JOURNALS.length],
    createdAt: `${Math.min(t.year + 1, 2026)}-03-10`,
    updatedAt: `${Math.min(t.year + 1, 2026)}-03-10`,
    status: 'published',
    views: 500 + ((i * 419) % 4000),
    downloads: 90 + ((i * 59) % 800),
    ownerId: t.authors.includes('Dr. Vikram Menon') ? 'u-scientist' : undefined,
    art: t.art,
    doi: `10.5555/pv.pub.${t.year}.${String(i + 1).padStart(3, '0')}`,
    journal: JOURNALS[i % JOURNALS.length],
    volume: String(10 + (i % 12)),
    pages: `${100 + i * 13}–${112 + i * 13}`,
    relatedDatasetIds: DATASETS.filter((d) => d.id === `ds-${t.key}`).map((d) => d.id),
  })),
  {
    id: 'pub-review-poles',
    type: 'publication',
    slug: 'pub-review-poles',
    title: 'Three poles, one climate: a review of Indian polar research (demo)',
    summary: 'A demo review connecting Antarctic, Arctic and Himalayan research themes.',
    abstract: 'This demo review summarises how Antarctic, Arctic and Himalayan observations complement each other for understanding climate change and its impacts on India. (Demo abstract.)',
    tags: ['review', 'three poles', 'antarctica', 'arctic', 'himalaya', 'climate'],
    region: 'himalaya',
    discipline: 'climate',
    year: 2025,
    authors: ['Dr. Vikram Menon', 'Dr. Priya Iyer', 'Dr. Kiran Das'],
    accessLevel: 'public',
    licence: 'CC-BY-4.0',
    credit: 'Antarctic Demo Review',
    createdAt: '2025-08-01',
    updatedAt: '2025-08-01',
    status: 'published',
    views: 2100,
    downloads: 640,
    ownerId: 'u-scientist',
    art: 'mountain',
    doi: '10.5555/pv.pub.2025.100',
    journal: 'Antarctic Demo Review',
    volume: '22',
    pages: '1–34',
    relatedDatasetIds: ['ds-chandra-glacier', 'ds-antarctic-sea-ice-extent', 'ds-arctic-sea-ice'],
  },
];

/* ================================= BLOGS ================================= */

function kidsSections(t: (typeof TOPICS)[number]): Section[] | undefined {
  if (!t.kids) return undefined;
  const heads = ['The big idea', 'What scientists did', 'Why it is cool'];
  return t.kids.map((k, i) => sec(`k${i + 1}`, heads[i] ?? `Fact ${i + 1}`, k));
}

const TOPIC_BLOGS: Blog[] = TOPICS.map((t, i) => {
  const general = t.sections.map((s, j) => sec(`s${j + 1}`, s.heading, s.body));
  const expert = [
    ...general,
    sec('methods', 'Methods in detail', t.methods ?? 'Field protocols follow the expedition science plan; instrument calibration and QC are documented in the linked report (demo).'),
    sec('caveats', 'Uncertainties and caveats', 'Values are preliminary demo numbers. Record length is short, so trends should be treated as indicative until confirmed by longer series and independent datasets.'),
  ];
  return {
    id: `blog-${t.key}`,
    type: 'blog',
    slug: `blog-${t.key}`,
    title: t.blogTitle,
    summary: t.summary,
    tags: t.tags,
    region: t.region,
    station: t.station,
    discipline: t.discipline,
    year: t.year,
    expeditionId: t.expeditionId,
    authors: [t.authors[0]],
    accessLevel: 'public',
    licence: 'CC-BY-4.0',
    credit: 'NCPOR Outreach (demo)',
    createdAt: `${Math.min(t.year + 1, 2026)}-0${(i % 9) + 1}-12`,
    updatedAt: `${Math.min(t.year + 1, 2026)}-0${(i % 9) + 1}-12`,
    status: 'published',
    views: 1500 + ((i * 523) % 12000),
    downloads: 0,
    ownerId: t.authors.includes('Dr. Vikram Menon') ? 'u-scientist' : undefined,
    art: t.art,
    readingMinutes: 4 + (i % 5),
    versions: { general, expert, class8: kidsSections(t) },
    translations: BLOG_TRANSLATIONS[t.key],
    citations: [`${t.authors.join(', ')} (${t.year}). ${t.title}. NCPOR Report rep-${t.key} (demo).`],
    glossaryTerms: t.glossary,
    attachments: [{ id: `att-blog-${t.key}`, name: `${t.key}-factsheet.pdf`, kind: 'pdf', sizeKb: 640 }],
    featured: ['bharati-sea-ice', 'ice-core-dml', 'chandra-glacier', 'adelie-census'].includes(t.key),
  };
});

interface ExtraBlog {
  key: string;
  title: string;
  summary: string;
  tags: string[];
  region: Region;
  station?: StationSlug;
  discipline: Discipline;
  year: number;
  art: ArtVariant;
  author: string;
  sections: [string, string][];
  kids?: [string, string][];
  glossary?: string[];
}

const EXTRA: ExtraBlog[] = [
  { key: 'life-at-maitri', title: 'A day in the life at Maitri station', summary: 'From 6 am weather balloons to movie night: what winter-over life at Maitri looks like (demo diary).', tags: ['life at station', 'maitri', 'winter-over', 'antarctica', 'daily routine'], region: 'antarctica', station: 'maitri', discipline: 'outreach', year: 2023, art: 'station', author: 'Pooja Joshi', sections: [['Morning', 'The day starts with weather observations and a quick check of the generators.'], ['Work', 'Scientists visit lakes, service instruments and log data; engineers keep the station warm.'], ['Evening', 'Dinner together, a call home via satellite, and sometimes an aurora overhead.']], kids: [['Waking up', 'At Maitri it can be dark all day in winter!'], ['Jobs', 'Everyone has a job — even washing dishes is a team task.']] },
  { key: 'become-polar-scientist', title: 'How to become a polar scientist', summary: 'Subjects to study, skills to build and paths into Indian polar research.', tags: ['careers', 'how to become a polar scientist', 'education', 'students', 'skills'], region: 'antarctica', discipline: 'outreach', year: 2025, art: 'aurora', author: 'Meera Kulkarni', sections: [['Study', 'Physics, chemistry, biology, geography and maths all lead to polar careers.'], ['Skills', 'Fieldwork, coding, data analysis and teamwork are essential.'], ['Paths', 'Research fellowships, PhD programmes and expedition support roles are common entry points.']], kids: [['Start now', 'Love science? Ask questions, read, and join science clubs!']] },
  { key: 'antarctic-treaty', title: 'The Antarctic Treaty explained', summary: 'Why a whole continent is set aside for peace and science.', tags: ['antarctic treaty', 'policy', 'peace', 'science diplomacy', 'antarctica'], region: 'antarctica', discipline: 'outreach', year: 2024, art: 'ice', author: 'Dr. Anil Sen', sections: [['What it says', 'The Treaty reserves Antarctica for peaceful purposes and scientific cooperation.'], ['India’s role', 'India became a consultative party and runs research stations under the Treaty framework.'], ['Environment', 'An environmental protocol protects Antarctic ecosystems.']] },
  { key: 'why-poles-matter-india', title: 'Why the poles matter for India', summary: 'Monsoon, sea level and water security link India to the far-away ice.', tags: ['india', 'monsoon', 'sea level', 'water security', 'climate'], region: 'himalaya', discipline: 'climate', year: 2025, art: 'mountain', author: 'Dr. Priya Iyer', sections: [['Sea level', 'Melting ice sheets raise the sea along India’s 7,500 km coastline.'], ['Monsoon', 'Polar and ocean changes influence the atmospheric patterns that drive the monsoon.'], ['Water', 'Himalayan glaciers feed rivers for hundreds of millions of people.']] },
  { key: 'ship-voyage', title: 'Crossing the Roaring Forties: the voyage south', summary: 'What it is like to sail through the stormiest seas on Earth to reach Antarctica.', tags: ['ship', 'voyage', 'roaring forties', 'southern ocean', 'expedition'], region: 'southern_ocean', discipline: 'outreach', year: 2022, art: 'ship', author: 'Arjun Nair', sections: [['Setting sail', 'The ship leaves port loaded with fuel, food and science gear.'], ['Storms', 'Between 40° and 60° S, strong winds and big waves test everyone’s sea legs.'], ['First iceberg', 'Spotting the first iceberg is a moment every expedition member remembers.']] },
  { key: 'penguin-facts-kids', title: '10 fun facts about penguins', summary: 'Penguins can’t fly, but they are amazing swimmers. Fun facts for young readers.', tags: ['penguin', 'kids', 'fun facts', 'adélie', 'emperor penguin', 'biodiversity'], region: 'antarctica', discipline: 'biology', year: 2024, art: 'penguin', author: 'Meera Kulkarni', sections: [['Swimmers', 'Penguins “fly” underwater using their flippers.'], ['Huddles', 'Emperor penguins huddle together to stay warm in winter.'], ['Stone nests', 'Adélie penguins build nests from small pebbles.']], kids: [['Did you know?', 'Some penguins give pebbles as gifts!'], ['Colours', 'Black backs and white bellies help them hide in water.']] },
  { key: 'food-at-station', title: 'What do you eat in Antarctica?', summary: 'Stocking a year of food, baking bread at −30 °C and missing fresh fruit.', tags: ['food', 'life at station', 'logistics', 'antarctica'], region: 'antarctica', station: 'bharati', discipline: 'outreach', year: 2021, art: 'station', author: 'Kavya Joshi', sections: [['Supplies', 'A year of food arrives by ship and is stored in freezers and warehouses.'], ['Cooking', 'Station chefs bake fresh bread and cook Indian meals for the team.'], ['Treats', 'Festivals are celebrated with special dishes.']] },
  { key: 'aurora-explained', title: 'What makes the aurora glow?', summary: 'Solar wind, magnetic fields and glowing oxygen — the physics of polar lights.', tags: ['aurora', 'space weather', 'solar wind', 'geospace', 'magnetosphere'], region: 'antarctica', station: 'bharati', discipline: 'geospace', year: 2024, art: 'aurora', author: 'Ishita Mehta', sections: [['From the Sun', 'The Sun blows a stream of charged particles called the solar wind.'], ['Guided to the poles', 'Earth’s magnetic field funnels particles toward the polar regions.'], ['Colours', 'Oxygen glows green and red; nitrogen adds blue and purple.']], kids: [['Sky lights', 'Auroras are like the sky’s own light show!']], glossary: ['aurora', 'solar-wind'] },
  { key: 'what-is-ice-core', title: 'What is an ice core? A simple explainer', summary: 'How drilling into ice lets scientists read Earth’s past climate and how old the ice is.', tags: ['ice core', 'explainer', 'palaeoclimate', 'age', 'how old is the ice', 'bubbles'], region: 'antarctica', station: 'maitri', discipline: 'glaciology', year: 2024, art: 'core', author: 'Dr. Vikram Menon', sections: [['Layers of time', 'Snow piles up year after year and compresses into ice with visible layers.'], ['Trapped air', 'Tiny bubbles trap ancient air, so we can measure past CO₂.'], ['How old?', 'Deep Antarctic ice can be hundreds of thousands of years old.']], kids: [['Frozen diary', 'An ice core is like a diary written by snow!']], glossary: ['ice-core', 'annual-layer'] },
  { key: 'women-in-polar-science', title: 'Women in Indian polar science', summary: 'Stories of scientists, doctors and engineers who wintered in Antarctica (demo profiles).', tags: ['women in science', 'careers', 'inspiration', 'antarctica', 'arctic'], region: 'antarctica', discipline: 'outreach', year: 2025, art: 'aurora', author: 'Meera Kulkarni', sections: [['Pioneers', 'Early women expedition members opened doors for many who followed.'], ['Today', 'Women lead science projects at all four stations (demo).'], ['Advice', 'Build skills, find mentors and apply!']] },
  { key: 'third-pole', title: 'The Third Pole: why the Himalaya is polar too', summary: 'After Antarctica and the Arctic, the Himalaya holds the most ice on Earth.', tags: ['third pole', 'himalaya', 'glacier', 'water', 'himansh'], region: 'himalaya', station: 'himansh', discipline: 'glaciology', year: 2023, art: 'mountain', author: 'Tenzin Negi', sections: [['Lots of ice', 'Thousands of glaciers cover the Himalaya and Karakoram.'], ['Water towers', 'Rivers like the Ganga, Indus and Brahmaputra depend on snow and ice melt.'], ['Himansh', 'India’s Himansh station studies these glaciers up close.']], glossary: ['third-pole'] },
  { key: 'sea-ice-vs-icebergs', title: 'Sea ice vs icebergs: what is the difference?', summary: 'One is frozen seawater, the other is a broken piece of glacier. Here is how to tell.', tags: ['sea ice', 'iceberg', 'glacier', 'calving', 'explainer'], region: 'antarctica', discipline: 'glaciology', year: 2023, art: 'ocean', author: 'Sneha Patil', sections: [['Sea ice', 'Sea ice forms when the ocean surface freezes. It is usually a few metres thick.'], ['Icebergs', 'Icebergs break off glaciers and ice shelves — this is called calving.'], ['Sea level', 'Melting sea ice does not raise sea level much; melting land ice does.']], kids: [['Easy trick', 'Sea ice = frozen sea. Iceberg = broken glacier!']], glossary: ['sea-ice', 'calving'] },
  { key: 'satellites-watch-ice', title: 'How satellites watch the ice', summary: 'Microwaves, radar and lasers let us monitor polar ice every day from space.', tags: ['satellite', 'remote sensing', 'sea ice', 'radar', 'earth observation'], region: 'arctic', discipline: 'climate', year: 2024, art: 'night', author: 'Nikhil Reddy', sections: [['Passive microwave', 'These sensors see through clouds and darkness to map sea ice.'], ['Radar', 'Radar images show cracks, icebergs and glacier movement.'], ['Laser altimetry', 'Lasers measure ice height to track thinning.']] },
  { key: 'winter-diary', title: 'Winter-over diary: 60 days of darkness', summary: 'Excerpts from a demo winter diary at Bharati during the polar night.', tags: ['winter-over', 'polar night', 'diary', 'bharati', 'life at station'], region: 'antarctica', station: 'bharati', discipline: 'outreach', year: 2024, art: 'night', author: 'Arjun Nair', sections: [['Sunset', 'The last sunset is a big event — then the Sun does not rise for weeks.'], ['Routine', 'A steady routine keeps the team healthy and happy.'], ['Sunrise', 'When the Sun returns, everyone gathers outside to cheer.']] },
  { key: 'plastic-in-polar-seas', title: 'Microplastics have reached the polar seas', summary: 'Even the remote Southern Ocean contains tiny plastic fragments (demo survey).', tags: ['microplastics', 'pollution', 'southern ocean', 'arctic', 'environment'], region: 'southern_ocean', discipline: 'oceanography', year: 2025, art: 'ocean', author: 'Vivek Rao', sections: [['Found everywhere', 'Surface water samples contained microplastic fibres (demo).'], ['Sources', 'Fibres come from clothing, fishing gear and packaging far away.'], ['What you can do', 'Reduce single-use plastics and support clean-up drives.']] },
  { key: 'climate-tipping-points', title: 'Climate tipping points in plain language', summary: 'What happens if ice sheets or ocean currents cross a point of no return?', tags: ['tipping points', 'climate', 'ice sheet', 'amoc', 'permafrost', 'sea level'], region: 'antarctica', discipline: 'climate', year: 2025, art: 'ice', author: 'Dr. Kavya Iyer', sections: [['What is a tipping point?', 'A threshold beyond which a system changes to a new state, sometimes irreversibly.'], ['Polar examples', 'West Antarctic and Greenland ice sheets, Arctic sea ice and permafrost.'], ['Try it', 'Use our Climate Sandbox tool to explore a simple educational model.']], glossary: ['tipping-point'] },
];

const EXTRA_BLOGS: Blog[] = EXTRA.map((b, i) => ({
  id: `blog-${b.key}`,
  type: 'blog',
  slug: `blog-${b.key}`,
  title: b.title,
  summary: b.summary,
  tags: b.tags,
  region: b.region,
  station: b.station,
  discipline: b.discipline,
  year: b.year,
  authors: [b.author],
  accessLevel: 'public',
  licence: 'CC-BY-4.0',
  credit: 'NCPOR Outreach (demo)',
  createdAt: `${b.year}-${String((i % 12) + 1).padStart(2, '0')}-05`,
  updatedAt: `${b.year}-${String((i % 12) + 1).padStart(2, '0')}-05`,
  status: 'published',
  views: 2400 + ((i * 811) % 15000),
  downloads: 0,
  ownerId: b.author === 'Dr. Vikram Menon' ? 'u-scientist' : undefined,
  art: b.art,
  readingMinutes: 3 + (i % 4),
  versions: {
    general: b.sections.map(([h, body], j) => sec(`s${j + 1}`, h, body)),
    class8: b.kids?.map(([h, body], j) => sec(`k${j + 1}`, h, body)),
  },
  citations: [],
  glossaryTerms: b.glossary ?? [],
  attachments: [],
  featured: b.key === 'what-is-ice-core' || b.key === 'become-polar-scientist',
}));

export const BLOGS: Blog[] = [...TOPIC_BLOGS, ...EXTRA_BLOGS];

/* ================================= MEDIA ================================= */

const PHOTO_CAPTIONS: Record<ArtVariant, string[]> = {
  ice: ['Fast ice stretching to the horizon', 'Ablation stake on a blue-ice surface', 'Pressure ridges on coastal sea ice'],
  penguin: ['Adélie penguins on stone nests', 'Penguins crossing the fast ice', 'A crèche of fluffy chicks'],
  core: ['Ice-core section under lab lights', 'Drill tent on the ice plateau', 'Visible annual layers in a core'],
  station: ['Station modules after a blizzard', 'Weather mast against a clear sky', 'Supply vehicles at the station'],
  ocean: ['CTD rosette being lowered', 'Icebergs drifting in open water', 'Fjord waters at midnight sun'],
  ship: ['Research vessel in heavy swell', 'Net tow on the aft deck', 'Ship approaching the ice edge'],
  mountain: ['Glacier snout in the Chandra valley', 'Field camp below Himalayan peaks', 'Meltwater stream in the afternoon'],
  aurora: ['Aurora ribbons over the station', 'All-sky camera under green aurora', 'Stars and aurora above the ice'],
  night: ['Polar night over the station', 'Moonlit ice field', 'Night sky with the Milky Way'],
};

const photoFromTopic = (t: (typeof TOPICS)[number], i: number, k: number): MediaItem => {
  const caption = PHOTO_CAPTIONS[t.art][(i + k) % 3];
  const r = seededRandom(i * 13 + k);
  return {
    id: `photo-${t.key}-${k + 1}`,
    type: 'photo',
    slug: `photo-${t.key}-${k + 1}`,
    title: caption,
    summary: `${caption} — ${t.title} (demo photo).`,
    caption: `${caption}. From “${t.title}”.`,
    altText: `Illustrated scene: ${caption.toLowerCase()} in ${t.region.replace('_', ' ')}.`,
    tags: [...t.tags.slice(0, 4), 'photo'],
    region: t.region,
    station: t.station,
    discipline: t.discipline,
    year: t.year,
    expeditionId: t.expeditionId,
    authors: [t.authors[t.authors.length - 1]],
    accessLevel: 'public',
    licence: 'CC-BY-NC-4.0',
    credit: `Photo: ${t.authors[t.authors.length - 1]} / NCPOR (demo)`,
    createdAt: `${t.year}-02-${String(10 + k).padStart(2, '0')}`,
    updatedAt: `${t.year}-02-${String(10 + k).padStart(2, '0')}`,
    status: 'published',
    views: 200 + Math.round(r() * 5000),
    downloads: 20 + Math.round(r() * 400),
    art: t.art,
    width: k % 2 ? 1200 : 1600,
    height: k % 2 ? 1500 : 1000,
  };
};

const STATION_PHOTOS: MediaItem[] = (['maitri', 'bharati', 'himadri', 'himansh'] as StationSlug[]).flatMap((s, i) =>
  [0, 1, 2].map((k): MediaItem => {
    const region: Region = s === 'himadri' ? 'arctic' : s === 'himansh' ? 'himalaya' : 'antarctica';
    const art: ArtVariant = k === 0 ? 'station' : s === 'himansh' ? 'mountain' : k === 1 ? 'aurora' : 'ice';
    const caption = PHOTO_CAPTIONS[art][k];
    return {
      id: `photo-station-${s}-${k + 1}`,
      type: 'photo',
      slug: `photo-station-${s}-${k + 1}`,
      title: `${s[0].toUpperCase() + s.slice(1)}: ${caption}`,
      summary: `${caption} at ${s} station (demo photo).`,
      caption: `${caption} at ${s[0].toUpperCase() + s.slice(1)} station.`,
      altText: `Illustrated scene of ${s} station: ${caption.toLowerCase()}.`,
      tags: [s, 'station', 'photo'],
      region,
      station: s,
      discipline: 'outreach',
      year: 2016 + i * 2 + k,
      authors: ['NCPOR media team (demo)'],
      accessLevel: 'public',
      licence: 'CC-BY-4.0',
      credit: 'NCPOR media team (demo)',
      createdAt: `${2016 + i * 2 + k}-01-20`,
      updatedAt: `${2016 + i * 2 + k}-01-20`,
      status: 'published',
      views: 800 + i * 300 + k * 90,
      downloads: 60 + k * 20,
      art,
      width: 1600,
      height: k === 2 ? 1600 : 1000,
    };
  }),
);

const VIDEO_TOPICS = ['bharati-sea-ice', 'adelie-census', 'ice-core-dml', 'kongsfjorden', 'chandra-glacier', 'krill-survey', 'bharati-aurora', 'maitri-met', 'svalbard-glacier', 'so-carbon'];

const VIDEOS: MediaItem[] = VIDEO_TOPICS.map((key, i) => {
  const t = TOPICS.find((x) => x.key === key)!;
  return {
    id: `video-${key}`,
    type: 'video',
    slug: `video-${key}`,
    title: `Video: ${t.blogTitle}`,
    summary: `Short documentary (demo) about ${t.title.toLowerCase()}.`,
    caption: `Documentary short: ${t.blogTitle}.`,
    altText: `Video thumbnail illustrating ${t.title.toLowerCase()}.`,
    tags: [...t.tags.slice(0, 4), 'video'],
    region: t.region,
    station: t.station,
    discipline: t.discipline,
    year: t.year,
    expeditionId: t.expeditionId,
    authors: ['NCPOR media team (demo)'],
    accessLevel: 'public',
    licence: 'CC-BY-NC-4.0',
    credit: 'NCPOR media team (demo)',
    createdAt: `${t.year}-08-01`,
    updatedAt: `${t.year}-08-01`,
    status: 'published',
    views: 4000 + i * 1300,
    downloads: 100 + i * 20,
    art: t.art,
    width: 1920,
    height: 1080,
    durationSec: 180 + i * 25,
    transcript: `[Narrator] ${t.sections[0].body} [Scientist] ${t.sections[1].body} [Narrator] ${t.sections[2].body} (Demo transcript.)`,
    chapters: [
      { t: 0, title: 'Introduction' },
      { t: 45, title: t.sections[0].heading },
      { t: 100, title: t.sections[1].heading },
      { t: 150, title: t.sections[2].heading },
    ],
  };
});

export const MEDIA: MediaItem[] = [...TOPICS.flatMap((t, i) => [photoFromTopic(t, i, 0), photoFromTopic(t, i, 1)]), ...STATION_PHOTOS, ...VIDEOS];

/* ================================= EVENTS ================================ */

const EV: [string, EventItem['eventType'], string, string, string, Region, StationSlug | undefined, string][] = [
  ['antarctica-day-2025', 'School outreach', 'Antarctica Day school connect 2025', '2025-12-01', 'Online + 40 schools', 'antarctica', 'bharati', 'Live video call between Bharati station and students across India, with a quiz and Q&A.'],
  ['polar-workshop-2024', 'Workshop', 'Young researchers’ polar data workshop', '2024-08-19', 'NCPOR Goa', 'antarctica', undefined, 'Hands-on training on sea-ice and ice-core datasets for PhD students (demo).'],
  ['mou-university-2023', 'MoU', 'MoU with a partner university for glaciology', '2023-03-14', 'New Delhi', 'himalaya', 'himansh', 'Agreement to co-supervise students and share Himansh field facilities (demo).'],
  ['lecture-ozone-2022', 'Lecture', 'Public lecture: the ozone hole story', '2022-09-16', 'Goa Science Centre', 'antarctica', 'maitri', 'World Ozone Day lecture on measurements from Maitri.'],
  ['visit-minister-2024', 'Visit', 'Dignitaries visit NCPOR laboratories', '2024-01-22', 'NCPOR Goa', 'antarctica', undefined, 'Tour of the ice-core laboratory and data centre (demo).'],
  ['award-2023', 'Award', 'Science communication award for outreach team', '2023-11-10', 'Bengaluru', 'arctic', undefined, 'Recognition for the Polar Kids online programme (demo).'],
  ['ocean-day-2025', 'School outreach', 'World Ocean Day beach science', '2025-06-08', 'Vasco da Gama, Goa', 'indian_ocean', undefined, 'Students measured water temperature and learnt about ocean warming.'],
  ['arctic-conf-2024', 'Conference', 'Arctic science symposium', '2024-10-03', 'Online', 'arctic', 'himadri', 'Talks on Kongsfjorden, glaciers and aerosols from Himadri teams (demo).'],
  ['himalaya-camp-2025', 'Workshop', 'Himalayan glaciology field school', '2025-07-01', 'Himansh, Spiti', 'himalaya', 'himansh', 'Two-week field school on glacier mass balance and hydrology.'],
  ['science-day-2026', 'School outreach', 'National Science Day open house', '2026-02-28', 'NCPOR Goa', 'antarctica', undefined, 'Labs open to the public with polar exhibits and a Sounds of the Pole booth.'],
  ['earth-day-2026', 'Lecture', 'Earth Day talk: three poles, one planet', '2026-04-22', 'Pune', 'himalaya', undefined, 'How Antarctic, Arctic and Himalayan changes connect (demo).'],
  ['krill-workshop-2025', 'Workshop', 'Southern Ocean ecosystems workshop', '2025-02-11', 'Kochi', 'southern_ocean', undefined, 'Krill and zooplankton identification training.'],
  ['mou-space-2025', 'MoU', 'MoU on satellite sea-ice products', '2025-09-05', 'Ahmedabad', 'antarctica', 'bharati', 'Collaboration on validating satellite sea-ice products with Bharati data (demo).'],
  ['teachers-2026', 'Workshop', 'Teachers’ training: teaching climate with polar data', '2026-06-15', 'Online', 'antarctica', undefined, 'Lesson plans and worksheets for Class 6–10 teachers.'],
  ['antarctica-day-2026', 'School outreach', 'Antarctica Day 2026 live link-up', '2026-12-01', 'Online', 'antarctica', 'maitri', 'Upcoming: students talk live with the Maitri winter team.'],
];

export const EVENTS: EventItem[] = EV.map(([key, eventType, title, date, venue, region, station, description], i) => ({
  id: `event-${key}`,
  type: 'event',
  slug: `event-${key}`,
  title,
  summary: description,
  description: `${description} This is a demo institutional activity record with photos and reports linked from the archive.`,
  tags: [eventType.toLowerCase(), 'outreach', region.replace('_', ' '), ...(station ? [station] : [])],
  region,
  station,
  discipline: 'outreach',
  year: Number(date.slice(0, 4)),
  authors: ['NCPOR Outreach (demo)'],
  accessLevel: 'public',
  licence: 'CC-BY-4.0',
  credit: 'NCPOR Outreach (demo)',
  createdAt: date,
  updatedAt: date,
  status: 'published',
  views: 300 + i * 120,
  downloads: 10 + i * 3,
  art: region === 'himalaya' ? 'mountain' : region === 'arctic' ? 'aurora' : region === 'indian_ocean' || region === 'southern_ocean' ? 'ocean' : 'station',
  eventType,
  date,
  venue,
  photoIds: MEDIA.filter((m) => m.type === 'photo' && m.region === region).slice(i % 3, (i % 3) + 3).map((m) => m.id),
  reportIds: REPORTS.filter((r) => r.region === region).slice(0, 1).map((r) => r.id),
}));
