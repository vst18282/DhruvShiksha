/* Quick check of chatbot answers. Run: npx tsx scripts/chat-check.ts */
import { answerQuestion } from '../lib/chat/answer';

const cases: [string, 'all' | 'page', { type: 'report'; id: string; title: string } | null][] = [
  ['Ice core findings', 'all', null],
  ['Bharati station', 'all', null],
  ['How to become a polar scientist', 'all', null],
  ['what is the recipe for biryani', 'all', null],
  ['summarise this', 'page', { type: 'report', id: 'rep-bharati-sea-ice', title: 'Sea-ice report' }],
  ['when did the fast ice break up', 'page', { type: 'report', id: 'rep-bharati-sea-ice', title: 'Sea-ice report' }],
  ['krill swarms', 'page', { type: 'report', id: 'rep-bharati-sea-ice', title: 'Sea-ice report' }],
];
for (const [q, s, p] of cases) {
  const a = answerQuestion(q, s, p);
  console.log(`\n=== [${s}] ${q} → found=${a.found}`);
  console.log('summary:', a.summary.slice(0, 160));
  console.log('cites:', a.citations.map((c) => c.title.slice(0, 50)).join(' | '));
  console.log('attach:', a.attachments.map((x) => x.file.name).join(', '), '| related:', a.related.length, '| follow:', a.followUps.join(' / '));
}
