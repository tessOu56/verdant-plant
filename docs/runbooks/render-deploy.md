# Verdant Platform — Render dynamic deploy

Public primary host must be a **Node** Web Service (not static-only Vercel).

## Blueprint

Repo root [`render.yaml`](../../render.yaml):

- build: `npm ci && npm run build`
- start: `npm start` → `node server/server.js`
- env: `HOSTED=1`（開啟連結改同 origin `/{id}.html`，單埠可公開）
- health: `GET /health`

## Manual

1. [Render Dashboard](https://dashboard.render.com/) → New → Web Service → connect `tessOu56/verdant-plant`
2. Root directory: repo root · Build / Start as above · `HOSTED=1`
3. Optional: `PUBLIC_BASE_URL=https://<service>.onrender.com`
4. After green deploy: open console URL → WS live → start a station → Open → `/{id}.html`

## Smoke

```bash
BASE=https://<service>.onrender.com
curl -fsS "$BASE/health"
curl -fsS "$BASE/api/services" | head
curl -fsS -o /dev/null -w "%{http_code}\n" "$BASE/"
curl -fsS -o /dev/null -w "%{http_code}\n" "$BASE/atelier.html"
```

## Notes

- Child services still spawn on internal ports for TCP health; public demo pages are served from `dist` on the main port when `HOSTED=1`.
- Do not treat Vercel static-only as done for Verdant.
