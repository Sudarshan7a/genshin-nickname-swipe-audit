# Nickname Swipe — Rebuild

Friends-only ballot: swipe every candidate nickname for each Genshin entity.

## Run

```sh
npm install
npm run ingest   # builds data/entities.json from new research/
npm run build
npm start        # single port (PORT env, default 3000)
```

Open `http://localhost:3000/?code=YOUR_INVITE_CODE`.

## Checks

```sh
npm run lint
npx tsc --noEmit
npm test
npm run e2e   # Playwright: real drags, layout, screenshots (needs npm run build first)
npm run build
```
