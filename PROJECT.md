# PROJECT.md — Nickname Swipe UI Rebuild (from scratch)

## Purpose
Throw away the current UI (`src/*`, `teyvat.css`) and rebuild it from zero on the proven backend. Same app: validate community nicknames for Genshin characters/weapons/artifacts by asking one question per card: “Heard it in the wild?”

## Users
- Invite-only voters (friends on phones): open link, swipe, suggest missing names.
- Admin (you): review suggestions, approve/reject, export `results.json`.

## Must-haves
1. Delete current UI files outright, no porting of styles/markup.
2. Keep backend contract frozen: `GET /api/entities`, `POST /api/vote`, `DELETE /api/vote`, `GET /api/my-votes`, `POST /api/suggest`, `GET /api/results`, `GET /api/export`, `POST /api/admin/suggestions/:id`, `x-invite-code` + `x-voter-id` + `x-admin-code`, per-voter rate limits, `data/votes.db` stays clean.
3. Keep single `npm start` on one port, gzip + CDN vendors (tunnel drops responses ~30KB).
4. Core flows preserved: gate (`?code=` auto-login), filter All/Characters/Weapons/Artifacts + search, entity header + art fallback, swipe card (drag right=Heard / left=Never / up=Not sure + buttons + arrow keys, Undo, Skip, blind mode ON, tap-flip for source/quote), tray chips (mobile bottom sheet / desktop side), summary → suggest → Next, Help-queue for zero-nickname entities, admin review desk.
5. New design system from tokens up (no generic AI look): mobile 390px / desktop 1440px, 44px targets, no horizontal overflow, `prefers-reduced-motion`, keyboard + aria-live, zero console errors.
6. Quality: `npm run lint`, `npx tsc --noEmit`, `npm test` (46 unit), `npm run e2e` (14 Playwright) stay green; screenshots for deck/tray/help/admin/summary/empty/error/gate.

## Non-goals
- No backend / ingest / DB rewrite (`server/`, `scripts/ingest.mjs`, `data/entities.json`, `shared/` untouched).
- No cloud DB/auth/analytics; no public access without invite code.
- No auto-promoting suggestions to verified; no hosting HoYoverse art.
- No new features beyond parity + look/feel (streak, sound, art fallback are parity, not new scope).

## Hard constraints
- Codes from env (`INVITE_CODE`/`ADMIN_CODE`), never committed/printed.
- e2e uses `e2e/.tmp/e2e.db` only; real `data/votes.db` stays empty until friends vote.
- Working branch `feat/rebuild`; uncommitted redesign WIP gets stashed/discarded on approval, not merged.

## Stack choice
Vite + React + TS + Tailwind + shadcn/ui tokens + Framer Motion + lucide-react frontend on existing Express + better-sqlite3 backend — because backend/tunnel/DB are already proven live and the rebuild is UI-only, so lowest risk is keep the serving/data layer and swap the presentation layer for a real token-driven system.
