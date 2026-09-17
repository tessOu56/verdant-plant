# Verdant — Explore Design living lab

**Labelled living lab.** Not a shop, not Plinth, not a hosted product.

Plant-themed console for frontend depth: spawn/kill orchestration, hand-rolled WebSocket, Canvas, virtual list, Three.js, Atelier recipe engine. UI consumes npm [`@is_tess/components`](https://www.npmjs.com/package/@is_tess/components) and `@is_tess/tokens` (Explore Design; same kit as [AI Search Portal](https://github.com/tessOu56/ai-search-portal)).

**Not claimed:** no public host. Run locally (`localhost:4000` / `:5173`). This public repo is product code and local how-to only.

## What this proves

| Proof | Honest bound |
|-------|----------------|
| **Local orchestrator** | `child_process` spawn/kill + TCP health + WebSocket status |
| **FE depth stations** | garden (WS), bloom (Canvas), meadow (virtual list), scene (Three.js), atelier (RecipeEngine) |
| **Not this** | Garden e-commerce, Plinth storefront, production deploy |

- **Frontend:** React + TypeScript + Tailwind + Zustand + TanStack Query
- **Backend:** zero-dependency Node orchestrator (hand-rolled WebSocket)

## Run locally

### A. Direct (no install)

Built `dist/` is included. Needs Node 18+:

```bash
node server/server.js       # or npm start
```

Open http://localhost:4000 , press **啟動** to spawn a station, then **開啟 ↗**.

### B. Dev (HMR; `npm install` first)

```bash
npm install
npm run dev:all
```

Starts both:

- Console UI **http://localhost:5173** (Vite HMR)
- API / orchestrator **http://localhost:4000** (REST start/stop + WebSocket status)

Vite proxies `/api` and `/ws` to port 4000. Station pages come from `dist`; after changing station source, `npm run build`.

Other scripts: `npm run dev` (Vite only), `npm run build`, `npm start`, `npm run demo:atelier`, `npm run build:app` (Capacitor sync).

### C. Atelier offline Web demo (no Node API)

```bash
npm run demo:atelier
# or npm run build, then serve dist/atelier.html
```

Default **local** mode: recipe engine in the browser, inventory in `localStorage`. Remote fifth station: `?api=1`. App / static hosting notes: [`docs/ATELIER-APP.md`](docs/ATELIER-APP.md).

## Architecture

```
Browser console (React) ──REST start/stop──▶ server/server.js (:4000)
        ▲                                   │ child_process.spawn / kill
        └──WebSocket /ws (live status)──────┤
                                            ├─▶ garden :4101 (React + REST ranks + WS garden)
                                            ├─▶ bloom  :4102 (React · Canvas)
                                            ├─▶ meadow :4103 (React · perf lab)
                                            ├─▶ scene  :4104 (React · Three.js)
                                            └─▶ atelier:4105 (React · RecipeEngine)
```

The console process actually spawns child services (`READY` on stdout), stops with `SIGTERM` (`SIGKILL` after 3s), and TCP-health-checks running services every 2s. It broadcasts `status / pid / uptime / reachable` over WebSocket.

## Stations

| Station | Shows | Stack |
|---------|-------|-------|
| Shared garden (live) | realtime, optimistic UI | WebSocket (`useSocket`: heartbeat + exponential backoff), Zustand, TanStack Query, optimistic water + `water-ack` |
| Bloom | heavy animation, pixel render, degrade | Canvas + `requestAnimationFrame` fixed timestep, petal easing, pollen, low-end 30fps / no particles |
| Meadow perf lab | DOM cost, leak demo | 50k-item virtual list vs full render FPS, live FPS meter, leak make/fix |
| 3D garden | WebGL, camera | Three.js field, OrbitControls, wind sway, low-poly fallback, dispose geometry/material/renderer on leave |
| Atelier | domain model, offline demo / Capacitor | `shared/atelier` seed + RecipeEngine, Zod + Vitest, localStorage client-first, `?api=1` remote, Capacitor `dist-app` |

Atelier tests: `npm test` (Vitest). App notes: [`docs/ATELIER-APP.md`](docs/ATELIER-APP.md).

## Where to look in code

- Reconnectable WebSocket hook: `src/lib/useSocket.ts`
- Zustand store: `src/lib/store.ts`
- TanStack Query: `src/lib/api.ts`, `src/garden/main.tsx`, `src/platform/main.tsx`
- Tailwind: component `className` + `tailwind.config.js` (leaf / bloom / soil)
- Three.js: `src/scene/main.tsx`
- Hand-rolled WS server: `server/miniws.js`
- Dev launcher: `scripts/dev.mjs`

## Add a station

Put a server under `server/` that listens on `process.env.PORT` and logs `READY ...` when up; add a row in `server/services.config.js`; optionally add `xxx.html` + `src/xxx/main.tsx` and register it in `vite.config.ts` `input`, then `npm run build`. Restart the console to start it from the UI.
