/**
 * Concept / synonym expansion map. Each concept groups terms that should match each other
 * even when users phrase things loosely ("ice melting" ≈ "ablation", "penguins" ≈ "Adélie").
 * Terms are written naturally; they are normalised + stemmed at index time.
 */
export interface Concept {
  id: string;
  label: string;
  /** Phrases/words that trigger the concept in a query. */
  triggers: string[];
  /** Terms the concept expands to (searched in documents). */
  expands: string[];
  /** Optional implicit content-type preference (e.g. "research trip" → expeditions). */
  boostType?: 'expedition' | 'dataset' | 'blog';
}

export const CONCEPTS: Concept[] = [
  { id: 'melt', label: 'melting / ice loss', triggers: ['melt', 'melting', 'thaw', 'thawing', 'retreat', 'shrinking', 'shrink', 'thinning', 'losing ice', 'ice loss', 'disappearing', 'break up', 'breakup'], expands: ['melt', 'thaw', 'retreat', 'ablation', 'thinning', 'break up', 'mass balance', 'shrinking', 'loss'] },
  { id: 'penguin', label: 'penguins', triggers: ['penguin', 'penguins', 'pengiun', 'pinguin', 'adelie', 'emperor'], expands: ['penguin', 'adelie', 'emperor', 'colony', 'seabirds', 'chicks', 'creche'] },
  { id: 'breeding', label: 'breeding / nesting', triggers: ['breeding', 'breed', 'nesting', 'nest', 'babies', 'chicks', 'eggs', 'population', 'count', 'counting'], expands: ['breeding', 'nesting', 'colony', 'chicks', 'census', 'pairs', 'creche'] },
  { id: 'antarctica', label: 'Antarctica', triggers: ['south pole', 'antarctica', 'antarctic', 'antartica', 'antartic', 'southern continent', 'south', 'cold place south', 'icy continent'], expands: ['antarctica', 'antarctic', 'maitri', 'bharati', 'isea', 'southern'] },
  { id: 'polar', label: 'polar / cold regions', triggers: ['cold place', 'cold places', 'coldest', 'freezing place', 'polar', 'pole', 'poles', 'frozen'], expands: ['polar', 'antarctica', 'arctic', 'ice', 'expedition'] },
  { id: 'arctic', label: 'Arctic', triggers: ['north pole', 'arctic', 'artic', 'svalbard', 'norway', 'ny alesund', 'north'], expands: ['arctic', 'himadri', 'svalbard', 'kongsfjorden', 'ny alesund'] },
  { id: 'himalaya', label: 'Himalaya / Third Pole', triggers: ['himalaya', 'himalayas', 'himalayan', 'third pole', 'mountain', 'mountains', 'spiti', 'lahaul', 'chandra'], expands: ['himalaya', 'himalayan', 'third pole', 'himansh', 'chandra', 'spiti', 'glacier'] },
  { id: 'india', label: 'India', triggers: ['india', 'indian', 'bharat', 'our country'], expands: ['india', 'indian', 'isea', 'ncpor'] },
  { id: 'research', label: 'research / expeditions', triggers: ['research', 'study', 'studies', 'mission', 'trip', 'expedition', 'expeditions', 'voyage', 'campaign', 'survey'], expands: ['expedition', 'research', 'campaign', 'survey', 'science'], boostType: 'expedition' },
  { id: 'age', label: 'age / dating of ice', triggers: ['how old', 'old', 'oldest', 'age', 'ancient', 'history', 'past climate', 'time machine', 'years ago', 'dating'], expands: ['age', 'dating', 'annual layers', 'palaeoclimate', 'ice core', 'years', 'past'] },
  { id: 'icecore', label: 'ice cores', triggers: ['ice core', 'ice cores', 'drill', 'drilling', 'core', 'bubbles'], expands: ['ice core', 'drilling', 'annual layers', 'd18o', 'palaeoclimate', 'bubbles'] },
  { id: 'seaice', label: 'sea ice', triggers: ['sea ice', 'frozen sea', 'ice on the sea', 'pack ice', 'fast ice', 'floating ice'], expands: ['sea ice', 'fast ice', 'sea ice extent', 'ice edge'] },
  { id: 'glacier', label: 'glaciers / ice sheets', triggers: ['glacier', 'glaciers', 'ice sheet', 'ice cap', 'ice shelf', 'icefield'], expands: ['glacier', 'ice sheet', 'mass balance', 'snout', 'ablation'] },
  { id: 'ocean-warming', label: 'ocean warming / SST', triggers: ['ocean warming', 'warm ocean', 'sea temperature', 'water temperature', 'sst', 'hot sea', 'sea surface temperature', 'ocean heat'], expands: ['sea surface temperature', 'sst', 'ocean warming', 'heat content', 'atlantic water', 'temperature'] },
  { id: 'krill', label: 'krill / zooplankton', triggers: ['krill', 'zooplankton', 'shrimp', 'plankton', 'whale food'], expands: ['krill', 'zooplankton', 'plankton', 'food web'] },
  { id: 'weather', label: 'weather / climate', triggers: ['weather', 'wind', 'storm', 'blizzard', 'temperature', 'climate'], expands: ['weather', 'meteorology', 'wind', 'blizzard', 'katabatic', 'temperature', 'climate'] },
  { id: 'ozone', label: 'ozone', triggers: ['ozone', 'ozone hole', 'uv', 'ultraviolet', 'sun protection'], expands: ['ozone', 'ozone hole', 'uv', 'stratosphere', 'dobson'] },
  { id: 'aurora', label: 'aurora / space weather', triggers: ['aurora', 'southern lights', 'northern lights', 'polar lights', 'space weather', 'solar storm', 'geomagnetic', 'sky lights'], expands: ['aurora', 'geomagnetic', 'space weather', 'kp index', 'magnetometer', 'geospace'] },
  { id: 'pollution', label: 'pollution / soot', triggers: ['pollution', 'soot', 'smoke', 'dirty snow', 'black carbon', 'dust', 'haze', 'plastic', 'microplastic'], expands: ['black carbon', 'aerosol', 'pollution', 'haze', 'dust', 'microplastics'] },
  { id: 'carbon', label: 'carbon / CO₂', triggers: ['carbon', 'co2', 'carbon dioxide', 'greenhouse gas', 'carbon sink', 'acidification'], expands: ['carbon', 'co2', 'pco2', 'carbon sink', 'acidification'] },
  { id: 'water', label: 'water / rivers', triggers: ['water supply', 'river', 'rivers', 'meltwater', 'drinking water', 'water'], expands: ['meltwater', 'discharge', 'river', 'water', 'hydrology'] },
  { id: 'rocks', label: 'rocks / geology', triggers: ['rock', 'rocks', 'stone', 'geology', 'continent', 'gondwana', 'minerals'], expands: ['geology', 'rocks', 'gondwana', 'metamorphic'] },
  { id: 'microbes', label: 'microbes / life', triggers: ['microbes', 'bacteria', 'germs', 'tiny life', 'life in lakes', 'microorganisms', 'lakes'], expands: ['microbes', 'bacteria', 'microbial mats', 'psychrophile', 'lakes', 'cyanobacteria'] },
  { id: 'permafrost', label: 'permafrost / frozen ground', triggers: ['permafrost', 'frozen ground', 'frozen soil', 'rock glacier'], expands: ['permafrost', 'rock glacier', 'frozen ground'] },
  { id: 'career', label: 'careers', triggers: ['career', 'job', 'become', 'scientist', 'work in antarctica', 'how to join'], expands: ['careers', 'how to become a polar scientist', 'skills', 'education'] },
  { id: 'life', label: 'life at stations', triggers: ['life at station', 'daily life', 'live there', 'food', 'eat', 'winter', 'dark'], expands: ['life at station', 'winter over', 'food', 'daily routine', 'polar night'] },
  { id: 'satellite', label: 'satellites / remote sensing', triggers: ['satellite', 'space', 'from space', 'remote sensing', 'radar'], expands: ['satellite', 'remote sensing', 'passive microwave', 'radar'] },
  { id: 'treaty', label: 'Antarctic Treaty / policy', triggers: ['treaty', 'law', 'rules', 'who owns antarctica', 'policy'], expands: ['antarctic treaty', 'policy', 'science diplomacy'] },
  { id: 'tipping', label: 'tipping points', triggers: ['tipping point', 'tipping points', 'point of no return', 'collapse'], expands: ['tipping points', 'ice sheet', 'amoc', 'permafrost'] },
];

/** Place / station aliases and common misspellings (applied before fuzzy correction). */
export const ALIASES: Record<string, string> = {
  bharti: 'bharati',
  bharathi: 'bharati',
  bharthi: 'bharati',
  bhartiya: 'bharati',
  maitree: 'maitri',
  maithri: 'maitri',
  mitri: 'maitri',
  himadari: 'himadri',
  himadree: 'himadri',
  himanshu: 'himansh',
  himanch: 'himansh',
  antartica: 'antarctica',
  antartic: 'antarctic',
  artic: 'arctic',
  pengiun: 'penguin',
  pinguin: 'penguin',
  pengin: 'penguin',
  glaciar: 'glacier',
  glaicer: 'glacier',
  himalya: 'himalaya',
  himalayas: 'himalaya',
  krils: 'krill',
  kril: 'krill',
  auroa: 'aurora',
  arora: 'aurora',
  larseman: 'larsemann',
  schirmaker: 'schirmacher',
  svalbad: 'svalbard',
  oxygen18: 'd18o',
  d18: 'd18o',
};
