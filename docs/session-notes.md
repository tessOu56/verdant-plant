# verdant-platform — 開發過程紀錄（Cowork session 摘要）

**來源 session**：Cowork「Web game product interface」（2026-07-09）
**封存日**：2026-07-14
**成果物**：`project/`（可執行專案）、`展示專案規劃書.md`、`面試考古題與準備方向.md`

## 緣起

原始目標是針對 web game（博弈類）前端職缺做技術展示。第一版 `gamefront-platform` 為零依賴 Node 展示控制台：dashboard（:4000）真實 spawn/kill 子服務、手刻 RFC 6455 WebSocket（`miniws.js`）、三個 demo（即時下注/開獎、老虎機轉輪、效能實驗室），並附規劃書與面試考古題兩份文件。

## 需求演進

1. **對準職缺技術棧**：前端改用 React + TypeScript + Tailwind + Zustand + TanStack Query 重寫（後端維持零依賴 Node）。
2. **視覺去博弈化**：遊戲畫面全面改為花草風格，且是「演進既有 platform」而非另開專案 → 更名 `verdant-platform`（花草產品體系控制台）。
3. **徹底移除博弈痕跡**：刪除舊 `gamefront-platform` 整包、兩份文件全面改寫為純技術產品展示；掃描確認無任何博弈字眼（連 game loop 都改為「主迴圈」）。
4. **加值項**：新增 Three.js 3D 場景服務與 dev 一鍵啟動。

## 最終架構（四個可啟停服務）

| 服務 | 埠 | 展現的技術 |
|------|----|-----------|
| 共享花園 garden | 4101* | WebSocket 即時（心跳＋指數退避重連 hook）、樂觀更新＋伺服器 ack 校正、Zustand、TanStack Query 排行榜 |
| 花朵綻放 bloom | 410x* | Canvas + rAF 固定時間步長、緩動、粒子、低配降階、即時 FPS |
| 花圃效能 meadow | 410x* | 5 萬筆虛擬列表 vs 全量渲染 FPS 對比、記憶體洩漏製造/修復 |
| 3D 花園場景 scene | 4104 | Three.js 程序化花田、OrbitControls、風動、低多邊形降階、離場 dispose geometry/material/renderer（WebGL 記憶體洩漏防範） |

\* 實際埠號見 `project/server/server.js` 服務登錄。

控制台 orchestrator（:4000）：REST + 手刻 WebSocket 即時狀態、真實 spawn/kill 子行程、TCP 健康檢查。

## 驗證紀錄（沙箱實測通過）

TypeScript 編譯無誤；Vite 四頁（platform/garden/bloom/meadow ＋ scene）建置成功；spawn → running + TCP 可達；REST 排行 API 正常；WebSocket 握手與 `hello`（1371 bytes，擴充長度分幀）/`grow` 廣播正常；靜態資產 200；stop 正常；`npm run dev:all` 兩埠（5173/4000）HTTP 200。

## 執行方式

- 免安裝（附建置好的 `dist/`，Node 18+）：`cd project && node server/server.js` → http://localhost:4000
- 開發：`npm install && npm run dev:all`（Vite HMR :5173，`/api`、`/ws` proxy 至 :4000）

## 後續建議（當時未做）

控制台「一鍵全部啟動/停止」、dashboard 內嵌各服務即時縮圖預覽。若要正式投遞作品，規劃書第四節有兩版並陳（原生 JS vs React/TS）的論述框架。
