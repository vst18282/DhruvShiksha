/* Quick relevance check for the acceptance-criteria queries. Run: npx tsx scripts/search-check.ts */
import { SearchService } from '../lib/search';

const QUERIES = ['ice melting near bharti', 'penguins breeding report', 'cold place research India south', 'how old is the ice', 'krill', 'glaciar retret himalya'];

for (const q of QUERIES) {
  const r = SearchService.search(q);
  console.log(`\n=== ${q}  (${r.results.length} results, didYouMean=${r.didYouMean ?? '-'})`);
  console.log('concepts:', r.concepts.join(' | '));
  r.results.slice(0, 5).forEach((x, i) => console.log(`${i + 1}. [${x.item.type}] ${x.item.title}  score=${x.score.toFixed(2)}  why=${x.why.join(', ')}`));
}
