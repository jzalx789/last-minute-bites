# Prototype 0.2 架構與 API

瀏覽器從同一 Python HTTP 服務載入 `static/index.html`、`app.js`、`style.css`；前端透過同源 `/api/*` JSON 呼叫後端。`server.py` 管理 SQLite 交易、session、日期計算、食譜配對與權限。`recipes.json` 保存四個雙語固定食譜。不需 CDN、外部字體、資料服務、前端 build 或 API key。

## 資料表

| 表 | 內容及不變條件 |
| --- | --- |
| users | 唯一的小寫 Email、scrypt salt/hash；不存明文密碼 |
| sessions | opaque cookie token 的 SHA-256 雜湊、可空的 user_id、CSRF token、到期時間；匿名 session 用於登入前 CSRF |
| kitchens | 冰箱名稱 |
| memberships | user_id 主鍵確保一人一冰箱，kitchen_id 外鍵，owner/editor 檢查及每冰箱最多一位 Owner 的部分唯一索引 |
| invitations | 邀請碼雜湊、唯一 kitchen_id、7 天到期時間；每冰箱只有一個現行邀請 |
| food_items | 自增 ID、kitchen_id、version、active/used 狀態及後端驗證後的 JSON 食物欄位 |
| user_preferences | user_id 主鍵及經驗證的個人設定 JSON |

食物 JSON 包含 name、category、location、note、ingredient、date_source、date_kind、effective_date、production_date、shelf_life、shelf_unit。未知日期會正規化並清除相關日期資料。推算日期每次在後端重算，不能信任前端有效日期。分類與位置獨立；確切標準材料由用戶在表單確認，未映射項目不匹配。

每個連線開啟 foreign_keys、10 秒 SQLite busy timeout。WAL 模式。所有 API 在 `BEGIN IMMEDIATE` 交易中檢查 session 及 membership，寫入與權限檢查不會被其他寫入穿插；例外回滾，並關閉連線。新資料庫權限設為 0600，新資料目錄為 0700。`PRAGMA user_version=2` 為目前 schema，版本 2 非破壞性建立 mutation_keys 表，既有帳戶／食物不改動。

## API

`GET /api/state` 取得／建立 session，回傳 csrf、user。已登入時另有 preferences、today、kitchen、members、foods、ingredients；沒有冰箱的使用者不獲得任何其他冰箱資料。食品 eligibility 以使用者註冊時保存的時區日期計算。原始 token／密碼／邀請碼不會透過 state 回傳。

所有以下 API 使用 **POST**，`Content-Type: application/json`、目前 session 的 `X-CSRF-Token`，以及同源 Origin（瀏覽器提供）:

| 路徑 | 主要資料／行為 | 存取 |
| --- | --- | --- |
| /api/register | email, password, confirm_password, timezone（選填）；建立帳戶並輪換 session | 匿名 session |
| /api/login | email, password；輪換 session | 匿名 session |
| /api/logout | 結束目前 session，建立新匿名 session | 已登入 |
| /api/preferences | language, text_size, default_view, date_format, reminders, reminder_days；只修改提供欄位 | 自己 |
| /api/kitchen/create | name；建立冰箱及 Owner membership | 尚未加入 |
| /api/invitation/preview | code；只預覽冰箱名稱、Editor 角色及到期時間 | 尚未加入 |
| /api/invitation/accept | code, confirmed=true；再次驗證碼與一人一冰箱 | 尚未加入 |
| /api/invitation/replace | 撤銷舊邀請並回傳新 code/expires（只顯示一次） | Owner |
| /api/member/remove | user_id, confirmed=true；只能移除自己冰箱的 Editor | Owner |
| /api/kitchen/leave | confirmed=true；保留食物，不能移除 Owner | Editor |
| /api/kitchen/clear | confirmed=true, kitchen_name（須完全吻合）；只刪目前冰箱食物 | Owner |
| /api/date/preview | production_date, shelf_life（正整數）, shelf_unit（days/months/years） | 已登入 |
| /api/food/create | 食物欄位；production 模式須 date_confirmed=true | Owner/Editor |
| /api/food/update | id, version, 食物欄位；只允許 active | 同冰箱成員 |
| /api/food/used | id, version, confirmed=true | 同冰箱成員 |
| /api/food/delete | id, version, confirmed=true | 同冰箱成員 |
| /api/recipes | selected（食物 ID 陣列）；重驗 eligibility／範圍，回傳 removed、selected、recipes | 同冰箱成員 |

所有錯誤為 `{"error":{"code":"..."}}`，例如 invalid_input (400)、unauthorized (401)、csrf/owner_only/no_kitchen (403)、food_not_found/invalid_invitation (404)、conflict/already_member (409)、rate_limited (429)、storage_unavailable (503)。前端以中英文呈現，寫入失敗不清除表單；版本衝突需按 Reload latest record 並確認放棄輸入。當請求在回應前中斷時，客戶端無法確定伺服器是否完成寫入；重試新增前應先查看庫存，尚未實作通用 idempotency key。

## 隔離、同步與安全

後端從 session 推導使用者、從 membership 推導 kitchen_id，拒絕跨冰箱 ID；不依賴用戶傳來角色或 kitchen_id。移除／離開後下一次 state 不返回舊資料，下一次寫入拒絕。Owner 不能自我移除、離開或被 Editor 移除。不能撤回被移除者已存的副本。

食物每次更新／用完增加 version，更新／刪除須提交載入時的 version；交易內比較，過時版本 409。自增 ID 避免清空後重用舊 ID。前端每 5 秒及聚焦請求 state，正在填表／搜尋時避免用輪詢覆寫輸入；失去 membership 時仍即時清除畫面與選取。選取在分頁 sessionStorage 按帳戶分開，不是 shared state，不儲存密碼／session cookie。Session cookie 7 天有效，不做滑動到期。

CSRF token 與 cookie 分離，同源 Origin 檢查；HttpOnly、SameSite=Lax，HTTPS 部署另開 Secure。靜態檔案只開放固定三條路徑，不可下載資料庫／後端原始碼。Content-Security-Policy 禁止 inline script、跨來源連線及被嵌入；文字資料跳脫後呈現。參數化 SQL 避免使用者輸入構成 SQL。例外回應不洩漏資料庫訊息；請求日誌不記錄 body/cookie/query。速率限制保存在單程序記憶體，屬 Prototype 防護，非正式多機防濫用設計。

生產日期計算假設生產日為第零日，加日曆天／月／年，月尾調整至有效日。計算參考值不自動等於安全期限；Use by／Best before 只採用用戶明確確認的包裝措辭。資料未知不判定安全；日期未知、已用完、過 Use by 等規則在 UI 及伺服器端配對共同執行。


## 0.2 手機與部署補充

`Store` 將應用狀態與 HTTP 傳輸分開；`server.py` 用 BaseHTTPRequestHandler，`wsgi.py` 用 WSGI，兩者共用相同驗證／權限／交易方法。完整 HTTP 合約測試也在 WSGI 執行，實際 Gunicorn 啟動與重啟持久化另有測試。

新增 mutation_keys：user_id、request_key 複合主鍵，kitchen_id 外鍵、body_hash、result JSON。只針對 food/create；同使用者／相同內容重試取回既有 ID，不同內容或已刪除項目 409。membership 仍在查鍵前驗證。

Camera QR 使用 locally bundled jsQR 1.4.0 / qrcode-generator 2.0.4。payload 是 `lmb-invite:<32-character-code>`，不自動接受 URL 或加入；成功只填入表單，必須經伺服器預覽及確認。相機權限限同源，畫面不上傳；離頁、背景、關閉會停止 tracks。靜態資產白名單新增 icons／manifest／mobile.js／sw.js／兩個程式庫；授權／雜湊見 THIRD_PARTY_NOTICES.md。

Service worker cache 名稱按版本更新，只保存明確公開殼路徑；所有 `/api/`、POST、跨來源、私人資料均略過，不提供假離線同步。原有登入 cookie 不能直接由 JavaScript 讀取。

正式主機指引與安全 PythonAnywhere 部署腳本見 DEPLOYMENT.md。公開 HTTPS 尚待帳戶／token，不能從本機測試推論正式網址可用。
