# DhruvShiksha · NCPOR (Demo)

**Integrated Polar Science Outreach, Knowledge Repository and Media Dissemination Portal**
Problem statement 26063 · Ministry of Earth Sciences · National Centre for Polar and Ocean Research (NCPOR), Goa · Theme: Smart Education

DhruvShiksha is a **frontend-only** Next.js application. There is no backend, database or API key: authentication, data, search and "AI" all run in the browser on fictional demo data.


> **Honesty note:** every person, number, finding, DOI and photo in this app is fictional demo content. DOIs use the `10.5555` test prefix. Social platform logos (X, Instagram, Facebook, YouTube, WhatsApp, Threads) come from the CC0 [`simple-icons`](https://simpleicons.org) package and LinkedIn's mark from its public brand assets; they are trademarks of their owners and are used only to identify each platform. Social handles, likes, dislikes and reports are demo numbers.

---

## Quick start

```bash
npm i
npm run dev        # http://localhostests :3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (type-checks and lints) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (`next/core-web-vitals`) |
| `npm run typecheck` | `tsc --noEmit` (strict mode) |
| `npm test` | Vitest unit tests (`tests/*.test.ts`): permissions, visibility, downloads/embargo, audit filters, activity summary, engagement |

Requirements: Node 18.17+ (developed on Node 25). The build downloads the Inter, Noto Sans Devanagari and Dancing Script (display cursive) fonts once through `next/font`, which self-hosts them. After that the app makes no external network calls at runtime.

## Demo credentials

The login page lists these in a collapsible card and also has one-click **Log in as** buttons. The account menu includes a **Switch role (demo)** helper, and so does the command palette (`Ctrl/Cmd + K`).

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@ncpor.demo | Admin@123 |
| Scientist | scientist@ncpor.demo | Scientist@123 |
| Content manager | content@ncpor.demo | Content@123 |
| Researcher | researcher@ncpor.demo | Researcher@123 |
| Student / audience | student@ncpor.demo | Student@123 |

The top navigation shows **icons only**; hovering or focusing a tab slides the icon left and opens its label. The tabs are Home, Explore, Expeditions, Data, Gallery, **Map** (a small menu with the 2D and 3D views), Scientific Tools and Updates. **Data** is only shown to admins, scientists, content managers and researchers — students and visitors do not see it (the `/data` route itself is still public, like the rest of the archive). Admins do not see **Home** (the logo still links there) because their work starts in the dashboard. Learn, Events and About are no longer tabs; they live in the footer and in the About → Sitemap list, and their routes still work.

Visitors who are not logged in can browse all public content. Logging in stores the session in `localStorage` (Zustand) and sets a `demo_role` cookie. `middleware.ts` reads that cookie to guard `/dashboard/*` by role and to require a login for `/studio/*` and `/upload`; those pages then check the live permission table in the browser. **This is not a security boundary.** A real deployment must verify a signed session on the server.

---

## Feature tour

| Area | Route(s) | Highlights |
| --- | --- | --- |
| Photographs | every card, hero and gallery | Freely licensed photos from Wikimedia Commons, chosen per card from its title (`lib/images.ts`), with a procedural SVG fallback and in low-bandwidth mode. Credits: About → Image credits |
| Home | `/` | Aurora hero, semantic search, animated stats, featured expedition, stream teaser, latest blogs, tools grid, station globe, photo, fact and word of the day, newsletter |
| Explore | `/explore` | Hero photographed in Spiti (the "frozen ground" of the Himalaya) behind a natural-language search bar, Filters button and suggested searches; sticky **Refine Results** sidebar (content type, region, year range, station, discipline, access, language) with live counts and an Apply step; content-type pills with counts; result cards with a topic photo, type/region badges, Featured flag, video length, event date, meta row and "why this matched" chips; list view; sort; "Did you mean"; saved searches. Everything stays in the URL so searches can be shared |
| Year-wise stream | `/expeditions`, `/expeditions/[id]` | Full-bleed photo header; meandering SVG river from 2008 to 2025 with the expedition cards alternating left and right of it in a zig-zag (single column on phones); hovering or focusing a card fades a description panel into the facing half of the row (summary, highlights, dates, leader, team size) without shifting the layout; sticky year rail with scroll-linked highlight, hover mini-map of routes, region/decade/search filters, Story/Compact modes; expedition hub tabs: overview, team, timeline, map track, reports, datasets, gallery, blogs, activities |
| Archive | `/reports`, `/data`, `/publications`, `/blog`, `/gallery`, `/events`, `/stations`, `/press`, `/about` | Full-bleed photo header on the Data catalogue (the other lists keep the plain heading), PDF-style viewer, data dictionary, chart preview, extent map, DOI, citation generator (APA/BibTeX/RIS), CSV download, access requests with embargo countdowns, reading-level switch (Expert/General/Class 8), Hindi/Marathi versions, glossary hover cards, masonry lightbox with simulated video, transcripts and chapters, calendar/list events |
| Gallery | `/gallery` | Full-bleed header with the counts; polar photo behind the whole page (it holds still while you scroll); showcase of the photo of the day and the most-viewed media in a compact frame with the title set large in cursive beside it, advancing every 3 s with arrows, dots and a pause on hover, focus, reduced motion and low bandwidth; masonry grid whose crops are picked from each item's id so the wall looks hand-laid, with type/year chips and captions on hover; **Sounds of the poles** — eight Web Audio clips where playing one stops the previous one and draws a live frequency trace beside its icon with the details below; lightbox opens wide with the caption, credit, licence, alt text, reactions, download and a link to the post the photo illustrates |
| Related content | every detail page | `<RelatedContent>`: shared tags + expedition/station/discipline + text similarity, with a "why related" hint |
| Chatbot | floating button, every page (`Ctrl + /`) | "Ask the Archive": floating topic bubbles, All / Current page scope, answer cards with key facts, citations, attachments (view/download), collapsed related row, follow-ups, feedback, copy, voice input where supported |
| Dashboards | `/dashboard/*` | Vertical sidebar (hamburger drawer on phones). Admin: overview (health summary, KPI cards with trends, interactive traffic chart, needs-attention list, content mix, publishing pipeline, users by role, recent activity, popular content, storage, social audience), users (profile pop-up, joined date, internal/external), roles & permissions (read-only, **Change** → system settings), content manager activity (summary + post queue with side panel), audit log (filters, group-by, detail pop-up, CSV), social governance (official logos, per-account profile page), content health (score from likes/dislikes, to-fix from reports and reviews), system settings (workflow, permission table, content & engagement, defaults, embargo, reset), Publishing & Insights (drafts, calendar, analytics; view only). Scientist (uploads, drafts, science review, access decisions, embargo warnings, impact); Content manager (publish directly, review queue, moderation, visibility, calendar, analytics, blog editor, homepage curation, my uploads); Researcher (my uploads, saved searches, collections, access requests, citation manager, API keys); Student (paths, badges, streak, bookmarks, questions, downloads) |
| Upload Centre | `/upload` | Scientists, researchers and content managers (per the permission table). 5-step wizard for reports, datasets, publications, media, activities and expeditions; drag-and-drop, simulated chunked progress, CSV header parsing, AI-suggested metadata with confirmation, duplicate detection, bulk mode, access/licence, embargo presets within the admin maximum, **Save as draft**; scientists and researchers submit for review, content managers **publish now** and can set who sees the item |
| Content Studio | `/studio` (+ drafts, approvals, calendar, accounts, analytics) | Source selector (current / selected / all reports / expedition), 14 languages, tone, difficulty, scientific ↔ non-scientific control, length and option toggles, images with AI alt text, voice notes (MediaRecorder with simulated transcription), special notes; multiple platforms and accounts; generate, rephrase, reiterate, translate; version history with undo/redo and compare; fact-check panel; live platform previews; per-account overrides; checklist; draft → review → approve → schedule (IST) → publish; drag-and-drop calendar; mock OAuth connect; analytics; blog, press note, newsletter and summary outputs |
| Updates | `/updates` | Full-bleed header with post count and the latest timestamp; feed grouped by month with author avatars, role, platform icons, hashtag chips and sources; sticky sidebar (search, platform filter, showing/total counts, clear); visible to every role unless a manager limited the audience; like / dislike / report, share |
| Feedback | every published item, gallery lightbox and update | Like / dislike (login required, toggles), **Report** dialog with reasons; feeds Content health. Admin can switch reactions, reporting and share buttons off |
| Learn | `/learn/*` | Learning paths with progress, A–Z glossary, 5 quizzes with badges, scrollytelling virtual expedition diary, resources, ask-a-scientist (moderated), careers |
| Polar Map | `/tools/polar-map/2d`, `/tools/polar-map/3d` | Reached from the **Map** tab in the header; two pages sharing selection, year, layers and projection settings. 2D uses React Leaflet + Proj4Leaflet (South Pole, North Pole, Himalaya, World); 3D uses `react-globe.gl`, WebGL detection and low-bandwidth fallback. Both use bundled Natural Earth coastline-only geometry (no borders, tiles or API keys), six typed demo points, tracks, year-driven illustrative sea ice, Goa arcs, search/fly-to, hover cards, responsive details, fullscreen and an accessible table. Deep links use `?point=bharati`; `/map` remains a short redirect. Data extension guide: `docs/polar-map-data.md` |
| Scientific Tools | `/tools/*` | See below |

### Scientific Tools

| Tool | Route | Notes |
| --- | --- | --- |
| Ice Core Stratigraphy | `/tools/ice-core` | 3D layered core (annual, dust, ash, bubbles); depth slider with age readout; δ18O/CO₂/CH₄/dust charts; cut-away, explode, Holocene vs Last Glacial; annotations; library of 3 cores; 2D SVG fallback |
| Sounds of the Pole | `/tools/sounds-of-the-pole` | 8 Web Audio synthesised soundscapes, mixer, presets, waveform/spectrogram, sleep timer, captions |
| Satellite & Ice Data | `/tools/satellite` | Procedural rasters on a real land mask (true colour, sea ice, SST, albedo, glacier), monthly animation, before/after swipe, area-of-interest statistics, charts with PNG/CSV export |
| Climate Sandbox | `/tools/climate-sandbox` | Toy tipping-point model (`lib/climate-model.ts`) with hysteresis and cascades; sea-level and sea-ice outputs; animated cascade diagram; India impacts; challenge mode; A/B compare |
| Geospace Observatory | `/tools/geospace` | Simulated live solar wind, Bz, Kp gauge, G-scale, X-ray class, aurora ovals over both poles, magnetometer traces with window and pause controls, alerts, event log, explainer |

All tools share `ToolLayout`, which provides how-to steps, a "science behind this" section with a reading-level switch, glossary links, related content and a demo-data note.

---

## Architecture

```
app/                    App Router routes (every route has loading.tsx; error.tsx and not-found.tsx at the root)
components/
  ui/                   shadcn-style primitives on Radix (button, dialog/sheet, tabs, select, misc…)
  common/               SectionHeader, PageHero (full-bleed page headers), EmptyState, ErrorState, StatusBadge, AiBadge, PolarImage, DataTable…
  skeletons/            Card/List/Table/Chart/Map/Globe/Detail/Chat/Search/Post skeletons
  layout/               header (gov strip, mega menu, settings), footer, command palette, notifications
  archive/ detail/ search/ expeditions/ dashboard/ admin/ approvals/ upload/ studio/ updates/ engagement/ visibility/ moderation/ chatbot/ learn/ tools/ maps/ charts/
data/                   Typed seed data (topics → reports, blogs, datasets, publications, media; expeditions, stations…)
public/images/archive/  Photographs and maps (Wikimedia Commons, resized) used across the site
lib/
  archive.ts            Merges seed data with persisted demo overrides
  images.ts             Chooses a photo per item from its title; image-library.ts holds the files and credits
  mock-api/             Async API with artificial latency (MOCK_DELAY_RANGE in lib/constants.ts)
  search/               SearchService (concepts, BM25, fuzzy correction, Fuse.js), URL sync
  mock-ai/              Generator, rephrase, translate, fact-check, summaries, upload metadata suggestions
  chat/                 Retrieval-only answer builder for the chatbot
  permissions-core.ts   Pure permission model: base table → workflow options → per-cell edits, locked cells, route roles
  permissions.ts        Runtime API: useCan(), can/canFully/grant against the live (persisted) table
  visibility.ts         Per-role visibility (isVisibleTo, presets, labels)
  access.ts             Download rules (settings + permissions) and embargo helpers
  audit.ts, activity.ts, social.ts, users.ts, engagement.ts   Pure helpers behind the admin tabs
  climate-model.ts, ice-core.ts, satellite.ts, geospace.ts, audio/soundscapes.ts, geo.ts, cite.ts, access.ts
store/                  Zustand stores: ui, auth, data (org overrides + system settings), permissions (workflow + edits), engagement (reactions, reports), user (personal), chat (session), studio (in-memory)
tests/                  Vitest unit tests for the pure modules
types/                  Domain types
middleware.ts           Demo route protection by cookie
scripts/                Verification scripts (search, chat, ai, climate); run with `npx tsx scripts/<name>.ts`
```

**Data flow:** seed files → `lib/archive.ts` (merges patches, uploads and CMS blogs from `store/data.ts`, persisted to `localStorage`) → `lib/mock-api` (Promises with a 400–1200 ms delay) → TanStack Query hooks (`hooks/use-queries.ts`) → components with skeleton states. Persisted stores are rehydrated after mount to avoid SSR hydration mismatches. **Reset demo data** is in Admin → System settings (or Settings). It also clears permission edits, workflow changes, reactions and reports.

### Roles, permissions and publishing rules

| Role | Creates content | Publishing | Admin tools |
| --- | --- | --- | --- |
| Admin | No (no composer, no upload) | Oversees drafts, calendar and analytics | Users, permissions, workflow, audit, social governance, content health, visibility, embargo |
| Content manager | Uploads, posts, blogs | **Publishes directly**; approves scientists' and researchers' work; changes visibility | Moderation, social accounts, analytics |
| Scientist | Uploads, expeditions, draft posts | Sends for approval; can mark posts science-accurate | — |
| Researcher | Uploads | Sends for approval | — |
| Student / visitor | — | — | — |

The effective permission table is computed as **default table → workflow options → edits in the permission table** (`lib/permissions-core.ts`). Workflow options (System settings) exist only for scientists and content managers; each updates the matching cells shown in Roles & permissions. An edit made directly in the permission table overrides the workflow option until it is reset, and the UI flags such conflicts. A few cells are locked so the portal stays usable (everyone can view public content, visitors can only read, admins always keep user management, the audit log and visibility control). Every change is written to the audit log.

Published content is visible to all roles by default. Content managers and admins can limit an item or post to chosen roles (`visibleTo`); the rule is applied in the archive, search, related content, the chatbot, detail pages and the Updates feed.

### How search works (`lib/search`)

1. The query is normalised (diacritics, `δ18O` → `d18o`) and alias-corrected (`bharti` → `bharati`). Unknown words are fuzzy-corrected against the index vocabulary with Levenshtein distance and a trigram fallback. Concept trigger words are protected from correction.
2. **Concept expansion** (`concepts.ts`) maps loose phrasing to archive vocabulary. For example, *melting → ablation, retreat, thaw*; *penguins → Adélie, colony*; *cold place / south → Antarctica, Maitri, Bharati*; *how old → age, dating, annual layers*.
3. **BM25** scores weighted fields (title × 3, tags × 2.4, metadata × 2, summary × 1.5, body × 1) over unigrams and bigrams.
4. **Fuse.js** adds typo-tolerant title/tag matching. Type hints ("report", "dataset") and concept preferences (research trip → expeditions) boost ranking.
5. Results carry "why matched" labels, a best-matching snippet and highlight stems.

`SearchService.search(query, filters, scope)` is the single interface, so an embedding or vector search can replace it without UI changes. Acceptance queries such as *ice melting near bharti*, *penguins breeding report*, *cold place research India south* and *how old is the ice* are checked in `scripts/search-check.ts`.

### How the mock AI works (`lib/mock-ai`)

- **Deterministic templates:** outputs are built only from the chosen sources' real demo fields (title, summary, key findings, station, year).
- **Transforms:** tone hooks, difficulty (simplification plus analogies for class levels), scientific level (jargon kept, explained or replaced), length, special notes ("mention …", "include …", "avoid jargon", `@handles`) and voice-note quotes.
- **Platform shaping:** X threads within 280 characters, Instagram carousel slides and hashtag block, LinkedIn tone, YouTube chapters, WhatsApp formatting. Separate builders handle blog articles (with SEO metadata), press notes, newsletters and summaries.
- **`seed`** rotates phrasings for Reiterate. `rephrase(piece, mode)` functions are pure.
- **Translations:** Hindi and Marathi use hand-written demo translations for featured items. Other languages return a clearly labelled placeholder.
- **Fact-check:** each output sentence is matched against source sentences by token overlap and marked supported, partial, unsupported or stylistic, with the source passage.
- **Latency:** 1–2.5 s, with skeletons and a typing reveal.

### Chatbot (`lib/chat/answer.ts`)

The chatbot is retrieval-only and never generates free text. It retrieves items through `SearchService`, scores passages against the expanded query terms, and composes a summary, key facts, citations and attachments. "Current page" restricts retrieval to the registered page item: detail pages call `useRegisterPageContext`. When nothing relevant is found it says so and suggests topics instead.

---

## Where to plug in real services

| Replace | File | Notes |
| --- | --- | --- |
| Backend API | `lib/mock-api/index.ts` | Swap function bodies for `fetch()` calls; signatures stay the same |
| Authentication | `store/auth.ts`, `middleware.ts`, `lib/auth/demo-users.ts` | Use an IdP (OAuth/SAML/Parichay) and verify signed sessions server-side |
| LLM generation | `lib/mock-ai/index.ts` → set `USE_MOCK_AI = false`, implement `callRealModel()` | Keep the `GenerateRequest` / `GeneratedPiece` contract |
| Semantic search | `lib/search/index.ts` → `SearchService.search` | Embeddings / vector DB; keep `SearchResult` shape |
| Upload metadata AI | `lib/mock-ai/suggest.ts` | Vision / document-understanding model |
| Speech-to-text | `components/studio/attachments.tsx` (`ingest`) | Replace the simulated transcript |
| File storage and downloads | `lib/downloads.ts`, `lib/upload.ts` | Signed URLs / object storage |
| Social publishing | `components/studio/publish-panel.tsx`, `components/studio/accounts-view.tsx` | Real OAuth and platform APIs |
| Globe texture | `components/maps/globe-3d.tsx` → `REAL_TEXTURE_URL` | Drop `/public/textures/earth.jpg` |
| Real audio | `lib/audio/soundscapes.ts` → `REAL_AUDIO_FILES` | Drop `/public/audio/{id}.mp3` |
| Mock latency | `lib/constants.ts` → `MOCK_DELAY_RANGE` | Set to `[0, 0]` for instant responses |

---

## Accessibility and performance

- Skip link, landmarks, visible focus rings, labelled controls, keyboard-operable maps, dialogs and menus, and `aria-live` regions for chat, search results and toasts.
- Text size control (A-/A/A+), high-contrast mode, dark mode and `prefers-reduced-motion` support. Skeleton shimmer, stream flow, typing and diary transitions all respect reduced motion.
- **Low-bandwidth mode** (header settings): hides decorative art, disables 3D (globe → 2D map, ice core → SVG) and heavy animation.
- Alt text on all media; captions and transcripts for videos and sounds; a table-of-points alternative for the map.
- Heavy modules (Recharts, three.js scenes, maps) load through `next/dynamic` with skeleton fallbacks.
- The design aims at GIGW / WCAG 2.1 AA. **Full conformance still requires manual testing with assistive technologies and an expert accessibility review, which has not been done for this demo.**

## Verification performed

- `npm run build`, `npm run lint`, `tsc --noEmit` and `npm test` (37 unit tests) pass with strict TypeScript.
- A headless-Chrome smoke test visited every public route, each tool and each role's dashboards, the Studio and Upload. It recorded **0 console or page errors**, correct 403 states (a student opening `/studio`), search ranking, chatbot page scope with answer card, and Studio generation with fact-check and previews.
- A third headless run on the production build (20 checks, 0 console errors, no failed requests) covered the redesigned Explore page: hero search, the Refine Results sidebar and its Apply step, filter chips in the URL, all eight type pills on one line, card and list views, real photos with no broken images, the About image credits, the admin navigation without **Home**, and no sideways scrolling at 390 px.
- After the admin rework, a second headless run (48 checks, 0 console errors) covered: sidebar-only admin navigation and the mobile hamburger; the user profile pop-up; Roles → Change → permission table; a permission edit blocking a researcher's upload and resetting it; activity side panel; audit filter and detail pop-up; official logos and the account profile page; admin redirects away from `/studio` and `/upload`; scientist "Submit for review / Save as draft" vs content manager "Publish now"; moderation and visibility in the content manager dashboard; likes on public pages; and a staff-only post hidden from a student's Updates feed.
- A responsive overflow check ran at 360 px and 768 px on key pages.
- Unit-style scripts in `scripts/` check search relevance, chatbot answers, the AI generator and the climate model.

## Known limitations

- All data is fictional. The "AI" is template-based and "translations" beyond the featured Hindi and Marathi items are placeholders.
- The photographs are real and freely licensed, but the archive items are not: each photo illustrates the card's topic (sea ice, penguins, a station) rather than the fictional item itself. Credits are listed on the About page.
- State lives in the browser (`localStorage` / `sessionStorage`). Different browsers or users do not share data, and clearing storage resets the demo.
- The demo auth cookie is not secure and must not be used in production.
- Uploaded files and voice notes are kept in memory only (object URLs); only their metadata is saved.
- Maps use 1:110m Natural Earth geometry, so coastlines are coarse at high zoom. Satellite images are procedural.
- The 3D tools need WebGL; performance on low-end devices may vary, and low-bandwidth mode is the fallback.
- Web Speech (voice input) and `MediaRecorder` depend on browser support; controls hide when unsupported.
- The UI language switch covers navigation and key strings only; long-form content languages are handled per article and in the Studio.
