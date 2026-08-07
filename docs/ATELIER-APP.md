# Atelier App（Capacitor）

Web demo 與跨平台 App 共用同一套 React UI（`src/atelier`）與 `shared/atelier` 配方引擎。預設 **local 模式**（`localStorage`），無需 Node。

## 本機 Web demo（無後端）

```bash
npm install
npm run demo:atelier          # Vite 開啟 /atelier.html
# 或
npm run build && npx serve dist -p 4173
# 開啟 http://localhost:4173/atelier.html
```

- 庫存持久：`localStorage` key `verdant.atelier.v1`
- 倒數加速：local ≤ 3 秒
- 遠端 API（第五站 :4105）：URL 加 `?api=1`

验收：不啟 `server/`，靜態頁可完成煉銅／乳化／蒸發結晶。

## 靜態託管

- [`vercel.json`](../vercel.json)：`/atelier` → `/atelier.html`
- Vercel／Cloudflare Pages：Root = 本 repo，**不要**設 Node server；輸出 `dist`（或 build command `npm run build`）
- 分享連結：`https://<host>/atelier` 或 `/atelier.html`

## Capacitor App

| 項目 | 值 |
|------|-----|
| appId | `com.tessou.verdant.atelier` |
| webDir | `dist-app`（由 `dist` 複製，`index.html` ← `atelier.html`） |
| 設定 | [`capacitor.config.ts`](../capacitor.config.ts) |

```bash
npm run build:app             # vite build → dist-app → cap sync android
npm run build:app:ios         # 需完整 Xcode + CocoaPods
npm run open:android          # Android Studio
npm run open:ios              # Xcode
```

### 前置

- **Android**：Android Studio + JDK 17+；模擬器或真機
- **iOS**：完整 **Xcode**（App Store），`xcode-select` 指向 Xcode.app；CocoaPods（`brew install cocoapods`）；首次在專案內 `cd ios/App && pod install`（需 Xcode）
- 本機若只有 Command Line Tools，`pod install`／iOS sync 會失敗——屬環境限制，Android 路徑仍可用

### 驗收

1. `npm run build:app`
2. `npm run open:android` → Run app
3. 完成一輪「試玩：煉銅」→ 收取 → 庫存增加

不上架商店（無簽章／審核流程）。

## 與控制台第五站

`npm start` → 啟動 Atelier :4105 仍提供 REST；瀏覽器開服務埠並加 `?api=1` 可打遠端。靜態／App 預設不依賴此路徑。
