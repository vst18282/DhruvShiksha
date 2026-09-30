import type { AskQuestion, Faq, Quiz } from '@/types';

export const QUIZZES: Quiz[] = [
  {
    id: 'quiz-antarctica-basics',
    title: 'Antarctica basics',
    level: 'Class 5',
    description: 'Warm up with the coldest continent.',
    badge: 'Ice Explorer',
    questions: [
      { id: 'q1', q: 'Which is the coldest continent?', options: ['Asia', 'Antarctica', 'Europe', 'Africa'], answer: 1, explain: 'Antarctica is the coldest, windiest and driest continent.' },
      { id: 'q2', q: 'What are India’s two active Antarctic stations?', options: ['Maitri and Bharati', 'Himadri and Himansh', 'Dakshin and Gangotri', 'Vostok and Casey'], answer: 0, explain: 'Maitri and Bharati are India’s active stations in Antarctica.' },
      { id: 'q3', q: 'Which penguin builds nests of pebbles?', options: ['Emperor', 'King', 'Adélie', 'Galápagos'], answer: 2, explain: 'Adélie penguins build nests from small stones.' },
      { id: 'q4', q: 'Sea ice is made of…', options: ['Frozen rain', 'Frozen seawater', 'Glacier pieces', 'Snow only'], answer: 1, explain: 'Sea ice forms when the ocean surface freezes.' },
      { id: 'q5', q: 'The Antarctic Treaty sets Antarctica aside for…', options: ['Mining', 'Tourism only', 'Peace and science', 'Fishing'], answer: 2, explain: 'The Treaty reserves Antarctica for peaceful purposes and science.' },
    ],
  },
  {
    id: 'quiz-ice-cores',
    title: 'Ice cores and past climate',
    level: 'Class 8',
    description: 'How old is the ice and what does it remember?',
    badge: 'Time Traveller',
    questions: [
      { id: 'q1', q: 'An ice core is…', options: ['A frozen lake', 'A drilled cylinder of ice', 'An iceberg', 'A snowball'], answer: 1, explain: 'Ice cores are drilled cylinders preserving layers of past snow.' },
      { id: 'q2', q: 'How do scientists date shallow ice cores?', options: ['Counting annual layers', 'Weighing them', 'Colour only', 'Guessing'], answer: 0, explain: 'Seasonal layers are counted, like tree rings, and checked with volcanic markers.' },
      { id: 'q3', q: 'Air bubbles in ice help measure past…', options: ['Rainfall', 'CO₂ levels', 'Earthquakes', 'Tides'], answer: 1, explain: 'Bubbles trap ancient air, so we can measure past greenhouse gases.' },
      { id: 'q4', q: 'δ18O in ice is a clue to past…', options: ['Temperature', 'Population', 'Wind direction only', 'Sea depth'], answer: 0, explain: 'Oxygen isotope ratios act as a thermometer for past climate.' },
      { id: 'q5', q: 'Deeper ice is usually…', options: ['Younger', 'Older', 'The same age', 'Warmer and younger'], answer: 1, explain: 'Snow builds up on top, so deeper ice is older.' },
    ],
  },
  {
    id: 'quiz-third-pole',
    title: 'The Third Pole',
    level: 'High school',
    description: 'Glaciers, rivers and Himansh.',
    badge: 'Glacier Guardian',
    questions: [
      { id: 'q1', q: 'Why is the Himalaya called the Third Pole?', options: ['It is at the South Pole', 'It holds the most ice outside the polar regions', 'It has penguins', 'It is flat'], answer: 1, explain: 'The Himalaya–Tibet region stores the largest ice mass outside the poles.' },
      { id: 'q2', q: 'Himansh station is located in…', options: ['Ladakh', 'Spiti / Chandra basin', 'Sikkim', 'Kashmir valley'], answer: 1, explain: 'Himansh is in the Chandra basin, Lahaul–Spiti.' },
      { id: 'q3', q: 'Debris on a glacier usually…', options: ['Speeds melt always', 'Insulates the ice when thick', 'Has no effect', 'Freezes rivers'], answer: 1, explain: 'A thick debris layer insulates ice and slows melt.' },
      { id: 'q4', q: 'Glacier mass balance is negative when…', options: ['It gains more snow than it loses', 'It loses more ice than it gains', 'It is covered in debris', 'It snows in summer'], answer: 1, explain: 'Negative balance means net ice loss.' },
      { id: 'q5', q: 'Black carbon on snow…', options: ['Raises albedo', 'Lowers albedo and speeds melt', 'Has no effect', 'Creates new snow'], answer: 1, explain: 'Dark particles absorb more sunlight.' },
    ],
  },
  {
    id: 'quiz-oceans',
    title: 'Polar oceans and krill',
    level: 'Class 8',
    description: 'Fronts, krill and carbon in the Southern Ocean.',
    badge: 'Ocean Navigator',
    questions: [
      { id: 'q1', q: 'Krill are…', options: ['Fish', 'Small crustaceans', 'Plants', 'Birds'], answer: 1, explain: 'Krill are shrimp-like crustaceans.' },
      { id: 'q2', q: 'A CTD measures…', options: ['Colour, taste, depth', 'Conductivity, temperature, depth', 'Clouds, tides, dust', 'Currents only'], answer: 1, explain: 'CTD = Conductivity, Temperature, Depth.' },
      { id: 'q3', q: 'The Southern Ocean is an important…', options: ['Carbon sink', 'Desert', 'Volcano', 'Glacier'], answer: 0, explain: 'It absorbs a large share of human CO₂ emissions.' },
      { id: 'q4', q: 'Argo floats…', options: ['Fly in the sky', 'Dive and profile the ocean', 'Dig in the seabed', 'Catch fish'], answer: 1, explain: 'They profile temperature and salinity to 2,000 m.' },
      { id: 'q5', q: 'Ocean fronts are boundaries between…', options: ['Countries', 'Water masses', 'Continents', 'Clouds'], answer: 1, explain: 'Fronts separate water with different temperature and salinity.' },
    ],
  },
  {
    id: 'quiz-space-weather',
    title: 'Auroras and space weather',
    level: 'General',
    description: 'How the poles see the Sun.',
    badge: 'Aurora Hunter',
    questions: [
      { id: 'q1', q: 'Auroras are caused by…', options: ['City lights', 'Solar particles hitting the atmosphere', 'Moonlight on ice', 'Volcanoes'], answer: 1, explain: 'Charged particles excite atmospheric gases.' },
      { id: 'q2', q: 'The Kp index ranges from…', options: ['0 to 9', '1 to 100', '−5 to 5', '0 to 1'], answer: 0, explain: 'Kp is a 0–9 scale.' },
      { id: 'q3', q: 'Green aurora mostly comes from…', options: ['Nitrogen', 'Oxygen', 'Helium', 'Carbon'], answer: 1, explain: 'Atomic oxygen emits green light at ~557.7 nm.' },
      { id: 'q4', q: 'Space weather can affect…', options: ['GPS and power grids', 'Only plants', 'Only oceans', 'Nothing'], answer: 0, explain: 'Geomagnetic storms disturb GPS, radio and power systems.' },
      { id: 'q5', q: 'Aurora in the south is called…', options: ['Aurora borealis', 'Aurora australis', 'Aurora indica', 'Aurora polaris'], answer: 1, explain: 'Australis = southern.' },
    ],
  },
];

export const FAQS: Faq[] = [
  { id: 'f1', category: 'general', q: 'Is this the official NCPOR website?', a: 'No. DhruvShiksha is a demonstration concept with fictional data. It is not affiliated with any official website.' },
  { id: 'f2', category: 'data', q: 'How can I download a dataset?', a: 'Open datasets can be downloaded from the dataset page. Registered datasets need a free account; restricted datasets require an access request.' },
  { id: 'f3', category: 'data', q: 'What does “embargoed” mean?', a: 'The data will be made available after a set date, usually to allow the original team to publish first.' },
  { id: 'f4', category: 'education', q: 'Can teachers use the worksheets?', a: 'Yes, learning resources are CC-BY licensed (demo) for classroom use.' },
  { id: 'f5', category: 'careers', q: 'Can students join an expedition?', a: 'Expeditions usually include researchers and support staff selected through institutional programmes. Build a science background and watch for fellowship calls.' },
  { id: 'f6', category: 'general', q: 'How is AI used on this portal?', a: 'AI drafts summaries and social posts from archive items. Every AI draft is labelled and must be approved by a human before publishing.' },
  { id: 'f7', category: 'data', q: 'How do I cite a dataset?', a: 'Use the “Cite” button for APA, BibTeX or RIS formats including the DOI (demo).' },
  { id: 'f8', category: 'education', q: 'Is there content in Hindi and Marathi?', a: 'Yes, featured articles have Hindi and Marathi versions, and the interface can be switched to these languages.' },
];

export const ASK_QUESTIONS: AskQuestion[] = [
  { id: 'aq1', askedBy: 'Riya, Class 7, Pune', question: 'Do penguins live at the North Pole?', answer: 'No! Penguins live in the Southern Hemisphere. The Arctic has polar bears, but no penguins.', answeredBy: 'Dr. Lakshmi Pillai', status: 'answered', createdAt: '2026-05-10' },
  { id: 'aq2', askedBy: 'Kabir, Class 9, Goa', question: 'How do scientists stay warm in Antarctica?', answer: 'Layers! Thermal innerwear, fleece and a windproof outer shell. Stations are heated and well insulated.', answeredBy: 'Pooja Joshi', status: 'answered', createdAt: '2026-06-02' },
  { id: 'aq3', askedBy: 'Sara, teacher, Nagpur', question: 'Why does ice float?', answer: 'Water expands when it freezes, so ice is less dense than liquid water and floats.', answeredBy: 'Dr. Vikram Menon', status: 'answered', createdAt: '2026-06-20' },
  { id: 'aq4', askedBy: 'Aarav Naik', question: 'How old is the oldest ice ever found?', answer: 'Some Antarctic ice is estimated to be over a million years old, and scientists are drilling to find even older ice.', answeredBy: 'Dr. Vikram Menon', status: 'answered', createdAt: '2026-07-14', userId: 'u-student' },
  { id: 'aq5', askedBy: 'Aarav Naik', question: 'Can I see the aurora from India?', status: 'pending', createdAt: '2026-09-20', userId: 'u-student' },
  { id: 'aq6', askedBy: 'Meenal, Class 10, Nashik', question: 'What is the difference between weather and climate?', status: 'pending', createdAt: '2026-09-25' },
  { id: 'aq7', askedBy: 'Anonymous', question: 'Is it true there are lakes under Antarctic ice?', answer: 'Yes — hundreds of subglacial lakes exist beneath the ice sheet.', answeredBy: 'Dr. Deepa Rao', status: 'answered', createdAt: '2026-04-11' },
];

export const LEARNING_PATHS = [
  { id: 'lp-junior', level: 'Class 5–6', title: 'Polar Explorers', description: 'Penguins, ice and the coldest places on Earth.', steps: ['blog-penguin-facts-kids', 'blog-sea-ice-vs-icebergs', 'quiz-antarctica-basics', 'blog-life-at-maitri'] },
  { id: 'lp-middle', level: 'Class 7–8', title: 'Ice Detectives', description: 'How scientists read ice, oceans and the sky.', steps: ['blog-what-is-ice-core', 'blog-ice-core-dml', 'quiz-ice-cores', 'blog-aurora-explained', 'quiz-space-weather'] },
  { id: 'lp-senior', level: 'Class 9–12', title: 'Climate Investigators', description: 'Glaciers, tipping points and data you can analyse.', steps: ['blog-third-pole', 'blog-chandra-glacier', 'quiz-third-pole', 'blog-climate-tipping-points', 'quiz-oceans'] },
  { id: 'lp-public', level: 'Everyone', title: 'Why the Poles Matter', description: 'The big picture for India and the planet.', steps: ['blog-why-poles-matter-india', 'blog-antarctic-treaty', 'blog-krill-survey', 'blog-become-polar-scientist'] },
];

export const RESOURCES = [
  { id: 'res-1', title: 'Worksheet: Label the layers of an ice core', kind: 'Worksheet', level: 'Class 8', sizeKb: 420 },
  { id: 'res-2', title: 'Poster: India’s four polar stations', kind: 'Poster', level: 'All', sizeKb: 3200 },
  { id: 'res-3', title: 'Lesson plan: Sea ice vs icebergs (45 min)', kind: 'Lesson plan', level: 'Class 6', sizeKb: 280 },
  { id: 'res-4', title: 'Activity: Make your own albedo experiment', kind: 'Activity', level: 'Class 7', sizeKb: 350 },
  { id: 'res-5', title: 'Data worksheet: Plot Arctic sea-ice decline', kind: 'Worksheet', level: 'High school', sizeKb: 510 },
  { id: 'res-6', title: 'Poster: The Southern Ocean food web', kind: 'Poster', level: 'All', sizeKb: 2900 },
  { id: 'res-7', title: 'Lesson plan: Auroras and space weather', kind: 'Lesson plan', level: 'Class 9', sizeKb: 300 },
  { id: 'res-8', title: 'Colouring sheet: Penguins of Antarctica', kind: 'Activity', level: 'Class 5', sizeKb: 800 },
];

export const CAREERS = [
  { role: 'Glaciologist', path: 'BSc/MSc in Geology, Physics or Geography → PhD in cryosphere science', skills: ['Fieldwork', 'GIS & remote sensing', 'Data analysis'] },
  { role: 'Oceanographer', path: 'BSc in Physics/Chemistry/Biology → MSc Marine Science → research fellowship', skills: ['Ship-based sampling', 'Python/R', 'Instrumentation'] },
  { role: 'Atmospheric scientist', path: 'BSc Physics → MSc Atmospheric Science → PhD', skills: ['Modelling', 'Remote sensing', 'Statistics'] },
  { role: 'Polar biologist', path: 'BSc/MSc Life Sciences → PhD in ecology or microbiology', skills: ['Field surveys', 'Lab techniques', 'Ecology'] },
  { role: 'Station engineer / doctor', path: 'Engineering or medical degree → selection for expedition support roles', skills: ['Resilience', 'Teamwork', 'Technical skills'] },
  { role: 'Science communicator', path: 'Any science degree + communication/journalism training', skills: ['Writing', 'Design', 'Storytelling'] },
];

/** Virtual Expedition Diary entries (demo) keyed by expedition id. */
export const DIARIES: Record<string, { day: number; date: string; title: string; text: string; art: 'ship' | 'ice' | 'station' | 'penguin' | 'aurora' | 'mountain' | 'ocean'; fact: string }[]> = {
  'isea-39': [
    { day: 1, date: '2019-11-20', title: 'Setting sail from Goa', text: 'Our ship leaves the port loaded with a year of supplies. Everyone waves goodbye as the coast disappears.', art: 'ship', fact: 'Expedition ships carry fuel, food, spare parts and science instruments.' },
    { day: 9, date: '2019-11-28', title: 'Crossing the equator', text: 'The sea is calm and warm. We practise safety drills and set up our lab equipment.', art: 'ocean', fact: 'It takes around two to three weeks to sail from India to Antarctica.' },
    { day: 16, date: '2019-12-05', title: 'The Roaring Forties', text: 'Huge waves! The ship rolls from side to side and many of us feel seasick.', art: 'ship', fact: 'Strong westerly winds blow between 40° and 50° South.' },
    { day: 21, date: '2019-12-10', title: 'First iceberg', text: 'Someone shouts “iceberg!” and we all rush to the deck. It is bigger than a building.', art: 'ice', fact: 'Only about one-tenth of an iceberg is visible above water.' },
    { day: 24, date: '2019-12-13', title: 'Arrival at Bharati', text: 'The ship stops at the edge of the fast ice. Helicopters ferry us and cargo to the station.', art: 'station', fact: 'Bharati station is built from recycled shipping containers.' },
    { day: 30, date: '2019-12-19', title: 'Measuring the sea ice', text: 'We drill holes in the fast ice and install buoys that will measure thickness every hour.', art: 'ice', fact: 'Fast ice near Bharati can be around 1.5–2 m thick in spring (demo).' },
    { day: 38, date: '2019-12-27', title: 'Penguin neighbours', text: 'Adélie penguins waddle past our camp, carrying pebbles for their nests.', art: 'penguin', fact: 'Adélies can swim at up to 8 km/h.' },
    { day: 52, date: '2020-01-10', title: 'Early break-up', text: 'The fast ice starts breaking earlier than expected. Our buoys record every crack.', art: 'ice', fact: 'This season’s break-up came about 11 days early in our demo record.' },
    { day: 80, date: '2020-02-07', title: 'Last summer night', text: 'The Sun dips below the horizon for the first time in weeks and the sky glows pink.', art: 'aurora', fact: 'Near the poles, summer days can last 24 hours.' },
  ],
  'him-2013': [
    { day: 1, date: '2013-06-01', title: 'Leaving Manali', text: 'We drive over high passes, watching the landscape change from forests to bare rock.', art: 'mountain', fact: 'Mountain roads here can be closed by snow until June.' },
    { day: 4, date: '2013-06-04', title: 'Base camp at 4,000 m', text: 'Breathing is harder up here. We rest a day to adjust to the altitude.', art: 'mountain', fact: 'At 4,000 m there is about 40% less oxygen per breath than at sea level.' },
    { day: 10, date: '2013-06-10', title: 'Walking the glacier snout', text: 'With GPS in hand, we trace the edge of the glacier and compare it with an old map.', art: 'ice', fact: 'Glacier snouts in the demo record retreated 12–25 m per year.' },
    { day: 25, date: '2013-06-25', title: 'Installing stakes', text: 'We drill bamboo stakes into the ice to measure melt through the summer.', art: 'ice', fact: 'Stakes show how much the ice surface lowers over time.' },
  ],
};
