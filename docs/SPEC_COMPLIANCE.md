# IS2023 程式與交付規格對照

核對日期：2026-11-15（香港時間）。執行中 App 為 1.4.2；功能來源快照為 `806bb34`。本次更新交付工具與開發文件，不更改正式資料或增加新平台。

依使用者提供的 40 頁 IS2023 GP 規格核對。頁碼採 PDF 印出的頁碼。檔名標示 2026-27A，文件內標題卻是 2025-26；本文不自行判定哪個學年有效。2026-11-15 使用者確認開發平台「尚未確認」獲老師批准。

## 結論與不可代替的外部確認

程式已具備五項核心功能，以及至少兩個分屬不同類別的進階功能候選：AI 整合、雲端資料庫／共享資料。既有自動驗收覆蓋這些流程。HTML URL 在第 16 頁的提交格式內，但第 13 頁要求平台獲老師批准，故只能列為「格式有依據、平台批准待確認」，不能宣稱已完整合規。

PDF 第 1 頁的 learning outcome 及第 31 頁 rubric 提及 Android-compatible／buildable APK；第 13、16 頁則接受 Android、iOS 或 emulator，以及 APK、IPA、HTML URL。請向老師確認這次作業能否以目前 Web/PWA 及 HTML URL 交付；若指定 APK，須另建置及測試 Android 包，不能把此 HTML 入口當作 APK。

## Prototype 與程式碼

| 規格 | 狀態 | 實作／可核對證據 |
| --- | --- | --- |
| 認證（p13） | 已實作，有驗收 | 真實帳戶、密碼雜湊、session、owner/editor；`web/worker.js`、`web/account.js`；`web_api_contract.py`、`privacy_api.py` |
| 導覽結構（p13） | 已實作，有驗收 | 底部導覽、返回、hash routes、多廚房切換；`static/app.js`；`web_browser.py`、`multi_kitchen_browser.py` |
| 儲存／讀取（p13） | 已實作，有驗收 | 雲端 SQLite Durable Object、批次 CRUD、重登／版本／交易；`stock_api_contract.py`、`multi_kitchen_api.py` |
| 互動 UI（p13-14） | 已實作，有驗收 | 表單、搜尋、篩選、多選、食譜設定、消耗／復原、改名；相關 API／browser tests |
| 成功／錯誤／載入／空白狀態（p14） | 已實作，有驗收 | 雙語 status、錯誤保留輸入、過時版本／名稱不符處理；`user_fixes_browser.py`、`kitchen_settings_browser.py` |
| Mobile-first UI（p14） | 有瀏覽器證據 | 窄屏、短屏、大字及 keyboard viewport；`auth_keyboard_browser.py`、`iphone_fixes_browser.py` 等；不是實體 OS 裝置證明 |
| 進階類別一：AI（p15） | 已實作；fixture 驗證與真實呼叫紀錄分開 | DeepSeek 私有 RPC、食譜、分類、照片建議；`web/ai.js`、`web/ai-gateway.js`、`ai_api_contract.py`；不把三種 AI 功能算成三個獨立類別 |
| 進階類別二：雲端資料庫（p15） | 已實作，有驗收 | Cloudflare 持久 SQLite、共享廚房／批次；每五秒輪詢更新，並非推送式即時資料庫 |
| 額外進階功能：QR 相機（p15） | 有程式與部分測試；真機仍待補證據 | `static/mobile.js`、本地 jsQR；權限及拒絕備援；不靠此項作為唯一第二類別 |
| 可建置／可重現（p16） | 已提供設定；平台批准另計 | lockfile、Node.js 24、Python 3.12、兩個本機 Wrangler 服務、隔離 fixture；README 有啟動及驗收指令 |
| 原始碼及執行入口（p16-17） | 已補強交付 | `S01G10.zip`、`submission/S01G10.html` 和正式 HTTPS URL；明示不是 APK／完整離線後端 |
| 檔案大小（p17） | 由匯出驗證控制 | 不含依賴／資料庫／憑證，低於 50 MB；實際 bytes、版本及 SHA-256 manifest 由打包程序產生 |
| 程式組織／註解（p17） | 有模組分工與開發文件 | `web/` 按資料／權限／AI／通知分工；前端入口仍較大，可作後續維護改進，非無缺陷保證 |
| 私密資料與第三方來源（p20、35） | 已有邊界，須組員覆核 | 打包拒絕私人／執行檔案；QR notices／license；新增 AI 使用紀錄，不能代替個人 review |

## 驗證證據及其界線

- 功能來源 `806bb34` 的完整 Prototype acceptance：<https://github.com/jzalx789/last-minute-bites/actions/runs/43384797422>，50 項 Worker 單元測試、當時 48 項 Python 相容測試，以及 API／Chromium／WebKit 流程成功。
- 1.4.2 正式部署流程：`43385450610` 成功；當次部署先有前端／後端版本切換差距，代理等待後端回報 1.4.2，再驗證改名、名稱不符保護、兩種語言的確認文字及測試帳戶清理。不可只以早期 health HTTP 200 證明新後端已生效。
- 2026-11-15 公開 `/healthz` 回報 1.4.2。新增打包驗證檢查版本一致、逐檔 hash、來源變更、敏感路徑及 50 MB 邊界；最終執行結果應連同交付包保留。
- Fixture 不代表真實模型品質；Playwright 手機 viewport／WebKit 不等於 Android／iOS OS emulator 或真機。實體相機、通知收件及最新實機流程，仍應由組員另外記錄裝置、瀏覽器、版本和日期。
- 使用者曾提供回饋，1.4.2 已修正照片確認按鈕、冰箱改名及清空名稱提示；本文件不附含姓名／電話的私人聊天截圖，也不虛構問卷、測試人數或回饋統計。

## 本次本機檢查結果

- 2026-11-15：50 項 Worker 單元測試、52 項 Python／匯出回歸測試通過；Worker／前端 JavaScript 語法檢查通過。Python 項目包含舊後端相容測試，不代替目前 Worker 功能驗收。
- 對比 `806bb34`，`static/` 和 `web/` 執行程式未改動；新 HTML 是獨立課程入口，沒有加入正式 App 路由。
- 正式 `/healthz` 回報 1.4.2；HTML 入口在瀏覽器可開啟並前往正式登入畫面。

## 程式碼以外仍需準備

| 項目 | 此次狀態 |
| --- | --- |
| 老師批准目前平台／提交形式 | 待確認；使用者已表示尚未確認 |
| 當前版本 Android／iOS 真機或 OS emulator 測試 | 需補可辨認裝置及版本的證據；不能以瀏覽器模擬替代 |
| Architecture & User Guide（p18-21，最多20頁） | 開發文件已更新；沒有替組員生成可直接宣稱完成的正式指南、封面、目錄或真機截圖 |
| 測試報告、使用者回饋、真實裝置／AI展示 | 有部分歷史及自動化證據；仍須整理實際測試範圍與限制 |
| 重要 AI prompts／人類檢閱與修訂（p35） | 已補代理協助紀錄；組員仍須親自審閱、補充真實決定和反思 |
| 提案、BMC、競品、設計稿、進度／分工紀錄 | 未在此次程式碼檢查中證實已完整符合，不代填貢獻 |
| 少於10分鐘影片、最多10張slides、viva（p22-29） | 不屬於此次程式碼／交付包修正，須另外完成 |
| 有效學年及交付截止 | PDF 內學年與檔名不同，User Guide 截止亦有 Week 11／12 差異；以老師最新公布為準 |

不得把此對照或自動測試成功當作授課老師批准、學術誠信確認、已提交或必定取得某個分數的證明。
