# Last Minute Bites — Web Prototype 0.7

**網站：https://last-minute-bites-demo.jzalx789.workers.dev**

電腦、Mac 或手機瀏覽器直接開啟，不需要安裝 App 或 VPN。可自行註冊並建立冰箱；共用示範帳戶只放合成食物資料。

## 已實作

- Email/password 登入、session cookie、CSRF、Owner／Editor 共用庫存、邀請及後端撤權。
- 手機可捲動的主要內容區，底部導覽及選取操作不遮擋表單；支援窄屏、橫向及大字。
- 我的食材：數量＋單位、購買日期與獨立批次。不同日期買的同名食物保留各自份量及期限；先列較早到期，期限相同再按購買日。
- 快速消耗：每項直接輸入用量，0／空白代表略過，「全部」一按填好；不需勾選。舊食物可在同一視窗補填使用前數量及單位，與扣減一起確認。從食譜進入時，現有批次版本與單位相符才預填建議用量，可一按清除。
- 消耗：填寫每批實際使用量，部分扣減保留剩餘，歸零才移到已用完。整批用完、刪除及復原也可獨立操作；復原只撤銷最後一次用完的份量。舊資料顯示「份量未設定」，不臆測數量。
- 自動分類：輸入中英文名稱即可套用建議類別，常見食物使用本機規則；陌生名稱在離開名稱欄位或儲存時交由 DeepSeek 判斷，打字中的規則查詢不呼叫模型。仍可自行更改類別。
- 非食物防護：前後端攔截明顯非食物，不能用自行送出分類或確認欄位繞過；不明確名稱需先取得伺服器判斷，再確認是食物／飲品。模型不可用時明示需要確認，既有明顯非食物標記警告並排除食譜、不自動刪除。
- 照片辨識：選取照片後縮小並轉為 JPEG，DeepSeek 建議名稱及類別，排除非食物及低信心候選；使用者選取候選後自動套用分類，確認才儲存，不猜到期日、份量或新鮮程度。
- DeepSeek 動態生成 1–2 道食譜，可選涼菜、湯、主食、肉類、蔬菜或搭配菜式；設定 1–12 人、小／一般／大食量、時間上限、不想使用的食材及口味／飲食偏好。
- 「清庫存」只用現有庫存，優先較近到期批次，不添購；「設計一餐」可加入新食材，以採購／準備清單列出每道菜所缺份量，也可從空庫存規劃。每道菜均按所選人數設計，兩道菜的庫存用量合計不可超過同一批現存量。
- 只有明確按下生成才呼叫模型；瀏覽及背景同步不觸發生成。保留個人最近結果，庫存變動後顯示需要更新。
- 煮完後由使用者選批次及填寫實際消耗量；單純查看或生成食譜不扣庫存。採購清單不會自動建立食物，買好後須新增實際份量。
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

然後執行 `LMB_WEB_BASE_URL=http://127.0.0.1:8790 python3 tests/web_api_contract.py`、`python3 tests/ai_api_contract.py`、`python3 tests/stock_api_contract.py`、`python3 tests/stock_browser.py`、`python3 tests/consume_browser.py`、`python3 tests/classification_api.py`、`python3 tests/classification_browser.py`、`python3 tests/user_fixes_browser.py` 及同網址的 `tests/web_browser.py`。`LMB_WEB_ENGINE=webkit` 可切換引擎。CI 不花費模型額度。`tests/live_ai_browser.py` 需明確設定 `LMB_LIVE_AI=1`、正式網址及經檢視的測試食物照片才驗證四個真實 DeepSeek 流程（辨識、4 人大食量設計、清庫存、空庫存採購計劃）；每次食譜及格式不合的名稱分類最多可再修正一次；不會為不確定的判斷重試至肯定。`tests/live_classification.py` 需明確設定 `LMB_LIVE_FOOD=1`、正式網址、食物照片與非食物圖片，才驗證真實名稱／影像分類。驗證紀錄見 [docs/VALIDATION.md](docs/VALIDATION.md)。

## 部署結構

部署鏡像位於 `jzalx789/caresync-is3542` 的 `codex/last-minute-bites-web` 分支、`apps/last-minute-bites/`。`.github/workflows/last-minute-bites.yml` 使用現有 GitHub 部署秘密，不需要使用者再提供 Token。只推送本來源儲存庫不會更新網站。

食物 Worker 的 `FOOD_AI` service binding 呼叫 CareSync Worker 的私有 `FoodAI` RPC entrypoint，沿用其現有伺服器端 DeepSeek 設定；沒有複製或向瀏覽器傳送金鑰。部署順序為先註冊該 entrypoint，再部署獨立食物 Worker。CareSync 預設 HTTP 功能及資料綁定保留；其日後獨立部署須保留此 export 與 gateway 檔案。原有兩個專案的主分支沒有修改。

實際模型為 `deepseek-flash`，使用 DeepSeek OpenAI-compatible Chat Completions 及官方 vision 格式。選取照片會將處理後影像交給 DeepSeek；應用程式不把照片寫入資料庫。每帳戶每天最多 12 次照片辨識、24 次食譜、40 次陌生名稱分類；名稱分類另限全站每日 200 次、每帳戶 5 分鐘 6 次。常見名稱不佔模型額度，私人分類結果快取 24 小時，不可用結果 60 秒後可重試。另設照片／食譜整站及短時間限額；回覆會先檢驗，未通過可由模型修正一次再完整檢驗；仍失敗便顯示錯誤並保留手動新增／既有結果，不以固定食譜假裝 AI。數量以千分之一單位做精確扣減，批次修改使用版本與交易保護。模型的菜式人數／時間／合計庫存用量、清庫存不添購與避免食材名稱均會檢驗。口味／飲食偏好仍屬模型建議，名稱檢查不是過敏原認證；實際菜式仍需使用者檢查，不提供食物安全、營養判斷或照片到期日推測。

同步 `static/` 及正式 `web/` 檔案時，**不要部署測試 fixture 或 wrangler.test.jsonc**。同一個 Worker／Durable Object class／object name 會保留原資料，0.4 新增資料表；0.5 以相容的 JSON 欄位擴充份量及批次；0.7 新增私人名稱判斷快取表，沿用原有庫存。名稱／照片分類不代表實際物件可食用或食物安全判斷。`.data/`、`.wrangler/`、資料庫及私人帳密均忽略。`python3 scripts/package.py` 產生 `submission/S01G10.zip`，不包含秘密或執行資料。

沒有製作問卷或正式 user guide；此版本專注可操作的 prototype。
