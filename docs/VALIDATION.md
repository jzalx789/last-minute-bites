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
