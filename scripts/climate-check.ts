/* Sanity check for the toy climate model. Run: npx tsx scripts/climate-check.ts */
import { simulate } from '../lib/climate-model';

for (const [pathway, peak] of [['low', 1.6], ['medium', 2.7], ['high', 4.4]] as const) {
  const r = simulate({ pathway, peak, horizon: 2100, overshoot: 10 });
  console.log(pathway, 'peak', r.peakWarming, 'SLR', r.seaLevel2100, r.elements.map((e) => `${e.id}:${e.state}${e.tippedYear ? '@' + e.tippedYear : ''}`).join(' '));
}
