/**
 * Mock API layer. Every function returns a Promise with artificial latency so
 * skeleton states are exercised exactly like a real network API.
 *
 * SWAP POINT: replace the bodies with fetch() calls to a real backend
 * (e.g. `return fetch('/api/reports').then(r => r.json())`) — signatures stay the same.
 */
import type {
  AccessRequest,
  ArchiveItem,
  AuditEntry,
  Blog,
  ContentType,
  Dataset,
  EventItem,
  Expedition,
  MediaItem,
  Notification,
  Publication,
  Report,
  Role,
  SocialAccount,
  SocialPost,
  Station,
  Status,
  User,
  AskQuestion,
} from '@/types';
import { MOCK_DELAY_RANGE } from '@/lib/constants';
import { allItems, findItem, itemsOfType, publishedItems } from '@/lib/archive';
import { SearchService, type SearchFilters, type SearchResponse } from '@/lib/search';
import { STATIONS } from '@/data/stations';
import { GLOSSARY } from '@/data/glossary';
import { QUIZZES, FAQS } from '@/data/learn';
import { AUDIT_LOG, NOTIFICATIONS, ANALYTICS, PRESS_RELEASES } from '@/data/org';
import { isVisibleTo, visibilityLabel } from '@/lib/visibility';
import { useDataStore } from '@/store/data';
import { useAuthStore } from '@/store/auth';

export function delay<T>(value: T, range: [number, number] = MOCK_DELAY_RANGE): Promise<T> {
  const ms = range[0] + Math.random() * (range[1] - range[0]);
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

const store = () => useDataStore.getState();
const actor = () => useAuthStore.getState().user;

/** Record an audit entry for the signed-in actor. `details` is the short description shown in the audit pop-up. */
export function audit(action: string, itemType: string, itemTitle: string, opts: { itemId?: string; details?: string; module?: string } = {}) {
  const u = actor();
  store().addAudit({
    actor: u?.name ?? 'Visitor',
    userId: u?.id ?? 'visitor',
    role: u?.role ?? 'student',
    action,
    itemType,
    itemTitle,
    itemId: opts.itemId,
    details: opts.details,
    module: opts.module ?? (typeof window !== 'undefined' ? window.location.pathname : undefined),
    durationMs: Math.round(40 + Math.random() * 160), // simulated server time (demo)
  });
}

/* ------------------------------ Archive ------------------------------ */

export const api = {
  getHome: () => {
    const items = publishedItems();
    const s = store();
    return delay({
      stats: {
        expeditions: items.filter((i) => i.type === 'expedition').length,
        reports: items.filter((i) => i.type === 'report').length,
        datasets: items.filter((i) => i.type === 'dataset').length,
        photos: items.filter((i) => i.type === 'photo').length,
        publications: items.filter((i) => i.type === 'publication').length,
      },
      featuredExpedition: (findItem(s.curation.featuredExpeditionId) as Expedition) ?? (itemsOfType<Expedition>('expedition')[0] as Expedition),
      blogs: s.curation.featuredBlogIds.map((id) => findItem(id)).filter(Boolean) as Blog[],
      latestBlogs: itemsOfType<Blog>('blog').sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6),
      photoOfDay: itemsOfType<MediaItem>('photo')[new Date().getDate() % 40],
      banner: s.curation.banner,
      expeditions: itemsOfType<Expedition>('expedition'),
    });
  },

  list: <T extends ArchiveItem>(type: ContentType) => delay(itemsOfType<T>(type).sort((a, b) => b.year - a.year)),
  getReports: () => delay(itemsOfType<Report>('report').sort((a, b) => b.year - a.year)),
  getDatasets: () => delay(itemsOfType<Dataset>('dataset').sort((a, b) => b.year - a.year)),
  getPublications: () => delay(itemsOfType<Publication>('publication').sort((a, b) => b.year - a.year)),
  getBlogs: () => delay(itemsOfType<Blog>('blog').sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
  getMedia: () => delay(publishedItems().filter((i): i is MediaItem => i.type === 'photo' || i.type === 'video')),
  getEvents: () => delay(itemsOfType<EventItem>('event').sort((a, b) => b.date.localeCompare(a.date))),
  getExpeditions: () => delay(itemsOfType<Expedition>('expedition').sort((a, b) => a.startDate.localeCompare(b.startDate))),

  /** Fetch any item by id/slug. Unpublished items are returned only for staff roles. */
  getItem: <T extends ArchiveItem>(id: string) => {
    const it = findItem(id) as T | undefined;
    const u = actor();
    const role = u?.role;
    if (it && it.status !== 'published' && !(role === 'admin' || role === 'content_manager' || role === 'scientist' || (u && it.ownerId === u.id))) return delay(undefined);
    if (it && !isVisibleTo(it, role, u?.id)) return delay(undefined);
    return delay(it);
  },

  getStations: (): Promise<Station[]> => delay(STATIONS),
  getStation: (slug: string) => {
    const st = STATIONS.find((s) => s.slug === slug);
    const items = st ? publishedItems().filter((i) => i.station === st.slug) : [];
    return delay(st ? { station: st, items } : undefined);
  },

  search: (q: string, filters: SearchFilters): Promise<SearchResponse> => delay(SearchService.search(q, filters), [300, 700]),
  getRelated: (id: string) => {
    const it = findItem(id);
    return delay(it ? SearchService.related(it, 6) : [], [300, 800]);
  },

  getGlossary: () => delay(GLOSSARY),
  getQuizzes: () => delay(QUIZZES),
  getQuiz: (id: string) => delay(QUIZZES.find((q) => q.id === id)),
  getFaqs: () => delay(FAQS),
  getPress: () => delay(PRESS_RELEASES),

  /* ----------------------------- Uploads ----------------------------- */
  upload: (item: ArchiveItem) => {
    store().addUpload(item);
    audit(item.status === 'draft' ? 'saved upload draft' : item.status === 'published' ? 'uploaded & published' : 'uploaded for review', item.type, item.title, { itemId: item.id, details: `Status: ${item.status}. Access: ${item.accessLevel}${item.embargoUntil ? ` until ${item.embargoUntil}` : ''}. Visible to: ${visibilityLabel(item.visibleTo)}.` });
    return delay(item, [600, 1000]);
  },
  patchItem: (id: string, patch: Partial<ArchiveItem>) => {
    store().patchItem(id, patch);
    const it = findItem(id);
    const what = patch.status ? `set status: ${patch.status}` : 'visibleTo' in patch ? 'changed visibility' : 'embargoUntil' in patch || 'accessLevel' in patch ? 'changed embargo' : 'edited metadata';
    const details = Object.entries(patch)
      .filter(([k]) => k !== 'updatedAt')
      .map(([k, v]) => `${k}: ${k === 'visibleTo' ? visibilityLabel(v as SocialPost['visibleTo']) : v === undefined ? '(cleared)' : String(v)}`)
      .join('; ');
    audit(what, it?.type ?? 'item', it?.title ?? id, { itemId: id, details });
    return delay(true, [300, 600]);
  },
  /** Items in the approval pipeline (uploads + in-review seeds). */
  getPipelineItems: () => delay(allItems().filter((i) => i.status !== 'published' || i.userCreated)),

  /* ------------------------------ Posts ------------------------------ */
  getPosts: () => delay([...store().posts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))),
  getPost: (id: string) => delay(store().posts.find((p) => p.id === id)),
  savePost: (post: SocialPost) => {
    store().upsertPost({ ...post, updatedAt: new Date().toISOString() });
    audit(post.status === 'draft' ? 'saved draft' : `post ${post.status}`, 'post', post.title, { itemId: post.id, details: `Platforms: ${post.platforms.join(', ') || 'website'}. Language: ${post.language}. Visible to: ${visibilityLabel(post.visibleTo)}.` });
    return delay(post, [400, 800]);
  },
  transitionPost: (id: string, status: Status, comment?: string, extra?: Partial<SocialPost>) => {
    const p = store().posts.find((x) => x.id === id);
    if (!p) return delay(undefined);
    const u = actor();
    const next: SocialPost = {
      ...p,
      ...extra,
      status,
      updatedAt: new Date().toISOString(),
      publishedAt: status === 'published' ? new Date().toISOString() : p.publishedAt,
      comments: comment ? [...p.comments, { id: `c${Date.now()}`, author: u?.name ?? 'Reviewer', role: u?.role ?? 'content_manager', text: comment, at: new Date().toISOString() }] : p.comments,
    };
    store().upsertPost(next);
    audit(status, 'post', p.title, { itemId: id, details: comment ? `Comment: ${comment}` : `Status changed from ${p.status} to ${status}.` });
    return delay(next, [500, 900]);
  },
  setPostVisibility: (id: string, visibleTo: SocialPost['visibleTo']) => {
    const p = store().posts.find((x) => x.id === id);
    if (!p) return delay(undefined);
    const next = { ...p, visibleTo, updatedAt: new Date().toISOString() };
    store().upsertPost(next);
    audit('changed visibility', 'post', p.title, { itemId: id, details: `Now visible to: ${visibilityLabel(visibleTo)}.` });
    return delay(next, [200, 400]);
  },
  /** Public Updates feed: published posts the current viewer may see. */
  getFeed: () => {
    const u = actor();
    return delay(
      store()
        .posts.filter((p) => p.status === 'published' && isVisibleTo({ visibleTo: p.visibleTo }, u?.role, u?.id))
        .sort((a, b) => (b.publishedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.updatedAt)),
    );
  },
  deletePost: (id: string) => {
    store().removePost(id);
    return delay(true, [200, 400]);
  },

  getAccounts: () => delay(store().accounts),
  saveAccount: (acc: SocialAccount) => {
    store().upsertAccount(acc);
    audit(acc.connected ? 'connected account' : 'revoked account', 'social account', acc.handle);
    return delay(acc, [500, 900]);
  },
  removeAccount: (id: string) => {
    const a = store().accounts.find((x) => x.id === id);
    store().removeAccount(id);
    audit('removed account', 'social account', a?.handle ?? id);
    return delay(true);
  },

  /* ------------------------------ Access ------------------------------ */
  getAccessRequests: () => delay(store().accessRequests),
  requestAccess: (r: Omit<AccessRequest, 'id' | 'status' | 'createdAt'>) => {
    const req: AccessRequest = { ...r, id: `ar-${Date.now()}`, status: 'pending', createdAt: new Date().toISOString() };
    store().upsertAccessRequest(req);
    audit('requested access', r.itemType, r.itemTitle);
    return delay(req, [700, 1100]);
  },
  decideAccess: (id: string, status: 'approved' | 'declined') => {
    const r = store().accessRequests.find((x) => x.id === id);
    if (!r) return delay(undefined);
    const next = { ...r, status, decidedAt: new Date().toISOString() };
    store().upsertAccessRequest(next);
    audit(status === 'approved' ? 'granted access' : 'declined access', r.itemType, r.itemTitle);
    return delay(next, [400, 700]);
  },

  /* ------------------------------ Admin ------------------------------ */
  getUsers: (): Promise<User[]> => delay(store().users),
  saveUser: (u: User) => {
    store().upsertUser(u);
    const prev = store().users.find((x) => x.id === u.id);
    audit(prev ? (prev.active !== u.active ? (u.active ? 'activated user' : 'deactivated user') : 'updated user') : 'created user', 'user', u.email, { itemId: u.id, details: `${u.name} · ${u.role} · ${u.org}` });
    return delay(u, [400, 700]);
  },
  getAudit: (): Promise<AuditEntry[]> => delay([...store().auditExtra, ...AUDIT_LOG]),
  getAnalytics: () => delay(ANALYTICS),
  getNotifications: (role: Role): Promise<Notification[]> => {
    const read = new Set(store().readNotifications);
    return delay(NOTIFICATIONS.filter((n) => n.roles.includes(role)).map((n) => ({ ...n, read: n.read || read.has(n.id) })), [300, 600]);
  },
  markRead: (ids: string[]) => {
    store().markNotificationsRead(ids);
    return delay(true, [100, 200]);
  },

  /* ---------------------------- Ask a scientist ---------------------------- */
  getQuestions: (): Promise<AskQuestion[]> => delay(store().questions),
  askQuestion: (q: Omit<AskQuestion, 'id' | 'status' | 'createdAt'>) => {
    const item: AskQuestion = { ...q, id: `aq-${Date.now()}`, status: 'pending', createdAt: new Date().toISOString().slice(0, 10) };
    store().upsertQuestion(item);
    return delay(item, [600, 900]);
  },
  moderateQuestion: (q: AskQuestion) => {
    store().upsertQuestion(q);
    audit(`question ${q.status}`, 'question', q.question.slice(0, 40));
    return delay(q, [400, 700]);
  },
};

export type Api = typeof api;
