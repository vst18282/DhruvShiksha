import type { AccessRequest, AuditEntry, Notification, PressRelease, Role, SocialAccount, SocialPost, User, PlatformId, Status } from '@/types';
import { DEMO_CREDENTIALS } from '@/lib/auth/demo-users';
import { seededRandom } from '@/lib/utils';

/* ================================ USERS ================================= */

const NAMES = ['Harsh Vardhan', 'Nandini Rao', 'Imran Qureshi', 'Swati Kale', 'Gaurav Menon', 'Tanvi Shah', 'Omkar Desai', 'Fatima Sheikh', 'Rajat Kapoor', 'Bhavna Pillai', 'Siddharth Jain', 'Anjali Verma', 'Karthik Subramanian', 'Mehak Arora', 'Pranav Kulkarni', 'Shreya Ghosh', 'Yash Thakur', 'Divya Nambiar', 'Aditya Rane', 'Zoya Mirza'];
const ROLES: Role[] = ['student', 'researcher', 'scientist', 'student', 'content_manager', 'student', 'researcher', 'scientist', 'student', 'researcher'];
const ORGS = ['Demo School, Goa', 'Partner University (demo)', 'NCPOR (demo)', 'Demo College, Pune', 'Outreach Cell (demo)', 'Demo Institute, Kochi'];

export const USERS: User[] = [
  ...DEMO_CREDENTIALS.map((c) => c.user),
  ...NAMES.map((name, i): User => ({
    id: `u-${i + 1}`,
    name,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.demo`,
    role: ROLES[i % ROLES.length],
    active: i % 7 !== 3,
    org: ORGS[i % ORGS.length],
    createdAt: `202${2 + (i % 4)}-0${(i % 9) + 1}-1${i % 9}`,
    lastActive: `2026-09-${String(28 - (i % 25)).padStart(2, '0')}`,
  })),
];

/* =============================== AUDIT LOG ============================== */

const ACTIONS: [string, string][] = [
  ['uploaded', 'report'],
  ['approved', 'post'],
  ['published', 'post'],
  ['edited metadata', 'dataset'],
  ['requested access', 'dataset'],
  ['granted access', 'dataset'],
  ['changed role', 'user'],
  ['logged in', 'session'],
  ['rejected', 'post'],
  ['scheduled', 'post'],
  ['connected account', 'social account'],
  ['downloaded', 'report'],
];
const TITLES = ['Sea-ice retreat near Bharati', 'Adélie colony census', 'Ice core DML dataset', 'Chandra basin retreat', 'Antarctica Day post', 'Krill survey report', '@ncpor_india', 'Arctic aerosol dataset', 'World Ocean Day thread', 'Annual Report 2025'];

const AGENTS = ['Chrome 129 · Windows 11', 'Firefox 131 · Ubuntu 24.04', 'Safari 18 · macOS 15', 'Chrome 129 · Android 15', 'Edge 129 · Windows 11'];
const MODULES: Record<string, string> = { report: '/upload', post: '/studio', dataset: '/data', user: '/dashboard/admin?tab=users', session: '/login', 'social account': '/studio/accounts' };

export const AUDIT_LOG: AuditEntry[] = Array.from({ length: 100 }, (_, i) => {
  const r = seededRandom(i + 500);
  const actorUser = USERS[Math.floor(r() * 8)];
  const [action, itemType] = ACTIONS[Math.floor(r() * ACTIONS.length)];
  const d = new Date(Date.UTC(2026, 8, 28, 18, 0));
  d.setUTCMinutes(d.getUTCMinutes() - i * 173);
  const itemTitle = TITLES[Math.floor(r() * TITLES.length)];
  const agent = AGENTS[Math.floor(r() * AGENTS.length)];
  return {
    id: `audit-${i + 1}`,
    actor: actorUser.name,
    userId: actorUser.id,
    role: actorUser.role,
    action,
    itemType,
    itemTitle,
    at: d.toISOString(),
    // Each demo user works from a small, stable set of addresses so grouping by IP is meaningful.
    ip: `10.12.${USERS.indexOf(actorUser) * 7 + 10}.${Math.floor(r() * 3) + 20}`,
    details: `(demo) ${actorUser.name} ${action} the ${itemType} “${itemTitle}”.`,
    module: MODULES[itemType] ?? '/dashboard',
    userAgent: agent,
    durationMs: Math.round(40 + r() * 400),
  };
});

/* ============================ NOTIFICATIONS ============================= */

export const NOTIFICATIONS: Notification[] = [
  { id: 'n1', kind: 'access', title: 'New access request', body: 'Dr. Farah Siddiqui requested access to “Ice core DML dataset”.', at: '2026-09-28T09:30:00Z', read: false, roles: ['scientist', 'admin'], link: '/dashboard/scientist#requests' },
  { id: 'n2', kind: 'approval', title: 'Post awaiting approval', body: '“Why the ice near Bharati is thinning” — X thread in review.', at: '2026-09-28T08:10:00Z', read: false, roles: ['content_manager', 'admin'], link: '/studio/approvals' },
  { id: 'n3', kind: 'comment', title: 'Reviewer comment', body: 'Meera Kulkarni: “Please add the demo-data caveat to paragraph 2.”', at: '2026-09-27T16:40:00Z', read: false, roles: ['scientist'], link: '/dashboard/scientist' },
  { id: 'n4', kind: 'access', title: 'Access request approved', body: 'Your request for “Adélie colony census dataset” was approved.', at: '2026-09-26T11:00:00Z', read: false, roles: ['researcher'], link: '/dashboard/researcher' },
  { id: 'n5', kind: 'learning', title: 'New badge earned!', body: 'You earned the “Ice Explorer” badge. Keep your streak going.', at: '2026-09-27T07:00:00Z', read: false, roles: ['student'], link: '/dashboard/student' },
  { id: 'n6', kind: 'learning', title: 'A scientist answered you', body: 'Dr. Vikram Menon answered “How old is the oldest ice ever found?”', at: '2026-09-25T13:20:00Z', read: true, roles: ['student'], link: '/learn/ask-a-scientist' },
  { id: 'n7', kind: 'system', title: 'Storage at 72%', body: 'Media storage is at 72% of quota (demo).', at: '2026-09-24T05:00:00Z', read: false, roles: ['admin'], link: '/dashboard/admin' },
  { id: 'n8', kind: 'social', title: 'Scheduled post published', body: '“World Ozone Day” posted to 3 accounts.', at: '2026-09-16T04:30:00Z', read: true, roles: ['content_manager', 'admin'], link: '/studio/calendar' },
  { id: 'n9', kind: 'approval', title: 'Upload approved', body: 'Your dataset “Bharati sea-ice buoys 2025” is now published.', at: '2026-09-20T10:00:00Z', read: true, roles: ['scientist'], link: '/dashboard/scientist' },
  { id: 'n10', kind: 'system', title: 'Saved search alert', body: '3 new items match “sea ice bharati”.', at: '2026-09-23T06:00:00Z', read: false, roles: ['researcher'], link: '/explore?q=sea+ice+bharati' },
  { id: 'n11', kind: 'social', title: 'Special day coming up', body: 'Antarctica Day is on 1 December — start drafting posts.', at: '2026-09-22T06:00:00Z', read: false, roles: ['content_manager'], link: '/studio' },
  { id: 'n12', kind: 'comment', title: 'Moderation needed', body: '2 new ask-a-scientist questions are waiting.', at: '2026-09-25T09:00:00Z', read: false, roles: ['content_manager'], link: '/dashboard/content?tab=moderation' },
];

/* ============================ SOCIAL ACCOUNTS =========================== */

export const SOCIAL_ACCOUNTS: SocialAccount[] = [
  { id: 'acc-x-main', platform: 'x', handle: '@ncpor_india_demo', displayName: 'NCPOR India (demo)', followers: 84200, connected: true, purpose: 'Official announcements', connectedAt: '2024-01-10' },
  { id: 'acc-x-kids', platform: 'x', handle: '@polarkids_demo', displayName: 'Polar Kids (education)', followers: 12300, connected: true, purpose: 'Education', connectedAt: '2025-02-01' },
  { id: 'acc-ig-main', platform: 'instagram', handle: '@ncpor.polar.demo', displayName: 'NCPOR Polar (demo)', followers: 56100, connected: true, purpose: 'Photos & reels', connectedAt: '2024-03-15' },
  { id: 'acc-ig-kids', platform: 'instagram', handle: '@polarkids.demo', displayName: 'Polar Kids', followers: 9800, connected: true, purpose: 'Education', connectedAt: '2025-02-01' },
  { id: 'acc-li-main', platform: 'linkedin', handle: 'ncpor-demo', displayName: 'NCPOR – Goa (demo)', followers: 31500, connected: true, purpose: 'Institutional', connectedAt: '2024-01-10' },
  { id: 'acc-fb-outreach', platform: 'facebook', handle: 'NCPOR Outreach – Goa', displayName: 'NCPOR Outreach – Goa (demo)', followers: 42000, connected: true, purpose: 'Community', connectedAt: '2024-05-22' },
  { id: 'acc-yt-main', platform: 'youtube', handle: '@NCPORPolarDemo', displayName: 'NCPOR Polar Channel (demo)', followers: 27800, connected: true, purpose: 'Video', connectedAt: '2024-06-01' },
  { id: 'acc-wa-broadcast', platform: 'whatsapp', handle: 'Schools broadcast', displayName: 'Schools broadcast list (demo)', followers: 2400, connected: false, purpose: 'Teacher network', connectedAt: '2025-07-01' },
];

/* =============================== POSTS ================================== */

const POST_SEEDS: [string, Status, PlatformId[], string[], string, string][] = [
  ['Why the ice near Bharati is thinning', 'in_review', ['x', 'linkedin'], ['acc-x-main', 'acc-li-main'], 'rep-bharati-sea-ice', 'u-scientist'],
  ['Adélie census results', 'approved', ['instagram', 'facebook'], ['acc-ig-main', 'acc-fb-outreach'], 'rep-adelie-census', 'u-content'],
  ['How old is the ice? Ice core explainer', 'scheduled', ['x', 'instagram', 'youtube'], ['acc-x-main', 'acc-ig-main', 'acc-yt-main'], 'rep-ice-core-dml', 'u-content'],
  ['World Ozone Day: watching the ozone hole', 'published', ['x', 'facebook', 'linkedin'], ['acc-x-main', 'acc-fb-outreach', 'acc-li-main'], 'rep-ozone-maitri', 'u-content'],
  ['Krill: tiny animal, big role', 'published', ['instagram', 'x'], ['acc-ig-kids', 'acc-x-kids'], 'rep-krill-survey', 'u-content'],
  ['Chandra basin glacier retreat', 'draft', ['linkedin'], ['acc-li-main'], 'rep-chandra-glacier', 'u-scientist'],
  ['Antarctica Day countdown', 'scheduled', ['x', 'instagram', 'facebook'], ['acc-x-main', 'acc-ig-main', 'acc-fb-outreach'], 'blog-antarctic-treaty', 'u-content'],
  ['Arctic haze explained', 'changes_requested', ['x'], ['acc-x-main'], 'rep-arctic-aerosol', 'u-scientist'],
  ['Meet the emperors of the ice', 'published', ['instagram'], ['acc-ig-main'], 'rep-emperor-penguins', 'u-content'],
  ['Southern Ocean carbon sink', 'in_review', ['linkedin', 'x'], ['acc-li-main', 'acc-x-main'], 'rep-so-carbon', 'u-content'],
  ['Kongsfjorden warming thread', 'published', ['x'], ['acc-x-main'], 'rep-kongsfjorden', 'u-content'],
  ['National Science Day open house', 'published', ['facebook', 'instagram'], ['acc-fb-outreach', 'acc-ig-main'], 'event-science-day-2026', 'u-content'],
  ['Life at Maitri reel', 'published', ['instagram', 'youtube'], ['acc-ig-main', 'acc-yt-main'], 'blog-life-at-maitri', 'u-content'],
  ['Aurora season at Bharati', 'scheduled', ['instagram', 'x'], ['acc-ig-main', 'acc-x-main'], 'rep-bharati-aurora', 'u-content'],
  ['Himalayan black carbon', 'rejected', ['x'], ['acc-x-main'], 'rep-himalaya-black-carbon', 'u-scientist'],
  ['Become a polar scientist', 'published', ['linkedin', 'facebook'], ['acc-li-main', 'acc-fb-outreach'], 'blog-become-polar-scientist', 'u-content'],
  ['Earth Day: three poles', 'published', ['x', 'linkedin'], ['acc-x-main', 'acc-li-main'], 'event-earth-day-2026', 'u-content'],
  ['Sea ice vs icebergs (kids)', 'approved', ['instagram', 'x'], ['acc-ig-kids', 'acc-x-kids'], 'blog-sea-ice-vs-icebergs', 'u-content'],
  ['Svalbard glacier check-up', 'draft', ['x'], ['acc-x-main'], 'rep-svalbard-glacier', 'u-scientist'],
  ['World Ocean Day beach science', 'published', ['facebook', 'instagram'], ['acc-fb-outreach', 'acc-ig-main'], 'event-ocean-day-2025', 'u-content'],
  ['Microplastics in polar seas', 'in_review', ['x', 'facebook'], ['acc-x-main', 'acc-fb-outreach'], 'blog-plastic-in-polar-seas', 'u-content'],
  ['Cold-loving microbes', 'draft', ['linkedin'], ['acc-li-main'], 'rep-antarctic-microbes', 'u-scientist'],
  ['Teachers’ training announcement', 'published', ['whatsapp', 'facebook'], ['acc-wa-broadcast', 'acc-fb-outreach'], 'event-teachers-2026', 'u-content'],
  ['Monsoon and the Indian Ocean', 'scheduled', ['x', 'linkedin'], ['acc-x-main', 'acc-li-main'], 'rep-io-heat', 'u-content'],
  ['Tipping points explainer', 'approved', ['youtube', 'x'], ['acc-yt-main', 'acc-x-main'], 'blog-climate-tipping-points', 'u-content'],
];

function sourceType(id: string): 'report' | 'blog' | 'event' {
  return id.startsWith('rep-') ? 'report' : id.startsWith('blog-') ? 'blog' : 'event';
}

export const POSTS: SocialPost[] = POST_SEEDS.map(([title, status, platforms, accountIds, src, by], i) => {
  const r = seededRandom(i + 900);
  const created = new Date(Date.UTC(2026, 8, 27 - i, 6 + (i % 8)));
  const sched = new Date(Date.UTC(2026, 9, 1 + ((i * 3) % 60), 4 + (i % 10), 30));
  const pub = new Date(Date.UTC(2026, 8, 25 - i * 2, 5 + (i % 6)));
  const reach = Math.round(4000 + r() * 40000);
  return {
    id: `post-${i + 1}`,
    title,
    text: `${title} — new from the PolarVerse archive. Read the full story and explore the data on the portal. (Demo post)`,
    outputType: 'social',
    platforms,
    accountIds,
    language: i % 6 === 2 ? 'hi' : i % 6 === 4 ? 'mr' : 'en',
    status,
    scheduledAt: status === 'scheduled' ? sched.toISOString() : undefined,
    publishedAt: status === 'published' ? pub.toISOString() : undefined,
    createdBy: by === 'u-scientist' ? 'Dr. Vikram Menon' : 'Meera Kulkarni',
    createdByRole: by === 'u-scientist' ? 'scientist' : 'content_manager',
    createdAt: created.toISOString(),
    updatedAt: created.toISOString(),
    sources: [{ type: sourceType(src), id: src }],
    hashtags: ['#PolarScience', '#NCPOR', i % 2 ? '#Antarctica' : '#ClimateScience'],
    comments:
      status === 'changes_requested'
        ? [{ id: 'c1', author: 'Meera Kulkarni', role: 'content_manager', text: 'Please simplify the second sentence and add a source line.', at: created.toISOString() }]
        : status === 'rejected'
          ? [{ id: 'c1', author: 'Dr. Vikram Menon', role: 'scientist', text: 'Numbers are preliminary — hold until the report is final.', at: created.toISOString() }]
          : [],
    aiGenerated: i % 3 !== 1,
    metrics: status === 'published' ? { reach, impressions: Math.round(reach * 1.8), engagement: Math.round(reach * (0.03 + r() * 0.05)), clicks: Math.round(reach * 0.012) } : undefined,
  };
});

/* ============================ ACCESS REQUESTS =========================== */

export const ACCESS_REQUESTS: AccessRequest[] = [
  { id: 'ar1', itemId: 'ds-ice-core-dml', itemType: 'dataset', itemTitle: 'Dataset: Shallow ice core from coastal Dronning Maud Land', requesterId: 'u-researcher', requesterName: 'Dr. Farah Siddiqui', purpose: 'Comparing coastal δ18O records for a PhD chapter.', institution: 'Partner University (demo)', status: 'pending', createdAt: '2026-09-28T09:30:00Z' },
  { id: 'ar2', itemId: 'ds-adelie-census', itemType: 'dataset', itemTitle: 'Dataset: Adélie colony census at the Larsemann Hills', requesterId: 'u-researcher', requesterName: 'Dr. Farah Siddiqui', purpose: 'Meta-analysis of penguin breeding success.', institution: 'Partner University (demo)', status: 'approved', createdAt: '2026-09-20T09:30:00Z', decidedAt: '2026-09-26T11:00:00Z' },
  { id: 'ar3', itemId: 'rep-antarctic-microbes', itemType: 'report', itemTitle: 'Cold-loving microbes from Antarctic soils near Maitri', requesterId: 'u-2', requesterName: 'Nandini Rao', purpose: 'Enzyme screening project.', institution: 'Partner University (demo)', status: 'declined', createdAt: '2026-08-11T09:30:00Z', decidedAt: '2026-08-15T09:00:00Z' },
  { id: 'ar4', itemId: 'ds-ice-core-dml', itemType: 'dataset', itemTitle: 'Dataset: Shallow ice core from coastal Dronning Maud Land', requesterId: 'u-7', requesterName: 'Omkar Desai', purpose: 'Model–data comparison.', institution: 'Demo Institute, Kochi', status: 'pending', createdAt: '2026-09-25T09:30:00Z' },
];

/* ============================ PRESS RELEASES ============================ */

export const PRESS_RELEASES: PressRelease[] = [
  { id: 'pr1', date: '2026-03-25', title: 'Demo: 45th Antarctic expedition returns after successful season', summary: 'Team completes sea-ice, geology and geospace programmes at Bharati and Maitri (demo).', body: 'This is a demo press release. The expedition team returned after a four-month season, completing science programmes and station resupply.' },
  { id: 'pr2', date: '2025-12-01', title: 'Demo: Antarctica Day school connect reaches 40 schools', summary: 'Students across India spoke live with the Bharati winter team.', body: 'Demo press release describing a school outreach event.' },
  { id: 'pr3', date: '2025-09-05', title: 'Demo: MoU signed on satellite sea-ice validation', summary: 'Collaboration will use Bharati field data to validate satellite products.', body: 'Demo press release describing an institutional collaboration.' },
  { id: 'pr4', date: '2025-07-01', title: 'Demo: Himalayan glaciology field school opens at Himansh', summary: 'Two-week training for early-career researchers.', body: 'Demo press release.' },
];

/* ============================== ANALYTICS =============================== */

const MONTHS = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];

export const ANALYTICS = {
  monthly: MONTHS.map((m, i) => {
    const r = seededRandom(i + 77);
    return {
      month: m,
      uploads: Math.round(20 + i * 2 + r() * 15),
      visitors: Math.round(18000 + i * 1500 + r() * 6000 + (m === 'Dec' ? 9000 : 0)),
      downloads: Math.round(2200 + i * 150 + r() * 900),
      reach: Math.round(90000 + i * 9000 + r() * 30000 + (m === 'Dec' ? 60000 : 0)),
      engagement: Math.round(4000 + i * 300 + r() * 1500),
    };
  }),
  byPlatform: [
    { platform: 'X', reach: 182000, engagement: 7400 },
    { platform: 'Instagram', reach: 240000, engagement: 15600 },
    { platform: 'LinkedIn', reach: 96000, engagement: 5200 },
    { platform: 'Facebook', reach: 131000, engagement: 6100 },
    { platform: 'YouTube', reach: 88000, engagement: 4300 },
    { platform: 'WhatsApp', reach: 9000, engagement: 1400 },
  ],
  byLanguage: [
    { language: 'English', engagement: 22400 },
    { language: 'Hindi', engagement: 11800 },
    { language: 'Marathi', engagement: 5200 },
    { language: 'Tamil', engagement: 2100 },
    { language: 'Bengali', engagement: 1900 },
  ],
  bestTimes: [
    { slot: '07–09', score: 72 },
    { slot: '09–12', score: 58 },
    { slot: '12–15', score: 44 },
    { slot: '15–18', score: 61 },
    { slot: '18–21', score: 88 },
    { slot: '21–24', score: 49 },
  ],
  storage: { usedGb: 1440, quotaGb: 2000 },
};
