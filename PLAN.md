# PLAN.md — Nickname Swipe Rebuild

> Status: M0 + M1 DONE (verified below). M2+ awaiting your go. No M2+ code written.

## Milestone 0 — Empty app runs, lints, tests, builds ✅ DONE
- Verified: `npm run lint` ✅, `npx tsc --noEmit` ✅, `npm test` (13 pass) ✅, `npm run build` ✅ on the M0 shell + M1 ingest.

## Milestone 0 — Empty app runs, lints, tests, builds (first, per project-kickoff)
- Files: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `src/main.tsx`, `src/App.tsx`, `server/index.js` (static stub), `.gitignore`, `.env.example` (INVITE_CODE, ADMIN_CODE, PORT), `README.md`, `AGENTS.md`, `DESIGN.md` (tokens from design-craft).
- Proves: `npm run lint && npx tsc --noEmit && npm test && npm run build && npm start` all green on empty shell.
- Note: creates new branch `feat/rebuild`; old root files (`index.html`, `js/`, `css/`, `tools/`) untouched/ignored.

## Milestone 1 — STEP 0 ingest (do before any UI) ✅ DONE
- Verified: `node scripts/ingest.mjs` prints the summary below, 0 parse failures, `npm test` (ingest + logic) green. Output `data/entities.json` (442 entities), resolutions in `DATA-NOTES.md`.
- Files: `scripts/ingest.mjs`, `data/entities.json` (generated), `DATA-NOTES.md`.
- Work:
  1. Parse `characters-export.json` (display names) + 13 character batches (label vocabulary normalize → researchConfidence; preserve source URLs ≤5-word quotes; audit missing `emilie`/`escoffier`, dup `ineffa`).
  2. Parse `artifact_sets.json` + 7 batches + corrective (corrective additive for `silkenmoonsserenade`/`songofdayspast`; resolve batch-6 misnumbering, `viridescentvenerer`/`wandererstroupe` dup; flag `OC` technical-only, 402/snippet-only evidence).
  3. Parse `weapons.json` + `weapons-research.md` + `weapons-recheck-research.md` + `weapons-no-alias-list.md` + 26 batch JSONs (precedence: recheck-verified > original-verified > batch-JSON > preliminary/snippet; preserve disagreement in `researchConfidence`/notes, never invent abbreviations).
  4. Emit normalized `entities.json`; never invent; missing → null. Print summary: counts per type, entities with 0 / 1–2 nicknames, parse failures.
- Proves: `node scripts/ingest.mjs` prints summary + `node scripts/ingest.mjs --check` exits 0; unit tests `npm test -- ingest` green. I show you the printed summary before building UI.

## Milestone 2 — STEP 2 storage & access (backend first, local only)
- Files: `server/index.js` (Express, single-port static + API), `server/db.js` (better-sqlite3, `data/votes.db`), `server/auth.js` (INVITE_CODE/ADMIN_CODE), `server/rate-limit.js`, `server/backup.js` (**nightly copy of votes.db → `backups/`**), `shared/logic.js` (pure upsert/separation/threshold/0-candidate + **suggestion-dedupe vs existing nicknames**), `tests/*.test.js`.
- Endpoints: `POST /api/vote` (upsert UNIQUE voter_id+entity_id+nickname), `GET /api/my-votes`, `POST /api/suggest` (**dedupe: reject/flag suggestions matching an existing normalized nickname**), `GET /api/results` (admin code, **results.json export**), `POST /api/admin/suggestion/:id` (approve/reject). `?code=` auto-login → localStorage; bare URL = code input only. Optimistic UI contract + offline queue spec defined here, implemented in M3.
- Proves: `npm test` (upsert, vote separation, threshold, 0-candidate, suggestion-dedupe) + `curl` smoke tests against `npm start` green.

## Milestone 3 — STEP 1 core UX (one vertical slice)
- Files: `src/App.tsx`, `src/components/EntityHeader.tsx`, `src/components/CardStack.tsx` (Framer Motion drag, stamps, spring-back, haptics), **`src/components/Tray.tsx` (bottom chips mobile with per-chip status mark, clickable to revisit; side list on desktop)**, `src/components/Summary.tsx`, `src/components/SuggestForm.tsx`, **`src/store/queue.ts` (offline queue with retry + optimistic UI)**, `src/store/auth.ts` (`?code=` auto-login → localStorage; bare URL shows one code input only), `src/styles/*`.
- Behavior: filter All/Characters/Weapons/Artifacts + search; blind-mode default ON; flip for source/quote; →←↑ keys, buttons, Undo, Skip; 0–1 nickname → suggest card "Help us out". **Zero-nickname entities stay out of the main swipe deck in a separate "Help us find names" mode (suggest form only + counter of how many still need names).** Summary → suggest → Next.
- Proves: `npm run build && npm start`, manual swipe through 3 entities (multi + 0-candidate), unit tests for queue/0-candidate; screenshots at 390px + 1440px.

## Milestone 4 — STEP 3 design + a11y + admin page
- Files: `DESIGN.md`, `src/styles/theme.css`, `src/components/Admin.tsx`, `src/components/Progress.tsx` (bar, ✓, streak display-only).
- Work: dark Teyvat theme (parchment, gold, element glow), 100dvh/safe-area, no scroll-jank, `prefers-reduced-motion`, focus states, aria-live, keyboard hints. Admin: list/approve/reject + `results.json` download.
- Proves: `ui-verify` (real browser, 375/768/1440px screenshots, console clean) + axe/manual keyboard pass.

## Milestone 5 — STEP 4 quality gate & handoff
- Files: `README.md` (run instructions), `AGENTS.md`, `results.json` sample, `PLAN.md` (checked off).
- Proves: full gate `npm run lint && npx tsc --noEmit && npm test && npm run build` + `npm start` single-port tunnel-ready + screenshot evidence. Report: what changed, verified, not verified, one next step. No merge/push.

## Open decisions for you (answer with approval or edit)
1. React + Framer Motion vs vanilla — I propose React + Framer Motion (spec names it, physics faster). OK?
2. Express vs Fastify — I propose Express (simpler single-file static+API). OK?
3. Confirm: proceed M0→M1 after approval, and I show ingest summary before any UI work (M3)?

Reply "approve" (optionally with changes) and I start at Milestone 0.
