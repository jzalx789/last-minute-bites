# Prototype 0.2 驗證

2026-11-07（Asia/Hong_Kong）。此紀錄只針對可運作的 Prototype 0.2。

| 檢查 | 實際結果 |
| --- | --- |
| Python 後端／WSGI／部署保護／Demo suite | 48 項通過，0 跳過；包含 21 本機 API、21 WSGI 合約、1 日期、1 Demo、4 部署／教師帳戶流程 |
| Chromium browser_smoke | 通過；登入、共享、日期、多選、食譜、雙語／大字、斷線保留輸入、衝突／重新載入、撤權與清空；無未捕捉 JS 錯誤 |
| mobile_acceptance | 通過；真實 getUserMedia 管線接收模擬 QR 攝影機影像、成功後 camera tracks 結束、權限拒絕備援、manifest、Service worker、離線及不快取私人 API |
| WebKit mobile engine | 通過；登入、庫存、選取、配對、窄屏；不是實體 iPhone 驗證 |
| 實際 Gunicorn | 通過；啟動、登入、寫入、重啟持久化、配對及登出 |
| SQLite 備份 | 開著 WAL 連線時產生一致 snapshot，檢查 integrity 與獨立還原讀取通過 |
| 靜態語法 | Python compile、app.js／mobile.js／sw.js 檢查通過 |

測試只使用暫存資料庫與合成帳戶。相機輸入由固定 QR 的 Y4M 模擬裝置提供，未捏造實體拍攝。截圖在忽略的 `artifacts/mobile-evidence/`，不包含私人使用者資料。

```sh
python3 -m unittest discover -s tests -v
python3 tests/browser_smoke.py
python3 tests/mobile_acceptance.py
LMB_TEST_GUNICORN=.venv/bin/gunicorn python3 tests/deployment_smoke.py
```

此雲端的額外 WebKit 引擎來自官方 Playwright 下載。缺少的 Debian 庫從簽章驗證的套件索引下載並解壓於使用者目錄，未修改系統／關閉 TLS／變更檢查碼。當次命令：

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/lmb-browsers \
LMB_TEST_WEBKIT=1 LMB_TEST_WEBKIT_EXECUTABLE=/tmp/lmb-webkit-run \
python3 tests/mobile_acceptance.py
```

其他主機可使用 Playwright 官方安裝與系統依賴；本機額外路徑不保證在新任務／新機器存在。GitHub Actions 已提供相同測試設定；推送後才會觸發，未宣稱遠端 CI 已通過。

仍待外部條件：使用者主機帳號 Jzalx 的安全授權、實際公開 HTTPS 部署、Android／iOS 真機與安裝驗收、老師平台核准及食譜團隊審核。網站上傳／reload 成功不自動等於這些項目通過。沒有食物照片辨識、可及性認證或正式多機營運承諾。


## Web Prototype 0.3（公開網站）

- 公開網址：https://last-minute-bites-demo.jzalx789.workers.dev
- Cloudflare Worker＋SQLite-backed Durable Object，沒有本機 Python 依賴。沿用既有部署授權建立獨立 Worker，CareSync 主分支及服務保留。
- `npm --prefix web test`：3 項日期／欄位正規化／密碼測試通過。
- `tests/web_api_contract.py`：本機與正式 HTTPS 都通過，涵蓋真實登入、CSRF、角色、跨冰箱 CRUD、同時修改的 200／409、日期、重試鍵、食譜、偏好、撤權、清空及重新登入。
- `tests/web_browser.py`：本機 Chromium 與正式 HTTPS WebKit 都通過，包括桌面／手機 viewport、註冊、庫存、跨分類選取、配對、QR 邀請、雙語設定、撤權與登出。沒有關閉 TLS 驗證。
- 此雲端 Chromium 的代理憑證不受信任；修改持久信任設定遭自動審核拒絕。保留原設定，改用沿用系統信任的 WebKit 成功完成公開瀏覽器驗證。
- 部署工作流程 `42377641930` 已通過。首次新 Worker 部署後的網址傳播延遲造成第一次健康檢查 404，已改成有界重試；實際 /healthz 與資料操作已驗證。
- 已建立可用的合成 Demo Owner／Editor 並驗證七項庫存共享與重新登入；私人交付帳密在忽略的 `.data/public-demo-credentials.json`，不放入原始碼包。

## Web Prototype 0.4（本次修正，2026-11-07）

正式網站仍為 https://last-minute-bites-demo.jzalx789.workers.dev，`/healthz` 回報 `0.4` 與 `persistent-sqlite`。部署鏡像 commit `a919242`、GitHub Actions `42389631708` 成功。原 Demo Owner 重新登入及七項庫存保留，沒有重建或清空資料庫。

- Python 舊後端回歸：48 項通過；Worker 單元測試：7 項通過；CareSync 私有 RPC 增補後的回歸：114 項通過，語法檢查及兩個 Worker dry-run 通過。
- 本機 AI API contract 使用**測試專用 RPC**：一款湯／兩款互補菜式、過 Use by 排除、私人歷史及快取、無效模型內容拒絕、等待模型不阻塞其他冰箱、重複請求限流、生成期間庫存變動拒絕、批次交易回滾、獨立用完／復原、圖片不自動入庫及不推測日期，全部通過。它不證明模型品質。
- Chromium 及 WebKit 手機流程使用測試 RPC：320px／短螢幕／橫向／平板／桌面、繁中大字、內容可捲動、底部導覽不覆蓋表單、移除指定提醒、照片結果確認、直接用完／刪除／復原、明確按鈕生成、背景刷新不呼叫模型、無效模型結果保留舊食譜、煮完逐項確認移除，全部通過。Safari 引擎原先 360px 清單篩選器溢出已修正。這些是瀏覽器 viewport 測試，不是真機認證。
- **正式 HTTPS、真實 DeepSeek 呼叫**：`tests/live_ai_browser.py` 用 WebKit 與系統 TLS 信任完成兩次模型呼叫。輸入已檢視的公開番茄照片（Wikimedia `Tomato_je.jpg`，不是私人相片），成功返回「番茄」候選，確認前庫存仍為空，日期維持未知。以番茄、雞蛋、豆腐、菠菜生成兩款不同類別的繁中菜式：「番茄炒蛋」及「菠菜豆腐湯」。API 回報 `provider=deepseek`、`model=deepseek-flash`；不是 fixture 或固定食譜。生成後四筆庫存全部保留，勾選一筆完全用完後，只有一筆進入已用完清單。390px 版面及食譜詳細頁通過，無未捕捉 JS 錯誤。
- 正式網站 `tests/web_api_contract.py` 與 WebKit `tests/web_browser.py` 通過：登入／CSRF、跨冰箱權限、CRUD、衝突、日期、共享邀請及撤權、私人偏好、清空及重登入。
- CareSync 首頁正常；原 `/api/analyse` 在沒有有效 owner code 的 near-fall POST 仍回 403。沒有取出其秘密或聲稱此次已用 owner code 執行 CareSync 真實模型；near-fall High 規則由原回歸測試驗證。

正式模型驗收結果與截圖放在忽略的 `artifacts/live-ai/`，不包含秘密。CI 使用測試 RPC，避免每次 push 消耗模型額度。沒有關閉 TLS 驗證、修改系統信任或要求使用者執行額外設定。

## Web Prototype 0.5（2026-11-08，香港時間）

此版本在同一網址提供數量、購買批次、部分消耗及客製化食譜。`/healthz` 回報 `0.5`，SQLite 資料庫及帳戶綁定沿用原有設定，舊紀錄不臆測數量或購買日。

- Worker 單元測試 11 項、原 Python API 回歸 48 項通過。CareSync／私有 AI gateway 回歸 116 項通過，兩個 Worker 的語法及 dry-run 檢查通過；CareSync 首頁與原保護的 near-fall POST（未提供 owner code，403）維持原行為。
- 本機及正式 HTTPS 的批次／數量合約通過：第一批 6 隻、第三天另一批 10 隻；第一批消耗 2 隻後餘 4／10；其他批次不變、跨冰箱拒絕、超量／非正數／超過三位小數拒絕、過期版本拒絕、多人同時扣減只允許一筆成功、批次交易回滾、歸零轉已用完、復原只返回最後一次完全用完的份量。舊 client 的整批用完及未帶數量欄位的編輯仍維持數量資料。
- Chromium 與 WebKit 的 `stock_browser.py` 通過：數量必填、單位、購買日、兩批同名雞蛋、部分消耗／取消、全用完／復原、小數、公升、超量輸入、4 人大食量清庫存、3 人小食量菜單及採購清單、窄螢幕與繁中大字。消耗視窗的確定／取消固定可見，食物內容在視窗內捲動。
- 模型邊界使用測試 RPC 驗證：人數、食量及時間設定傳遞；兩道菜合計用量不可超過同批庫存；清庫存不能加入 additional；優先較近到期及同期限較早購買批次；避免食材；無庫存可做採購規劃。測試服務不部署，也不代表真實模型品質。
- **真實 DeepSeek＋正式 WebKit 已通過四個流程**：公開番茄照片辨識；4 人大食量、30 分鐘內的繁中「番茄炒蛋＋菠菜豆腐湯」並列缺少的油／調味等準備清單；實際只消耗部分食材並保留其他批次；清庫存「番茄蛋花湯＋菠菜豆腐羹」只用已記錄食材及水，additional 為空；空庫存規劃 3 人小食量湯品，所有食材均在採購清單，庫存仍為空。每道菜人數吻合，已知用量以原庫存單位驗證，整餐合計沒有超量。
- 清庫存曾收到帶額外食材的模型草稿，檢驗以 `stock_only_extras` 擋下；新增最多一次模型修正後再完整驗證，正式重測通過。修正不循環，持續不符合限制仍回錯誤、保留原庫存與前一次結果。清庫存輸出省略額外主食搭配建議；份量不足的小菜說明仍保留。
- 原公開 Demo 登入成功，現有庫存及使用狀態可讀，舊份量顯示未設定。驗證使用獨立合成帳戶，沒有為固定測試筆數覆寫 Demo 的使用者操作。公開 API／共享邀請／雙語偏好／撤權與登出的 WebKit 回歸通過。

真實模型結果及截圖在忽略的 `artifacts/live-ai/`；本機照片與所有 session state 在忽略路徑，不放入 Git 或原始碼包。一般 CI 僅用本機測試 RPC；實際模型須明確啟用 `LMB_LIVE_AI=1`。沒有製作問卷或正式 user guide。
