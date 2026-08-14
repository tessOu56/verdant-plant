# Verdant Platform — Explore Design 動態能力 lab

**不是**園藝電商，也不是第二個 Portal／Plinth。  
花草主題包裝的 **前端能力展示控制台**：即時狀態、指定啟動／停止服務、開啟各站 live UI。四站各展現一項 FE 深度能力；第五站 **Atelier** 為同產品下的配方引擎切片。

定位 SSOT：[`docs/PROJECT-PLAN.md`](docs/PROJECT-PLAN.md)

**業務三角：** Portal＝AI 搜尋／治理產品 · Plinth＝金工 Gallery／商業 · Verdant＝同一套 Explore Design（`@is_tess/*`）的活體 lab（即時／效能／3D／配方）。

- **前端**：React + TypeScript + Tailwind + Zustand + TanStack Query（多頁 Vite）；UI 消費 `@is_tess/components`＋`@is_tess/tokens`（application: `verdant`）；3D 用 Three.js
- **後端**：零第三方依賴 Node（手刻 RFC 6455 WebSocket）；公開主站以 Render 等同構 Node host 為準（動態，非純靜態）

## 執行方式

### A. 直接跑（免安裝）

已附建置好的 `dist/`，只要 Node 18+：

```bash
cd verdant-platform
node server/server.js       # 或 npm start
```

打開 http://localhost:4000 ，按「啟動」拉起服務，再按「開啟 ↗」進入。

### B. dev 一鍵啟動（HMR，需先 npm install）

```bash
npm install
npm run dev:all
```

這會**同時**啟動：

- 控制台前端 **http://localhost:5173**（Vite HMR，編輯 `src` 即時熱更新）
- API / orchestrator **http://localhost:4000**（REST 啟停 + WebSocket 狀態）

Vite 已設定 proxy，把 `/api` 與 `/ws` 轉發到 4000，所以在 5173 開發控制台時即時狀態照常運作。要體驗某個服務的即時畫面，在控制台按「啟動」後用「開啟 ↗」進入其埠號（服務頁由 `dist` 提供，改動服務頁原始碼後 `npm run build` 更新）。

其他腳本：`npm run dev`（只開 Vite）、`npm run build`（重建 dist）、`npm start`（只跑後端）、`npm run demo:atelier`（離線 Atelier）、`npm run build:app`（Capacitor sync）。

### C. Atelier 離線 Web demo（不需 Node API）

```bash
npm run demo:atelier
# 或 npm run build 後開啟 dist/atelier.html（靜態伺服器即可）
```

預設 **local** 模式：配方引擎在瀏覽器跑、庫存寫入 `localStorage`。遠端第五站加 `?api=1`。跨平台 App 與靜態託管見 [`docs/ATELIER-APP.md`](docs/ATELIER-APP.md)。
## 架構

```
瀏覽器控制台(React) ──REST 啟停──▶ server/server.js（控制台 :4000）
        ▲                            │ child_process.spawn / kill
        └──WebSocket /ws（即時狀態）──┤
                                     ├─▶ garden :4101（React 頁 + REST 排行 + WebSocket 即時花園）
                                     ├─▶ bloom  :4102（React 頁 · Canvas 動畫）
                                     ├─▶ meadow :4103（React 頁 · 效能實驗室）
                                     ├─▶ scene  :4104（React 頁 · Three.js 3D 場景）
                                     └─▶ atelier:4105（React 頁 · RecipeEngine + 科學圖鑑）
```

控制台主程序用 `child_process.spawn` 真的把子服務拉起（靠子程序 stdout 的 `READY` 判定就緒），`SIGTERM` 停止（3 秒後 `SIGKILL` 保底），每 2 秒對執行中的服務做 **TCP 健康檢查**，把 `status / pid / uptime / reachable` 經 WebSocket 廣播給控制台。

## 服務對應的技術展示

| 服務 | 展現能力 | 用到的技術棧重點 |
|------|---------|-----------------|
| 共享花園（即時） | 即時資料流、低延遲、樂觀 UI | WebSocket（`useSocket` hook：心跳偵測 + 指數退避重連）、Zustand 管花園資源與植株、TanStack Query 抓排行榜、樂觀澆水後以伺服器 `water-ack` 校正 |
| 花朵綻放 | 重度動畫、像素級渲染、效能降階 | Canvas + `requestAnimationFrame` 固定時間步長主迴圈、花瓣緩動綻放、花粉粒子、低配裝置模式（Zustand 控制、降 30fps／關粒子） |
| 花圃效能實驗室 | DOM 渲染、記憶體洩漏、極端優化 | 5 萬株花圃的虛擬列表 vs 全量渲染 FPS 對比、即時 FPS 儀表、記憶體洩漏製造/修復示範 |
| 3D 花園場景 | WebGL 3D 渲染、互動相機 | Three.js 程序化花田、OrbitControls 拖曳縮放、風吹搖曳動畫、低多邊形降階、離開頁面釋放 geometry/material/renderer 避免 WebGL 洩漏 |
| 鍊金工坊 Atelier | 跨主題領域模型、可解釋科學、離線 demo／Capacitor | `shared/atelier` seed＋RecipeEngine、Zod＋Vitest、localStorage client-first、示意圖 UI、`?api=1` 遠端、Capacitor `dist-app` |

Atelier 測試：`npm test`（Vitest）。App／部署：[`docs/ATELIER-APP.md`](docs/ATELIER-APP.md)。

## 技術棧在哪裡看

- WebSocket 可重連 hook：`src/lib/useSocket.ts`
- Zustand 全域狀態：`src/lib/store.ts`
- TanStack Query 資料抓取：`src/lib/api.ts` + `src/garden/main.tsx`（`useQuery`）、`src/platform/main.tsx`
- Tailwind 樣式：全部元件的 className + `tailwind.config.js`（自訂 leaf / bloom / soil 色票）
- Three.js 3D 場景：`src/scene/main.tsx`
- 手刻 WebSocket 伺服器：`server/miniws.js`
- dev 一鍵啟動：`scripts/dev.mjs`

## 新增自己的花草服務

在 `server/` 放一個監聽 `process.env.PORT`、就緒時 `console.log('READY ...')` 的服務檔；在 `server/services.config.js` 加一筆；（若要新畫面）在專案根加一個 `xxx.html` 入口與 `src/xxx/main.tsx`，並在 `vite.config.ts` 的 `input` 註冊後 `npm run build`。重啟控制台即可在畫面上看到並啟動它。
