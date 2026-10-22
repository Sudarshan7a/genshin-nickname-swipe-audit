# Nickname Swipe — Rebuild

Friends-only ballot: swipe every candidate nickname for each Genshin entity.

## Run locally

```sh
npm install
npm run ingest   # builds data/entities.json from new research/
npm run build
npm start        # single port (PORT env, default 3000)
```

Open `http://localhost:3000/?code=YOUR_INVITE_CODE`.

## Go live (public tunnel)

```sh
npm run share    # server on 8099 + opentunnel route, prints the public URL
```

- Codes live in `.env` (`INVITE_CODE`, `ADMIN_CODE`, `PORT`). The file is
  gitignored — it is also your backup if you forget the codes.
- Generate fresh codes with: `node -e "console.log(require('crypto').randomBytes(12).toString('hex'))"` (run twice, use one for friends, one for admin; restart the server after changing `.env`).
- Invite friends with: `<public URL>/?code=<INVITE_CODE>`.
- Admin page: open `<public URL>/#/admin`, enter `ADMIN_CODE`.
- Stop: Ctrl+C in the share terminal (`npm run share` stops both). Or stop the background tunnel with `opentunnel service stop` (this also pauses any other routes on the profile).
- If the public URL changes: run `opentunnel route list` and update the invite links. The route name in this repo is `nicknameswipe`.
- Votes live in `data/votes.db` (gitignored). Nightly + startup copies land in `backups/` (gitignored, newest 14 kept).

## Checks

```sh
npm run lint
npx tsc --noEmit
npm test
npm run e2e   # Playwright: real drags, layout, screenshots (needs npm run build first)
npm run build
```
