# Nickname Swipe — Rebuild (PROJECT.md)

## Purpose
Rebuild "Nickname Swipe" completely from scratch (ignore old code) to validate community nicknames for Genshin Impact characters, weapons, and artifact sets. Voters swipe through research-backed nickname candidates and answer one question per card: "Have you heard people call it this?" Results measure which nicknames are actually recognized.

## Users
- **Invite-only voters** (friends): open `?code=` link, swipe, suggest missing nicknames.
- **Admin** (you): reviews suggestions behind a separate `ADMIN_CODE`, approves/rejects, downloads `results.json`.

## Must-haves
1. **STEP 0 — Ingest (before UI):** `scripts/ingest.mjs` parses everything under `new research/` (aritfacts [sic], character, weapons) into ONE normalized `data/entities.json`: `{ id, type: character|weapon|artifact, name, imageUrl|null, nicknames: [{ text, sourceUrl|null, quote|null, researchConfidence|null }] }`. Never invent names/nicknames/sources; missing → null. Conflict rule: newer/corrective wins (list all in `DATA-NOTES.md`). Print summary: counts per type, entities with 0 / 1–2 nicknames, parse failures.
2. **STEP 1 — Core UX:** One entity at a time, type filter (All/Characters/Weapons/Artifacts) + search. Header: name + type badge (image only if `imageUrl`). Stack of nickname cards, Tinder physics (drag rotation, velocity commit, HEARD/NEVER/UNSURE stamps, spring-back, haptic). Swipe right=Heard, left=Never, up=Not sure + buttons + arrow keys (→←↑), Undo, Skip. Tap to flip for source link + quote (blind mode default ON). After last card: summary → "Add one I know" form (nickname + optional URL + where-heard chips) → Next entity. 0–1 nickname entities go straight to suggest card. Suggestions stored separately, never shown as verified, visible to others only after admin approval. Three answers stored as separate values, never merged.
3. **STEP 2 — Storage & access (local, no cloud):** Single Node server serves built frontend + JSON API, SQLite via better-sqlite3 at `data/votes.db`. Tables: `votes` (UNIQUE voter_id+entity_id+nickname, upsert), `suggestions`, `voters`. Endpoints: `POST /api/vote`, `GET /api/my-votes`, `POST /api/suggest`, `GET /api/results` (admin code), `POST /api/admin/suggestion/:id` (approve/reject). Optimistic UI + offline queue with retry. Invite `?code=` auto-login → localStorage; bare URL = one code input only. Codes from env `INVITE_CODE` / `ADMIN_CODE`. Rate-limit writes. Layout: entity header on top, bottom tray (mobile) / side list (desktop) with all nicknames as chips, clickable to revisit. Single `npm start` on one port. Admin page: review, approve/reject, download `results.json`.
4. **STEP 3 — Design:** Dark Teyvat-inspired (parchment slips, gold accents, element glow if known), NOT generic. No HoYoverse art hosted. Mobile-first thumb buttons, 100dvh, safe-area, no scroll-jank. Progress bar, ✓ per entity, daily streak display-only. Respect `prefers-reduced-motion`. A11y: buttons for every gesture, focus states, aria-live.
5. **STEP 4 — Quality:** Pure logic in shared module + unit tests (vote separation, upsert, threshold, 0-candidate handling, ingest parsing). Run tests, run app, test 390px + 1440px with screenshots.

## Non-goals
- No reuse of old code (`index.html`, `js/`, `css/`, `tools/`, root `characters-export.json` are legacy — ignore).
- No cloud DB/auth/analytics; no public access without invite code.
- No auto-promoting research candidates or user suggestions to "verified."
- No hosting HoYoverse art; `imageUrl` from research JSONs used only if present, else no image.
- No frequency/popularity claims beyond what evidence + votes support.

## Data sources (canonical)
- `new research/character/`: `characters-export.json` (124 keys) + batch-1..13 + handoff guide + START-HERE.MD.
- `new research/aritfacts/`: `artifact_sets.json` (63) + batch-1..7 + corrective-silken-song + handoff guide + START-HERE.md.
- `new research/weapons/`: `weapons.json` (255) + `research-output/weapons-research.md` + `weapons-no-alias-list.md` + `weapons-recheck-research.md` + `weapons-fetch-retry-packet.md` + `weapon research by other agent/weapons-batch-01..26.json` + guide.
- Known conflicts to resolve in DATA-NOTES.md: characters missing `emilie`/`escoffier` + duplicated `ineffa`; artifact batch-6 misnumbering + `viridescentvenerer`/`wandererstroupe` duplication + corrective additive for `silkenmoonsserenade`/`songofdayspast`; weapons `calamityofeshu CoE`, `beyondthechrysalis chrysalis` verdict differences + preliminary-vs-verified strictness.

## Stack choice
Vite + React + TypeScript + Tailwind + Framer Motion frontend with Express + better-sqlite3 backend (single `npm start` serves dist + API) — because the spec mandates single-port local serving, SQLite upserts, and Tinder physics, and this is the simplest stack that covers all three with unit-testable shared logic.

## Approved edits (2026-10-22, M1 scope)
- Nickname stable id = sha1(entityId + '::' + normalized text)[0:16]; votes key on it; re-ingest never deletes votes.
- Duplicates merged by key (ineffa, viridescentvenerer, wandererstroupe); corrective additive; batch-6 parsed by Exact key; weapons union all sources with provenance + preliminary preserved; conflicts kept as separate candidates.
- emilie/escoffier exist with zero nicknames. All zero-nickname entities stay out of the main deck in a "Help us find names" mode (suggest-only + counter).
- Bottom tray chips with status marks (side list on desktop), `?code=` auto-login, offline queue + optimistic UI, nightly votes.db → backups/, admin results.json export, suggestions deduped against existing nicknames.
