# Last Minute Bites

IS2023 S01G10 — 可運行的共享冰箱 Prototype 0.1。HTML/CSS/JavaScript 前端、Python 標準函式庫後端、SQLite 持久化；無第三方執行依賴。介面預設英文，支援繁體中文。

## 啟動

需要 **Python 3.12+**，包含 `sqlite3`、`ssl`、`zoneinfo` 及系統時區資料。從專案根目錄執行：

```sh
python3 server.py
```

伺服器預設監聽本機 `127.0.0.1` 的 `8000` 埠。用瀏覽器連到這個服務的根路徑 `/`；它會提供 HTML 入口及 API。**不可直接雙擊 `static/index.html` 使用共享功能。** 這是本機開發服務，沒有部署或公開網址。

可覆寫埠及資料庫位置：

```sh
python3 server.py --port 8080 --db .data/kitchen.sqlite3
```

SQLite 資料庫在首次啟動時建立；帳戶、session、食物及偏好在重啟後保留。結束服務按 Ctrl+C。`.data/`、資料庫、測試產物及密鑰不提交 Git。不要在服務運行時直接刪除資料庫。

首次使用請自行註冊及建立冰箱，**沒有內建 demo 帳戶或密碼**。可開兩個獨立瀏覽器設定檔／無痕視窗建立 Owner 及 Editor，以測試共享；同一瀏覽器設定檔內的分頁共用登入。

## 已實作

- Email/password 註冊、登入、登出；密碼 10–128 字元，scrypt 雜湊；7 天 session，HttpOnly／SameSite=Lax cookie，CSRF token 與 Origin 檢查。
- 每帳戶最多一個冰箱。建立冰箱為 Owner，邀請預覽及確認加入為 Editor；Owner 邀請／替換／移除，Editor 可離開；後端逐次驗證角色及成員身分。
- 高熵邀請碼只在產生時顯示，7 天到期，資料庫只存雜湊。替換舊碼不會移除現有成員。
- 扁平 CSS 冰箱／SVG 分類、較小調味架、冷凍位置捷徑、搜尋、Categories／Use first、未知日期區段。
- 新增／編輯共用表單；分類與存放位置分開；完全用完與刪除分開；保留用完紀錄，清空僅影響目前冰箱的食物。
- 包裝日期、生產日期＋正整數期限、未知日期。日曆月份／年份加法會調整月尾／閏日；推算須確認；未知日期會清除舊日期欄位。
- Use by／Best before／Unspecified 分開；過 Use by 不可匹配，未知日期不發提醒，並不表示安全。
- 個人跨分類多選，在此分頁的 sessionStorage 按使用者保存；刷新及頁面切換保留，登出清除。不同帳戶互不干擾，不會寫入共享庫存。
- 4 個版本化示範食譜，精確中英文別名協助對應，表單可確認／修改材料映射；依已選食物覆蓋數及缺料數排序，列出庫存／缺料／油鹽等待檢查項目。閱讀不扣庫存。
- 5 秒輪詢及視窗聚焦更新；失去成員身分時清除載入資料與選取。食物版本檢查避免默默覆寫；衝突保留輸入，需明確重新載入。
- 個人語言、文字大小、預設視圖、日期格式、App 內 1／3／7 天日期提醒；按帳戶保存，不影響其他成員。
- 手機／桌面配置、原生表單標籤、鍵盤焦點、跳至內容、文字日期狀態、可取消的對話框；文字以跳脫後的純文字渲染。

## 操作示範

1. 註冊第一個帳戶，建立冰箱；點分類或 Add food，輸入少量食材。
2. 進入 Settings → Shared kitchen，產生邀請碼並複製。
3. 在獨立瀏覽器 session 註冊第二個帳戶，輸入碼、預覽、確認加入。同一個 Python 服務及資料庫支援雙方讀寫。
4. 在不同分類勾選食物，點 Find recipes；查看配對及缺料，返回仍保留選取。
5. 編輯食物可儲存、標記完全用完或確認刪除。Owner 才能移除成員及在 Settings 清空食物，清空需輸入冰箱名稱。
6. Settings → Preferences／Reminders 調整個人顯示及 App 內提醒。

## 驗證

後端整合測試僅需 Python，使用暫存資料庫及獨立 HTTP session：

```sh
python3 -m unittest discover -s tests -v
```

真實瀏覽器驗收需額外測試工具 **Playwright 1.62.0** 與 Chromium；不屬於應用程式執行依賴。此雲端環境已有這些工具。其他機器可在獨立虛擬環境安裝 `playwright==1.62.0`，並安裝 Chromium。測試預設使用 `/usr/bin/chromium`，也可設定 `LMB_TEST_CHROMIUM` 為自己的執行檔路徑。

```sh
python3 tests/browser_smoke.py
```

測試啟動自己的臨時服務，不會使用／覆寫開發資料庫。截圖位於忽略的 `artifacts/`。實際結果及範圍見 [驗證紀錄](docs/VALIDATION.md)。

## 設定與安全界線

[.env.example](.env.example) 列出可用的非秘密設定；程式**不會自動載入 .env**，請透過 shell／服務管理器注入。手動新增、登入、共享及固定食譜都不需外部 API。照片辨識／OCR **未實作且沒有假入口**，不需要提供 API key。

本 Prototype 使用 Python `ThreadingHTTPServer`，供開發／課程示範。若日後正式部署，需要 HTTPS 反向代理、備份、服務監管、存取與負載審查；設定 `LMB_SECURE_COOKIE=1` 及外部同源 `LMB_ORIGIN`，不可直接把開發伺服器宣稱為正式雲端服務。未加入 Email 驗證、忘記密碼、跨機器速率限制或背景通知。登入／註冊限制每來源 IP 每 5 分鐘 30 次、每 Email 15 次；邀請嘗試每帳戶每 5 分鐘 20 次，限制在程序重啟後重設。

日曆時區於註冊時從瀏覽器取得，無效時使用 Asia/Hong_Kong，並在偏好頁顯示；日期本身保留 `YYYY-MM-DD`，不做 UTC 轉換。提醒只在 App 開啟時出現；資料輪詢不是即時同步；個人選取只在目前瀏覽器分頁保留，並不跨裝置同步。

示範食譜尚待團隊審核，未經真人試煮；不提供數量／營養／過敏或安全性判斷。登入、角色共享、日曆日期計算及配對為實際完成的功能；共享／其他功能是否符合課程「進階功能」計分分類仍需組員與課程要求核對，沒有聲稱獲課程認可。

## 原始碼交付

```sh
python3 scripts/package.py
```

產生 `artifacts/S01G10.zip`，只包含 Git 追蹤的原始碼／文件／非秘密設定範例，不包含 `.git`、帳戶、資料庫、真實密碼或測試截圖。解壓後按上述 Python 命令啟動。

- [架構、資料表與 API](docs/ARCHITECTURE.md)
- [完整開發規格](DEVELOPMENT_PROMPT.md)
- [工作流程](docs/APP_FLOW.md)
- [設計參考索引](design/README.md)：索引中的 PNG 未包含在目前 checkout；介面使用實際 HTML/CSS/SVG 元件。

以上文件說明實際實作，不宣稱已修改原 proposal 或完成團隊食譜審核。
