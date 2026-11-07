# Last Minute Bites — Web Prototype 0.4

**網站：https://last-minute-bites-demo.jzalx789.workers.dev**

電腦、Mac 或手機瀏覽器直接開啟，不需要安裝 App 或 VPN。可自行註冊並建立冰箱；共用示範帳戶只放合成食物資料。

## 已實作

- Email/password 登入、session cookie、CSRF、Owner／Editor 共用庫存、邀請及後端撤權。
- 手機可捲動的主要內容區，底部導覽及選取操作不遮擋表單；支援窄屏、橫向及大字。
- 我的食材：搜尋、分類、多選、直接用完／刪除、已用完清單及復原，均不依賴食譜。
- 照片辨識：選取照片後縮小並轉為 JPEG，DeepSeek 建議食物名稱；使用者確認才儲存，不猜到期日、不自動新增。
- DeepSeek 動態生成 1–2 道食譜，可選涼菜、湯、主食、肉類、蔬菜或搭配菜式。使用所選食材或現有庫存，列出還需準備的材料、步驟及搭配。
- 只有明確按下生成才呼叫模型；瀏覽及背景同步不觸發生成。保留個人最近結果，庫存變動後顯示需要更新。
- 煮完後由使用者勾選真正完全用完的食物；單純查看或生成食譜不扣庫存。
- 包裝日期／生產日＋期限／未知日期、日曆月尾及閏年計算、Use by／Best before、QR 邀請及雙語偏好。

網站使用 Cloudflare Worker＋SQLite-backed Durable Object，靜態頁面與 API 同源。密碼使用 PBKDF2-SHA256 與隨機 salt，session token 只保存雜湊。保留的 Python 後端供舊 API 對照；目前網頁的 AI／批次庫存功能需要 Worker。

## 開發及驗證

需要 Node.js 22+、Python、Playwright 1.62.0 與 Pillow 13.0.0。

```sh
npm ci --prefix web
npm --prefix web run check
npm --prefix web test
python3 -m unittest discover -s tests -v
```

本機驗收使用明確標示的測試 RPC，**不是實際模型**。在兩個終端機啟動：

```sh
web/node_modules/.bin/wrangler dev --config tests/fixtures/food-ai/wrangler.jsonc --port 8791
web/node_modules/.bin/wrangler dev --config web/wrangler.test.jsonc --port 8790
```

然後執行 `LMB_WEB_BASE_URL=http://127.0.0.1:8790 python3 tests/web_api_contract.py`、`python3 tests/ai_api_contract.py`、`python3 tests/user_fixes_browser.py` 及同網址的 `tests/web_browser.py`。`LMB_WEB_ENGINE=webkit` 可切換引擎。CI 不花費模型額度。`tests/live_ai_browser.py` 需明確設定 `LMB_LIVE_AI=1`、正式網址及經檢視的測試食物照片才執行兩次真實 DeepSeek 呼叫。驗證紀錄見 [docs/VALIDATION.md](docs/VALIDATION.md)。

## 部署結構

部署鏡像位於 `jzalx789/caresync-is3542` 的 `codex/last-minute-bites-web` 分支、`apps/last-minute-bites/`。`.github/workflows/last-minute-bites.yml` 使用現有 GitHub 部署秘密，不需要使用者再提供 Token。只推送本來源儲存庫不會更新網站。

食物 Worker 的 `FOOD_AI` service binding 呼叫 CareSync Worker 的私有 `FoodAI` RPC entrypoint，沿用其現有伺服器端 DeepSeek 設定；沒有複製或向瀏覽器傳送金鑰。部署順序為先註冊該 entrypoint，再部署獨立食物 Worker。CareSync 預設 HTTP 功能及資料綁定保留；其日後獨立部署須保留此 export 與 gateway 檔案。原有兩個專案的主分支沒有修改。

實際模型為 `deepseek-flash`，使用 DeepSeek OpenAI-compatible Chat Completions 及官方 vision 格式。選取照片會將處理後影像交給 DeepSeek；應用程式不把照片寫入資料庫。每帳戶每天最多 12 次辨識、24 次食譜，另設整站及短時間限額；失敗顯示錯誤並保留手動新增／既有結果，不以固定食譜假裝 AI。實際菜式仍需使用者檢查，不提供食物安全、營養判斷或照片到期日推測。

同步 `static/` 及正式 `web/` 檔案時，**不要部署測試 fixture 或 wrangler.test.jsonc**。同一個 Worker／Durable Object class／object name 會保留原資料，0.4 只新增資料表。`.data/`、`.wrangler/`、資料庫及私人帳密均忽略。`python3 scripts/package.py` 產生 `submission/S01G10.zip`，不包含秘密或執行資料。

沒有製作問卷或正式 user guide；此版本專注可操作的 prototype。
