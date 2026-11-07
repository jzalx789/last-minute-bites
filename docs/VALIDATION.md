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
