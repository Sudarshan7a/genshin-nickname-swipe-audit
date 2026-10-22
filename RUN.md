# RUN.md — full pstack run decision log (M2→M5, no stops)

## Exit predicate (all must hold)
1. `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` green.
2. All 10 M5 browser flows pass via Kimi WebBridge, evidence in VERIFY.md.

## Playbook
Feature (primary) + Autonomous run (drive without stopping).
- Feature step 1 (how): repo mapped in M0/M1 (server stub, shared/logic, entities.json shape). Done inline.
- Feature step 2 (architect): API + domain sketched below. Done inline.
- Feature step 3 (throughput checkpoint): below.
- Feature step 4 (delegate): backend + frontend+admin delegates, then review diffs.
- Feature step 5 (verify on matching surface): real browser via WebBridge.
- Feature step 6 (sequence-verifiable-units): commit per green milestone.
- Feature step 8 (Opening a PR): skip (no push asked; local branch only).

## Throughput checkpoint
- **Blocking first steps.** API contract + domain shapes defined here before fan-out. Deps installed upfront by lead (`supertest`, `framer-motion`). No delegate touches `package.json`.
- **Independent workstreams.** Backend delegate owns `server/*`, `shared/logic.js` extensions, `tests/server.test.js`. Frontend delegate owns `src/*`, `tests/queue.test.js`. Reads `data/entities.json` as contract, never writes it.
- **Shared mutable state.** `shared/logic.js` single-writer (backend delegate). Frontend treats it read-only. `data/entities.json` read-only for both.
- **Smallest safe decomposition.** Two workers, not one. Backend and frontend are large independent surfaces joined only by the contract below. Parallel halves wall time. M5 verification stays with lead (tab discipline).

## Domain (model-the-domain)
- Vote `{voterId, nicknameId, entityId, answer: heard|never|unsure}`. Idempotent upsert on `(voter_id, nickname_id)`.
- Suggestion state machine `pending → approved | rejected`. Approved suggestions merge into entity nicknames at serve time with the same stable id scheme, provenance `user-suggestion:<id>`, confidence `unknown`.
- Results per nickname `{heard, never, unsure, distinctVoters, likely}`. `likely = distinctVoters >= 5 && heard >= 0.8 * (heard + never)`. Pure `computeResults()`.
- Offline queue is a command list `[{op: vote|suggest, payload, attempts}]`, localStorage persisted, retried FIFO. Server upserts make replay idempotent.
- Deck is a per-entity state machine `unvoted → partial → complete → summary → next`. Help-queue is a separate mode.

## API contract (boundary-discipline: validate at routes, pure logic in shared/)
- Auth header `x-invite-code` (from `?code=` → localStorage). Admin adds `x-admin-code`. All `/api/*` reject without valid invite code. Bare `/` serves app; app shows code input when no stored code.
- `GET /api/entities` → `{entities}` (entities.json + approved suggestions merged).
- `POST /api/vote {nicknameId, entityId, answer}` → upsert. `DELETE /api/vote {nicknameId}` → retract (undo).
- `GET /api/my-votes` (header `x-voter-id`) → `{votes: [{nicknameId, entityId, answer, updatedAt}]}`.
- `POST /api/suggest {entityId, nickname, sourceUrl?, whereHeard?[]}` → 409 `{match}` on normalized dup vs entity nicknames or pending suggestions.
- `GET /api/results` (admin) → counts JSON. `GET /api/export` (admin) → `results.json` download `{verified: false, ...}`.
- `POST /api/admin/suggestions/:id {action: approve|reject}` (admin).
- Write routes rate-limited (in-memory sliding window). Votes DB path env `VOTES_DB` default `data/votes.db`. Backup `backups/` on startup + every 24h, keep newest 14.

## Log
| step | change | predicate moved? |
|---|---|---|
| M0+M1 | shell + ingest, 442 entities | gate green, committed `bfd3ee3` |
| M2 | backend API + storage + backups | 44 tests green, committed `f0cceeb` |
| M3+M4 | swipe UX + Teyvat design + admin | browser-verified after fixes, committed `1c26a92` |
| M5 fixes | AnimatePresence removal; ingest exclusion tightening | gate green, committed `20e14a0` |
| M5 | 10 flows via WebBridge (8 pass, 1 partial-layout, drag untestable here) | VERIFY.md written |
| E2E | Playwright suite: real drags, 44px targets, screenshots, zero console errors | 14/14 green, VERIFY.md flows 3+10 fully verified |
| LIVE | gzip + CDN vendors + per-voter limits + share script; public URL verified outside | 10/10 outside checks green, DB clean, committed |
