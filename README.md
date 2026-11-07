# Last Minute Bites — Prototype 0.2

可運行的 mobile-first 共享冰箱 App。HTML/CSS/JavaScript、Python 3.12+、SQLite。英文／繁中；本機 Python 不需第三方框架，QR 程式庫已本地打包。

## 在 Mac 開啟

1. 下載並解壓最新 `S01G10.zip`。
2. 雙擊 **Open on Mac.command**；它會自動啟動服務並開瀏覽器，請保留終端機視窗。
3. 需要測試帳戶／資料，改用 **Open Demo on Mac.command**。首次會建立隔離的合成 Owner／Editor／無關帳戶；隨機帳密顯示在本機終端機，保存在 `.data/demo/demo-credentials.json`。

需要 Python 3.12 或以上版本。若 macOS 阻擋下載的 command，可在專案資料夾的 Terminal 執行：

```sh
python3 scripts/open_local.py
# 或：python3 scripts/open_local.py --demo
```

一般模式可自行註冊並建立冰箱。Demo 不會覆寫一般資料庫，請勿將本機 Demo 帳密用在其他已部署的資料庫。不要直接雙擊 `static/index.html`，共享功能需要後端。

## 在手機開啟／部署

已有 PythonAnywhere 帳號 **Jzalx**，目前**尚未部署正式網址**。雙擊 **Deploy to PythonAnywhere.command**，核對帳號，在你自己的終端機隱藏輸入新 API Token。Token 不會保存到程式或傳回聊天；若曾貼到聊天，請先撤銷再產生新的 Token。

部署器會保護不相關的既有網站、上傳本次版本、設定 HTTPS／持久 SQLite、執行公開存取及共享／權限 smoke check，並產生這個網站自己的教師 Demo 帳戶。成功才會顯示實際網址；帳密在本機 `.data/deployment/demo-credentials.json`。免費主機有用量與續用限制，須保持服務有效。

若要從 Terminal 執行：

```sh
python3 scripts/deploy_pythonanywhere.py --username Jzalx --apply --ask-token --demo
```

手機使用正式 HTTPS 網址：iPhone Safari 分享 → 加入主畫面；Android 瀏覽器選單 → Install app／加入主畫面。提供圖示、standalone 與公開殼離線提示；庫存與共享需要網絡。部署腳本已做本機及安全保護測試，**尚未在你的主機實際執行**。

## 已實作

- Email/password 登入、註冊、session、CSRF；scrypt、HttpOnly／SameSite cookie。
- Owner／Editor 共用庫存；邀請預覽／確認、替換／7 天到期、移除／離開、後端逐次驗權。
- **相機掃描邀請 QR Code**：影像只在裝置內處理，拒絕相機時可手動輸入；掃描不會自動加入。
- 可操作的冰箱分類／調味架、冷凍位置捷徑、搜尋、Use first、跨分類個人多選。
- Food CRUD、用完與刪除分開；包裝／生產日＋期限／未知三種日期；月尾／閏年；Use by 與 Best before 分開。
- 四個固定雙語食譜、精確材料映射、全／部分／無匹配、缺料及 Check at home。閱讀不扣庫存。
- 5 秒及聚焦刷新、失權清理、版本衝突保留草稿；新增表單 request_id 防止重試重複紀錄。
- 個人雙語、放大文字、預設視圖、日期格式、App 內日期提醒；未知日期不提醒。
- PWA manifest／圖示／安裝指引／Service worker；不快取任何 API 或私人資料。
- WSGI／Gunicorn 部署入口、持久 SQLite、健康檢查、私人備份、Mac 啟動器。

## 開發與測試

```sh
python3 server.py --port 8000
python3 -m unittest discover -s tests -v
node --check static/app.js
python3 tests/browser_smoke.py
python3 tests/mobile_acceptance.py
```

瀏覽器測試需 Playwright 1.62.0、Pillow 13.0.0、Chromium；覆寫 `LMB_TEST_CHROMIUM` 可選執行檔。WebKit 測試另設 `LMB_TEST_WEBKIT=1` 並安裝其瀏覽器／系統依賴。測試使用暫存資料庫，截圖在忽略的 `artifacts/`。測試結果見 [VALIDATION.md](docs/VALIDATION.md)。

`.env.example` 是非秘密設定範例，不會自動載入。一般資料庫在 `.data/kitchen.sqlite3`；持久化保存帳戶／食物，不能提交 Git。正式部署設 `LMB_DB`、`LMB_ORIGIN`、`LMB_SECURE_COOKIE=1`。Gunicorn 依賴：`pip install --require-hashes -r requirements-deploy.txt`。不需要外部 AI／食譜 API key。

此版完成 QR 相機功能，**未做食物照片辨識／OCR**。食譜仍待團隊審核；不提供安全／營養／過敏判斷或背景推播。Chromium／WebKit 的手機模擬與相機測試已執行，尚未實體手機驗收。課程平台／進階分類與分數仍由老師確認。

## 打包

```sh
python3 scripts/package.py
```

產生 `artifacts/S01G10.zip` 及可從 GitHub 下載的 `submission/S01G10.zip`。只包追蹤的原始碼／必要設定與技術文件，排除資料庫、Token、私人帳密、快取、截圖及 ZIP 自身。QR 程式庫授權見 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
