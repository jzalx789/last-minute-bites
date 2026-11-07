# Last Minute Bites — Web Prototype 0.3

直接開啟網頁使用，不需要安裝 App、啟動 Python、操作終端機或連接 VPN。

**網站：https://last-minute-bites-demo.jzalx789.workers.dev**

電腦、Mac 或手機的現代瀏覽器皆可使用。可自行註冊並建立冰箱；示範帳戶只使用合成食物資料。不要在共用示範帳戶內加入個人資料。

## 已實作

- 真實 Email/password 登入、session cookie、CSRF 與後端權限。
- Owner／Editor 共用庫存、邀請預覽及確認、撤權、離開、版本衝突。
- 分類冰箱、搜尋、Use first、跨分類個人多選、食物新增／編輯／用完／刪除。
- 包裝日期／生產日＋期限／未知日期，日曆月尾及閏年計算，區分 Use by／Best before。
- 四個固定雙語食譜、精確材料映射、缺料／Check at home；過 Use by 不匹配。
- 相機 QR 邀請、手動輸入備援、個人雙語／大字／日期格式及 App 內提醒。
- 持久 SQLite 雲端資料儲存，5 秒刷新，資料與帳戶不依賴使用者的電腦。

網站使用 Cloudflare Worker＋SQLite-backed Durable Object；靜態頁面與 API 同源。密碼用 PBKDF2-SHA256（100,000 次）及隨機 salt，session token 只保存雜湊，HTTPS cookie 有 Secure／HttpOnly／SameSite。Cloudflare 網頁版優先，保留的 Python 版本僅供本機開發對照。

## 開發

需要 Node.js 22+：

```sh
npm ci --prefix web
npm --prefix web run dev
npm --prefix web test
python3 tests/web_api_contract.py
python3 tests/web_browser.py
```

測試腳本預設連本機 Wrangler `8787` 埠；`LMB_WEB_BASE_URL` 可指定已部署網址。Browser test 需要 Playwright 1.62.0 與瀏覽器執行檔，使用獨立合成帳戶，不碰使用者帳戶。日期／密碼單元測試、實際 API contract 及公開 WebKit 瀏覽器驗收已通過，見 [驗證紀錄](docs/VALIDATION.md)。

## 更新網站

沿用既有 CareSync Cloudflare GitHub Actions 授權，但網站與資料獨立。部署鏡像位於 `jzalx789/caresync-is3542` 的 `codex/last-minute-bites-web` 分支，`apps/last-minute-bites/` 及 `.github/workflows/last-minute-bites.yml`。CareSync 原主分支、原 Worker 與資料沒有變更。

修改此儲存庫後，將 `web/`、`static/`、`recipes.json` 同步到上述獨立部署路徑，推送該分支會執行測試與 `wrangler deploy --config apps/last-minute-bites/web/wrangler.jsonc`。**只推送此儲存庫不會更新網站**。不要重新建立或重置 Durable Object namespace，資料會隨相同 Worker／class／object name 保留。部署流程使用 GitHub 既有秘密，不需要使用者另外提供 Token；不要把任何真實 Token 或私人帳密提交 Git。

`.data/`、`.wrangler/`、資料庫及私人測試帳密不提交。`python3 scripts/package.py` 可產生 `submission/S01G10.zip` 原始碼包。QR 程式庫已本地打包，授權見 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

食譜為待審核示範內容，不提供食物安全／營養判斷、食物照片辨識或背景推播。沒有製作問卷或正式 user guide；此版本專注可操作的 prototype。
