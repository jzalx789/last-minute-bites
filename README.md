# Last Minute Bites — Web Prototype 1.1

**網站：https://last-minute-bites-demo.jzalx789.workers.dev**

電腦、Mac 或手機瀏覽器可直接開啟，不需 VPN；一般瀏覽免安裝，iPhone／iPad 的推播需先加入主畫面。可自行註冊並建立冰箱；共用示範帳戶只放合成食物資料。

## 已實作

- Web Push：設定 → 提醒內可明確允許通知、啟用／停止此裝置、發送測試通知及更新狀態。不會在瀏覽時自行彈出權限視窗；iPhone／iPad 先顯示加入主畫面說明，權限封鎖時顯示系統設定指引。
- 伺服器每 5 分鐘執行 Cron，在帳戶時區上午 9 點左右，對有日期、仍有剩餘且接近設定日期或已過日期的食材合併提醒；包括包裝日期及自訂預計吃完日，沒有日期或已用完的食材不提醒。每裝置每天一次，關閉 App 不影響排程。日期提醒總開關也會暫停排程推播，測試通知仍可明確按下。
- 首頁及食物清單會顯示不可收起的日期過期警告，可一鍵篩選已過日期的紀錄；過食用期限明確標示請勿食用，最佳食用日期、自訂提醒日及標示不明則顯示各自的檢查提示。此畫面警告不受一般日期提醒開關影響；已授權推播仍遵循每天約 9 點及每裝置每天一次的排程，移除／用完紀錄後停止對該紀錄提醒。
- 推播沿用有效登入及冰箱權限；登出、登入到期（目前 7 天）或被撤權後停止，再登入後需重新啟用。鎖定畫面只顯示通用提醒，不列食材名稱或數量，點通知回到 App。

- Email/password 登入、session cookie、CSRF、Owner／Editor 共用庫存、邀請及後端撤權。
- 登入／註冊使用原生頁面捲動，避免 iPhone Safari 鍵盤彈出與 visual viewport 平移時，固定容器縮短而把欄位擠出畫面；登入後沿用原有底部導覽及庫存捲動。
- 手機可捲動的主要內容區，底部導覽及選取操作不遮擋表單；支援窄屏、橫向及大字。
- 我的食材：數量＋單位、購買日期與獨立批次。不同日期買的同名食物保留各自份量及期限；先列較早到期，期限相同再按購買日。
- 快速消耗：每項直接輸入用量，0／空白代表略過，「全部」一按填好；不需勾選。舊食物可在同一視窗補填使用前數量及單位，與扣減一起確認。從食譜進入時，現有批次版本與單位相符才預填建議用量，可一按清除。
- 消耗：填寫每批實際使用量，部分扣減保留剩餘，歸零才移到已用完。整批用完、刪除及復原也可獨立操作；復原只撤銷最後一次用完的份量。舊資料顯示「份量未設定」，不臆測數量。
- 自動分類：輸入中英文名稱即可套用建議類別，常見食物使用本機規則；陌生名稱在離開名稱欄位或儲存時交由 DeepSeek 判斷，打字中的規則查詢不呼叫模型。仍可自行更改類別。
- 非食物防護：前後端攔截明顯非食物，不能用自行送出分類或確認欄位繞過；不明確名稱需先取得伺服器判斷，再確認是食物／飲品。模型不可用時明示需要確認，既有明顯非食物標記警告並排除食譜、不自動刪除。
- 照片辨識：選取照片後縮小並轉為 JPEG，DeepSeek 建議名稱及類別，排除非食物及低信心候選；使用者選取候選後自動套用分類，確認才儲存，不猜到期日、份量或新鮮程度。
- 食譜頁直接顯示這次選用的食材、剩餘份量及購買批次，可在頁內搜尋、添加和移除，庫存不受影響。移除全部後不會擅自改用所有庫存；也可在設計一餐時不選庫存、只規劃採購。依飲食偏好排除的食物會另外標明。
- 三種生成模式按 1→2→3 排序，預設推薦「優先清理庫存」：每道以選定庫存為主，可用已允許的常備調味料，整餐最多補購兩種新食材；「完全自由」仍以所選庫存作整餐核心，可加配庫存以外的食材及配菜，沒有兩種補購上限；「安全局限」只用已登記庫存及清水，不假設任何調味料，只有一種食材也遵守。
- 模式 1、2 可使用使用者勾選的鹽、糖、油、醬油、醋、胡椒及乾辣椒等常備調味料，無需庫存紀錄，不列採購、不扣數量；可取消家中沒有的項目，忌口條件會先排除可辨識的不符項目。AI 分開回傳 inventory uses／seasonings／additional purchases，後端檢查調味料 ID、每批用量及模式限制；沒有固定菜式清單。
- 庫存優先模式會先考慮已過非安全期限的提醒日期／最佳食用日期、較早到期及較早購入的可選紀錄；已過 Use by 仍排除食譜。使用已過品質或提醒日期的食材時，食譜會顯示先檢查標示、儲存及實際狀態的提示，不保證食用安全。
- 可將所選食材分配到 1–4 道獨立菜式，顯示每道使用的食材及建議用量。「這組菜式用齊所有選用食材」開啟時，後端檢查每一個所選批次都有被使用；可取消此選項，允許留下不適合的食材。
- 不喜歡其中一道可單獨「換一道」，沿用原組合的人數／偏好並保留其他菜式；替換會先扣留其他菜式建議用量，再驗證整餐不超量及不重複舊名稱。失敗保留原食譜，庫存或設定變動則須重新生成。重新載入會還原已儲存的選擇及設定。
- DeepSeek 動態生成 1–4 道食譜，可選涼菜、湯、主食、肉類、蔬菜或搭配菜式；設定 1–12 人、小／一般／大食量、時間上限、不想使用的食材及口味／飲食偏好。
- 每道菜均按所選人數及份量偏好設計，整餐的庫存用量合計不可超過同一批現存量；新增食材以採購／準備清單列出，完全自由模式也可從空庫存規劃。常備調味料獨立列示，確認煮過也只扣使用者確認的已登記庫存。
- 食譜只有明確按下生成或「換一道」才呼叫模型；瀏覽及背景同步不觸發生成。保留個人最近結果，庫存變動後顯示需要更新。
- 煮完後由使用者選批次及填寫實際消耗量；單純查看或生成食譜不扣庫存。採購清單不會自動建立食物，買好後須新增實際份量。
- 自行決定／開封後：可留空而不設固定日期，或填預計吃完日作自訂提醒；支援補填、修改、清除及共享。提醒日不視作包裝食用期限，過了提醒日仍由使用者判斷；清庫存排序及食譜輸入保留日期來源。
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
web/node_modules/.bin/wrangler dev --config web/wrangler.test.jsonc --port 8790 --test-scheduled
```

然後執行 `LMB_WEB_BASE_URL=http://127.0.0.1:8790 python3 tests/web_api_contract.py`、`python3 tests/ai_api_contract.py`、`python3 tests/stock_api_contract.py`、`python3 tests/stock_browser.py`、`python3 tests/consume_browser.py`、`python3 tests/classification_api.py`、`python3 tests/classification_browser.py`、`python3 tests/personal_dates_browser.py`、`python3 tests/recipe_builder_api.py`、`python3 tests/recipe_builder_browser.py`、`python3 tests/push_api_contract.py`、`python3 tests/push_browser.py`、`python3 tests/push_service_worker.py`、`python3 tests/user_fixes_browser.py` 及同網址的 `tests/web_browser.py`。`LMB_WEB_ENGINE=webkit` 可切換引擎。CI 不花費模型額度。`tests/live_ai_browser.py` 需明確設定 `LMB_LIVE_AI=1`、正式網址及經檢視的測試食物照片才驗證四個真實 DeepSeek 流程（辨識、4 人大食量設計、清庫存、空庫存採購計劃）；每次食譜及格式不合的名稱分類最多可再修正一次；不會為不確定的判斷重試至肯定。`tests/live_classification.py` 需明確設定 `LMB_LIVE_FOOD=1`、正式網址、食物照片與非食物圖片，才驗證真實名稱／影像分類。`tests/live_recipe_builder.py` 需明確設定 `LMB_LIVE_RECIPES=1` 才驗證正式模型的 4 道菜及單道替換。驗證紀錄見 [docs/VALIDATION.md](docs/VALIDATION.md)。

## 部署結構

部署鏡像位於 `jzalx789/caresync-is3542` 的 `codex/last-minute-bites-web` 分支、`apps/last-minute-bites/`。`.github/workflows/last-minute-bites.yml` 使用現有 GitHub 部署秘密，不需要使用者再提供 Token。通知金鑰由既有 Durable Object 自行產生、保存在私人儲存內；API 只提供公開 VAPID key，沒有把私鑰交給瀏覽器或寫入 Git。推播使用瀏覽器原有的推播服務，不另申請通知帳戶或啟用付費方案。只推送本來源儲存庫不會更新網站。

食物 Worker 的 `FOOD_AI` service binding 呼叫 CareSync Worker 的私有 `FoodAI` RPC entrypoint，沿用其現有伺服器端 DeepSeek 設定；沒有複製或向瀏覽器傳送金鑰。部署順序為先註冊該 entrypoint，再部署獨立食物 Worker。CareSync 預設 HTTP 功能及資料綁定保留；其日後獨立部署須保留此 export 與 gateway 檔案。原有兩個專案的主分支沒有修改。

實際模型為 `deepseek-flash`，使用 DeepSeek OpenAI-compatible Chat Completions 及官方 vision 格式。選取照片會將處理後影像交給 DeepSeek；應用程式不把照片寫入資料庫。每帳戶每天最多 12 次照片辨識、24 次食譜、40 次陌生名稱分類；名稱分類另限全站每日 200 次、每帳戶 5 分鐘 6 次。常見名稱不佔模型額度，私人分類結果快取 24 小時，不可用結果 60 秒後可重試。另設照片／食譜整站及短時間限額；回覆會先檢驗，未通過可由模型修正一次再完整檢驗；仍失敗便顯示錯誤並保留手動新增／既有結果，不以固定食譜假裝 AI。數量以千分之一單位做精確扣減，批次修改使用版本與交易保護。模型的菜式人數／時間／合計庫存用量、清庫存不添購與避免食材名稱均會檢驗。口味／飲食偏好仍屬模型建議，名稱檢查不是過敏原認證；實際菜式仍需使用者檢查，不提供食物安全、營養判斷或照片到期日推測。

同步 `static/` 及正式 `web/` 檔案時，**不要部署測試 fixture 或 wrangler.test.jsonc**。同一個 Worker／Durable Object class／object name 會保留原資料，0.4 新增資料表；0.5 以相容的 JSON 欄位擴充份量及批次；0.7 新增私人名稱判斷快取表，沿用原有庫存。名稱／照片分類不代表實際物件可食用或食物安全判斷。`.data/`、`.wrangler/`、資料庫及私人帳密均忽略。`python3 scripts/package.py` 產生 `submission/S01G10.zip`，不包含秘密或執行資料。

通知使用 RFC 8291 aes128gcm 及 RFC 8292 VAPID，僅接受已知瀏覽器推播服務的 HTTPS endpoint，不跟隨重新導向；保護 CSRF、帳戶／裝置隔離、過期端點清理、短時間限流、重試及每日去重。正式 Cron 配置在 `web/wrangler.jsonc`；授權的 `push/config` 提供 `schedule.last_run` 供檢查實際觸發。

推播測試明確區分協定向量／本機測試傳輸／模擬權限，以及真正 Service Worker 的背景事件處理。此雲端 Chromium 的真正 PushManager 註冊回傳 AbortError（permission denied）；沒有捏造遠端推播或實際 iPhone 收件成功。實機仍需使用者允許通知，並用「發送測試通知」確認。

沒有製作問卷或正式 user guide；此版本專注可操作的 prototype。
