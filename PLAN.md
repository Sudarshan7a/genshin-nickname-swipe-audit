# PLAN.md — UI Rebuild From Scratch (awaiting approval, no code yet)

> Status: PROPOSED — do not implement until user replies “approve”.

## Milestone 0 — Empty UI shell runs, lints, tests, builds (first, per project-kickoff)
- Files: `src/` deleted except `main.tsx` stub + `src/App.tsx` placeholder, `src/teyvat.css` deleted, `DESIGN.md` tokens stub; backend `server/`, `tests/`, `e2e/`, `scripts/` untouched.
- Work: backup/stash uncommitted redesign WIP, delete current UI files, confirm backend gate still green on empty shell.
- Proves: `npm run lint && npx tsc --noEmit && npm test && npm run build && npm start` all green.

## Milestone 1 — Design tokens + system (design-craft)
- Files: `DESIGN.md`, `src/styles/tokens.css`, `tailwind.config.js`, `src/components/ui/*` (shadcn-style primitives only, no flows yet).
- Work: Fraunces + Karla type ramp, brass/parchment/desk tokens, radius/shadow/motion specs, icon set (lucide-react), art-fallback plate rule.
- Proves: `npm run build` green + `DESIGN.md` token table review; no flows wired yet.

## Milestone 2 — Core deck vertical slice (one entity end-to-end)
- Files: `src/App.tsx`, `src/components/Gate.jsx`, `src/components/EntityHeader.jsx`, `src/components/CardStack.jsx`, `src/components/Tray.jsx`, `src/store/session.js`, `src/store/queue.js`.
- Work: gate → filter/search → entity header → swipe card (drag/buttons/keys/undo/skip/blind/flip) → tray; offline queue + optimistic UI against frozen API contract.
- Proves: `npm run build && npm start` manual swipe of 3 entities + `npm test` green.

## Milestone 3 — Remaining flows (summary / suggest / help / admin)
- Files: `src/components/Summary.jsx`, `src/components/SuggestForm.jsx`, `src/components/HelpQueue.jsx`, `src/components/Admin.jsx`, `src/store/sound.js`.
- Work: summary → suggest → Next, help-queue suggest-only mode, admin approve/reject + `results.json` download, streak/sound parity.
- Proves: `npm run e2e -- --project=desktop` + `--project=mobile` green (drag, layout, states specs), zero console errors, screenshots at 390px + 1440px.

## Milestone 4 — Polish + quality gate + go-live re-verify
- Files: `VERIFY.md`, `RUN.md`, `README.md`, `e2e/screenshots/*`.
- Work: motion/a11y pass (`prefers-reduced-motion`, focus, aria-live), 3 critique rounds with screenshots, full gate, `tools/golive-check.cjs` 10/10 from outside, DB verified clean.
- Proves: `npm run lint && npx tsc --noEmit && npm test && npm run build && npm run e2e` + `node tools/golive-check.cjs` all green.

## Open decisions (answer with approval or edit)
1. Delete (not migrate) all current `src/components/*` + `teyvat.css` at M0 — OK?
2. Tailwind + shadcn-style tokens + Framer Motion, keep Express/better-sqlite3 backend frozen — OK?
3. Stash/discard uncommitted redesign WIP at M0 start — OK?

Reply “approve” (optionally with changes) and I start at Milestone 0. No scaffold or feature code until then.
