/* Quick check of the mock AI generator. Run: npx tsx scripts/ai-check.ts */
import { generate, rephrase, summarize, type GenerateRequest } from '../lib/mock-ai';

const base: GenerateRequest = {
  sources: [{ type: 'report', id: 'rep-bharati-sea-ice' }],
  outputType: 'social',
  platforms: ['x', 'instagram', 'linkedin'],
  languages: ['en', 'hi', 'ta'],
  tone: 'Friendly',
  difficulty: 'class8',
  scientificLevel: 1,
  includeTerms: true,
  length: 'medium',
  options: { emojis: true, hashtags: true, cta: true, citations: true, thread: true },
  attachments: { reportIds: [], imageIds: [], voiceNotes: [{ id: 'v1', name: 'note', durationSec: 10, transcript: 'The ice broke up much earlier than we expected this year.' }], specialNotes: 'mention Team Bharati, tag @partner_demo' },
  seed: 0,
};

(async () => {
  const pieces = await generate(base);
  for (const p of pieces) {
    console.log(`\n--- ${p.language} / ${p.platform} (${p.text.length} chars) translated=${p.translated ?? '-'}`);
    console.log(p.text.slice(0, 400));
    console.log('factcheck:', p.factCheck.map((f) => f.status[0]).join(''));
  }
  const r = rephrase(pieces[0], 'shorter');
  console.log('\nshorter:', r.text.length, 'vs', pieces[0].text.length);
  const v2 = await generate({ ...base, seed: 1, languages: ['en'], platforms: ['x'] });
  console.log('\nregen differs:', v2[0].text !== pieces[0].text);
  const blog = await generate({ ...base, outputType: 'blog', languages: ['en'] });
  console.log('\nblog title:', blog[0].article?.title, '| sections', blog[0].article?.sections.length);
  const s = await summarize([{ type: 'report', id: 'rep-ice-core-dml' }]);
  console.log('\nkids:', s.forKids);
})();
