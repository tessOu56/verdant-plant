# Verdant Platform — PROJECT-PLAN

**Repo:** `verdant-plant` · **Brand:** Verdant Platform · **Role:** Explore Design **living lab**（動態前端能力展示）

## Purpose

用花草主題包裝，現場展示現代前端深度能力：真實 spawn／kill 編排、手刻 WebSocket、Canvas、虛擬列表、Three.js、Atelier 配方引擎。  
**UI 必須消費 `@is_tess/*`（explore-design-sdk）**；缺口回灌 SDK，使 Verdant 成為設計系統的活體證明。

## Non-goals

- 不是園藝／花卉電商或消費 App
- 不是第二個 AI Search Portal（產品旅程）
- 不是第二個 Plinth Gallery（品牌／商業站）
- 不以「純靜態 Landing」當作公開完成定義

## 業務三角（關聯）

| 角色 | 業務 | 技術 |
|------|------|------|
| **Portal** | 旗艦產品：搜尋／治理信任 | 已吃 `@is_tess/tokens`＋`components` |
| **Plinth** | 品牌／商業：金工 Gallery／拍賣 | token map 對齊；本輪不強制改依賴 |
| **Verdant** | 能力 lab＋SDK 品質閘 | **強制**吃 SDK；動態編排為公開主鉤子 |
| **SDK** | 共用設計系統資產 | Verdant 驅動 Live status／VirtualList／MediaFrame 等 |

**訪客 10 秒文案：**  
Portal 解決資料信任；Plinth 賣金工體驗；Verdant 用同一套 Explore Design，現場展示即時／效能／3D／配方引擎能跑多深。

## Public vs Local

| 環境 | 定義 |
|------|------|
| **Public（主 URL）** | Node host（Render）跑 `server/server.js` + `dist`：控制台動態、WS 狀態、可啟停、同埠開啟各站 HTML |
| **Local** | `npm run dev:all` 或 `node server/server.js`（同構） |
| **Atelier offline** | `/atelier.html` client-first；屬同產品第五站，不是獨立品牌 |

`HOSTED=1` 時服務「開啟」連結改為同 origin `/{id}.html`（單埠公開）；子進程仍可在本機埠做健康檢查。

## SDK 契約

- Application map：`@is_tess/tokens/applications/verdant.map.json` → CSS `[data-app="verdant"]`
- Console chrome：`Button`／`Card*`／`StatusChip`／`LiveStatusBadge`／`Metric`／`BrandMark`…
- 深度站：`VirtualList`（meadow）、`MediaFrame`（scene 外框）
- 規則：能 composition 不新開包；新 primitive 測過再 publish；Verdant 不 vendor 平行 UI

## Stations

| id | 能力 |
|----|------|
| garden | WS 即時、樂觀更新、重連 |
| bloom | Canvas + rAF timestep |
| meadow | 虛擬列表 vs 全量、洩漏 lab |
| scene | Three.js + dispose |
| atelier | RecipeEngine + Zod |

## Deploy

- Primary：Render Web Service（見 `render.yaml`／`docs/runbooks/render-deploy.md`）
- Vercel 靜態-only **不算** done；若保留僅 redirect 至 Render
