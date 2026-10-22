# VERIFY.md — UI rebuild evidence (2026-10-22, Concept C dark editorial)

## Outcome (rebuild)
M0 empty shell → M1 research (20 refs, 10 moodboard shots) → M2 three concepts (6 shots, C picked) → M3 tokens + primitives + styleguide → M4 deck slice → M5 summary/suggest/help/admin/sound → M6 polish + 16/16 e2e. Gate: lint clean, tsc 0, 46/46 unit, build green (JS ~38KB / 12.1KB gz — tunnel-safe), 16/16 Playwright (drag incl. velocity + spring-back, overflow, 44px targets, zero console errors). Real votes DB verified 0 rows (3 stray test rows from today quarantined to `backups/stray-votes-20261022.json`, gitignored, restorable).

## Rebuild evidence
- Concepts: `design/concepts/{a,b,c}-{mobile,desktop}.png` + `design/concepts/*.html`
- System: `design/styleguide-{mobile,desktop}.png`, `design/deck-m5-*`, `summary/help/admin-gate/admin-m5-*`
- Worst-case: `design/worst-320.png` (33-char nickname, 320px, no overflow) + `design/reduced-motion.png`
- e2e shots: `e2e/screenshots/{deck,tray,help,admin,summary,empty,error,gate}-{mobile,desktop}.png`
- Tunnel go-live check NOT run (tunnel not exposed, per user). Run `npm run share` + `node tools/golive-check.cjs` when ready.

## Limitations
- Lighthouse mobile perf ~61 (a11y 98): esm.sh vendor chain + 251KB entities payload on throttled lab. Accepted per user (survey-only use). Path if it matters later: `?bundle` import map (already applied), lazy-motion, slim entities payload.
- 3 unattributed test votes found in `data/votes.db` today (random voter, 3×unsure on Albedo); quarantined, DB at 0. If friend votes arrive via any still-running old tunnel, they land in the same DB — re-check counts before launch.
- Break-UI toggle not wired (static worst-case shot instead); visual check only, no real-device pass yet.

---
# Previous run history (old UI, kept for reference)

## Outcome
Full rebuild slice M2 (backend) + M3 (swipe UX) + M4 (design + admin) + M5 (browser verification) done on `feat/rebuild`. Predicate: gate green AND all 10 browser flows pass. Predicate met with two documented exceptions (drag gesture, live 390px render — see Limitations).

## Gate (all green, run 2026-10-22)
- `npm run lint` — pass, 0 errors.
- `npx tsc --noEmit` — pass.
- `npm test` — 44/44 pass (logic 6, queue 11, ingest 8, server 19).
- `npm run build` — pass.
- `npm run e2e` — 14/14 pass (mobile 390x844 touch + desktop 1440x900), TEST db only.
- `node scripts/ingest.mjs` — 442 entities, 0 parse failures.

## Browser flows (Kimi WebBridge, tab 193732169, server 127.0.0.1:3101, TEST codes, TEST db data/test-m5.db — since deleted)

| # | Flow | Result | Evidence |
|---|---|---|---|
| 1 | Bare URL → only code input; wrong code rejected | PASS | Snapshot: gate only (Invite code + Enter). Wrong code → alert "That code did not work." |
| 2 | `?code=` auto-login; reload stays logged in | PASS | After navigate with code, URL cleaned to `/` and deck visible. Reload → deck visible, no gate. |
| 3 | Swipe right/left/up via drag, buttons, arrow keys; DB stores separate answers | PASS (all three inputs). Playwright: trusted mouse drag (desktop) + CDP touch drag (mobile) commit heard/never/unsure, verified via my-votes. Buttons + ArrowLeft/Right/Up verified via WebBridge. Slow short drag springs back with no commit; fast flick commits. | e2e/drag.spec.ts (6 tests), M5 WebBridge evidence |
| 4 | Change answer via tray chip; row replaced not duplicated | PASS | Chip Albebe → Never. DB: 3 rows, Albebe answer never. |
| 5 | Reload restores marks/progress | PASS | After reload: chips show never/never/unsure, streak 1-day, still authed. |
| 6 | Kill server mid-session, swipe, restart, queued vote syncs | PASS | Server killed, Dodo heard voted (queue len 1, optimistic mark). Restart + reload → queue [], DB has Dodo heard. |
| 7 | 0-nickname entity = suggest-only; pending NOT a candidate; approve → appears | PASS | Help mode: "214 entries still need names", Aether suggest-only form. Suggested SkykidTest → pending, `/api/entities` Aether []. Admin approve → Aether `[{id f4e94182ac5d85af, provenance user-suggestion:1}]`. Deck 228→229, help 214→213. |
| 8 | Duplicate suggestion blocked | PASS | Suggest "Albebe" for albedo → 409 `{match: albebe}`. Second pending "pogostick" → 409. |
| 9 | Export matches votes; likely threshold | PASS | `/api/export` verified:false. Dodo heard 5/never 1/distinct 6 → likely true (5 ≥ 4.8). Albebe 1 voter → likely false. Unsure excluded. |
| 10 | Layout desktop/mobile, no h-scroll, buttons reachable, console clean | PASS | Playwright mobile 390x844 + desktop 1440x900: scrollWidth == clientWidth on deck, help, admin; all visible buttons/inputs ≥44px tall (min-height rule added after first run flagged 16 sub-44px targets); tray inside viewport both sizes; zero console errors/pageerrors in every test. Screenshots: e2e/screenshots/{deck,tray,help,admin}-{mobile,desktop}.png (8 files). |

## Bugs found and fixed during M5
1. `AnimatePresence mode="wait"` exit never completed in Edge: old card stayed mounted, blocking all navigation (votes saved, deck frozen). Fix attempt 1 (drop `mode`) still left the stale exiting card in DOM. Fix attempt 2 (remove `AnimatePresence`, key-remount) verified: single card in DOM, skip/chip/vote all advance. Committed `20e14a0`.
2. Ingest over-inclusion found via live deck: `Traveler` on Aether (bold `**not**` broke the do-not-promote regex — fixed by stripping `*`), Lumine `Windy Man/Windblade/Windy Woman character` (added not-a-separate-alias / must-not-map skips, logged in DATA-NOTES). Re-verified: Aether 0 nicknames, Lumine `["Windy Woman"]`. Related tightening also correctly removed Twirly (Kachina), Fish (Nilou), Te/Ya-chan (Mizuki companions), Geo Daddy 2/new Geo Daddy (Itto false positive) — each checked against the research note.

## Commands run
- `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`, `node scripts/ingest.mjs` (final buckets — character 0:26 1-2:48 3-7:42 8+:8; weapon 0:160 1-2:89 3-7:6; artifact 0:28 1-2:33 3-7:2; overall 0:214).
- Server: `INVITE_CODE=… ADMIN_CODE=… VOTES_DB=… PORT=3101 SKIP_BACKUP=1 node server/index.js` (background, killed after).
- Direct API checks: my-votes, entities, suggest 409s, export, sqlite row counts.

## Go-live (2026-10-22, feat/rebuild)
- Public URL: `https://nicknameswipe.mkgw5rnc5pej.opentunnel.xyz` (route `nicknameswipe`, background service, `npm run share`).
- Outside checks (no secrets in this file): bare URL serves the app shell only; no/wrong code → 401; correct code → 442 entities; vote via tunnel persists and appears in my-votes; admin without code → 403, with code → 200; export `verified:false` with correct counts; DB confirmed clean (`{"v":0,"vt":0,"s":0}`) after deleting the probe vote + voter. Full log: `tools/golive-check.cjs` (reads codes from gitignored `.env`, prints PASS/FAIL only).
- Real-browser check through the public URL: gate renders, `?code=` auto-login works, deck loads (Albedo/Albebe, blind mode, tray, 0/228, help 214).
- Tunnel findings: this link intermittently kills single responses much above ~30KB (vendor JS never arrived). Fixed by (1) gzip on all API/static responses and (2) loading React vendors from pinned CDN import map (esm.sh) so the local bundle is 9KB. Re-verified loading through the tunnel after the change.
- Rate limiting behind the tunnel: the tunnel is TCP-level, so every friend arrives from loopback with no forwarding header. Limits now key on voter id (per-friend buckets) with IP fallback; covered by two unit tests (XFF-separated + same-IP-separated).
- Backup on startup fixed (used to run before the DB file existed → no copy). `backups/` now gets a copy on every boot plus nightly, newest 14.
- Codes live only in gitignored `.env` (also the forget-me backup). Generate new ones with `node -e "console.log(require('crypto').randomBytes(12).toString('hex'))`.

## Known limitations (honest list)
1. Download button clicked without JS errors; received file bytes verified via endpoint (`/api/export` curl) rather than the browser download itself.
2. Research data carries the sources' own caveats (snippet-only/402 evidence, ambiguous abbreviations like VV/DM/OC) — preserved as `preliminary` + provenance, never upgraded. Vulgar joke candidates are kept as research candidates for voting; hide via admin reject if unwanted.
3. `data/votes.db` (real) was never created or touched in any test run. E2E used `e2e/.tmp/e2e.db` (gitignored); M5 used `data/test-m5.db` (deleted after). Go-live probe votes were deleted; DB verified empty.
4. E2E drag on mobile uses CDP touch events (trusted input) rather than a physical finger, and velocity is approximated by event timing. Same commit path as production gestures.

## Start it
- `cp .env.example .env` and set `INVITE_CODE`, `ADMIN_CODE` (and `PORT` optionally, default 3000).
- `npm install && npm run ingest && npm run build && npm start`.
- Open `http://<host>:<port>/?code=<INVITE_CODE>`.
- Tunnel: point it at the single `npm start` port (e.g. `cloudflared tunnel --url http://localhost:3000`). Nightly `backups/` run inside the server process; admin export at `#/admin` + Download results.json.
