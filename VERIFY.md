# VERIFY.md — M2→M5 verification evidence (2026-10-22)

## Outcome
Full rebuild slice M2 (backend) + M3 (swipe UX) + M4 (design + admin) + M5 (browser verification) done on `feat/rebuild`. Predicate: gate green AND all 10 browser flows pass. Predicate met with two documented exceptions (drag gesture, live 390px render — see Limitations).

## Gate (all green, run 2026-10-22)
- `npm run lint` — pass, 0 errors.
- `npx tsc --noEmit` — pass.
- `npm test` — 44/44 pass (logic 6, queue 11, ingest 8, server 19).
- `npm run build` — pass (459 modules, dist hash index-C9BQFjpU.js).
- `node scripts/ingest.mjs` — 442 entities, 0 parse failures.

## Browser flows (Kimi WebBridge, tab 193732169, server 127.0.0.1:3101, TEST codes, TEST db data/test-m5.db — since deleted)

| # | Flow | Result | Evidence |
|---|---|---|---|
| 1 | Bare URL → only code input; wrong code rejected | PASS | Snapshot: gate only (Invite code + Enter). Wrong code → alert "That code did not work." |
| 2 | `?code=` auto-login; reload stays logged in | PASS | After navigate with code, URL cleaned to `/` and deck visible. Reload → deck visible, no gate. |
| 3 | Swipe right/left/up via buttons AND arrow keys; DB stores separate answers | PASS | Heard Albebe (button @e48), never Alfredo (ArrowLeft), unsure Bedo (ArrowUp). `my-votes`: heard/never/unsure rows. Drag: see Limitations. |
| 4 | Change answer via tray chip; row replaced not duplicated | PASS | Chip Albebe → Never. DB: 3 rows, Albebe answer never. |
| 5 | Reload restores marks/progress | PASS | After reload: chips show never/never/unsure, streak 1-day, still authed. |
| 6 | Kill server mid-session, swipe, restart, queued vote syncs | PASS | Server killed, Dodo heard voted (queue len 1, optimistic mark). Restart + reload → queue [], DB has Dodo heard. |
| 7 | 0-nickname entity = suggest-only; pending NOT a candidate; approve → appears | PASS | Help mode: "214 entries still need names", Aether suggest-only form. Suggested SkykidTest → pending, `/api/entities` Aether []. Admin approve → Aether `[{id f4e94182ac5d85af, provenance user-suggestion:1}]`. Deck 228→229, help 214→213. |
| 8 | Duplicate suggestion blocked | PASS | Suggest "Albebe" for albedo → 409 `{match: albebe}`. Second pending "pogostick" → 409. |
| 9 | Export matches votes; likely threshold | PASS | `/api/export` verified:false. Dodo heard 5/never 1/distinct 6 → likely true (5 ≥ 4.8). Albebe 1 voter → likely false. Unsure excluded. |
| 10 | Layout desktop/mobile, no h-scroll, buttons reachable, console clean | PARTIAL | Desktop 1435px: scrollWidth == clientWidth (no h-overflow), tray side list (position static ≥1024px). Zero console errors across all flows (armed listener). Mobile 390px: NOT live-rendered (bridge has no resize); mobile-first CSS verified statically (sticky bottom tray, safe-area, 100dvh, focus-visible, reduced-motion). |

## Bugs found and fixed during M5
1. `AnimatePresence mode="wait"` exit never completed in Edge: old card stayed mounted, blocking all navigation (votes saved, deck frozen). Fix attempt 1 (drop `mode`) still left the stale exiting card in DOM. Fix attempt 2 (remove `AnimatePresence`, key-remount) verified: single card in DOM, skip/chip/vote all advance. Committed `20e14a0`.
2. Ingest over-inclusion found via live deck: `Traveler` on Aether (bold `**not**` broke the do-not-promote regex — fixed by stripping `*`), Lumine `Windy Man/Windblade/Windy Woman character` (added not-a-separate-alias / must-not-map skips, logged in DATA-NOTES). Re-verified: Aether 0 nicknames, Lumine `["Windy Woman"]`. Related tightening also correctly removed Twirly (Kachina), Fish (Nilou), Te/Ya-chan (Mizuki companions), Geo Daddy 2/new Geo Daddy (Itto false positive) — each checked against the research note.

## Commands run
- `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`, `node scripts/ingest.mjs` (final buckets — character 0:26 1-2:48 3-7:42 8+:8; weapon 0:160 1-2:89 3-7:6; artifact 0:28 1-2:33 3-7:2; overall 0:214).
- Server: `INVITE_CODE=… ADMIN_CODE=… VOTES_DB=… PORT=3101 SKIP_BACKUP=1 node server/index.js` (background, killed after).
- Direct API checks: my-votes, entities, suggest 409s, export, sqlite row counts.

## Known limitations (honest list)
1. Drag gesture not end-to-end verified in a real pointer stream. Two synthetic PointerEvent attempts did not engage framer-motion's gesture pipeline (needs trusted pointer capture; this harness has no trusted-input action). Same `commit()` path verified via buttons + arrow keys; rotation/stamps/spring-back code present and unit-adjacent. Needs one manual drag on a phone before public use.
2. No live 390px render (bridge exposes no viewport resize or screenshots). Mobile layout verified by CSS review only. Desktop live-verified.
3. Download button clicked without JS errors; received file bytes not observable through the bridge (endpoint output verified via curl instead).
4. Chip touch height ~36px (no explicit 44px minimum). Buttons are real focusable elements with visible focus styles.
5. Research data carries the sources' own caveats (snippet-only/402 evidence, ambiguous abbreviations like VV/DM/OC) — preserved as `preliminary` + provenance, never upgraded. Vulgar joke candidates (e.g. Zhongli set) are kept as research candidates for voting; hide via admin reject if unwanted.
6. `data/test-m5.db` deleted after M5. Real `data/votes.db` untouched (never created in this run).

## Start it
- `cp .env.example .env` and set `INVITE_CODE`, `ADMIN_CODE` (and `PORT` optionally, default 3000).
- `npm install && npm run ingest && npm run build && npm start`.
- Open `http://<host>:<port>/?code=<INVITE_CODE>`.
- Tunnel: point it at the single `npm start` port (e.g. `cloudflared tunnel --url http://localhost:3000`). Do NOT expose until a manual phone drag test passes (limitation 1). Nightly `backups/` run inside the server process; admin export at `#/admin` + Download results.json.
