import { describe, expect, it } from 'vitest';
import { SEED_ITEMS } from '@/data';
import { IMAGE_LIBRARY, imageForItem, imageForKey } from '@/lib/images';

const idOf = (title: string) => {
  const item = SEED_ITEMS.find((i) => i.title === title);
  if (!item) throw new Error(`no seed item titled “${title}”`);
  return imageForItem(item).src.split('/').pop()!.replace('.jpg', '');
};

describe('topic photos', () => {
  it('gives every seed item a photo from the library', () => {
    const files = new Set(Object.values(IMAGE_LIBRARY).map((i) => i.src));
    for (const item of SEED_ITEMS) expect(files.has(imageForItem(item).src)).toBe(true);
  });

  it('matches the photo to the title', () => {
    expect(idOf('Ozone hole monitoring from Maitri, 2008 season')).toBe('ozone-hole');
    expect(idOf('Krill: the tiny animal that runs the Southern Ocean')).toMatch(/krill|ship-deck/);
    expect(idOf('Emperor penguin sightings on fast ice near the Maitri coast')).toBe('emperor-colony');
    expect(idOf('Antarctica Day 2026 live link-up')).toBe('station-india');
    expect(idOf('Women in Indian polar science')).toBe('woman-researcher');
    expect(idOf('Rock glaciers and permafrost in Spiti')).toMatch(/rock-glacier|spiti-valley/);
  });

  it('keeps regions apart when a topic word is shared', () => {
    expect(idOf('Mass balance of Vestre Brøggerbreen glacier, Svalbard')).toMatch(/svalbard-glacier|glacier-calving/);
    expect(idOf('Glacier retreat in the Chandra basin, western Himalaya')).toMatch(/chandra-valley|himalaya-glacier|himalaya-peak/);
  });

  it('is stable for the same item and varies across a topic’s content types', () => {
    const item = SEED_ITEMS.find((i) => i.id === 'rep-chandra-glacier')!;
    expect(imageForItem(item).src).toBe(imageForItem(item).src);
    const topic = SEED_ITEMS.filter((i) => i.id.endsWith('-arctic-sea-ice'));
    expect(topic.length).toBeGreaterThan(2);
    expect(new Set(topic.map((i) => imageForItem(i).src)).size).toBeGreaterThan(1);
  });

  it('has photos for page and station keys', () => {
    for (const k of ['home-hero', 'explore-hero', 'login-aurora', 'maitri', 'bharati', 'himadri', 'himansh']) expect(imageForKey(k)).toBeTruthy();
    expect(imageForKey('not-a-key')).toBeUndefined();
  });

  it('credits every image with an author, licence and source', () => {
    for (const [id, img] of Object.entries(IMAGE_LIBRARY)) {
      expect(img.author.length, id).toBeGreaterThan(2);
      expect(img.license.length, id).toBeGreaterThan(2);
      expect(img.source.startsWith('https://commons.wikimedia.org/'), id).toBe(true);
      expect(img.alt.length, id).toBeGreaterThan(8);
    }
  });
});
