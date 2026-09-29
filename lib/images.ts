import type { ArchiveItem, Region } from '@/types';
import { hashString } from '@/lib/utils';
import { IMAGE_LIBRARY, type ImageId, type LibraryImage } from './image-library';

export { IMAGE_LIBRARY, type ImageId, type LibraryImage };

/**
 * Picks a real photograph for an archive item from its title (then its tags, then its region).
 * Rules are ordered from specific to general; the first match wins. When a rule lists several
 * images, the item id chooses one deterministically so the same item always gets the same photo.
 * Items are fictional, so the photos illustrate the topic rather than depict the item itself.
 */
type ImagePick = ImageId[] | Partial<Record<Region | 'default', ImageId[]>>;
interface Rule {
  re: RegExp;
  pick: ImagePick;
  /** Only for these content types. */
  types?: ArchiveItem['type'][];
}

const RULES: Rule[] = [
  /* Events first: they are about people and places, not the science topic in their title. */
  { types: ['event'], re: /beach|ocean day/, pick: ['beach-survey'] },
  { types: ['event'], re: /three poles|earth day|one planet/, pick: ['earth-ocean'] },
  { types: ['event'], re: /link-up/, pick: ['station-india'] },
  { types: ['event'], re: /school connect/, pick: ['aurora-station'] },
  { types: ['event'], re: /field school/, pick: ['himalaya-glacier'] },
  { types: ['event'], re: /open house|laboratories|dignitaries/, pick: ['ice-core-store'] },
  { types: ['event'], re: /teachers|lecture|workshop|symposium|award/, pick: ['lecture-hall'] },
  { types: ['event'], re: /school|students/, pick: ['students'] },

  /* Specific photo / video titles */
  { re: /annual layers|core section|ice-core section/, pick: ['ice-core-scientist', 'ice-core-store'] },
  { re: /all-sky camera|aurora ribbons|stars and aurora|southern lights|what makes the aurora/, pick: { arctic: ['aurora-arc'], default: ['aurora-station', 'aurora-buildings', 'aurora-arc', 'aurora-iceberg'] } },
  { re: /station modules|after a blizzard/, pick: { arctic: ['arctic-station'], himalaya: ['himalaya-peak'], default: ['station-modules', 'station-snow'] } },
  { re: /weather mast/, pick: ['weather-mast'] },
  { re: /supply vehicles|traverse/, pick: ['tractor-traverse'] },
  { re: /ctd rosette/, pick: ['ctd-rosette'] },
  { re: /net tow|aft deck/, pick: ['ship-deck'] },
  { re: /ice edge|approaching the ice/, pick: ['ship-ice-edge', 'icebreaker'] },
  { re: /heavy swell|roaring forties|voyage/, pick: ['ship-waves', 'research-vessel'] },
  { re: /pressure ridge/, pick: ['pressure-ridge'] },
  { re: /ablation stake|blue-ice/, pick: ['blue-ice'] },
  { re: /fjord waters|midnight sun/, pick: ['kongsfjorden-view'] },
  { re: /field camp/, pick: { himalaya: ['himalaya-glacier'], default: ['antarctic-camp'] } },
  { re: /meltwater stream|glacier snout/, pick: { himalaya: ['glacier-stream', 'himalaya-glacier'] } },
  { re: /crèche|creche|chicks|stone nests/, pick: ['adelie-chick', 'adelie-rocks'] },
  { re: /icebergs? drifting|sea ice vs icebergs/, pick: ['iceberg-tabular', 'iceberg-sculpted'] },

  /* People and institutions */
  { re: /women/, pick: ['woman-researcher'] },
  { re: /become a polar scientist/, pick: ['seal-research', 'larsemann-hills'] },
  { re: /antarctic treaty/, pick: ['antarctic-treaty'] },
  { re: /what do you eat|day in the life|life at/, pick: ['station-interior', 'station-india'] },
  { re: /winter-over|darkness/, pick: ['aurora-station'] },
  { re: /annual report/, pick: ['expedition-cargo', 'station-india'] },
  { re: /why the poles matter|three poles|one climate/, pick: ['earth-ocean', 'sea-surface-temperature'] },
  { re: /third pole/, pick: ['himalaya-peak', 'chandra-valley'] },

  /* Science topics */
  { re: /ozone/, pick: ['ozone-hole'] }, // a map is the clearest illustration, so all ozone items share it
  { re: /emperor/, pick: ['emperor-colony'] },
  { re: /penguin|adélie|adelie/, pick: ['adelie-snow', 'adelie-ridge', 'adelie-rocks', 'adelie-chick'] },
  { re: /ice core|ice-core|how old is the ice/, pick: ['ice-core-scientist', 'ice-core-store'] },
  { re: /krill|zooplankton/, pick: ['krill', 'ship-deck'] },
  { re: /phytoplankton|tiny plants|plankton/, pick: ['phytoplankton', 'earth-ocean'] },
  { re: /microplastic/, pick: ['lab-samples'] },
  { re: /microbe|bacteria|survivors|love the cold/, pick: ['microbes', 'lab-samples'] },
  { re: /lake|oasis|microbial mat/, pick: ['antarctic-lake'] },
  { re: /aurora|geomagnetic|space weather/, pick: { arctic: ['aurora-arc'], default: ['aurora-station', 'aurora-buildings', 'aurora-arc'] } },
  { re: /kongsfjorden|fjord|atlantic water/, pick: ['kongsfjorden-ice', 'kongsfjorden-view'] },
  { re: /aerosol|haze|ny-ålesund|ny-alesund|black carbon at/, pick: ['arctic-station', 'ny-alesund'] },
  { re: /svalbard|brøggerbreen|arctic glacier|mass-balance|mass balance/, pick: ['svalbard-glacier', 'glacier-calving'] },
  { re: /\barctic (summer )?sea[ -]ice|summer ice of the arctic|september minimum/, pick: ['arctic-melt-ponds', 'arctic-ice-scientist', 'sea-ice-satellite', 'pressure-ridge'] },
  { re: /satellite|sea-ice extent|sea ice go|watch the ice/, pick: ['sea-ice-satellite', 'arctic-melt-ponds'] },
  { re: /fast ice|sea ice|sea-ice|thinning/, pick: ['sea-ice-floes', 'sea-ice-mountains', 'fast-ice'] },
  { re: /tipping point|climate change/, pick: ['glacier-calving'] },
  { re: /permafrost|rock glacier|frozen ground/, pick: ['rock-glacier', 'spiti-valley'] },
  { re: /spiti/, pick: ['spiti-valley'] },
  { re: /black carbon|soot|dust|dirty snow|snow cover/, pick: ['himalaya-satellite', 'himalaya-peak'] },
  { re: /meltwater|river|following the water|discharge|hydrology/, pick: ['glacier-stream', 'ladakh-river', 'braided-river'] },
  { re: /chandra|himansh|himalaya|glaciolog/, pick: ['chandra-valley', 'himalaya-glacier', 'himalaya-peak'] },
  { re: /fronts|sea surface temperature|invisible walls|\bsst\b/, pick: ['sea-surface-temperature', 'ship-waves'] },
  { re: /monsoon|indian ocean|ocean heat|argo/, pick: ['indian-ocean', 'monsoon-clouds'] },
  { re: /carbon|co2|breathes/, pick: ['ship-waves', 'research-vessel'] },
  { re: /geology|gondwana|rocks|neighbours/, pick: ['rock-formation', 'larsemann-hills'] },
  { re: /larsemann/, pick: ['larsemann-hills'] },
  { re: /weather|katabatic|blizzard|meteorolog/, pick: ['weather-mast', 'station-snow'] },
  { re: /indian scientific expedition|isea|expedition summary/, pick: ['ship-ice-edge', 'station-india', 'expedition-cargo', 'icebreaker'] },
  { re: /arctic campaign|himadri/, pick: ['ny-alesund', 'arctic-station'] },
  { re: /southern ocean|research vessel|cruise/, pick: ['research-vessel', 'orange-icebreaker'] },
  { re: /maitri|bharati|station/, pick: ['station-india', 'station-snow', 'station-modules'] },
  { re: /glacier/, pick: { arctic: ['svalbard-glacier'], himalaya: ['himalaya-glacier'], default: ['blue-ice', 'iceberg-sculpted'] } },
  { re: /iceberg/, pick: ['iceberg-sculpted', 'iceberg-tabular'] },
  /* Remaining events (MoUs etc. already matched their topic above) */
  { types: ['event'], re: /./, pick: ['lecture-hall'] },
];

const REGION_FALLBACK: Record<Region, ImageId[]> = {
  antarctica: ['sea-ice-mountains', 'fast-ice', 'iceberg-sculpted'],
  arctic: ['kongsfjorden-view', 'svalbard-glacier'],
  himalaya: ['himalaya-peak', 'chandra-valley'],
  southern_ocean: ['research-vessel', 'orange-icebreaker'],
  indian_ocean: ['indian-ocean'],
};

type ImageSubject = Pick<ArchiveItem, 'id' | 'type' | 'title' | 'tags' | 'region'>;

/** Demo ids share a topic suffix (rep-ozone-maitri, ds-ozone-maitri, blog-ozone-maitri…). */
const topicKey = (id: string) => id.replace(/^(rep|ds|pub|blog|up)-/, '');
const TYPE_OFFSET: Record<ArchiveItem['type'], number> = { report: 0, dataset: 1, publication: 2, blog: 3, photo: 4, video: 5, event: 6, expedition: 7 };

/**
 * Same topic, different content type → different photo (when the rule offers more than one),
 * so a report, its dataset and its publication don't show three identical cards side by side.
 */
function choose(ids: ImageId[], item: ImageSubject): LibraryImage {
  return IMAGE_LIBRARY[ids[(hashString(topicKey(item.id)) + TYPE_OFFSET[item.type]) % ids.length]];
}

function resolvePick(p: ImagePick, region: Region): ImageId[] | undefined {
  if (Array.isArray(p)) return p;
  return p[region] ?? p.default;
}

/** The photo that illustrates an item (never undefined: falls back to the item's region). */
export function imageForItem(item: ImageSubject): LibraryImage {
  const title = item.title.toLowerCase();
  const tags = item.tags.join(' ').toLowerCase();
  for (const text of [title, tags]) {
    for (const r of RULES) {
      if (r.types && !r.types.includes(item.type)) continue;
      if (!r.re.test(text)) continue;
      const ids = resolvePick(r.pick, item.region);
      if (ids?.length) return choose(ids, item);
    }
  }
  return choose(REGION_FALLBACK[item.region], item);
}

/** Non-item artwork keys used across the site (station pages, page heroes). */
const KEYED: Record<string, ImageId> = {
  maitri: 'station-india',
  bharati: 'larsemann-hills',
  himadri: 'arctic-station',
  himansh: 'himalaya-glacier',
  'home-hero': 'hero-aurora',
  'login-aurora': 'aurora-station',
  'learn-hero': 'adelie-snow',
  'explore-hero': 'hero-spiti',
};

export function imageForKey(key: string): LibraryImage | undefined {
  const id = KEYED[key];
  return id ? IMAGE_LIBRARY[id] : undefined;
}

export const HERO_IMAGE = IMAGE_LIBRARY['hero-aurora'];
/** Explore page hero: the Spiti valley photo from “Frozen ground: the hidden ice of the Himalaya”. */
export const EXPLORE_HERO_IMAGE = IMAGE_LIBRARY['hero-spiti'];
