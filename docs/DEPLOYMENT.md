# 目前的存取、測試與部署

適用 Last Minute Bites 1.4.3，更新於 2026-11-16。舊 PythonAnywhere／WSGI 步驟已移至 [歷史文件](legacy/DEPLOYMENT_0_2.md)，不適用於目前的 AI、多廚房或聚會正式版本。

## 教師／測試者入口

- 正式網址：<https://last-minute-bites-demo.jzalx789.workers.dev/>。
- 英文評閱／外部服務說明：[submission/REVIEW_NOTES.md](../submission/REVIEW_NOTES.md)。
- 提交入口：`submission/S01G10.html`，按「開啟 App」進入同一 HTTPS 網址。它不是 APK 或離線可執行後端。
- 需要網絡及支援的手機瀏覽器。測試者可自行註冊新帳戶，毋須索取私人 AI 金鑰或已有使用者密碼。
- 用兩個獨立帳戶／瀏覽器工作階段，透過邀請碼驗證 Owner／Editor 共享。不要共用別人的正式帳戶或修改其庫存。
- 手動庫存不需 AI 授權。AI 及照片另行同意，實際使用受現有模型服務及配額影響。
- 相機只在掃碼等明確動作時索權；通知須另行啟用。iOS 主畫面安裝及通知限制以介面提示為準，不能把一般瀏覽器測試當作真機收件證據。

## 本機重現

使用 Node.js 24、Python 3.12，執行 README 的安裝步驟及兩個 Wrangler 程序：測試 AI／推播 fixture 在 8791，App 測試後端在 8790。使用 `web/wrangler.test.jsonc`，不連正式資料。

原始碼匯出不會附送 `node_modules`、資料庫、`.wrangler`、session、推播私鑰、帳密或供應商金鑰。先依 lockfile 安裝依賴，再啟動；不能直接雙擊 `static/index.html` 取得完整後端功能。

## 正式發布

來源分支是 `codex/last-minute-bites-prototype`。推送來源只跑驗收，不會部署。現有部署鏡像保存 `apps/last-minute-bites/`，由授權的 `.github/workflows/last-minute-bites.yml` 先部署既有私有 `FoodAI` 服務，再部署食物 Worker。

保留 Worker `last-minute-bites-demo`、binding `KITCHENS`、class `KitchenStore`、object `shared-kitchens-v1` 及現有遷移。不要用換 namespace、重新 seed、刪除資料庫或複製金鑰來更新版本。供應商金鑰繼續留在既有私有服務；部署憑證沿用既有安全工作流程。

發布後不能只看工作流程綠燈：須等 `/healthz` 的實際版本與 `web/release.js` 相符，核對前端資產，並用隔離帳戶確認相關操作及既有 session／庫存保留。後端程式切換可能稍遲於公開資產。未驗證的真實模型、手機或推播行為應如實列為未驗證。

## 目前限制與交付邊界

依 2026-11-16 使用者提供的授課老師回覆，目前 Web＋Cloudflare 平台已獲批准，可交 HTML URL，不需 Android APK。交付工作網址、完整來源 ZIP 及評閱所需說明；其他功能及文件要求不變。離線只提供公開殼，雲端庫存、登入及 AI 需要網絡。Android／iOS 真機或 OS 模擬器瀏覽器驗收，以及正式課程提交，仍須由組員完成。
