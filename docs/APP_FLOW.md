# Last Minute Bites 目前操作與畫面流程

版本 1.4.2；2026-11-15 核對。舊的固定食譜流程保存在 [歷史文件](legacy/APP_FLOW_0_1.md)，不適用於目前 App。

```mermaid
flowchart TD
  Open[開啟手機網站 / PWA] --> Auth{已登入?}
  Auth -->|否| Login[登入或註冊並主動同意條款]
  Login --> Kitchens[建立 / 預覽邀請並加入 / 切換廚房]
  Auth -->|是| Kitchens
  Kitchens --> Home[冰箱首頁：分類 / 優先使用 / 日期提醒]
  Home --> Inventory[我的食材：搜尋 / 篩選 / 跨分類選材]
  Home --> Add[新增或編輯食材批次]
  Add --> Photo{選用照片 AI?}
  Photo -->|同意後辨識| Candidate[確認食材建議；日期及份量另填]
  Photo -->|不用或取消| Manual[手動名稱及分類]
  Candidate --> Save[驗證日期、數量、版本後保存]
  Manual --> Save
  Save --> Home
  Inventory --> Recipes[設定模式、人數、份量、菜數、偏好]
  Recipes --> Consent{文字 AI 已同意?}
  Consent -->|取消| Recipes
  Consent -->|同意| Generate[生成或單道替換；庫存不變]
  Generate --> Result[菜式、步驟、庫存用量及補購清單]
  Result --> Used[煮食後明確確認實際消耗]
  Inventory --> Used
  Used --> Transaction[版本、數量、權限檢查；交易扣減]
  Transaction --> Inventory
  Inventory --> Delete[獨立刪除 / 用完後復原]
  Home --> Settings[設定：偏好、共享、私隱、帳戶]
  Settings --> Owner[擁有者：改名、邀請、移除成員、名稱確認清空]
  Settings --> Party[聚會：明確來源分享、撤回、到期或結束]
  Settings --> Privacy[獨立 AI 選擇 / 匯出 / 清除歷史]
  Settings --> Account[更改密碼 / 登出 / 刪除帳戶]
```

## 畫面與不變條件

- 首次使用：不預先勾選條款；文字與照片 AI 預設關閉，可先用手動庫存。重新確認協議不代表同意相機或通知。
- 新增／編輯：同一表單處理數量、單位、購買日、日期來源、分類與位置；未知舊數量可保持未知。
- 食譜：順序為 `stock_first`、`plan`、`use_up`。模式約束與補購限制在後端驗證，不是固定配對四個食譜。
- 消耗：輸入實際數量或按 All，再明確確認；取消不扣庫存，不能把看過食譜當作已煮食。
- 共享：角色依廚房分別判斷；跨廚房只在聚會使用已批准來源。停止分享、離開、移除或到期後立即停止來源存取。
- 設定：擁有者可改名；清空只處理目前廚房的食物紀錄，名稱不符會保留確認視窗並提醒空格。
- 私隱與帳戶：不接受新版條款仍可存取匯出／刪帳；有其他成員的自有廚房須先轉移擁有權。
- 畫面持續呈現儲存成功、錯誤、載入及空白狀態；窄屏、放大文字及鍵盤 viewport 有專門驗收。

這是開發流程說明，不是已完成的正式課程 User Guide。正式指南仍需組員整理畫面、步驟及真機證據。
