# AGENTS.md — Nickname Swipe Rebuild

## Commands
- `npm run ingest` — rebuild `data/entities.json` from `new research/`. Never hand-edit output.
- `npm run lint` / `npx tsc --noEmit` / `npm test` / `npm run build` — verification gate.
- `npm start` — serves `dist/` + `/api` on one port.

## Structure
- `scripts/ingest.mjs` — only place that reads `new research/`.
- `data/entities.json` — generated. Shape: `{ id, type, name, imageUrl|null, nicknames: [{ id, text, sourceUrl|null, quote|null, researchConfidence, provenance[] }] }`.
- `shared/logic.js` — pure logic (normalize, nicknameId, upsertVote, confidence collapse, help-queue rule). Tested in `tests/`.
- `server/` — Express + better-sqlite3. Votes keyed `(voter_id, entity_id, nickname_id)`; never delete on re-ingest.
- `src/` — React frontend. Bottom tray chips (mobile) / side list (desktop) per spec.

## Conventions
- Nickname id = sha1(entityId + '::' + normalized text)[0:16]; normalized = lowercase, collapsed spaces, trimmed.
- researchConfidence ∈ `high|medium|preliminary|unknown` only.
- Never invent names/nicknames/sources. Missing → null.
- Merge rules + conflicts live in `DATA-NOTES.md`.
