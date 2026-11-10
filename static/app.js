"use strict";
const $ = (s, r = document) => r.querySelector(s),
  E = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const words = {
  language: ["Language", "語言"],
  until: ["Valid until", "有效至"],
  kitchen: ["Kitchen", "冰箱"],
  recipes: ["Recipes", "食譜"],
  settings: ["Settings", "設定"],
  back: ["Back", "返回"],
  add: ["Add food", "新增食物"],
  edit: ["Edit", "編輯"],
  cancel: ["Cancel", "取消"],
  save: ["Save changes", "儲存變更"],
  saved: ["Changes saved", "已儲存變更"],
  clear: ["Clear", "清除"],
  find: ["Find recipes", "尋找食譜"],
  selected: ["selected", "項已選"],
  categories: ["Categories", "分類"],
  use_first: ["Use first", "優先使用"],
  produce: ["Fruit & vegetables", "蔬果"],
  dairy: ["Eggs & dairy", "蛋奶"],
  protein: ["Meat & seafood", "肉類海鮮"],
  cooked: ["Cooked food", "熟食"],
  condiments: ["Condiments", "調味料"],
  dry: ["Dry goods", "乾貨"],
  other: ["Other", "其他"],
  dryother: ["Dry goods & other", "乾貨及其他"],
  freezer: ["Freezer", "冷凍庫"],
  fridge: ["Fridge", "冷藏庫"],
  pantry: ["Pantry", "食品櫃"],
  all: ["All food", "全部食物"],
  welcome: [
    "A little less waste. A little more dinner.",
    "少一點浪費，多一份好煮意。",
  ],
  intro: [
    "Keep track of what you have, use it in time, and find something simple to cook.",
    "記下家中食材，優先使用，再找一道簡單好菜。",
  ],
  sign_in: ["Sign in", "登入"],
  register: ["Create account", "註冊帳戶"],
  email: ["Email", "電郵"],
  password: ["Password", "密碼"],
  confirm_password: ["Confirm password", "確認密碼"],
  show_password: ["Show passwords", "顯示密碼"],
  password_hint: ["Use 10–128 characters.", "請使用 10 至 128 個字元。"],
  loading: ["Loading…", "載入中…"],
  auth_hint: [
    "Sign in to keep a food list with the people you cook with.",
    "登入後可與冰箱成員共享食材紀錄。",
  ],
  create_kitchen: ["Create a kitchen", "建立冰箱"],
  privacy_data: ["Privacy & data", "隱私與資料"],
  account_security: ["Account & security", "帳戶與安全"],
  terms_title: ["Terms of use", "用戶協議"],
  privacy_policy: ["Privacy policy", "隱私政策"],
  agree_terms: ["I agree to the Terms of use and acknowledge the Privacy policy.", "我同意用戶協議，並已知悉隱私政策。"],
  agreement_required: ["Please review and accept the current agreement first.", "請先閱讀並同意目前版本的協議。"],
  agreement_intro: ["Please review the updated terms. Optional AI and device permissions are separate. You can still export data or delete your account without accepting.", "請閱讀更新的條款。自選 AI 與裝置權限會分開處理；不接受仍可匯出資料或刪除帳戶。"],
  agreement_accept: ["Agree and continue", "同意並繼續"],
  legal_version: ["Agreement version", "協議版本"],
  contact_privacy: ["Privacy enquiries", "私隱查詢"],
  ai_text_choice: ["Allow text AI for recipes and unfamiliar food names", "允許文字 AI 生成食譜及判斷陌生食物名稱"],
  ai_photo_choice: ["Allow AI processing of photos I choose", "允許 AI 處理我選取的照片"],
  ai_choice_notice: ["DeepSeek receives the food data or reduced photo needed for the feature. Processing may occur outside your location, including China. Providers have their own retention/use policies. Do not send sensitive information. Either choice is optional; turning one off clears your saved AI results in this app.", "DeepSeek 會接收功能所需食材資料或縮小後照片，可能在你所在地以外（包括中國）處理，供應商有其保留與使用政策。請勿提交敏感資料。兩項均可拒絕；關閉任何一項會清除本 App 的個人 AI 結果。"],
  classification_privacy: ["Text AI is off. Confirm this is food to enter it manually, or change Privacy & data.", "文字 AI 已關閉。確認是食物後可手動新增，或到「隱私與資料」更改選項。"],
  privacy_changed: ["Privacy choices changed while processing. Review them before trying again.", "處理期間隱私選項已改變，請檢查後再試。"],
  ai_consent_required: ["AI is off. You can enable the relevant option in Privacy & data.", "AI 尚未啟用，可到「隱私與資料」開啟所需選項。"],
  ai_text_prompt: ["Enable text AI?", "啟用文字 AI？"],
  ai_photo_prompt: ["Send this photo to AI?", "將這張照片交給 AI？"],
  permissions_title: ["Device permissions", "裝置權限"],
  permission_camera: ["Camera · invitation QR only", "相機・只用於邀請 QR 掃描"],
  permission_notification: ["Notifications", "通知"],
  permission_note: ["Permission is requested only when you use the feature. Change camera/notification access in browser or system settings. We do not request location or microphone. Photo selection does not grant background access to your whole album.", "只有使用功能時才詢問權限。相機／通知可在瀏覽器或系統設定更改。我們不要求定位或麥克風；選取照片不會授予背景存取整個相簿的權限。"],
  permission_granted: ["Allowed", "已允許"],
  permission_denied: ["Blocked", "已封鎖"],
  permission_prompt: ["Ask when used", "使用時詢問"],
  permission_unknown: ["Check browser settings", "請在瀏覽器設定查看"],
  permission_unsupported: ["Unavailable in this browser", "此瀏覽器不支援"],
  export_data: ["Download my data", "下載我的資料"],
  export_note: ["Includes your account, choices, accessible kitchen food and personal recipes. The download contains private information; keep it secure.", "包含你的帳戶、選項、有權查看的廚房食材及個人食譜。下載檔包含私人資料，請妥善保管。"],
  clear_ai_history: ["Clear my AI history", "清除我的 AI 歷史"],
  clear_ai_history_note: ["Delete your saved recipes and name-assessment cache? Shared food records stay available.", "刪除你儲存的食譜與名稱判斷快取？共享食材紀錄會保留。"],
  clear_device: ["Sign out and clear this device", "登出並清除此裝置暫存"],
  clear_device_note: ["Sign out this session, stop its server push subscription, and remove this app’s local selections and shell cache? Downloaded files and your server account are separate.", "登出此登入、停止其伺服器推播訂閱，並移除本 App 的本機選材與介面快取？已下載檔案及伺服器帳戶須另行管理。"],
  password_current: ["Current password", "目前密碼"],
  password_new: ["New password", "新密碼"],
  password_change: ["Change password", "更改密碼"],
  password_unchanged: ["Choose a different new password.", "請設定不同的新密碼。"],
  password_changed: ["Password updated; other sign-ins were signed out.", "密碼已更新，其他登入已登出。"],
  active_sessions: ["Active sign-ins", "有效登入數量"],
  logout_all: ["Sign out all devices", "登出所有裝置"],
  delete_account: ["Delete account", "刪除帳戶"],
  delete_account_note: ["Permanently deletes your account, personal history, sessions and owned kitchens with no other members. Food in other members’ kitchens remains. Shared source grants stop. Export anything you need first; provider backups and copies held by others cannot be recalled immediately.", "永久刪除帳戶、個人歷史、登入與沒有其他成員的自有廚房。其他成員廚房的食物會保留，來源分享會停止。請先匯出所需資料；供應商備份與他人持有的副本不能即時收回。"],
  delete_email: ["Type your account email to confirm", "輸入帳戶電郵以確認"],
  destructive_confirm: ["I understand and confirm this action.", "我已理解並確認此操作。"],
  transfer_owner: ["Transfer kitchen ownership", "轉移廚房擁有權"],
  transfer_note: ["Choose an existing Editor as the new Owner. You will become an Editor. Sharing grants from this source kitchen are withdrawn and must be granted again by the new Owner.", "選擇現有編輯者成為新擁有者，你會變為編輯者。此來源廚房的分享會撤回，須由新擁有者重新授予。"],
  transfer_required: ["Transfer ownership of kitchens with other members before deleting your account.", "刪除帳戶前，請先轉移有其他成員廚房的擁有權。"],
  member_not_found: ["Choose an existing Editor in this kitchen.", "請選擇此廚房的現有編輯者。"],
  too_many_foods: ["Select up to 80 ingredients instead of using all stock.", "請改為選用不多於 80 項食材，避免使用全部庫存。"],
  reauth_note: ["Enter your password for sensitive changes. Password changes sign out other sessions. There is no automated email password recovery in this prototype.", "敏感操作須再次輸入密碼，更改密碼會登出其他登入。本原型沒有自動電郵重設密碼功能。"],
  kitchens: ["Your kitchens", "我的廚房"],
  switch_kitchen: ["Switch / add kitchen", "切換／加入廚房"],
  kitchen_switched: ["Kitchen switched", "已切換廚房"],
  current_kitchen: ["Current", "目前使用"],
  party: ["Party mode", "聚會模式"],
  create_party: ["Create a temporary party kitchen", "建立臨時聚會廚房"],
  party_hours: ["Party duration", "聚會時長"],
  hours_24: ["24 hours", "24 小時"],
  hours_48: ["48 hours", "48 小時"],
  hours_168: ["7 days", "7 天"],
  party_sources: ["Shared ingredient sources", "分享的食材來源"],
  party_source_consent: ["Choose kitchens you own to share with this party. All party members can see these food records, use them in recipes and record consumption against the original stock. Sharing does not move or copy food.", "選擇你擁有的廚房分享至聚會。所有聚會成員都可查看這些食材紀錄、合成食譜及扣減原庫存；食物不會搬移或複製。"],
  party_source_hint: ["Only a source kitchen’s owner can share it. Each guest can share their own kitchen after joining.", "只有來源廚房的擁有者可以分享。來賓加入後也可分享自己的廚房。"],
  share_source: ["Share this kitchen’s food", "分享此廚房食材"],
  unshare_source: ["Stop sharing", "停止分享"],
  unshare_confirm: ["Stop sharing these food records with the party? Existing consumption stays recorded in the source kitchen.", "停止向聚會分享這些食材紀錄？已扣減的份量仍保留在來源廚房。"],
  party_invite_policy: ["The code stops working when this party ends. Replacing it stops new joins with the old code; current members stay.", "邀請碼會在聚會結束時失效。替換後舊碼不能再加入，現有成員不受影響。"],
  party_until: ["Party ends", "聚會結束時間"],
  party_closed: ["Party ended · records only", "聚會已結束・僅供查看紀錄"],
  end_party: ["End party", "結束聚會"],
  end_party_confirm: ["End this party now? Records stay available, but invitations, new recipes and inventory changes stop. Food stays in its original kitchen.", "現在結束聚會？紀錄會保留，邀請、新食譜及庫存變更將停止。食物仍留在原本廚房。"],
  party_ended: ["This party has ended. Switch to an active kitchen to make changes.", "此聚會已結束，請切換至其他廚房進行操作。"],
  not_party: ["Cross-kitchen ingredients are available only in party mode.", "只有聚會模式可以使用跨廚房食材。"],
  source_owner_only: ["Only the owner can share this source kitchen.", "只有來源廚房的擁有者可以分享食材。"],
  source_edit_required: ["Edit or delete this food in its source kitchen.", "請到來源廚房編輯或刪除此食物。"],
  kitchen_limit: ["Limit reached: 20 kitchens per account, 8 source kitchens per party.", "每個帳號最多 20 個廚房；每次聚會最多分享 8 個來源廚房。"],
  source_kitchen: ["Source", "來源廚房"],
  party_own_food: ["Food added directly to this party", "直接新增至聚會的食物"],
  push_kitchen_scope: ["This device’s push subscription follows one kitchen. Enable it here to receive reminders for this kitchen.", "此裝置的推播訂閱綁定一個廚房。如需接收目前廚房的提醒，請在此啟用。"],
  join_kitchen: ["Join a kitchen", "加入冰箱"],
  setup_intro: [
    "Start your own kitchen, or join someone you cook with. You can switch between your kitchens, or share food in a temporary party kitchen.",
    "建立自己的冰箱，或加入親友的冰箱。可切換多個廚房，或建立臨時聚會廚房分享食材。",
  ],
  kitchen_name: ["Kitchen name", "冰箱名稱"],
  invite_code: ["Invitation code", "邀請碼"],
  preview_invite: ["Preview invitation", "預覽邀請"],
  join_confirm: ["Confirm and join as Editor", "確認以 Editor 身分加入"],
  preview_note: [
    "Editors can manage food, but cannot invite members or clear the whole kitchen. Existing food is not merged.",
    "Editor 可管理食物，但不能邀請成員或清空冰箱。不會合併舊有庫存。",
  ],
  empty: ["Nothing here yet", "這裡還沒有食物"],
  empty_hint: [
    "Add a few things you already have. No need to record your entire kitchen.",
    "先新增家中幾樣食材，無需一次記下整個冰箱。",
  ],
  kitchen_intro: ["What’s in your kitchen?", "冰箱裡有什麼？"],
  kitchen_subtitle: [
    "Pick a category, or see what to use first.",
    "選擇分類，或看看哪些食物應優先使用。",
  ],
  sync: [
    "Shared food refreshes every 5 seconds and when you return.",
    "共享食物每 5 秒及返回視窗時更新。",
  ],
  offline: [
    "Could not refresh. Showing the last loaded list. Check the connection before editing.",
    "更新失敗，正顯示上次載入的清單；編輯前請檢查連線。",
  ],
  retry: ["Retry", "重試"],
  search: ["Search food", "搜尋食物"],
  no_results: ["No food matches your search.", "沒有符合搜尋的食物。"],
  view_used: ["Include used-up records", "顯示已用完的紀錄"],
  unknown: ["Date unknown", "日期未知"],
  unknown_note: [
    "No date does not mean safe. Check the food and its packaging.",
    "沒有日期不代表安全，請檢查食物及包裝。",
  ],
  known_dates: ["Known dates, earliest first", "已知日期，由近至遠"],
  printed: ["Printed date", "包裝日期"],
  production: ["Production date + shelf life", "生產日期＋保存期限"],
  no_date: ["No date / not sure", "沒有日期／不確定"],
  personal_date_source: ["Decide myself / after opening", "自行決定／開封後"],
  personal_date: ["Planned finish date (optional)", "預計吃完日（選填）"],
  personal_hint: [
    "Set a reminder date, or leave it blank and judge the food’s condition yourself.",
    "可設定預計吃完日，或留空，按食物實際狀態自行判斷。",
  ],
  personal_undated: ["Self-managed, no fixed date", "自行判斷，未設日期"],
  personal_reminder: ["Personal reminder", "自訂提醒日"],
  past_personal: ["Past your reminder date", "已過自訂提醒日"],
  use_by: ["Use by", "此日期或之前食用"],
  best_before: ["Best before", "此日期前最佳"],
  unspecified: ["Unspecified label", "標示不明"],
  past_use_by: [
    "Past use-by — not available for recipes",
    "已過食用期限，不可匹配食譜",
  ],
  past_best: [
    "Past best-before — quality label",
    "已過最佳食用日期，屬品質標示",
  ],
  past_reference: ["Past reference date", "已過參考日期"],
  used: ["Used up", "已用完"],
  active: ["Active", "尚有剩餘"],
  name: ["Food name", "食物名稱"],
  date_information: ["Date information", "日期資料"],
  label_type: ["Package wording", "包裝措辭"],
  date: ["Date", "日期"],
  production_date: ["Production date", "生產日期"],
  shelf_life: ["Shelf life", "保存期限"],
  days: ["Days", "天"],
  months: ["Months", "月"],
  years: ["Years", "年"],
  calculate: ["Calculate reference date", "計算參考日期"],
  reference: ["Calculated reference date", "推算參考日期"],
  confirm_date: [
    "I checked this date and the package’s counting rules.",
    "我已檢查推算日期及包裝的起算規則。",
  ],
  calc_explanation: ["How the date is calculated", "日期如何計算"],
  calc_note: [
    "Add calendar days, months or years to the production date. Months and years clamp to the last valid day. This assumes the production day is day zero. A reference date is not automatically a safety deadline. If the package counts differently, use Printed date and enter its date directly.",
    "將日曆天、月或年加至生產日期；月份及年份會調整至該月最後有效日。假設生產日為第零日。推算參考日期並不自動等於安全期限。如包裝起算規則不同，請用包裝日期模式直接輸入。",
  ],
  category: ["Category", "分類"],
  location: ["Storage location", "存放位置"],
  note: ["Storage note (optional)", "存放備註（選填）"],
  note_hint: [
    "Follow the packaging instructions after opening.",
    "開封後請遵循包裝指示。",
  ],
  recipe_ingredient: ["Recipe ingredient", "食譜材料"],
  mapping_hint: [
    "Confirm an exact ingredient. Unmapped food stays in your list but does not match recipes.",
    "請確認標準材料；未對應的食物仍會保留，但不參與食譜匹配。",
  ],
  unmapped: ["Not mapped", "未對應"],
  tomato: ["Tomato", "番茄"],
  egg: ["Egg", "雞蛋"],
  rice: ["Rice", "白飯"],
  spinach: ["Spinach", "菠菜"],
  pasta: ["Pasta", "意粉"],
  tofu: ["Tofu", "豆腐"],
  soy_sauce: ["Soy sauce", "豉油"],
  oil: ["Cooking oil", "食油"],
  salt: ["Salt", "鹽"],
  mark_used: ["Mark used up", "標記已用完"],
  used_confirm: [
    "Only mark this if none remains. This keeps the record.",
    "只有完全用完才標記，紀錄仍會保留。",
  ],
  delete: ["Delete record", "刪除紀錄"],
  delete_confirm: [
    "Delete this food record for everyone in this kitchen?",
    "刪除此食物紀錄？此變更影響所有冰箱成員。",
  ],
  reload_record: ["Reload latest record", "重新載入最新紀錄"],
  discard: [
    "Discard unsaved changes and load the latest version?",
    "放棄尚未儲存的變更，載入最新版本？",
  ],
  recipe_intro: [
    "Something simple, with what you have.",
    "用手邊食材，簡單煮一餐。",
  ],
  recipe_disclaimer: [
    "4 demonstration recipes, awaiting team review. Not personally tested. Always follow food-safety guidance.",
    "4 個示範食譜，待團隊審核，未經真人試煮。請遵循食物安全指引。",
  ],
  choose_food: [
    "Select ingredients in Kitchen to find matches. You can also browse all four recipes.",
    "到冰箱選擇食材以尋找匹配，也可瀏覽全部四個食譜。",
  ],
  browse: ["Browse all recipes", "瀏覽全部食譜"],
  no_match: ["No matching recipes", "沒有匹配食譜"],
  no_match_note: [
    "None of the fixed recipes uses your selection. Check ingredient mappings or select something else.",
    "固定食譜未使用已選材料。請檢查材料對應，或選擇其他食材。",
  ],
  matches: ["Selected foods used", "用到的已選食物"],
  available: ["In your kitchen", "庫存已有"],
  missing: ["Missing ingredients", "缺少材料"],
  check_home: ["Check at home", "請檢查家中是否有"],
  none: ["None", "無"],
  minutes: ["min", "分鐘"],
  details: ["View recipe", "查看食譜"],
  ingredients: ["Ingredients", "材料"],
  steps: ["Steps", "步驟"],
  update_list: ["Update my food list", "更新食物清單"],
  read_no_change: [
    "Reading a recipe does not change inventory. Confirm changes yourself after cooking.",
    "閱讀食譜不會更改庫存，煮食後請自行確認更新。",
  ],
  shared: ["Shared kitchen", "共享冰箱"],
  preferences: ["Preferences", "個人偏好"],
  reminders: ["Reminders", "提醒"],
  help: ["Help & about", "說明與關於"],
  personal: ["Personal settings", "個人設定"],
  kitchen_data: ["Kitchen data", "冰箱資料"],
  sign_out: ["Sign out", "登出"],
  owner: ["Owner", "擁有者"],
  editor: ["Editor", "編輯者"],
  members: ["Members", "成員"],
  invite_editor: ["Invite an Editor / replace code", "邀請 Editor／替換邀請碼"],
  invite_policy: [
    "Codes expire after 7 days. Replacing a code stops new joins with the old code; current members stay. The code is shown only when generated.",
    "邀請碼 7 天後到期。替換後舊碼不能再加入，現有成員不受影響。邀請碼只在產生時顯示。",
  ],
  copy: ["Copy code", "複製邀請碼"],
  copied: ["Code copied", "已複製邀請碼"],
  copy_failed: [
    "Could not copy. Select and copy the displayed code manually.",
    "未能複製，請手動選取上方邀請碼複製。",
  ],
  remove: ["Remove", "移除"],
  remove_confirm: [
    "Remove this Editor? Their next request will lose access. Shared food stays.",
    "移除此 Editor？對方下次請求將失去存取權，共享食物仍會保留。",
  ],
  leave: ["Leave kitchen", "離開冰箱"],
  leave_confirm: [
    "Leave this kitchen? Shared food stays for the other members.",
    "離開此冰箱？共享食物將為其他成員保留。",
  ],
  clear_kitchen: ["Clear kitchen records", "清空冰箱紀錄"],
  clear_warning: [
    "This deletes every food record for all members. Accounts, membership and preferences stay.",
    "此操作會刪除全體成員的所有食物紀錄，保留帳戶、成員及偏好。",
  ],
  type_name: ["Type the kitchen name to confirm", "輸入冰箱名稱以確認"],
  text_size: ["Text size", "文字大小"],
  standard: ["Standard", "標準"],
  large: ["Large", "放大"],
  default_view: ["Default kitchen view", "預設冰箱視圖"],
  date_format: ["Date format", "日期格式"],
  iso: ["YYYY-MM-DD", "年-月-日"],
  dmy: ["DD/MM/YYYY", "日/月/年"],
  mdy: ["MM/DD/YYYY", "月/日/年"],
  enable_reminders: ["Enable food date reminders", "啟用食材日期提醒"],
  remind_before: ["Remind before date", "日期前提醒"],
  reminder_note: [
    "Dates appear in the app. Enable push below to receive reminders while the app is closed. Food without a date does not trigger reminders.",
    "日期會在 App 內顯示；在下方啟用推播後，關閉 App 仍可收到提醒。沒有日期的食材不會觸發提醒。",
  ],
  push_last_failed: [
    "The last delivery failed. Send a test notification to check the connection.",
    "上次推播未成功，可發送測試通知確認連線。",
  ],
  push_title: ["Device notifications", "裝置推播通知"],
  push_enable: ["Enable notifications", "啟用推播通知"],
  push_disable: ["Stop notifications on this device", "停止此裝置推播"],
  push_test: ["Send a test notification", "發送測試通知"],
  push_refresh: ["Refresh notification status", "更新通知狀態"],
  push_loading: ["Checking notification settings…", "正在檢查通知設定…"],
  push_enabled: [
    "Notifications are enabled on this device.",
    "此裝置已啟用推播通知。",
  ],
  push_disabled: [
    "Notifications are not enabled on this device.",
    "此裝置尚未啟用推播通知。",
  ],
  push_schedule: [
    "Daily around 9 AM in your account’s time zone",
    "每天約上午 9 點，依帳戶時區",
  ],
  push_master_off: [
    "Date reminders are off above; scheduled push is paused.",
    "上方的日期提醒已關閉，排程推播已暫停。",
  ],
  push_test_sent: [
    "Test sent. Check your device’s notification centre.",
    "測試通知已發送，請查看裝置的通知中心。",
  ],
  push_install_first: [
    "On iPhone or iPad: open this site in Safari, choose Share → Add to Home Screen, then enable notifications from the installed app.",
    "iPhone／iPad：請用 Safari 開啟網站，按「分享 → 加入主畫面」，再從主畫面開啟 App 並啟用通知。",
  ],
  push_unsupported: [
    "This browser does not support Web Push. Use a supported browser or the installed app.",
    "此瀏覽器未支援推播，請使用支援的瀏覽器或已安裝的 App。",
  ],
  push_denied: [
    "Notifications are blocked. Allow them in your browser or system settings, then refresh this status.",
    "通知已被封鎖。請在瀏覽器或系統設定允許通知，再更新此處狀態。",
  ],
  push_permission_needed: [
    "Choose Allow when the notification permission request appears.",
    "通知權限視窗出現時，請選擇「允許」。",
  ],
  push_unavailable: [
    "Could not connect to the push service. Try enabling notifications again.",
    "暫時無法連接推播服務，請再試啟用通知。",
  ],
  push_failed: [
    "The notification could not be sent. Your food records are unchanged.",
    "暫時無法發送通知，食材紀錄沒有改變。",
  ],
  push_not_subscribed: [
    "Enable notifications on this device first.",
    "請先在此裝置啟用推播通知。",
  ],
  push_subscription_expired: [
    "This notification subscription expired. Enable it again.",
    "此裝置的推播訂閱已失效，請重新啟用。",
  ],
  push_limit: [
    "Device limit reached. Stop notifications on an unused device first.",
    "已達裝置數目上限，請先在不使用的裝置停止推播。",
  ],
  push_in_use: [
    "This subscription belongs to another sign-in. Sign out there before enabling it here.",
    "此裝置訂閱仍連結另一個登入，請先在該登入停止推播。",
  ],
  push_account_changed: [
    "Your sign-in changed. Reopen notification settings.",
    "登入已變更，請重新開啟通知設定。",
  ],
  due: ["Date reminders", "日期提醒"],
  due_short: ["Dates", "日期提醒"],
  overdue_title: ["Past-date warning", "日期已過，請立即檢查"],
  overdue_critical: ["Use-by expired — do not eat", "已過食用期限，請勿食用"],
  overdue_review: ["Review", "查看處理"],
  overdue_filter: ["Past-date food", "已過日期的食物"],
  overdue_quality: ["Best-before is a quality date; check condition and storage.", "最佳食用日期屬品質標示；請檢查狀態及儲存情況。"],
  overdue_personal: ["Your planned date has passed; reassess the food’s condition.", "已過你設定的提醒日；請重新評估食物狀態。"],
  overdue_reference: ["Check the package label and storage before deciding what to do.", "請先確認包裝標示及儲存情況，再決定如何處理。"],
  due_hint: [
    "Based on entered dates; check the label type.",
    "依據所輸入日期，請留意標示類型。",
  ],
  lost_access: [
    "Kitchen access changed. Loaded food and selections were cleared.",
    "冰箱存取權已變更，已清除載入的食物與選取。",
  ],
  selection_changed: [
    "Unavailable foods were removed from your selection.",
    "已從選取中移除不可用的食物。",
  ],
  signout_note: [
    "Sign out ends this session; shared food remains.",
    "登出只結束此登入狀態，共享食物仍會保留。",
  ],
  storage_guidance: [
    "Categories help you navigate. Follow packaging for actual storage.",
    "分類只供導航，實際存放請遵循包裝指示。",
  ],
  help_text: [
    "Add food manually or confirm names suggested from a photo. In My food, enter the amount consumed from each purchase batch, delete records, or restore the last fully consumed amount. Recipes generates one to four dishes from your selected food or current inventory. After cooking, confirm actual consumption; partial amounts remain in stock.",
    "手動新增食物，或拍照後確認辨識名稱。在「我的食材」可選購買批次、填寫消耗量、刪除，或復原最後一次用完的份量。「食譜」可用所選食材或目前庫存產生一至兩道菜。煮完後確認實際消耗量，仍有剩餘的會留在庫存。",
  ],
  limitations: [
    "Photo recognition and recipes use DeepSeek and require an internet connection. Confirm photo results and review recipes. The app does not assess food safety or infer expiry dates from photos.",
    "照片辨識及食譜使用 DeepSeek，需要網絡連線。請確認辨識結果並檢查食譜；此程式不判斷食物安全，也不會從照片猜測到期日。",
  ],
  conflict: [
    "Someone changed this record. Your input is kept. Reload the latest record before submitting again.",
    "其他人已修改此紀錄。已保留你的輸入，請重新載入最新紀錄後再提交。",
  ],
  invalid_input: ["Check the entered values.", "請檢查輸入資料。"],
  invalid_date: ["Enter a valid calendar date.", "請輸入有效日期。"],
  confirm_calculation: [
    "Calculate and confirm the reference date first.",
    "請先計算並確認參考日期。",
  ],
  confirmation_required: ["Confirmation is required.", "請先確認。"],
  invalid_email: ["Enter a valid email address.", "請輸入有效電郵。"],
  password_length: [
    "Password must be 10–128 characters.",
    "密碼須為 10 至 128 個字元。",
  ],
  password_mismatch: ["Passwords do not match.", "兩次密碼不一致。"],
  invalid_credentials: [
    "Email or password is incorrect.",
    "電郵或密碼不正確。",
  ],
  registration_unavailable: [
    "Could not create this account. Try signing in or use a different email.",
    "無法建立此帳戶，請嘗試登入或使用其他電郵。",
  ],
  rate_limited: [
    "Too many attempts. Wait 5 minutes and try again.",
    "嘗試次數太多，請等候 5 分鐘再試。",
  ],
  invalid_invitation: [
    "Invitation invalid, replaced or expired. Ask the Owner for a new code.",
    "邀請碼無效、已替換或已到期，請向擁有者索取新碼。",
  ],
  owner_only: ["Only the Owner can do that.", "只有擁有者可執行此操作。"],
  no_kitchen: ["Kitchen access is no longer available.", "已無法存取此冰箱。"],
  food_not_found: [
    "This food record no longer exists in your kitchen.",
    "此冰箱已沒有這項紀錄。",
  ],
  food_used: ["This food has already been used up.", "此食物已用完。"],
  unauthorized: [
    "Your session expired. Reload and sign in again.",
    "登入已到期，請重新載入並登入。",
  ],
  csrf: [
    "Request could not be verified. Reload before trying again.",
    "無法驗證此請求，請重新載入後再試。",
  ],
  network_error: [
    "Could not connect. Your input is kept; check the connection and try again.",
    "無法連線，已保留輸入；請檢查連線後再試。",
  ],
  storage_unavailable: [
    "Storage unavailable. Your input is kept. Try again later.",
    "儲存暫時無法使用，已保留輸入，請稍後再試。",
  ],
  internal_error: [
    "Something went wrong. Your input is kept. Try again.",
    "發生錯誤，已保留輸入，請重試。",
  ],
  already_member: ["You already belong to this kitchen.", "你已加入此廚房。"],
  owner_cannot_leave: [
    "The Owner cannot leave their kitchen.",
    "擁有者不能離開自己的冰箱。",
  ],
  member_not_removable: [
    "This member cannot be removed.",
    "此成員不能被移除。",
  ],
  not_found: ["Not found.", "找不到此項目。"],
  timezone: ["Calendar timezone", "日曆時區"],
  welcome_kitchen: ["Make room for good food.", "為好食材留個位置。"],
  skip: ["Skip to content", "跳至主要內容"],
};
Object.assign(words, {
  scan_invite: ["Scan invitation QR", "掃描邀請 QR Code"],
  install: ["Install app", "安裝 App"],
  install_note: [
    "On iPhone/iPad: open in Safari, tap Share, then Add to Home Screen. On Android: use the browser menu and choose Install app or Add to Home screen. Installation needs an HTTPS website. Shared food needs an internet connection.",
    "iPhone／iPad：用 Safari 開啟，按分享，再選加入主畫面。Android：在瀏覽器選單選安裝 App 或加入主畫面。安裝需要 HTTPS 網站，共享食物需要網絡。",
  ],
  offline_start: [
    "You are offline. Reconnect and retry to load your kitchen. Private food data is never cached on this device by the app.",
    "目前離線。請恢復連線並重試以載入冰箱。本 App 不會快取私人冰箱資料。",
  ],
  request_reused: [
    "This earlier save cannot be repeated. Reload the food list before making a new entry.",
    "此儲存請求不能重複執行。請先重新載入清單，再新增紀錄。",
  ],
  help_steps: [
    "Start with a few foods. Select across categories and find recipes. Dates and storage can be edited anytime. Ask your kitchen Owner for an invitation to share.",
    "先新增幾樣食物，跨分類選擇後尋找食譜。日期與位置可隨時編輯。如需共享，請向冰箱 Owner 索取邀請碼。",
  ],
});
Object.assign(words, {
  ai_busy: [
    "A request is already running. Please wait.",
    "已有請求正在處理，請稍候。",
  ],
  diners: ["People eating", "用餐人數"],
  per_person_portion: ["Portion per person", "每人份量"],
  portion_light: ["Light", "小食量"],
  portion_standard: ["Standard", "一般食量"],
  portion_hearty: ["Hearty", "大食量"],
  max_minutes: ["Cooking time", "烹調時間上限"],
  any_time: ["No limit", "不限"],
  avoid: ["Ingredients to avoid", "不想使用的食材"],
  avoid_hint: [
    "e.g. egg, milk (separate with commas)",
    "例如：雞蛋、牛奶（用逗號分隔）",
  ],
  more_preferences: ["More preferences", "更多偏好"],
  preference_conflict: [
    "Your selected food conflicts with your preferences. Adjust the selection or preferences.",
    "所選食材與偏好不符，請調整食材或條件。",
  ],
  recipe_mode: ["Generation mode", "生成模式"],
  mode_stock_first: ["1. Stock first · Recommended", "1. 優先清理庫存・推薦"],
  mode_hint_stock_first: ["Use stock as the main ingredients, with home basics and at most two new ingredients for the whole meal.", "以庫存為主，可用家中常備調味料；整餐最多補購兩種新食材。"],
  pantry_title: ["Home basics", "家中常備調味料"],
  pantry_hint: ["Enabled by default for modes 1 and 2. Uncheck anything you do not have. These need no stock records and are not deducted. Dietary exclusions take priority; check product ingredients.", "模式 1、2 預設可用；沒有的可取消。無需建立庫存、不扣數量；忌口條件優先，請確認產品成分。"],
  pantry_used: ["Home basics · not tracked", "常備調味料・不扣庫存"],
  taste_label: ["Taste / dish preferences", "口味／想吃的菜式"],
  taste_placeholder: ["e.g. spicy, pan-seared salmon, Cantonese", "例如：想吃辣、香煎三文魚、港式"],
  purchase_limit: ["Could not keep purchases small. Try again or choose flexible mode.", "未能符合少量補購限制，可再生成或選完全自由模式。"],
  no_new_purchases: ["No extra purchases needed for these dishes", "這次菜式不需另外採購"],
  recipe_past_dates: ["Uses food past a label or reminder date. Check the label, storage and condition first; leave it out if unsure.", "包含已過標示或提醒日期的食材；請先確認標示、儲存及實際狀態，不確定就不要使用。"],
  mode_use_up: ["3. Strict stock only", "3. 安全局限・只用庫存"],
  mode_plan: ["2. Flexible meal", "2. 完全自由・可添購"],
  mode_hint_use_up: [
    "Only recorded inventory and tap water. No assumed seasoning or purchases, even with one ingredient.",
    "只用已登記庫存及清水；不假設調味料、不添購，只有一種食材也照此限制。",
  ],
  mode_hint_plan: [
    "Build around your selected food and freely add ingredients; extras appear in the shopping list.",
    "圍繞所選食材自由搭配，可使用庫存以外的食材；新增食材列入採購清單。",
  ],
  shopping_list: ["Shopping / preparation list", "待採購／準備清單"],
  shopping_note: [
    "Amounts are listed per dish. Add purchases to your inventory before recording their consumption.",
    "以下列出各菜式所需份量；買好後請先加入庫存，再記錄消耗。",
  ],
  no_shopping: [
    "Only recorded stock and tap water · no extra purchases",
    "只用已登記庫存及清水・不添購",
  ],
  quantity: ["Quantity remaining", "剩餘數量"],
  unit: ["Unit", "單位"],
  purchased_date: ["Purchase date", "購買日期"],
  remaining: ["Remaining", "剩餘"],
  quantity_unknown: ["Quantity not set", "份量未設定"],
  purchase_unknown: ["Purchase date not set", "購買日未設定"],
  batch: ["Batch", "批次"],
  batch_note: [
    "Each purchase keeps its own quantity and date.",
    "每次購買會分開記錄份量與期限。",
  ],
  classification_required: [
    "Please identify this name again before saving.",
    "請重新辨識名稱後再儲存。",
  ],
  checking_food: ["Identifying food…", "正在辨識食物…"],
  auto_category: ["Auto category", "自動分類"],
  manual_category: ["Category", "分類"],
  not_food: [
    "This looks like a non-food item. Check the name or photo.",
    "這看起來不是食物，請檢查名稱或照片。",
  ],
  food_confirmation_required: [
    "The name is unclear. Confirm it is food before saving.",
    "名稱不夠明確，請確認這是食物後再儲存。",
  ],
  food_confirm_label: [
    "I confirm this name refers to food or a drink.",
    "我確認這個名稱是食物或飲品。",
  ],
  food_name_incomplete: [
    "Finish the name to identify its category.",
    "完成名稱後會自動辨識分類。",
  ],
  classification_unavailable: [
    "Couldn't identify this name. Confirm it is food to continue.",
    "暫時未能辨識此名稱，確認是食物後可繼續。",
  ],
  usage_title: ["Update food", "更新食材"],
  usage_hint: [
    "Enter amounts used. Leave 0 to skip.",
    "填寫實際用量，0 代表不扣除。",
  ],
  usage_recipe_hint: [
    "Recipe amounts are filled in. Adjust or clear anything you didn't use.",
    "已帶入食譜用量，可修改或清空未用的食材。",
  ],
  all_short: ["All", "全部"],
  left_short: ["Left", "餘下"],
  bought_short: ["Bought", "購入"],
  skip_food: ["Skip this food", "不扣除此食材"],
  save_usage: ["Confirm", "確認"],
  usage_empty: ["Enter an amount or tap All.", "請輸入用量，或按「全部」。"],
  set_stock_here: ["Set quantity here", "在這裡補填份量"],
  stock_before: ["Amount before use", "使用前數量"],
  stock_before_example: ["e.g. 6", "例如 6"],
  enter_stock_before: [
    "Enter the amount before use below.",
    "請在下方補填使用前數量。",
  ],
  consume: ["Use some", "記錄消耗"],
  consume_title: ["How much did you use?", "這次用了多少？"],
  consume_hint: [
    "Choose the purchase batch and enter the amount actually used.",
    "選擇購買批次，填寫實際使用量。",
  ],
  consumed_amount: ["Amount used", "這次用了"],
  use_all: ["Use all remaining", "全部用完"],
  after_consumption: ["Left afterwards", "消耗後剩餘"],
  confirm_consumption: ["Confirm consumption", "確認消耗"],
  choose_consumption: [
    "Choose at least one batch and enter its amount.",
    "請選擇至少一個批次並填寫使用量。",
  ],
  invalid_quantity: [
    "Enter a positive quantity with up to 3 decimal places (maximum 1,000,000).",
    "請輸入大於零的數量，最多三位小數，上限 1,000,000。",
  ],
  quantity_required: [
    "Edit this batch to set its quantity before using part of it, or choose Use all remaining.",
    "部分消耗前請先編輯此批次的份量，或選擇「全部用完」。",
  ],
  insufficient_quantity: [
    "The amount exceeds the remaining quantity. Check the latest stock.",
    "使用量超過剩餘數量，請檢查最新庫存。",
  ],
  consumption_conflict: [
    "This batch changed. Cancel and reopen to load the latest quantity.",
    "此批次已變更，請取消後重新開啟，以載入最新份量。",
  ],
  restore_amount: ["Quantity to restore", "將復原數量"],
  unit_pcs: ["pcs", "個"],
  unit_g: ["g", "克"],
  unit_kg: ["kg", "公斤"],
  unit_ml: ["ml", "毫升"],
  unit_l: ["L", "公升"],
  unit_pack: ["packs", "包"],
  unit_box: ["boxes", "盒"],
  unit_bottle: ["bottles", "瓶"],
  unit_portion: ["portions", "份"],
  invalid_image: [
    "Choose a clear JPEG or PNG photo.",
    "請選擇清晰的 JPEG 或 PNG 相片。",
  ],
  inventory: ["My food", "我的食材"],
  items: ["items", "項"],
  used_short: ["Used up", "已用完"],
  remove_short: ["Delete", "刪除"],
  restore: ["Restore to inventory", "放回庫存"],
  manage_used: ["Mark selected as used up", "已選食材已用完"],
  manage_delete: ["Delete selected", "刪除已選食材"],
  active_food: ["Current inventory", "目前庫存"],
  used_food: ["Used-up records", "已用完紀錄"],
  photo: ["Identify food from a photo", "拍照／上傳識別"],
  photo_hint: [
    "Confirm the food name. Dates are entered separately. The photo is sent to DeepSeek.",
    "請確認名稱，日期另行輸入；照片將傳送至 DeepSeek 識別。",
  ],
  photo_busy: ["Identifying food…", "正在識別食材…"],
  photo_empty: [
    "No clear food was found. Try a clearer photo or enter it manually.",
    "未能清楚辨識食材，可換相片或手動輸入。",
  ],
  photo_confirm: ["Choose a food to fill the form", "選擇食材填入表單"],
  photo_failed: [
    "Photo recognition is unavailable. You can still enter food manually.",
    "暫時無法識別相片，你仍可手動新增。",
  ],
  photo_large: [
    "Use a clear food photo under 12 MB.",
    "請使用 12 MB 以內的清晰食物相片。",
  ],
  generate: ["Generate recipes", "生成食譜"],
  regenerate: ["Generate another set", "再生成一組"],
  generating: [
    "DeepSeek is planning your dishes…",
    "DeepSeek 正在為你配搭菜式…",
  ],
  recipe_title: ["What shall we cook?", "今天煮甚麼？"],
  recipe_foods_title: ["Food for this meal", "這次使用的食材"],
  recipe_avoided: [
    "Excluded by your ingredient preferences",
    "已按不想使用的食材偏好排除",
  ],
  recipe_add_food: ["Add food", "添加食材"],
  recipe_remove_food: ["Remove from this meal", "從這餐移除"],
  recipe_food_empty: [
    "No food selected. Add ingredients below.",
    "尚未選擇食材，可在下方添加。",
  ],
  recipe_picker_empty: [
    "No more available food. Add food to your inventory first.",
    "沒有其他可用食材，可先新增庫存。",
  ],
  recipe_selection_note: [
    "Changes here only affect this meal, not your inventory.",
    "這裡的增減只影響這餐，不會刪除庫存。",
  ],
  recipe_use_all: [
    "Use every selected food across this set",
    "這組菜式用齊所有選用食材",
  ],
  recipe_replace: ["Swap this dish", "不喜歡？換一道"],
  recipe_replacing: ["Finding a different dish…", "正在更換這道菜…"],
  recipe_changed: [
    "Food or settings changed. Generate a new set to apply them.",
    "食材或設定已更改，請重新生成；下方仍是上一組食譜。",
  ],
  recipe_dish: ["Dish", "菜式"],
  recipe_empty_choice: [
    "Choose at least one food, or use Design a meal to plan purchases.",
    "請至少添加一項食材，或用「設計一餐」規劃採購。",
  ],
  split_foods: [
    "Increase the number of dishes or select fewer ingredients.",
    "食材較多，請增加菜式數目或減少所選食材。",
  ],
  recipe_hint: [
    "Use your ingredients to suggest one to four dishes.",
    "依庫存食材建議 1–4 款菜式。",
  ],
  dish_style: ["Dish style", "菜式款式"],
  dish_count: ["Dishes", "菜式數目"],
  scope: ["Ingredients", "使用食材"],
  scope_selected: ["Selected food", "已選食材"],
  scope_all: ["All current food", "目前庫存"],
  style_auto: ["Let AI suggest", "讓 AI 配搭"],
  style_mixed: ["A meal with different dishes", "一餐不同菜式配搭"],
  style_cold: ["Cold dish", "涼菜"],
  style_soup: ["Soup", "湯"],
  style_main: ["Main / staple", "主食"],
  style_meat: ["Meat or seafood dish", "肉類／海鮮菜"],
  style_vegetable: ["Vegetable / tofu dish", "蔬菜／豆腐菜"],
  preference: [
    "Taste / dietary preferences (optional)",
    "口味／飲食偏好（選填）",
  ],
  preference_hint: [
    "e.g. Cantonese, mild, vegetarian",
    "例如：粵式、清淡、素食",
  ],
  ai_note: [
    "AI suggestions: check ingredients and cooking steps.",
    "AI 建議，請確認食材及烹調步驟。",
  ],
  ai_provider: ["Generated with DeepSeek", "由 DeepSeek 生成"],
  used_ingredients: ["From your inventory", "用到的庫存食材"],
  extra_ingredients: ["Also prepare", "還需準備"],
  suggested_amount: ["Suggested amount", "建議用量"],
  pairing: ["Serve with", "配搭建議"],
  servings: ["servings", "人份"],
  cooked: ["I cooked this / update food", "煮好了／更新食材"],
  pick_used: ["Which foods are completely used up?", "哪些食材已完全用完？"],
  pick_used_hint: [
    "Only tick foods with none left. Partly used food stays in your inventory.",
    "只勾選完全用完的食材，仍有剩餘的會保留在庫存。",
  ],
  confirm_used: ["Confirm used up", "確認已用完"],
  no_food: [
    "Add food to use up, or switch to Design a meal.",
    "請先新增要清理的食材，或切換「設計一餐」。",
  ],
  ai_unavailable: [
    "Recipe generation is temporarily unavailable. Your food is unchanged.",
    "食譜生成暫時無法使用，食材紀錄沒有改變。",
  ],
  ai_invalid: [
    "The recipe response was incomplete. Please try again.",
    "食譜內容未完整返回，請重試。",
  ],
  ai_limit: [
    "Generation limit reached. Try again later.",
    "已達生成次數限制，請稍後再試。",
  ],
  ai_busy: [
    "An AI request is already in progress. Please wait.",
    "AI 正在處理上一個請求，請稍候。",
  ],
  generation_stale: [
    "Your inventory changed. Generate again with the latest food.",
    "庫存已變更，請以最新食材重新生成。",
  ],
  no_recipes_yet: [
    "Choose ingredients and generate a recipe.",
    "選擇食材後，按生成食譜。",
  ],
  upgrade_required: [
    "The app has updated. Refresh this page.",
    "程式已更新，請重新整理頁面。",
  ],
  all: ["All food", "全部食材"],
  kitchen_subtitle: ["", ""],
  unknown_note: ["", ""],
  recipe_disclaimer: [
    "AI suggestions: check ingredients and cooking steps.",
    "AI 建議，請確認食材及烹調步驟。",
  ],
});
let inventoryStatus = "active",
  photoCandidates = [],
  photoBusy = false,
  recipeBusy = false,
  recipeHistoryLoaded = false;
const defaultRecipeOptions = () => ({
  style: "auto",
  count: 2,
  scope: "selected",
  preference: "",
  mode: "stock_first",
  pantry_staples: null,
  servings: 2,
  portion: "standard",
  max_minutes: null,
  avoid: "",
  use_all: true,
  exact_count: true,
});
let recipeOptions = defaultRecipeOptions();
let pushState = null,
  pushSequence = 0;
let recipeDraft = false,
  recipePickerOpen = false,
  recipeFoodSearch = "",
  replacingRecipe = null;
let state = null,
  guestLanguage = "en",
  authMode = "login",
  view = null,
  selection = new Set(),
  search = "",
  includeUsed = false,
  browse = false,
  recipeResult = null,
  recipeSeq = 0,
  offline = false,
  invitePreview = null,
  calculation = null,
  lastUser = null,
  lastKitchen = null;
const language = () => state?.preferences?.language || guestLanguage,
  t = (k) => words[k]?.[language() === "zh-Hant" ? 1 : 0] ?? k,
  app = $("#app");
const cats = [
  "produce",
  "dairy",
  "protein",
  "cooked",
  "condiments",
  "dry",
  "other",
];
function icon(kind) {
  const paths = {
    leaf: '<path d="M12 34C7 16 24 7 39 9c2 17-4 31-22 30M13 40l17-21M21 31l-1-9M23 29l9 1"/>',
    egg: '<path d="M12 29C12 17 20 7 25 7s14 10 14 22a13.5 13.5 0 0 1-27 0ZM18 30c0 4 2 6 5 7"/>',
    fish: '<path d="M9 25c10-16 23-14 31 0-8 14-21 16-31 0ZM9 25l-6-8v16l6-8ZM23 13v8M23 29v8"/><circle cx="32" cy="23" r="1.5"/>',
    bowl: '<path d="M7 24h36c-1 12-7 17-18 17S8 36 7 24ZM4 24h42M18 17c-5-5 5-6 0-11M29 17c-5-5 5-6 0-11"/>',
    jar: '<path d="M15 10h20v7H15zM17 17c-5 4-5 6-5 10v14h26V27c0-4 0-6-5-10M18 27h14v8H18z"/>',
    snow: '<path d="M25 5v40M8 15l34 20M8 35l34-20M19 9l6 6 6-6M19 41l6-6 6 6M8 22l9-2-2-9M35 39l-2-9 9-2M8 28l9 2-2 9M35 11l-2 9 9 2"/>',
    bag: '<path d="M12 14h26v29H12zM19 14V9h12v5M19 26h12M19 33h8"/>',
    tomato:
      '<path d="M25 17C5 7 3 40 22 42c4 1 6 0 9-1 18-8 11-31-6-24ZM25 18l-9-7 8 2 4-7 1 8 8-1-8 7"/>',
    home: '<path d="m6 23 19-16 19 16M12 20v23h26V20M21 43V30h8v13"/>',
    book: '<path d="M25 13C17 6 8 8 5 10v31c8-3 14-2 20 2 6-4 12-5 20-2V10c-5-3-14-2-20 3ZM25 13v30"/>',
  };
  return `<svg class="icon" viewBox="0 0 50 50" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${paths[kind] || paths.leaf}</svg>`;
}
function notify(s) {
  $("#toast").textContent = s;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => ($("#toast").textContent = ""), 6500);
}
let activeKitchenId = null, contextEpoch = 0, switchingKitchen = false;
async function api(path, data) {
  let res, result;
  try {
    res = await fetch("/api/" + path, {
      method: data === undefined ? "GET" : "POST",
      headers: {
        ...(activeKitchenId ? {"X-Kitchen-ID": String(activeKitchenId)} : {}),
        ...(data === undefined ? {} : {"Content-Type":"application/json", "X-CSRF-Token":state?.csrf || ""}),
      },
      body: data === undefined ? undefined : JSON.stringify(data),
      credentials: "same-origin",
    });
    result = await res.json();
  } catch (_) {
    throw { code: "network_error" };
  }
  if (!res.ok)
    throw { code: result.error?.code || "internal_error", status: res.status };
  if (result.csrf && state) state.csrf = result.csrf;
  return result;
}
const errorText = (e) => t(e.code || "internal_error");
function storeSelection() {
  if (state?.user)
    try {
      sessionStorage.setItem(
        "lmb-selection-" + state.user.id + "-" + state.kitchen?.id,
        JSON.stringify([...selection]),
      );
    } catch (_) {}
}
async function refresh(draw = true) {
  const epoch = contextEpoch;
  const next = await api("state");
  if (epoch !== contextEpoch) return;
  const uid = next.user?.id ?? null,
    kid = next.kitchen?.id ?? null;
  if (uid !== lastUser) {
    pushState = null;
    pushSequence++;
    recipeOptions = defaultRecipeOptions();
    recipeDraft = false;
    recipePickerOpen = false;
    recipeFoodSearch = "";
    if ($("#used-picker").open) $("#used-picker").close("cancel");
    recipeResult = null;
    recipeHistoryLoaded = false;
    photoCandidates = [];
    recipeSeq++;
    selection.clear();
    if (uid)
      try {
        selection = new Set(
          JSON.parse(sessionStorage.getItem("lmb-selection-" + uid + "-" + kid) || "[]"),
        );
      } catch (_) {}
    view = null;
    search = "";
  }
  const lost = lastUser === uid && lastKitchen && lastKitchen !== kid;
  if (lost) {
    pushState = null;
    pushSequence++;
    recipeDraft = false;
    recipeOptions = defaultRecipeOptions();
    if ($("#confirm").open) $("#confirm").close("cancel");
    if ($("#used-picker").open) $("#used-picker").close("cancel");
    selection.clear();
    recipeResult = null;
    recipeHistoryLoaded = false;
    photoCandidates = [];
    recipeSeq++;
    notify(t(switchingKitchen ? "kitchen_switched" : "lost_access"));
    location.hash = "kitchen";
  }
  lastUser = uid;
  lastKitchen = kid;
  const justClosed = state?.kitchen?.id === kid && !state.kitchen.closed && next.kitchen?.closed;
  state = next;
  activeKitchenId = kid;
  if (justClosed && $("#used-picker").open) $("#used-picker").close("cancel");
  if (recipeResult) {
    const current = state.foods.filter((f) => f.eligible);
    recipeResult.stale =
      current.length !== Object.keys(recipeResult.versions).length ||
      current.some((f) => recipeResult.versions[f.id] !== f.version);
  }
  offline = false;
  if (uid) {
    const valid = new Set(
        state.foods.filter((f) => f.eligible).map((f) => f.id),
      ),
      size = selection.size;
    selection = new Set([...selection].filter((id) => valid.has(id)));
    storeSelection();
    if (size !== selection.size) notify(t("selection_changed"));
    view ||= state.preferences.default_view;
  }
  if (draw || lost || justClosed) render(!lost);
}
const route = () => location.hash.slice(1).split("/").filter(Boolean);
function go(path) {
  if (location.hash === "#" + path) render();
  else location.hash = path;
}
const option = (v, label, chosen) =>
  `<option value="${E(v)}" ${v === chosen ? "selected" : ""}>${E(label)}</option>`;
const select = (name, label, values, chosen) =>
  `<label>${E(label)}<select name="${name}">${values.map((v) => option(v, t(v), chosen)).join("")}</select></label>`;
const field = (name, label, value = "", type = "text", extra = "") =>
  `<label>${E(label)}<input name="${name}" type="${type}" value="${E(value)}" ${extra}></label>`;
const button = (action, label, cls = "", attrs = "") =>
  `<button type="button" data-action="${action}" class="${cls}" ${attrs}>${E(label)}</button>`;
const back = (path = "kitchen") =>
    button("go", t("back"), "back", `data-path="${path}"`),
  formError = () => '<p class="error" role="alert"></p>';
function dateText(v) {
  if (!v) return t("unknown");
  const [y, m, d] = v.split("-");
  return state.preferences.date_format === "dmy"
    ? `${d}/${m}/${y}`
    : state.preferences.date_format === "mdy"
      ? `${m}/${d}/${y}`
      : v;
}
const daysUntil = (v) =>
  Math.round((Date.parse(v) - Date.parse(state.today)) / 86400000);
function foodStatus(f) {
  if (f.status === "used") return t("used");
  if (f.date_source === "personal")
    return t(
      !f.effective_date
        ? "personal_undated"
        : f.effective_date < state.today
          ? "past_personal"
          : "personal_reminder",
    );
  if (!f.effective_date) return t("unknown");
  if (f.effective_date < state.today)
    return t(
      f.date_kind === "use_by"
        ? "past_use_by"
        : f.date_kind === "best_before"
          ? "past_best"
          : "past_reference",
    );
  return t(f.date_kind);
}
const dateLine = (f) =>
  `${t(f.date_source === "unknown" ? "no_date" : f.date_source === "personal" ? "personal_date_source" : f.date_source)} · ${foodStatus(f)}${f.effective_date ? " · " + dateText(f.effective_date) : ""}`;
function selectionBar() {
  if (
    state.kitchen?.closed || !selection.size ||
    !["kitchen", "category"].includes(route()[0] || "kitchen")
  )
    return "";
  return `<aside class="selection" aria-label="${E(t("selected"))}"><div class="selection-summary"><strong id="selected-count">${selection.size}</strong> ${E(t("selected"))}${button("clear-selection", t("clear"), "quiet")}</div><div class="selection-actions">${button("batch-used", t("consume"))}${[...selection].every(id => state.foods.find(f => f.id === id)?.kitchen_id === state.kitchen.id) ? button("batch-delete", t("remove_short"), "danger") : ""}${button("find-recipes", t("find"), "primary")}</div></aside>`;
}
function addFoodDock() {
  const [page = "kitchen", category = "all"] = route();
  if (state.kitchen?.closed || !["kitchen", "category"].includes(page)) return "";
  return `<div class="add-food-dock"><button type="button" data-action="add" class="primary add-food-tile" ${page === "category" ? `data-category="${E(category)}"` : ""}><span aria-hidden="true">＋</span>${E(t("add"))}</button></div>`;
}
function render(keepScroll = false) {
  if (!state) return;
  const oldAuth = !state.user ? $('[data-form="auth"]') : null;
  const authDraft = oldAuth ? {mode:oldAuth.dataset.authMode,version:oldAuth.dataset.legalVersion,email:oldAuth.elements.email.value,password:oldAuth.elements.password.value,confirm:oldAuth.elements.confirm_password?.value,accepted:oldAuth.elements.terms_accepted?.checked} : null;
  const wasAuth = document.documentElement.classList.contains("auth-screen");
  document.documentElement.classList.toggle("auth-screen", !state.user);
  const scrollTop = keepScroll ? $("#main")?.scrollTop || 0 : 0;
  const reminderOpen = $("#date-reminders")?.open || false;
  document.documentElement.lang = language();
  document.documentElement.classList.toggle(
    "large",
    state.preferences?.text_size === "large",
  );
  $(".skip").textContent = t("skip");
  const [page = "kitchen", arg] = route();
  const publicLegal = ["terms","privacy-policy"].includes(page);
  const agreementGate = state.web_app && state.user && !state.consent?.accepted && !["privacy","account","settings","preferences","shared","help","terms","privacy-policy"].includes(page);
  let content;
  if (publicLegal) content = legalPage(page);
  else if (!state.user) content = auth();
  else if (agreementGate) content = agreementPage();
  else if (page === "privacy") content = privacyPage();
  else if (page === "account") content = accountPage();
  else if (
    !state.kitchen &&
    !["settings", "preferences", "help","privacy","account"].includes(page)
  )
    content = setup();
  else if (page === "kitchens") content = setup();
  else if (page === "party") content = partyPage();
  else if (page === "food") content = foodForm(arg);
  else if (page === "category") content = categoryPage(arg || "all");
  else if (page === "recipes") content = recipesPage(arg);
  else if (page === "settings") content = settings();
  else if (page === "shared") content = shared();
  else if (page === "preferences") content = preferences();
  else if (page === "reminders") content = reminders();
  else if (page === "help") content = help();
  else content = kitchen();
  app.innerHTML = `<header class="topbar"><button class="brand" data-action="go" data-path="kitchen">${icon("leaf")}<span>Last Minute <b>Bites</b></span></button><div class="header-actions">${state.user ? button("go", t("settings"), "", 'data-path="settings"') : button("language", language() === "en" ? "繁體中文" : "English")}</div></header><main id="main" tabindex="-1">${offline ? `<p class="error">${E(t("offline"))} ${button("retry", t("retry"))}</p>` : ""}${state.user && state.kitchen && !publicLegal && !agreementGate && !["kitchen","kitchens"].includes(page) ? kitchenContext() : ""}${state.kitchen?.closed ? `<p class="warning party-closed" role="status">${E(t("party_closed"))}</p>` : ""}${content}</main>${state.user && state.kitchen && !publicLegal && !agreementGate ? `<footer class="app-dock">${selectionBar()}${addFoodDock()}<nav class="bottom-nav" aria-label="${E(t("kitchen"))}"><button data-action="go" data-path="kitchen" ${page === "kitchen" ? 'aria-current="page"' : ""}>${icon("home")}${E(t("kitchen"))}</button><button data-action="go" data-path="category/all" ${page === "category" ? 'aria-current="page"' : ""}>${icon("bag")}${E(t("inventory"))}</button><button data-action="go" data-path="recipes" ${page === "recipes" ? 'aria-current="page"' : ""}>${icon("book")}${E(t("recipes"))}</button></nav></footer>` : ""}`;
  const nextAuth = $('[data-form="auth"]');
  if (authDraft && nextAuth) {
    nextAuth.elements.email.value=authDraft.email;
    if (authDraft.mode === authMode) {
      nextAuth.elements.password.value=authDraft.password;
      if (nextAuth.elements.confirm_password) nextAuth.elements.confirm_password.value=authDraft.confirm || "";
      if (nextAuth.elements.terms_accepted && authDraft.version === state.legal?.version) nextAuth.elements.terms_accepted.checked=!!authDraft.accepted;
    }
  }
  if ($("#date-reminders")) $("#date-reminders").open = reminderOpen;
  if (page === "food") bindFoodForm();
  if (page === "reminders") loadPushStatus();
  if (page === "privacy") loadPermissionState();
  if (page === "account" && state.user) loadAccountStatus();
  if (publicLegal && !legalContent && !legalLoading && !legalError) loadLegalContent();
  if (page === "recipes") displayRecipes(arg);
  if ($("#main")) $("#main").scrollTop = scrollTop;
  fitViewport();
  if (wasAuth && state.user) window.scrollTo(0, 0);
  if (
    page === "recipes" &&
    state.user &&
    state.kitchen &&
    !recipeHistoryLoaded &&
    !recipeBusy
  )
    loadRecipes(arg);
}
function auth() {
  return `<div class="auth-layout"><section class="auth-story"><div class="little-leaf">${icon("leaf")}</div><h1>${E(t("welcome"))}</h1><p>${E(t("intro"))}</p><div class="mini-fridge" aria-hidden="true"><span></span><span></span></div></section><section class="auth-panel"><div class="switcher">${button("auth-login", t("sign_in"), authMode === "login" ? "chosen" : "")}${button("auth-register", t("register"), authMode === "register" ? "chosen" : "")}</div><h2>${E(t(authMode === "login" ? "sign_in" : "register"))}</h2><p>${E(t("auth_hint"))}</p><form data-form="auth" data-auth-mode="${authMode}" data-legal-version="${E(state.legal?.version || "")}">${field("email", t("email"), "", "email", 'required maxlength="254" autocomplete="username"')}${field("password", t("password"), "", "password", `required minlength="10" maxlength="128" autocomplete="${authMode === "login" ? "current-password" : "new-password"}"`)}${authMode === "register" ? field("confirm_password", t("confirm_password"), "", "password", 'required minlength="10" maxlength="128" autocomplete="new-password"') : ""}<p class="hint">${E(t("password_hint"))}</p>${authMode === "register" ? `<label class="check agreement-check"><input type="checkbox" name="terms_accepted" required>${E(t("agree_terms"))}</label>` : ""}${legalLinks()}<label class="check"><input type="checkbox" data-show-password>${E(t("show_password"))}</label>${formError()}<button class="primary full">${E(t(authMode === "login" ? "sign_in" : "register"))}</button></form></section></div>`;
}
function setup() {
  return `<section class="page-heading"><h1>${E(t(state.kitchen ? "kitchens" : "welcome_kitchen"))}</h1><p>${E(t("setup_intro"))}</p><details><summary>${E(t("help"))}</summary><p>${E(t("help_steps"))}</p></details></section>${kitchenList()}${partyCreateForm()}<div class="two-column"><section class="panel"><h2>${E(t("create_kitchen"))}</h2><form data-form="create-kitchen">${field("name", t("kitchen_name"), "", "text", 'required maxlength="80"')}${formError()}<button class="primary">${E(t("create_kitchen"))}</button></form></section><section class="panel"><h2>${E(t("join_kitchen"))}</h2><form data-form="preview-invite">${field("code", t("invite_code"), invitePreview?.code || "", "text", 'required maxlength="100" autocomplete="off"')}${formError()}<div class="actions"><button>${E(t("preview_invite"))}</button>${button("scan-invite", t("scan_invite"))}</div></form>${invitePreview ? `<div class="invitation-preview"><h3>${E(invitePreview.name)}</h3><p>${E(t("preview_note"))}</p>${button("accept-invite", t("join_confirm"), "primary")}</div>` : ""}</section></div>${button("sign-out", t("sign_out"), "quiet")}`;
}
function kitchenContext() {
  return `<div class="kitchen-context">${button("go", state.kitchen.name + " ⌄", "kitchen-switch", 'data-path="kitchens"')}${state.kitchen.kind === "party" ? `<span class="role">${E(t("party"))}</span>` : ""}</div>`;
}
function kitchenList() {
  if (!state.kitchens?.length) return "";
  return `<section class="kitchen-list" aria-label="${E(t("kitchens"))}">${state.kitchens.map(k => `<button type="button" class="kitchen-card${k.id === state.kitchen?.id ? " chosen" : ""}" data-action="switch-kitchen" data-id="${k.id}" ${k.id === state.kitchen?.id ? 'aria-current="true"' : ""}><span><strong>${E(k.name)}</strong><small>${E(t(k.role))}${k.kind === "party" ? " · " + E(t(k.closed ? "party_closed" : "party")) : ""}</small></span><span>${k.id === state.kitchen?.id ? E(t("current_kitchen")) : "›"}</span></button>`).join("")}</section>`;
}
function partyCreateForm() {
  const owned = (state.kitchens || []).filter(k => k.kind === "home" && k.role === "owner");
  return `<details class="panel party-create"><summary>${E(t("create_party"))}</summary><form data-form="create-party">${field("name",t("kitchen_name"),"","text",'required maxlength="80"')}<label>${E(t("party_hours"))}<select name="hours">${[24,48,168].map(h => option(h,t("hours_"+h),24)).join("")}</select></label><fieldset class="party-choices"><legend>${E(t("party_sources"))}</legend><p class="hint">${E(t("party_source_consent"))}</p>${owned.map(k => `<label class="check"><input type="checkbox" name="source_ids" value="${k.id}">${E(k.name)}</label>`).join("")}<p class="hint">${E(t("party_source_hint"))}</p></fieldset>${formError()}<button class="primary full">${E(t("create_party"))}</button></form></details>`;
}
function partyPage() {
  const k = state.kitchen;
  if (k.kind !== "party") return `${back()}<h1>${E(t("party"))}</h1><p>${E(t("not_party"))}</p>${button("go", t("create_party"), "primary", 'data-path="kitchens"')}`;
  const options = (state.kitchens || []).filter(s => s.kind === "home" && s.role === "owner" && !k.sources.some(x => x.id === s.id));
  return `<div class="narrow">${back()}<h1>${E(t("party"))}</h1><h2>${E(k.name)}</h2><p>${E(t("party_until"))}: ${E(new Date(k.expires).toLocaleString(language(), {timeZone:state.preferences.timezone,timeZoneName:"short"}))}</p><h2>${E(t("party_sources"))}</h2><p class="hint">${E(t("party_source_consent"))}</p><ul class="party-source-list">${k.sources.map(src => `<li><strong>${E(src.name)}</strong>${!k.closed && (k.role === "owner" || src.owner_id === state.user.id) ? button("party-unshare",t("unshare_source"),"quiet",`data-id="${src.id}"`) : ""}</li>`).join("")}</ul>${!k.sources.length ? `<p class="hint">${E(t("party_source_hint"))}</p>` : ""}${!k.closed && options.length ? `<form data-form="party-source"><label>${E(t("source_kitchen"))}<select name="source_id">${options.map(src => option(src.id,src.name,options[0].id)).join("")}</select></label>${formError()}<button class="primary">${E(t("share_source"))}</button></form>` : ""}<p class="hint">${E(t("party_own_food"))}: ${state.foods.filter(f => f.kitchen_id === k.id && f.status === "active").length}</p>${button("go",t("shared"),"full",'data-path="shared"')}${!k.closed && k.role === "owner" ? button("party-end",t("end_party"),"danger full") : ""}</div>`;
}
function categoryButton(key, svg, cls = "") {
  const count = state.foods.filter(
    (f) =>
      f.status === "active" &&
      (key === "freezer"
        ? f.location === "freezer"
        : key === "dryother"
          ? ["dry", "other"].includes(f.category)
          : f.category === key),
  ).length;
  return `<button data-action="category" data-category="${key}" class="fridge-category ${cls}">${icon(svg)}<span>${E(t(key))}<small>${count} ${E(t("items"))}</small></span><span class="chevron" aria-hidden="true">›</span></button>`;
}
function pastDate(food) {
  return (
    food.status === "active" && !food.food_warning &&
    (food.quantity == null || food.quantity > 0) &&
    !!food.effective_date && food.effective_date < state.today
  );
}
function expiredUseBy(food) {
  return pastDate(food) && food.date_source !== "personal" && food.date_kind === "use_by";
}
function expiryAlert() {
  const foods = state.foods.filter(pastDate).sort((a, b) =>
    Number(expiredUseBy(b)) - Number(expiredUseBy(a)) ||
    a.effective_date.localeCompare(b.effective_date),
  );
  if (!foods.length) {
    expiryAlert.signature = "";
    return "";
  }
  // Routine shared-inventory refreshes must not repeatedly interrupt screen readers.
  const signature = JSON.stringify([state.user.id, state.kitchen.id,
    foods.map((f) => [f.id, f.name, f.effective_date, f.date_source, f.date_kind])]);
  const announce = expiryAlert.signature !== signature;
  expiryAlert.signature = signature;
  const first = foods[0];
  const message = expiredUseBy(first) ? "overdue_critical"
    : first.date_source === "personal" ? "overdue_personal"
    : first.date_kind === "best_before" ? "overdue_quality" : "overdue_reference";
  return `<aside class="expiry-alert" role="${announce ? "alert" : "region"}" aria-label="${E(t("overdue_title"))}"><div class="expiry-heading"><strong><span aria-hidden="true">⚠</span> ${E(t("overdue_title"))} <span class="expiry-count">${foods.length}</span></strong>${button("review-overdue", t("overdue_review"), "expiry-review")}</div><p><b>${E(first.name)}</b> · ${E(dateText(first.effective_date))}${foods.length > 1 ? ` · +${foods.length - 1}` : ""}</p><small>${E(t(message))}</small></aside>`;
}
function reminderBanner() {
  if (!state.preferences.reminders) return "";
  const foods = state.foods
    .filter(
      (f) =>
        f.status === "active" &&
        f.effective_date &&
        daysUntil(f.effective_date) >= 0 &&
        daysUntil(f.effective_date) <= state.preferences.reminder_days,
    )
    .sort((a, b) => a.effective_date.localeCompare(b.effective_date));
  return foods.length
    ? `<details id="date-reminders" class="reminder-banner"><summary><strong>${E(t("due_short"))}<span class="reminder-count">${foods.length}</span></strong><span class="reminder-preview">${E(dateText(foods[0].effective_date))} · ${E(foods[0].name)}</span></summary><div class="reminder-details"><p>${foods
        .slice(0, 3)
        .map(
          (f) =>
            `${E(f.name)}: ${E(t(f.date_source === "personal" ? "personal_reminder" : f.date_kind))} ${E(dateText(f.effective_date))}`,
        )
        .join("; ")}</p><small>${E(t("due_hint"))}</small></div></details>`
    : "";
}
function kitchen() {
  return `<section class="page-heading kitchen-heading kitchen-overview"><div><p class="kitchen-label"><button class="kitchen-name kitchen-switch" data-action="go" data-path="kitchens" title="${E(t("switch_kitchen"))}">${E(state.kitchen.name)} <span aria-hidden="true">⌄</span></button><span class="role">${E(t(state.kitchen.role))}</span></p><h1 class="sr-only">${E(t("kitchen_intro"))}</h1></div></section>${state.kitchen.kind === "party" ? `<div class="party-banner"><strong>${E(t("party"))}</strong><span>${E(t("party_until"))}: ${E(new Date(state.kitchen.expires).toLocaleString(language(), {timeZone:state.preferences.timezone,timeZoneName:"short"}))}</span>${button("go", t("party_sources"), "quiet", 'data-path="party"')}</div>` : ""}<div class="kitchen-toolbar"><div class="switcher">${button("view-categories", t("categories"), view === "categories" ? "chosen" : "")}${button("view-first", t("use_first"), view === "use_first" ? "chosen" : "")}</div>${button("category", t("all"), "quiet", 'data-category="all"')}</div>${expiryAlert()}${reminderBanner()}${
    view === "categories"
      ? `<div class="kitchen-illustration"><section class="fridge" aria-label="${E(t("fridge"))}"><div class="fridge-top"><span>Last Minute Bites</span><span class="fridge-hinge"></span></div><div class="fridge-shelves">${categoryButton("produce", "leaf")}${categoryButton("dairy", "egg")}${categoryButton("protein", "fish")}${categoryButton("cooked", "bowl")}</div><div class="freezer-drawer">${categoryButton("freezer", "snow")}</div></section><aside class="pantry-rack"><div class="rack-top">${icon("jar")}${icon("jar")}${icon("jar")}</div>${categoryButton("condiments", "jar", "rack-category")}${categoryButton("dryother", "bag", "dry-category")}</aside></div>`
      : foodList(
          state.foods.filter((f) => f.status === "active"),
          "use_first",
        )
  }`;
}
function categoryPage(key) {
  return `${back()}<section class="page-heading kitchen-heading"><h1>${E(key === "all" ? t("inventory") : t(key))}</h1></section>${expiryAlert()}<div class="list-tools"><label class="search-label"><span>${E(t("search"))}</span><input type="search" id="search" value="${E(search)}"></label><label>${E(t("inventory"))}<select id="inventory-status"><option value="active" ${inventoryStatus === "active" ? "selected" : ""}>${E(t("active_food"))}</option><option value="overdue" ${inventoryStatus === "overdue" ? "selected" : ""}>${E(t("overdue_filter"))}</option><option value="used" ${inventoryStatus === "used" ? "selected" : ""}>${E(t("used_food"))}</option></select></label></div><div id="food-list">${filteredList(key)}</div>`;
}
function filteredList(key) {
  return foodList(
    state.foods.filter(
      (f) =>
        f.status === (inventoryStatus === "overdue" ? "active" : inventoryStatus) &&
        (inventoryStatus !== "overdue" || pastDate(f)) &&
        (key === "all" ||
          (key === "freezer"
            ? f.location === "freezer"
            : key === "dryother"
              ? ["dry", "other"].includes(f.category)
              : f.category === key)) &&
        f.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
    ),
    key,
  );
}
function foodList(foods, key) {
  if (!foods.length)
    return `<section class="empty">${icon("leaf")}<h2>${E(t(search ? "no_results" : "empty"))}</h2><p>${E(t("empty_hint"))}</p></section>`;
  const known = foods
      .filter((f) => f.effective_date)
      .sort(
        (a, b) =>
          a.effective_date.localeCompare(b.effective_date) ||
          (a.purchased_date || "9999").localeCompare(
            b.purchased_date || "9999",
          ) ||
          a.id - b.id,
      ),
    unknown = foods
      .filter((f) => !f.effective_date)
      .sort(
        (a, b) =>
          (a.purchased_date || "9999").localeCompare(
            b.purchased_date || "9999",
          ) || a.id - b.id,
      );
  return `${known.length ? `<h2 class="list-heading">${E(t("known_dates"))}</h2><div class="food-rows">${known.map(foodRow).join("")}</div>` : ""}${unknown.length ? `<h2 class="list-heading">${E(t("unknown"))}</h2><div class="food-rows">${unknown.map(foodRow).join("")}</div>` : ""}`;
}
const quantityUnits = [
  "pcs",
  "g",
  "kg",
  "ml",
  "l",
  "pack",
  "box",
  "bottle",
  "portion",
];
function amountText(quantity, unit = "pcs") {
  return typeof quantity === "number"
    ? `${new Intl.NumberFormat(language() === "en" ? "en" : "zh-Hant", { maximumFractionDigits: 3 }).format(quantity)} ${t("unit_" + unit)}`
    : t("quantity_unknown");
}
function batchLine(food) {
  return `${state.kitchen?.kind === "party" ? (food.kitchen_name || state.kitchen.name) + " · " : ""}${t("batch")} #${food.id} · ${food.purchased_date ? t("purchased_date") + " " + dateText(food.purchased_date) : t("purchase_unknown")}`;
}
function foodRow(f) {
  return `<article class="food-row${pastDate(f) ? " past-date-row" : ""}${expiredUseBy(f) ? " expired-use-by" : ""}" data-food-id="${f.id}"><label class="food-select"><input type="checkbox" data-select="${f.id}" ${selection.has(f.id) ? "checked" : ""} ${f.eligible && !state.kitchen.closed ? "" : "disabled"} aria-label="${E(t("selected") + " " + f.name)}"><span><strong>${E(f.name)}</strong><span class="stock-quantity">${E(t("remaining"))}: ${E(amountText(f.quantity, f.unit))}</span>${f.food_warning ? `<small class="warning">${E(t("not_food"))}</small>` : ""}<small class="batch-label">${E(batchLine(f))}</small><small class="${!f.eligible && f.status !== "used" ? "warning" : ""}">${E(dateLine(f))}${expiredUseBy(f) ? ` · ${E(t("overdue_critical"))}` : ""}</small><small>${E(t(f.category))} · ${E(t(f.location))}</small></span></label><div class="food-actions">${!state.kitchen.closed && f.kitchen_id === state.kitchen.id ? button("edit", t("edit"), "quiet", `data-id="${f.id}"`) : ""}${state.kitchen.closed ? "" : f.status === "used" ? button("row-restore", t("restore"), "", 'data-id="' + f.id + '"') : f.food_warning ? "" : button("row-used", t("consume"), "", 'data-id="' + f.id + '"')}${!state.kitchen.closed && f.kitchen_id === state.kitchen.id ? button("row-delete", t("remove_short"), "danger", `data-id="${f.id}"`) : ""}</div></article>`;
}
function foodForm(id) {
  if (state.kitchen.closed) return `${back()}<h1>${E(t("party_closed"))}</h1>`;
  const f = id ? state.foods.find((f) => f.id === Number(id)) : null;
  if (id && !f) return `${back()}<h1>${E(t("food_not_found"))}</h1>`;
  const key = foodForm.category,
    v = f || {
      name: "",
      category: cats.includes(key) ? key : "other",
      location: key === "freezer" ? "freezer" : "other",
      date_source: "unknown",
      date_kind: "unspecified",
      note: "",
      ingredient: "",
    };
  calculation = f?.date_source === "production" ? f.effective_date : null;
  return `<div class="narrow">${back()}<h1>${E(t(f ? "edit" : "add"))}</h1>${!f ? `<section class="photo-panel"><label class="photo-upload">${E(t("photo"))}<input type="file" id="food-photo" accept="image/jpeg,image/png,image/webp,image/heic" capture="environment"></label><p class="hint">${E(t("photo_hint"))}</p><div id="photo-results">${photoCandidates.length ? photoCandidateHTML() : ""}</div><p id="photo-error" class="error" role="alert"></p></section>` : ""}<form data-form="food" data-id="${f?.id || ""}" data-version="${f?.version || ""}">${field("name", t("name"), v.name, "text", 'required maxlength="120" autocomplete="off"')}<div id="food-classification" class="food-classification" role="status" aria-live="polite"></div><label class="check food-confirmation" id="food-confirmation" hidden><input type="checkbox" name="food_confirmed" ${v.food_verification?.confirmed ? "checked" : ""}>${E(t("food_confirm_label"))}</label><p class="hint">${E(t("batch_note"))}</p><div class="two-fields">${field("quantity", t("quantity"), v.quantity ?? "", "number", `required min="0.001" max="1000000" step="0.001" inputmode="decimal"`)}<label>${E(t("unit"))}<select name="unit">${quantityUnits.map((unit) => option(unit, t("unit_" + unit), v.unit || "pcs")).join("")}</select></label></div>${field("purchased_date", t("purchased_date"), f ? f.purchased_date || "" : state.today, "date")}<label>${E(t("date_information"))}<select name="date_source">${["unknown", "printed", "production", "personal"].map((k) => option(k, t(k === "unknown" ? "no_date" : k === "personal" ? "personal_date_source" : k), v.date_source)).join("")}</select></label><div id="dated-fields" ${v.date_source === "unknown" ? "hidden" : ""}><div id="package-label">${select("date_kind", t("label_type"), ["unspecified", "use_by", "best_before"], v.date_kind)}</div><div id="printed-fields" ${!["printed", "personal"].includes(v.date_source) ? "hidden" : ""}><label><span id="food-date-label">${E(t(v.date_source === "personal" ? "personal_date" : "date"))}</span><input type="date" name="effective_date" value="${E(v.effective_date || "")}"></label><p class="hint" id="personal-date-hint" ${v.date_source !== "personal" ? "hidden" : ""}>${E(t("personal_hint"))}</p></div><div id="production-fields" ${v.date_source !== "production" ? "hidden" : ""}>${field("production_date", t("production_date"), v.production_date || "", "date")}<div class="two-fields">${field("shelf_life", t("shelf_life"), v.shelf_life || "", "number", 'min="1" max="10000" step="1"')}${select("shelf_unit", t("shelf_life"), ["days", "months", "years"], v.shelf_unit || "days")}</div>${button("calculate", t("calculate"))}<p id="calculation-result" role="status">${calculation ? E(t("reference") + ": " + dateText(calculation)) : ""}</p><label class="check"><input type="checkbox" name="date_confirmed" ${calculation ? "checked" : ""}>${E(t("confirm_date"))}</label><details><summary>${E(t("calc_explanation"))}</summary><p>${E(t("calc_note"))}</p></details></div></div><div class="two-fields">${select("category", t("category"), cats, v.category)}${select("location", t("location"), ["fridge", "freezer", "pantry", "other"], v.location)}</div><input type="hidden" name="ingredient" value="${E(v.ingredient)}"><label>${E(t("note"))}<textarea name="note" maxlength="1000" rows="3">${E(v.note)}</textarea></label>${formError()}<div class="actions"><button class="primary" ${f?.status === "used" ? "disabled" : ""}>${E(t(f ? "save" : "add"))}</button>${button("go", t("cancel"), "", 'data-path="kitchen"')}</div>${f ? `<div class="record-actions">${f.status === "active" ? button("mark-used", t("consume")) : ""}${button("delete-food", t("delete"), "danger")}${button("reload-record", t("reload_record"), "quiet")}</div>` : ""}</form></div>`;
}
function bindFoodForm() {
  const form = $('[data-form="food"]');
  if (!form) return;
  form.dataset.requestId = crypto.randomUUID();
  function fields() {
    const s = form.elements.date_source.value;
    $("#dated-fields").hidden = s === "unknown";
    $("#printed-fields").hidden = !["printed", "personal"].includes(s);
    $("#package-label").hidden = s === "personal";
    $("#personal-date-hint").hidden = s !== "personal";
    $("#food-date-label").textContent = t(
      s === "personal" ? "personal_date" : "date",
    );
    $("#production-fields").hidden = s !== "production";
    form.elements.effective_date.required = s === "printed";
    form.elements.effective_date.disabled = !["printed", "personal"].includes(
      s,
    );
    form.elements.date_kind.disabled = ["unknown", "personal"].includes(s);
    form.elements.date_confirmed.disabled = s !== "production";
    for (const k of ["production_date", "shelf_life", "shelf_unit"]) {
      form.elements[k].required = s === "production";
      form.elements[k].disabled = s !== "production";
    }
  }
  function invalidate() {
    calculation = null;
    form.elements.date_confirmed.checked = false;
    $("#calculation-result").textContent = "";
  }
  fields();
  bindFoodClassification(form);
  form.elements.date_source.addEventListener("change", () => {
    fields();
    invalidate();
  });
  for (const k of ["production_date", "shelf_life", "shelf_unit"])
    form.elements[k].addEventListener("input", invalidate);
  form.elements.name.addEventListener("input", () => {
    form.elements.ingredient.value = "";
    const n = form.elements.name.value
      .normalize("NFKC")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");
    for (const [k, aliases] of Object.entries(state.ingredients))
      if (aliases.includes(n)) form.elements.ingredient.value = k;
  });
}
function bindFoodClassification(form) {
  const entries = new Map(),
    status = $("#food-classification"),
    confirmation = $("#food-confirmation"),
    nameInput = form.elements.name,
    submit = $("button.primary", form),
    uid = state.user.id,
    kid = state.kitchen.id;
  let timer,
    sequence = 0;
  if (
    state.foods.find((f) => String(f.id) === form.dataset.id)?.category_mode ===
    "manual"
  )
    form.dataset.categoryManual = "true";
  const key = () =>
    nameInput.value.normalize("NFKC").toLowerCase().trim().replace(/\s+/g, " ");
  const draw = (assessment, aiChecked) => {
    const known = assessment.status === "food",
      blocked = assessment.status === "non_food",
      uncertain =
        !known && !blocked && (aiChecked || assessment.source !== "rules");
    form.dataset.foodStatus = blocked
      ? "non_food"
      : known
        ? "food"
        : "uncertain";
    status.className =
      "food-classification " +
      (blocked
        ? "classification-error"
        : known
          ? "classification-ok"
          : "classification-pending");
    if (known) {
      if (form.dataset.categoryManual !== "true")
        form.elements.category.value = assessment.category;
      if (assessment.ingredient)
        form.elements.ingredient.value = assessment.ingredient;
      status.textContent = `${t(form.dataset.categoryManual === "true" ? "manual_category" : "auto_category")}: ${t(form.elements.category.value)}`;
    } else
      status.textContent = t(
        blocked
          ? "not_food"
          : uncertain
            ? assessment.reason === "ai_disabled"
              ? "classification_privacy"
              : assessment.source === "unavailable"
              ? "classification_unavailable"
              : "food_confirmation_required"
            : "food_name_incomplete",
      );
    confirmation.hidden = !uncertain;
    form.elements.food_confirmed.required = uncertain;
    // A pending submit is already disabled by the form submit handler.
    if (blocked) submit.disabled = true;
    else if (!form.dataset.classifyingSubmit) submit.disabled = false;
  };
  form.clearFoodAssessment = () => entries.delete(key());
  form.classifyName = async function (allowAI = false) {
    if (!form.isConnected) return;
    const name = nameInput.value.trim(),
      nameKey = key(),
      seq = ++sequence;
    if (!name) {
      status.textContent = "";
      form.dataset.foodStatus = "uncertain";
      return;
    }
    let entry = entries.get(nameKey);
    if (entry?.promise && allowAI && !entry.aiRequested) {
      await entry.promise;
      return form.classifyName(allowAI);
    }
    if (
      !entry ||
      (!entry.promise &&
        entry.assessment?.status === "uncertain" &&
        allowAI &&
        !entry.aiChecked)
    ) {
      entry = { aiRequested: allowAI };
      entries.set(nameKey, entry);
      status.className = "food-classification classification-pending";
      status.textContent = t("checking_food");
      entry.promise = api("food/classify", { name, allow_ai: allowAI })
        .then((result) => {
          entry.assessment = result.assessment;
          entry.aiChecked = allowAI;
          return entry.assessment;
        })
        .catch(() => {
          entry.assessment = {
            status: "uncertain",
            category: "other",
            ingredient: "",
            source: "unavailable",
          };
          entry.aiChecked = true;
          return entry.assessment;
        })
        .finally(() => {
          entry.promise = null;
        });
    }
    const assessment = entry.promise ? await entry.promise : entry.assessment;
    if (
      seq === sequence &&
      form.isConnected &&
      key() === nameKey &&
      state.user?.id === uid &&
      state.kitchen?.id === kid
    )
      draw(assessment, entry.aiChecked);
    return assessment;
  };
  nameInput.addEventListener("input", () => {
    clearTimeout(timer);
    sequence++;
    form.elements.category.value = "other";
    form.dataset.categoryManual = "false";
    form.dataset.foodStatus = "uncertain";
    form.elements.food_confirmed.checked = false;
    form.elements.food_confirmed.required = false;
    confirmation.hidden = true;
    submit.disabled = false;
    status.textContent = nameInput.value.trim() ? t("checking_food") : "";
    timer = setTimeout(() => form.classifyName(false), 650);
  });
  nameInput.addEventListener("blur", () => {
    clearTimeout(timer);
    form.classifyName(true);
  });
  form.elements.category.addEventListener("change", () => {
    form.dataset.categoryManual = "true";
    const entry = entries.get(key());
    if (entry?.assessment) draw(entry.assessment, entry.aiChecked);
  });
  if (nameInput.value.trim()) form.classifyName(true);
}

function readRecipeOptions() {
  const form = $('[data-form="ai-recipes"]');
  if (!form) return recipeOptions;
  const d = Object.fromEntries(new FormData(form));
  return {
    style: d.style,
    count: Number(d.count),
    scope: d.scope,
    preference: d.preference,
    mode: d.mode,
    pantry_staples: [...form.querySelectorAll('[name="pantry_staples"]:checked')].map((el) => el.value),
    servings: Number(d.servings),
    portion: d.portion,
    max_minutes: d.max_minutes ? Number(d.max_minutes) : null,
    avoid: d.avoid,
    use_all: form.elements.use_all.checked,
    exact_count: true,
  };
}
function recipeAvoided(food) {
  const terms = (recipeOptions.avoid || "")
    .normalize("NFKC")
    .toLowerCase()
    .split(/[,，、;；\n]+/)
    .map((v) => v.trim())
    .filter(Boolean);
  const names = [food.name, ...(state.ingredients[food.ingredient] || [])].map(
    (v) => v.normalize("NFKC").toLowerCase(),
  );
  return terms.some((term) =>
    names.some((name) =>
      /^[a-z0-9 ]+$/.test(term)
        ? new RegExp(
            "(^|[^a-z0-9])" +
              term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
              "([^a-z0-9]|$)",
          ).test(name)
        : name.includes(term),
    ),
  );
}
function chosenRecipeFoods() {
  return state.foods.filter(
    (f) =>
      f.eligible &&
      !recipeAvoided(f) &&
      (recipeOptions.scope === "all" || selection.has(f.id)),
  );
}
function recipeFoodsHTML() {
  const foods = chosenRecipeFoods(),
    ids = new Set(foods.map((f) => f.id));
  const available = state.foods.filter(
    (f) => f.eligible && !recipeAvoided(f) && !ids.has(f.id),
  );
  const excluded = state.foods.filter(
    (f) =>
      f.eligible &&
      recipeAvoided(f) &&
      (recipeOptions.scope === "all" || selection.has(f.id)),
  );
  return `<section id="recipe-foods" aria-label="${E(t("recipe_foods_title"))}"><h2>${E(t("recipe_foods_title"))} <span class="food-count">${foods.length}</span></h2><p class="hint">${E(t("recipe_selection_note"))}</p>${excluded.length ? `<p class="hint">${E(t("recipe_avoided"))}: ${excluded.map((f) => E(f.name)).join("、")}</p>` : ""}<div class="recipe-food-chips" aria-live="polite">${foods.length ? foods.map((f) => `<div class="recipe-food-chip" data-recipe-food="${f.id}"><span><strong>${E(f.name)}</strong><small>${E(amountText(f.quantity, f.unit))} · ${E(batchLine(f))}</small></span>${button("recipe-remove-food", "×", "quiet", `data-id="${f.id}" aria-label="${E(t("recipe_remove_food") + ": " + f.name)}"`)}</div>`).join("") : `<p>${E(t("recipe_food_empty"))}</p>`}</div><details class="recipe-food-picker" ${recipePickerOpen ? "open" : ""}><summary>${E(t("recipe_add_food"))}</summary><label>${E(t("search"))}<input type="search" id="recipe-food-search" value="${E(recipeFoodSearch)}"></label><div class="recipe-food-choices">${available.map((f) => `<button type="button" data-action="recipe-add-food" data-id="${f.id}" data-food-search="${E(f.name.toLowerCase())}" ${!f.name.toLowerCase().includes(recipeFoodSearch.toLowerCase()) ? "hidden" : ""}><span><strong>${E(f.name)}</strong><small>${E(amountText(f.quantity, f.unit))} · ${E(batchLine(f))}</small></span><span aria-hidden="true">＋</span></button>`).join("")}</div>${!available.length ? `<p class="hint">${E(t("recipe_picker_empty"))}</p>` : ""}</details></section>`;
}
function recipeInputsChanged() {
  if (!recipeResult) return false;
  const options = readRecipeOptions(),
    saved = recipeResult.options || {};
  const changed = Object.keys(options).some(
    (k) => k !== "exact_count" && (Array.isArray(options[k])
      ? JSON.stringify(options[k]) !== JSON.stringify(saved[k] || [])
      : (options[k] ?? "") !== (saved[k] ?? "")),
  );
  const ids = chosenRecipeFoods()
    .map((f) => f.id)
    .sort((a, b) => a - b);
  return (
    changed ||
    JSON.stringify(ids) !==
      JSON.stringify([...recipeResult.selected].sort((a, b) => a - b))
  );
}
function updateRecipeFoods() {
  const root = $("#recipe-foods");
  if (root) root.outerHTML = recipeFoodsHTML();
  const form = $('[data-form="ai-recipes"]');
  if (form) {
    form.elements.scope.querySelector('[value="selected"]').textContent =
      `${t("scope_selected")} (${selection.size})`;
    form.elements.scope.value = recipeOptions.scope;
  }
  displayRecipes(route()[1]);
}
function recipeSwapButton(r) {
  return button(
    "replace-recipe",
    t("recipe_replace"),
    "",
    `data-id="${r.id}" ${state.kitchen.closed || recipeBusy || recipeResult?.stale || recipeInputsChanged() ? "disabled" : ""}`,
  );
}
function pantryHTML() {
  const staples = state.pantry_staples || [];
  const selected = recipeOptions.pantry_staples ?? staples.map((s) => s.id);
  return `<details class="pantry-preferences" ${recipeOptions.mode === "use_up" ? "hidden" : ""}><summary>${E(t("pantry_title"))} <span id="pantry-count" class="food-count">${selected.length}</span></summary><p class="hint">${E(t("pantry_hint"))}</p><div class="pantry-options">${staples.map((s) => `<label class="check"><input type="checkbox" name="pantry_staples" value="${E(s.id)}" ${selected.includes(s.id) ? "checked" : ""}>${E(s.name)}</label>`).join("")}</div></details>`;
}
function updatePantryUI() {
  const form = $('[data-form="ai-recipes"]');
  if (!form) return;
  const details = $(".pantry-preferences", form);
  if (details) details.hidden = form.elements.mode.value === "use_up";
  const count = $("#pantry-count", form);
  if (count) count.textContent = form.querySelectorAll('[name="pantry_staples"]:checked').length;
}
function recipeSeasoningsHTML(recipe, compact = false) {
  const items = recipe.seasonings || [];
  if (!items.length) return "";
  return compact
    ? `<p class="recipe-basics"><strong>${E(t("pantry_title"))}:</strong> ${items.map((i) => E(i.name)).join(" · ")}</p>`
    : `<section class="recipe-seasonings"><h3>${E(t("pantry_used"))}</h3><ul>${items.map((i) => `<li>${E(i.name)} · ${E(i.amount)}</li>`).join("")}</ul></section>`;
}
function recipePastDatesHTML(recipe) {
  return recipe.uses.some((use) => state.foods.some((f) => f.id === use.food_id && pastDate(f)))
    ? `<p class="warning recipe-date-note">${E(t("recipe_past_dates"))}</p>` : "";
}
function recipesPage(id) {
  if (id)
    return `<div class="narrow"><div id="recipe-content" aria-live="polite"></div></div>`;
  const selected = selection.size;
  if (!selected && recipeOptions.scope === "selected" && !recipeDraft)
    recipeOptions.scope = "all";
  return `<section class="page-heading"><h1>${E(t("recipe_title"))}</h1></section>
  <form data-form="ai-recipes" class="recipe-controls"><fieldset class="recipe-fields" ${state.kitchen.closed ? "disabled" : ""}>
    ${recipeFoodsHTML()}
    <label>${E(t("recipe_mode"))}<select name="mode">${["stock_first", "plan", "use_up"].map((v) => option(v, t("mode_" + v), recipeOptions.mode)).join("")}</select></label>
    <p id="mode-hint" class="hint">${E(t("mode_hint_" + recipeOptions.mode))}</p>
    <div class="two-fields recipe-dish-fields"><label>${E(t("dish_style"))}<select name="style">${["auto", "mixed", "cold", "soup", "main", "meat", "vegetable"].map((v) => option(v, t("style_" + v), recipeOptions.style)).join("")}</select></label><label>${E(t("dish_count"))}<select name="count">${[1, 2, 3, 4].map((v) => option(v, String(v), recipeOptions.count)).join("")}</select></label></div>
    <div class="two-fields"><label>${E(t("diners"))}<input name="servings" type="number" min="1" max="12" step="1" inputmode="numeric" value="${recipeOptions.servings}" required></label><label>${E(t("per_person_portion"))}<select name="portion">${["light", "standard", "hearty"].map((v) => option(v, t("portion_" + v), recipeOptions.portion)).join("")}</select></label></div>
    <label>${E(t("scope"))}<select name="scope"><option value="selected" ${recipeOptions.scope === "selected" ? "selected" : ""}>${E(t("scope_selected"))} (${selected})</option><option value="all" ${recipeOptions.scope === "all" ? "selected" : ""}>${E(t("scope_all"))}</option></select></label>
    <label class="check"><input type="checkbox" name="use_all" ${recipeOptions.use_all ? "checked" : ""}>${E(t("recipe_use_all"))}</label>
    <label>${E(t("taste_label"))}<input name="preference" value="${E(recipeOptions.preference)}" maxlength="120" placeholder="${E(t("taste_placeholder"))}"></label>
    ${pantryHTML()}
    <details class="recipe-preferences"><summary>${E(t("more_preferences"))}</summary>
      <label>${E(t("max_minutes"))}<select name="max_minutes">${option("", t("any_time"), recipeOptions.max_minutes ?? "")}${[15, 30, 45, 60].map((v) => option(v, `${v} ${t("minutes")}`, recipeOptions.max_minutes)).join("")}</select></label>
      <label>${E(t("avoid"))}<input name="avoid" value="${E(recipeOptions.avoid)}" maxlength="120" placeholder="${E(t("avoid_hint"))}"></label>
    </details>
    ${formError()}<button class="primary full" ${recipeBusy ? "disabled" : ""}>${E(t(recipeBusy ? "generating" : recipeResult ? "regenerate" : "generate"))}</button></fieldset>
  </form><div id="recipe-content" aria-live="polite">${recipeBusy ? `<p class="loading">${E(t("generating"))}</p>` : ""}</div>`;
}
function recipeSummary(generation) {
  const options = generation.options || {};
  return `${t("mode_" + (options.mode || "plan"))} · ${options.servings || generation.recipes[0]?.servings || 2} ${t("servings")} · ${t("portion_" + (options.portion || "standard"))}${options.max_minutes ? ` · ≤${options.max_minutes} ${t("minutes")}` : ""}`;
}
function shoppingHTML(generation) {
  if (generation.options?.mode === "use_up")
    return `<p class="recipe-source">${E(t("no_shopping"))}</p>`;
  const items = generation.recipes.flatMap((r) =>
    r.additional.map((item) => ({ ...item, recipe: r.title })),
  );
  if (!items.length) return `<p class="recipe-source">${E(t("no_new_purchases"))}</p>`;
  return `<section class="shopping-list"><h2>${E(t("shopping_list"))}</h2><p class="hint">${E(t("shopping_note"))}</p><ul>${items.map((item) => `<li><strong>${E(item.name)} ${E(item.amount)}</strong><small>${E(item.recipe)}</small></li>`).join("")}</ul></section>`;
}
async function loadRecipes(id) {
  const seq = ++recipeSeq;
  try {
    const result = await api("recipes/history");
    if (seq !== recipeSeq) return;
    recipeHistoryLoaded = true;
    if (result.generation) recipeResult = result.generation;
    const form = $('[data-form="ai-recipes"]');
    if (
      recipeResult &&
      (!form || !form.dataset.dirty) &&
      !recipeDraft &&
      (!selection.size ||
        JSON.stringify([...selection].sort((a, b) => a - b)) ===
          JSON.stringify([...recipeResult.selected].sort((a, b) => a - b)))
    ) {
      const saved = recipeResult.options || {};
      recipeOptions = {
        ...defaultRecipeOptions(),
        ...saved,
        mode: Object.hasOwn(saved, "pantry_staples") ? saved.mode || "stock_first" : "stock_first",
        servings: saved.servings || recipeResult.recipes[0]?.servings || 2,
        count: saved.count || recipeResult.recipes.length,
        use_all: saved.use_all ?? false,
      };
      if (recipeOptions.scope === "selected")
        selection = new Set(
          recipeResult.selected.filter((id) =>
            state.foods.some((f) => f.id === id && f.eligible),
          ),
        );
      recipeDraft = true;
      storeSelection();
      render(true);
    }
    if (route()[0] === "recipes") displayRecipes(id);
  } catch (error) {
    if ($("#recipe-content"))
      $("#recipe-content").innerHTML =
        `<p class="error">${E(errorText(error))}</p>`;
  }
}
function photoCandidateHTML() {
  return `<p>${E(t("photo_confirm"))}</p><div class="photo-candidates">${photoCandidates.map((food, index) => button("photo-fill", food.name, "", `data-index="${index}"`)).join("")}</div>`;
}
function displayRecipes(id) {
  const root = $("#recipe-content");
  if (!root) return;
  if (recipeBusy) {
    if (!replacingRecipe) {
      root.innerHTML = `<p class="loading">${E(t("generating"))}</p>`;
      return;
    }
  }
  if (!recipeResult?.recipes?.length) {
    root.innerHTML = `<section class="empty"><p>${E(t("no_recipes_yet"))}</p></section>`;
    return;
  }
  const recipes = recipeResult.recipes;
  const status = `${recipeInputsChanged() ? `<p class="warning recipe-input-changed">${E(t("recipe_changed"))}</p>` : ""}${replacingRecipe ? `<p class="loading" role="status">${E(t("recipe_replacing"))}</p>` : ""}`;
  if (id) {
    const r = recipes.find((r) => String(r.id) === String(id));
    if (!r) {
      root.innerHTML = E(t("not_found"));
      return;
    }
    root.innerHTML = `${back("recipes")}${status}<p class="recipe-source">${E(recipeSummary(recipeResult))}</p>${recipeResult.stale ? `<p class="warning">${E(t("generation_stale"))}</p>` : ""}<article class="recipe-detail"><span class="dish-tag">${E(t("recipe_dish"))} ${r.id} · ${E(t("style_" + r.kind))}</span><h2>${E(r.title)}</h2><p>${r.minutes} ${E(t("minutes"))} · ${r.servings} ${E(t("servings"))}</p>${r.uses.length ? `<h3>${E(t("used_ingredients"))}</h3><ul>${r.uses.map((use) => `<li>${E(use.name)} <span>${E(use.amount)}</span>${typeof use.quantity === "number" ? `<small class="recipe-stock">${E(t("suggested_amount"))}: ${E(amountText(use.quantity, use.unit))}</small>` : ""}<small class="recipe-stock">${E(t("remaining"))}: ${E(amountText(state.foods.find((f) => f.id === use.food_id)?.quantity, use.unit))} · ${E(batchLine({ id: use.food_id, purchased_date: use.purchased_date, kitchen_name:use.kitchen_name }))}</small></li>`).join("")}</ul>` : ""}${r.additional.length ? `<h3>${E(t("extra_ingredients"))}</h3><ul>${r.additional.map((item) => `<li>${E(item.name)} ${E(item.amount)}</li>`).join("")}</ul>` : ""}${recipeSeasoningsHTML(r)}${recipePastDatesHTML(r)}<h3>${E(t("steps"))}</h3><ol>${r.steps.map((step) => `<li>${E(step)}</li>`).join("")}</ol>${recipeResult.options?.mode !== "use_up" && r.pairing ? `<h3>${E(t("pairing"))}</h3><p>${E(r.pairing)}</p>` : ""}${r.notes ? `<p class="hint">${E(r.notes)}</p>` : ""}<p class="hint">${E(t("ai_note"))}</p>${recipeSwapButton(r)}${r.uses.length && !state.kitchen.closed ? button("cooked-recipe", t("cooked"), "primary full", `data-id="${r.id}"`) : `<p class="hint">${E(t("shopping_note"))}</p>`}</article>${shoppingHTML({ ...recipeResult, recipes: [r] })}`;
    return;
  }
  root.innerHTML = `${status}<div class="recipe-source">${E(t("ai_provider"))}<br>${E(recipeSummary(recipeResult))}</div>${recipeResult.stale ? `<p class="warning">${E(t("generation_stale"))}</p>` : ""}<div class="recipe-grid">${recipes.map((r) => `<article class="recipe-card"><div class="recipe-art">${icon(r.kind === "soup" ? "bowl" : r.kind === "meat" ? "fish" : r.kind === "main" ? "bowl" : "leaf")}</div><div class="recipe-copy"><span class="dish-tag">${E(t("recipe_dish"))} ${r.id} · ${E(t("style_" + r.kind))}</span><h2>${E(r.title)}</h2><p>${r.minutes} ${E(t("minutes"))} · ${r.servings} ${E(t("servings"))}</p><p class="recipe-used">${r.uses.map((f) => E(f.name) + (typeof f.quantity === "number" ? " · " + E(amountText(f.quantity, f.unit)) : "")).join(" / ")}</p>${recipeSeasoningsHTML(r, true)}${recipePastDatesHTML(r)}${recipeResult.options?.mode !== "use_up" && r.pairing ? `<p class="hint">${E(r.pairing)}</p>` : ""}<div class="actions">${button("recipe-detail", t("details"), "primary", `data-id="${r.id}"`)}${recipeSwapButton(r)}${r.uses.length && !state.kitchen.closed ? button("cooked-recipe", t("cooked"), "", `data-id="${r.id}"`) : ""}</div></div></article>`).join("")}</div>${shoppingHTML(recipeResult)}<p class="hint">${E(t("ai_note"))}</p>`;
}

let legalContent = null, legalLoading = false, legalError = null;
function legalLinks() {
  return `<p class="legal-links"><a href="/#terms" target="_blank" rel="noopener">${E(t("terms_title"))}</a><span aria-hidden="true"> · </span><a href="/#privacy-policy" target="_blank" rel="noopener">${E(t("privacy_policy"))}</a></p>`;
}
async function loadLegalContent() {
  if (legalLoading) return;
  legalLoading=true;
  try {legalContent=await api("legal");legalError=null;} catch(e) {legalError=e;}
  finally {legalLoading=false;if (["terms","privacy-policy"].includes(route()[0])) render(true);}
}
function legalPage(page) {
  if (!legalContent) return `<div class="narrow">${back(state.user ? "privacy" : "kitchen")}<h1>${E(t(page === "terms" ? "terms_title" : "privacy_policy"))}</h1>${legalError ? `<p class="error">${E(errorText(legalError))}</p>${button("retry-legal",t("retry"))}` : `<p role="status">${E(t("loading"))}</p>`}</div>`;
  const lang=language(), doc=page === "terms" ? legalContent.terms : legalContent.privacy;
  return `<article class="narrow legal-document">${back(state.user ? "privacy" : "kitchen")}<h1>${E(t(page === "terms" ? "terms_title" : "privacy_policy"))}</h1><p class="hint">${E(legalContent.operator[lang])} · ${E(legalContent.version)} · ${E(legalContent.effective_date)}</p>${doc.map(s=>`<section><h2>${E(s.title[lang])}</h2><p>${E(s.body[lang])}</p></section>`).join("")}<p>${E(t("contact_privacy"))}: <a href="mailto:${E(legalContent.contact)}">${E(legalContent.contact)}</a></p>${page === "privacy-policy" ? `<ul>${legalContent.sources.map(s=>`<li><a href="${E(s.url)}" target="_blank" rel="noopener noreferrer">${E(s.name)}</a></li>`).join("")}</ul>` : ""}</article>`;
}
function agreementPage() {
  return `<div class="narrow"><h1>${E(t("terms_title"))}</h1><p>${E(t("agreement_intro"))}</p>${legalLinks()}<p class="hint">${E(t("legal_version"))}: ${E(state.legal.version)}</p><form data-form="agreement"><label class="check"><input type="checkbox" name="accepted" required>${E(t("agree_terms"))}</label>${formError()}<button class="primary full">${E(t("agreement_accept"))}</button></form>${button("go",t("privacy_data"),"full",'data-path="privacy"')}${button("sign-out",t("sign_out"),"quiet")}</div>`;
}
function privacyPage() {
  const c=state.consent || {};
  return `<div class="narrow"><h1>${E(t("privacy_data"))}</h1>${back("settings")}<p><a href="mailto:${E(state.legal.contact)}">${E(state.legal.contact)}</a></p>${legalLinks()}<p class="hint">${E(t("legal_version"))}: ${E(c.version || state.legal.version)}${c.accepted_at ? " · "+E(new Date(c.accepted_at).toLocaleString(language())) : ""}</p>${!c.accepted ? `<p class="warning">${E(t("agreement_required"))}</p>${button("go",t("agreement_accept"),"full",'data-path="kitchen"')}` : ""}<form data-form="privacy"><p class="hint">${E(t("ai_choice_notice"))}</p><label class="check"><input type="checkbox" name="ai_text" ${c.ai_text ? "checked" : ""}>${E(t("ai_text_choice"))}</label><label class="check"><input type="checkbox" name="ai_photo" ${c.ai_photo ? "checked" : ""}>${E(t("ai_photo_choice"))}</label>${formError()}<button class="primary">${E(t("save"))}</button></form><section class="privacy-section"><h2>${E(t("permissions_title"))}</h2><p>${E(t("permission_note"))}</p><dl class="permission-list"><dt>${E(t("permission_camera"))}</dt><dd id="camera-permission">${E(t("permission_unknown"))}</dd><dt>${E(t("permission_notification"))}</dt><dd id="notification-permission">${E(t("permission_unknown"))}</dd></dl>${state.kitchen && !state.kitchen.closed ? button("go",t("reminders"),"full",'data-path="reminders"') : ""}</section><section class="privacy-section"><h2>${E(t("export_data"))}</h2><p class="hint">${E(t("export_note"))}</p>${button("export-data",t("export_data"),"full")}${button("clear-ai-history",t("clear_ai_history"),"full")}${button("clear-device",t("clear_device"),"full")}${button("go",t("account_security"),"full",'data-path="account"')}</section></div>`;
}
async function loadPermissionState() {
  const uid=state.user.id;
  const permissionText=value=>t("permission_"+({default:"prompt",prompt:"prompt",granted:"granted",denied:"denied",unsupported:"unsupported"}[value] || "unknown"));
  if ($("#notification-permission")) $("#notification-permission").textContent=permissionText("Notification" in window ? Notification.permission : "unsupported");
  try {
    const result=await navigator.permissions?.query({name:"camera"});
    if (state.user?.id === uid && $("#camera-permission")) $("#camera-permission").textContent=permissionText(result?.state);
  } catch {}
}
function accountPage() {
  return `<div class="narrow">${back("settings")}<h1>${E(t("account_security"))}</h1><p class="account-email">${E(state.user.email)}</p><p class="hint">${E(t("reauth_note"))}</p><p id="account-session-count" role="status"></p><section class="privacy-section"><h2>${E(t("password_change"))}</h2><form data-form="password">${field("password",t("password_current"),"","password",'required maxlength="128" autocomplete="current-password"')}${field("new_password",t("password_new"),"","password",'required minlength="10" maxlength="128" autocomplete="new-password"')}${field("confirm_password",t("confirm_password"),"","password",'required minlength="10" maxlength="128" autocomplete="new-password"')}${formError()}<button class="primary full">${E(t("password_change"))}</button></form></section><section class="privacy-section"><h2>${E(t("logout_all"))}</h2><form data-form="logout-all">${field("password",t("password_current"),"","password",'required maxlength="128" autocomplete="current-password"')}<label class="check"><input name="confirmed" type="checkbox" required>${E(t("destructive_confirm"))}</label>${formError()}<button class="full">${E(t("logout_all"))}</button></form></section><section class="privacy-section"><h2>${E(t("delete_account"))}</h2><p>${E(t("delete_account_note"))}</p><div id="ownership-blockers"></div><form data-form="delete-account">${field("email",t("delete_email"),"","email",'required autocomplete="off"')}${field("password",t("password_current"),"","password",'required maxlength="128" autocomplete="current-password"')}<label class="check"><input name="confirmed" type="checkbox" required>${E(t("destructive_confirm"))}</label>${formError()}<button class="danger full">${E(t("delete_account"))}</button></form></section></div>`;
}
async function loadAccountStatus() {
  const uid=state.user.id;
  try {
    const result=await api("account/status");if (state.user?.id !== uid || !$("#account-session-count")) return;
    $("#account-session-count").textContent=t("active_sessions")+": "+result.sessions;
    const blockers=result.owned.filter(k=>k.other_members>0);
    if (blockers.length) $("#ownership-blockers").innerHTML=`<p class="warning">${E(t("transfer_required"))}</p><ul>${blockers.map(k=>`<li>${E(k.name)} ${button("manage-owner",t("transfer_owner"),"quiet",`data-id="${k.id}"`)}</li>`).join("")}</ul><p>${E(t("shared"))} → ${E(t("transfer_owner"))}</p>`;
  } catch(e) {if ($("#account-session-count")) $("#account-session-count").textContent=errorText(e);}
}
function transferForm() {
  const editors=state.members.filter(m=>m.role === "editor");
  if (!editors.length) return "";
  return `<details class="privacy-section"><summary>${E(t("transfer_owner"))}</summary><p>${E(t("transfer_note"))}</p><form data-form="transfer-owner"><label>${E(t("members"))}<select name="user_id">${editors.map(m=>option(m.id,m.email,editors[0].id)).join("")}</select></label>${field("password",t("password_current"),"","password",'required maxlength="128" autocomplete="current-password"')}<label class="check"><input type="checkbox" name="confirmed" required>${E(t("destructive_confirm"))}</label>${formError()}<button class="danger full">${E(t("transfer_owner"))}</button></form></details>`;
}
async function ensureAI(kind) {
  if (!state.consent?.accepted) {notify(t("agreement_required"));go("kitchen");return false;}
  const key=kind === "photo" ? "ai_photo" : "ai_text";
  if (state.consent[key]) return true;
  if (!(await confirmAction(t(kind === "photo" ? "ai_photo_prompt" : "ai_text_prompt"),t("ai_choice_notice")))) return false;
  const result=await api("privacy",{[key]:true});state.consent=result.consent;return true;
}
async function clearLocalSessionData() {
  clearLocalSelections();
  try {
    const registration=await navigator.serviceWorker?.getRegistration("/");
    const sub=await registration?.pushManager?.getSubscription();
    if (sub) await sub.unsubscribe();
  } catch {}
}
function clearLocalSelections() {
  selection.clear();
  for (const kind of ["sessionStorage","localStorage"]) try {
    const storage=window[kind];
    for (const key of Object.keys(storage)) if (key.startsWith("lmb-")) storage.removeItem(key);
  } catch {}
}

const settingsLink = (path, key) =>
  `<button class="settings-link" data-action="go" data-path="${path}"><span>${E(t(key))}</span><span aria-hidden="true">›</span></button>`;
function settings() {
  return `<div class="narrow">${back()}<h1>${E(t("settings"))}</h1>${settingsLink("kitchens", "switch_kitchen")}${state.kitchen?.kind === "party" ? settingsLink("party","party") : ""}${state.kitchen ? `<h2>${E(t("kitchen"))}</h2><p>${E(state.kitchen.name)} · ${E(t(state.kitchen.role))}</p>${settingsLink("shared", "shared")}` : ""}<h2>${E(t("personal"))}</h2>${settingsLink("preferences", "preferences")}${settingsLink("privacy","privacy_data")}${settingsLink("account","account_security")}${settingsLink("terms","terms_title")}${settingsLink("privacy-policy","privacy_policy")}${state.kitchen ? settingsLink("reminders", "reminders") : ""}<h2>${E(t("help"))}</h2>${settingsLink("help", "help")}${state.web_app ? "" : button("install", t("install"), "settings-link")}<p class="hint" id="install-guide" hidden>${E(t("install_note"))}</p>${state.kitchen?.role === "owner" && !state.kitchen.closed && state.kitchen.kind !== "party" ? `<h2>${E(t("kitchen_data"))}</h2>${button("clear-kitchen", t("clear_kitchen"), "danger full")}` : ""}<hr><p class="hint">${E(t("signout_note"))}</p>${button("sign-out", t("sign_out"), "full")}</div>`;
}
function shared() {
  const owner=state.kitchen.role === "owner", agreed=!!state.consent?.accepted;
  const members=state.members.map(m=>`<li><span>${E(m.email)}<small>${E(t(m.role))}</small></span>${owner && agreed && m.role === "editor" ? button("remove-member",t("remove"),"danger",`data-id="${m.id}"`) : ""}</li>`).join("");
  const invite=owner && agreed && !state.kitchen.closed ? `<h3>${E(t("invite_editor"))}</h3><p>${E(t(state.kitchen.kind === "party" ? "party_invite_policy" : "invite_policy"))}</p>${button("invite",t("invite_editor"),"primary")}<div id="invite-output" aria-live="polite"></div>` : "";
  return `<div class="narrow">${back("settings")}<h1>${E(t("shared"))}</h1><h2>${E(state.kitchen.name)}</h2><h3>${E(t("members"))}</h3><ul class="member-list">${members}</ul>${invite}${owner ? transferForm() : `<p>${E(t("preview_note"))}</p>${button("leave",t("leave"),"danger")}`}</div>`;
}
function preferences() {
  const p = state.preferences;
  return `<div class="narrow">${back("settings")}<h1>${E(t("preferences"))}</h1><form data-form="preferences"><label>${E(t("language"))}<select name="language">${option("en", "English", p.language)}${option("zh-Hant", "繁體中文", p.language)}</select></label>${select("text_size", t("text_size"), ["standard", "large"], p.text_size)}${select("default_view", t("default_view"), ["categories", "use_first"], p.default_view)}${select("date_format", t("date_format"), ["iso", "dmy", "mdy"], p.date_format)}<p class="hint">${E(t("timezone"))}: ${E(p.timezone)}</p>${formError()}<button class="primary">${E(t("save"))}</button></form></div>`;
}

function pushPanelHTML() {
  const reason = pushState?.reason || window.LMBPush?.capability();
  const denied = pushState?.permission === "denied";
  const active = !!pushState?.subscribed && !denied && !reason;
  return `<h2>${E(t("push_title"))}</h2><p id="push-status" role="status">${E(t(reason || (denied ? "push_denied" : active ? "push_enabled" : pushState ? "push_disabled" : "push_loading")))}</p><p class="hint">${E(t("push_schedule"))} · ${E(state.preferences.timezone)}</p>${!state.preferences.reminders ? `<p class="warning">${E(t("push_master_off"))}</p>` : ""}${pushState?.last_error ? `<p class="warning">${E(t("push_last_failed"))}</p>` : ""}<div class="actions">${!active ? button("enable-push", t("push_enable"), "primary", reason || denied ? "disabled" : "") : button("disable-push", t("push_disable"))}${button("test-push", t("push_test"), "", active ? "" : "disabled")}${button("refresh-push", t("push_refresh"), "quiet")}</div>`;
}
function drawPushPanel() {
  const root = $("#push-panel");
  if (root) root.innerHTML = pushPanelHTML();
}
function pushApiForUser() {
  const uid = state.user?.id,
    kid = state.kitchen?.id;
  return (...args) => {
    if (state.user?.id !== uid || state.kitchen?.id !== kid)
      throw { code: "push_account_changed" };
    return api(...args);
  };
}
async function loadPushStatus() {
  if (!$("#push-panel") || !state.user || !state.kitchen || !window.LMBPush)
    return;
  const seq = ++pushSequence,
    uid = state.user.id,
    kid = state.kitchen.id;
  try {
    const next = await LMBPush.status(pushApiForUser());
    if (
      seq === pushSequence &&
      state.user?.id === uid &&
      state.kitchen?.id === kid
    ) {
      pushState = next;
      drawPushPanel();
    }
  } catch (error) {
    if (seq === pushSequence && $("#push-status"))
      $("#push-status").textContent = errorText(error);
  }
}

function reminders() {
  const p = state.preferences;
  return `<div class="narrow">${back("settings")}<h1>${E(t("reminders"))}</h1><p>${E(t("reminder_note"))}</p><form data-form="reminders"><label class="check"><input type="checkbox" name="reminders" ${p.reminders ? "checked" : ""}>${E(t("enable_reminders"))}</label><label>${E(t("remind_before"))}<select name="reminder_days">${[1, 3, 7].map((d) => option(d, `${d} ${t("days")}`, p.reminder_days)).join("")}</select></label>${formError()}<button class="primary">${E(t("save"))}</button></form><p class="hint">${E(t("push_kitchen_scope"))}</p><section id="push-panel" class="push-panel" aria-label="${E(t("push_title"))}">${pushPanelHTML()}</section></div>`;
}
function help() {
  return `<div class="narrow">${back("settings")}<h1>${E(t("help"))}</h1><p>${E(t("help_text"))}</p><h2>Last Minute Bites 1.4</h2><p>${E(t("limitations"))}</p><p>${E(t("note_hint"))}</p></div>`;
}
async function confirmAction(title, message, typed = false) {
  const dialog = $("#confirm");
  $("#confirm-title").textContent = title;
  $("#confirm-message").textContent = message;
  $("#confirm-cancel").textContent = t("cancel");
  $("#confirm-yes").textContent = title;
  $("#confirm-label").hidden = !typed;
  $("#confirm-input-label").textContent = t("type_name");
  $("#confirm-input").value = "";
  dialog.returnValue = "cancel";
  dialog.showModal();
  return new Promise((resolve) =>
    dialog.addEventListener(
      "close",
      () =>
        resolve(
          dialog.returnValue === "yes"
            ? typed
              ? $("#confirm-input").value
              : true
            : false,
        ),
      { once: true },
    ),
  );
}
function foodData(form) {
  const data = Object.fromEntries(new FormData(form));
  data.request_id = form.dataset.requestId;
  data.shelf_life = Number(data.shelf_life);
  data.quantity = data.quantity === "" ? null : Number(data.quantity);
  data.category_mode =
    form.dataset.categoryManual === "true" ? "manual" : "auto";
  data.food_confirmed = !!form.elements.food_confirmed?.checked;
  data.date_confirmed = form.elements.date_confirmed.checked && !!calculation;
  if (form.dataset.id) {
    data.id = Number(form.dataset.id);
    data.version = Number(form.dataset.version);
  }
  return data;
}
document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (!form.dataset.form) return;
  event.preventDefault();
  const submit = $('button:not([type="button"])', form);
  if (submit.disabled) return;
  submit.disabled = true;
  const error = $(".error", form);
  error.textContent = "";
  const data = Object.fromEntries(new FormData(form));
  try {
    switch (form.dataset.form) {
      case "agreement":
        await api("legal/accept",{accepted:form.elements.accepted.checked,version:state.legal.version});
        await refresh(false);go("kitchen");render();break;
      case "privacy": {
        const result = await api("privacy",{ai_text:form.elements.ai_text.checked,ai_photo:form.elements.ai_photo.checked});
        state.consent=result.consent;recipeSeq++;recipeResult=null;recipeHistoryLoaded=false;photoCandidates=[];
        await refresh();notify(t("saved"));break;
      }
      case "password":
        await api("account/password",data);form.reset();await loadAccountStatus();notify(t("password_changed"));break;
      case "logout-all":
      case "delete-account": {
        await api(form.dataset.form === "logout-all" ? "account/logout-all" : "account/delete",{...data,confirmed:form.elements.confirmed.checked});
        await clearLocalSessionData();activeKitchenId=null;contextEpoch++;await refresh(false);go("kitchen");render();break;
      }
      case "transfer-owner":
        await api("kitchen/transfer",{...data,user_id:Number(data.user_id),confirmed:form.elements.confirmed.checked});
        await refresh();notify(t("saved"));break;
      case "ai-recipes": {
        if (!(await ensureAI("text"))) break;
        recipeOptions = readRecipeOptions();
        recipeDraft = true;
        if (
          recipeOptions.scope === "selected" &&
          !selection.size &&
          recipeOptions.mode !== "plan"
        )
          throw { code: "recipe_empty_choice" };
        const requestSeq=++recipeSeq;
        recipeBusy = true;
        displayRecipes();
        const uid = state.user.id,
          kid = state.kitchen.id,
          language = state.preferences.language;
        try {
          const generated = await api("recipes/generate", {
            ...recipeOptions,
            selected: [...selection],
            regenerate: !!recipeResult,
          });
          if (
            requestSeq === recipeSeq && state.user?.id === uid &&
            state.kitchen?.id === kid &&
            state.preferences.language === language
          ) {
            recipeResult = generated.generation;
            recipeHistoryLoaded = true;
            notify(t("saved"));
          }
        } finally {
          recipeBusy = false;
        }
        if (route()[0] === "recipes") {
          render();
          displayRecipes();
        }
        break;
      }
      case "auth":
        await api(authMode === "login" ? "login" : "register", {
          ...data,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          terms_accepted: form.elements.terms_accepted?.checked === true,
          legal_version: state.legal?.version,
        });
        await refresh(false);
        go("kitchen");
        render();
        break;
      case "create-party":
      case "create-kitchen": {
        const result = await api("kitchen/create", {...data,
          kind: form.dataset.form === "create-party" ? "party" : "home",
          hours: Number(data.hours || 24),
          source_ids: form.dataset.form === "create-party" ? new FormData(form).getAll("source_ids").map(Number) : [],
        });
        activeKitchenId = result.kitchen_id;
        contextEpoch++;
        switchingKitchen = true;
        await refresh(false);
        go("kitchen");
        render();
        switchingKitchen = false;
        break;
      }
      case "party-source":
        await api("party/source/add", {source_id:Number(data.source_id),confirmed:true});
        await refresh();
        break;
      case "preview-invite":
        invitePreview = {
          ...(await api("invitation/preview", data)),
          code: data.code,
        };
        render();
        break;
      case "food":
        form.dataset.classifyingSubmit = "true";
        await form.classifyName(true);
        if (form.dataset.foodStatus === "non_food")
          throw Object.assign(new Error(), { code: "not_food" });
        if (
          form.dataset.foodStatus !== "food" &&
          !form.elements.food_confirmed.checked
        )
          throw Object.assign(new Error(), {
            code: "food_confirmation_required",
          });
        await api(
          form.dataset.id ? "food/update" : "food/create",
          foodData(form),
        );
        await refresh(false);
        go("kitchen");
        render();
        notify(t("saved"));
        break;
      case "preferences":
        if (data.language !== state.preferences.language) {
          recipeResult = null;
          recipeHistoryLoaded = false;
        }
        await api("preferences", data);
        await refresh(false);
        view = state.preferences.default_view;
        render();
        notify(t("saved"));
        break;
      case "reminders":
        await api("preferences", {
          reminders: form.elements.reminders.checked,
          reminder_days: Number(data.reminder_days),
        });
        await refresh();
        notify(t("saved"));
        break;
    }
  } catch (err) {
    if (err.code === "classification_required") form.clearFoodAssessment?.();
    recipeBusy = false;
    error.textContent = errorText(err);
    if (form.dataset.form === "ai-recipes") displayRecipes();
    if (err.code === "agreement_required") notify(errorText(err));
    if (["no_kitchen", "unauthorized", "party_ended", "agreement_required"].includes(err.code))
      await refresh().catch(() => {});
  } finally {
    delete form.dataset.classifyingSubmit;
    submit.disabled =
      form.dataset.form === "food" && form.dataset.foodStatus === "non_food";
  }
});
document.addEventListener("click", async (event) => {
  const b = event.target.closest("[data-action]");
  if (!b || b.disabled) return;
  const a = b.dataset.action;
  b.disabled = true;
  try {
    switch (a) {
      case "retry-legal":
        legalError=null;await loadLegalContent();break;
      case "export-data": {
        const data=await api("account/export");
        const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));
        const link=document.createElement("a");link.href=url;link.download="last-minute-bites-data.json";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);break;
      }
      case "clear-ai-history":
        if (await confirmAction(t("clear_ai_history"),t("clear_ai_history_note"))) {
          await api("account/history/clear",{confirmed:true});recipeSeq++;recipeResult=null;recipeHistoryLoaded=false;photoCandidates=[];notify(t("saved"));
        }break;
      case "clear-device":
        if (await confirmAction(t("clear_device"),t("clear_device_note"))) {
          await api("logout",{});await clearLocalSessionData();
          if ("caches" in window) for (const name of await caches.keys()) if (name.startsWith("lmb-shell-")) await caches.delete(name);
          activeKitchenId=null;contextEpoch++;await refresh(false);go("kitchen");render();
        }break;
      case "manage-owner":
      case "switch-kitchen":
        await api("kitchen/switch", {kitchen_id:Number(b.dataset.id)});
        activeKitchenId = Number(b.dataset.id);
        contextEpoch++;
        switchingKitchen = true;
        await refresh(false);
        switchingKitchen = false;
        go(a === "manage-owner" ? "shared" : "kitchen");
        render();
        break;
      case "party-unshare":
        if (await confirmAction(t("unshare_source"),t("unshare_confirm"))) {
          await api("party/source/remove",{source_id:Number(b.dataset.id),confirmed:true});
          await refresh();
        }
        break;
      case "party-end":
        if (await confirmAction(t("end_party"),t("end_party_confirm"))) {
          await api("party/end",{confirmed:true});
          await refresh();
        }
        break;
      case "enable-push":
      case "disable-push":
      case "test-push":
      case "refresh-push": {
        const scoped = pushApiForUser();
        try {
          if (a === "enable-push") {
            pushState = await LMBPush.enable(scoped);
            notify(t("push_enabled"));
          }
          if (a === "disable-push") {
            await LMBPush.disable(scoped);
            pushState = null;
            notify(t("push_disabled"));
          }
          if (a === "test-push") {
            await LMBPush.test(scoped);
            notify(t("push_test_sent"));
          }
        } finally {
          await loadPushStatus();
        }
        break;
      }
      case "scan-invite":
        await LMBMobile.startScanner();
        break;
      case "install":
        await LMBMobile.install();
        break;
      case "row-used":
      case "row-delete":
      case "row-restore": {
        const food = state.foods.find((f) => f.id === Number(b.dataset.id));
        if (!food) break;
        await manageFoods(
          [food],
          a === "row-used" ? "used" : a === "row-delete" ? "delete" : "restore",
        );
        break;
      }
      case "batch-used":
      case "batch-delete":
        await manageFoods(
          state.foods.filter((f) => selection.has(f.id)),
          a === "batch-used" ? "used" : "delete",
        );
        break;
      case "cooked-recipe": {
        const recipe = recipeResult?.recipes.find(
          (r) => String(r.id) === b.dataset.id,
        );
        if (recipe) await chooseUsedFoods(recipe);
        break;
      }
      case "photo-fill": {
        const item = photoCandidates[Number(b.dataset.index)],
          form = $('[data-form="food"]');
        if (!item || !form) break;
        form.elements.name.value = item.name;
        form.elements.category.value = item.category || "other";
        form.elements.ingredient.value = item.ingredient || "";
        form.elements.name.dispatchEvent(new Event("input", { bubbles: true }));
        form.classifyName(false);
        form.elements.name.focus();
        break;
      }
      case "go":
        go(b.dataset.path);
        break;
      case "language":
        guestLanguage = guestLanguage === "en" ? "zh-Hant" : "en";
        render();
        break;
      case "auth-login":
        authMode = "login";
        render();
        break;
      case "auth-register":
        authMode = "register";
        render();
        break;
      case "view-categories":
        view = "categories";
        render();
        break;
      case "view-first":
        view = "use_first";
        render();
        break;
      case "category":
        search = "";
        go("category/" + b.dataset.category);
        break;
      case "review-overdue":
        inventoryStatus = "overdue";
        search = "";
        go("category/all");
        break;
      case "add":
        foodForm.category = b.dataset.category;
        go("food");
        break;
      case "edit":
        go("food/" + b.dataset.id);
        break;
      case "clear-selection":
        selection.clear();
        storeSelection();
        document.querySelectorAll("[data-select]").forEach((input) => {
          input.checked = false;
        });
        updateDock();
        if (route()[0] === "recipes") render();
        break;
      case "recipe-remove-food":
      case "recipe-add-food": {
        if (recipeBusy) break;
        recipeOptions = readRecipeOptions();
        if (recipeOptions.scope === "all")
          selection = new Set(chosenRecipeFoods().map((f) => f.id));
        const id = Number(b.dataset.id);
        if (a === "recipe-add-food") selection.add(id);
        else selection.delete(id);
        recipeOptions.scope = "selected";
        recipePickerOpen = !!$(".recipe-food-picker")?.open;
        recipeDraft = true;
        storeSelection();
        updateRecipeFoods();
        break;
      }
      case "replace-recipe": {
        if (!(await ensureAI("text"))) break;
        if (
          recipeBusy ||
          !recipeResult ||
          recipeResult.stale ||
          recipeInputsChanged()
        )
          break;
        const uid = state.user.id,
          kid = state.kitchen.id,
          lang = language(),
          id = Number(b.dataset.id);
        const original = recipeResult;
        recipeBusy = true;
        replacingRecipe = id;
        recipeSeq++;
        displayRecipes(route()[1]);
        const generateButton = $('[data-form="ai-recipes"] button.primary');
        if (generateButton) generateButton.disabled = true;
        try {
          const response = await api("recipes/replace", {
            generation_id: original.id,
            recipe_id: id,
          });
          if (
            state.user?.id === uid &&
            state.kitchen?.id === kid &&
            language() === lang
          ) {
            recipeResult = response.generation;
            recipeHistoryLoaded = true;
            notify(t("saved"));
          }
        } catch (error) {
          if (error.code === "generation_stale" && recipeResult === original)
            recipeResult.stale = true;
          throw error;
        } finally {
          recipeBusy = false;
          replacingRecipe = null;
          if (generateButton?.isConnected) generateButton.disabled = false;
          if (route()[0] === "recipes") displayRecipes(route()[1]);
        }
        break;
      }
      case "find-recipes":
        recipeOptions.scope = "selected";
        recipeDraft = true;
        if (selection.size >= 6)
          recipeOptions.count = Math.min(4, Math.ceil(selection.size / 3));
        browse = false;
        go("recipes");
        break;
      case "browse-recipes":
        browse = true;
        displayRecipes();
        break;
      case "recipe-detail":
        go("recipes/" + b.dataset.id);
        break;
      case "reload-recipes":
        loadRecipes(route()[1]);
        break;
      case "retry":
        await refresh();
        break;
      case "accept-invite": {
        const joined = await api("invitation/accept", {
          code: invitePreview.code,
          confirmed: true,
        });
        invitePreview = null;
        activeKitchenId = joined.kitchen_id;
        contextEpoch++;
        switchingKitchen = true;
        await refresh(false);
        go("kitchen");
        render();
        switchingKitchen = false;
        break;
      }
      case "sign-out":
        await api("logout", {});
        await clearLocalSessionData();
        activeKitchenId = null;
        contextEpoch++;
        selection.clear();
        await refresh(false);
        go("kitchen");
        render();
        break;
      case "calculate": {
        const f = b.closest("form"),
          r = await api("date/preview", foodData(f));
        calculation = r.effective_date;
        f.elements.date_confirmed.checked = false;
        $("#calculation-result").textContent =
          t("reference") + ": " + dateText(calculation);
        break;
      }
      case "mark-used":
      case "delete-food": {
        const used = a === "mark-used";
        if (used) {
          const f = b.closest("form");
          const food = state.foods.find(
            (item) => item.id === Number(f.dataset.id),
          );
          if (food) await consumeFoods([food]);
          break;
        }
        if (
          !(await confirmAction(
            t(used ? "mark_used" : "delete"),
            t(used ? "used_confirm" : "delete_confirm"),
          ))
        )
          break;
        const f = b.closest("form");
        await api(used ? "food/used" : "food/delete", {
          id: Number(f.dataset.id),
          version: Number(f.dataset.version),
          confirmed: true,
        });
        await refresh(false);
        go("kitchen");
        render();
        notify(t("saved"));
        break;
      }
      case "reload-record":
        if (await confirmAction(t("reload_record"), t("discard")))
          await refresh();
        break;
      case "invite": {
        if (!(await confirmAction(t("invite_editor"), t(state.kitchen.kind === "party" ? "party_invite_policy" : "invite_policy"))))
          break;
        const r = await api("invitation/replace", {});
        $("#invite-output").innerHTML =
          `<label>${E(t("invite_code"))}<input id="generated-code" value="${E(r.code)}" readonly></label><p>${E(t("until"))}: ${E(new Date(r.expires * 1000).toLocaleString(language()))}</p>${button("copy-invite", t("copy"))}`;
        LMBMobile.drawCode(r.code, $("#invite-output"));
        break;
      }
      case "copy-invite":
        try {
          await navigator.clipboard.writeText($("#generated-code").value);
          notify(t("copied"));
        } catch (_) {
          $("#generated-code").select();
          notify(t("copy_failed"));
        }
        break;
      case "remove-member":
        if (await confirmAction(t("remove"), t("remove_confirm"))) {
          await api("member/remove", {
            user_id: Number(b.dataset.id),
            confirmed: true,
          });
          await refresh();
        }
        break;
      case "leave":
        if (await confirmAction(t("leave"), t("leave_confirm"))) {
          await api("kitchen/leave", { confirmed: true });
          await refresh(false);
          go("kitchen");
          render();
        }
        break;
      case "clear-kitchen": {
        const name = await confirmAction(
          t("clear_kitchen"),
          t("clear_warning"),
          true,
        );
        if (name === false) break;
        await api("kitchen/clear", { confirmed: true, kitchen_name: name });
        await refresh();
        notify(t("saved"));
        break;
      }
    }
  } catch (err) {
    const error = b.closest("form")?.querySelector(".error");
    if (error) error.textContent = errorText(err);
    else notify(errorText(err));
    if (["no_kitchen", "unauthorized", "party_ended", "agreement_required"].includes(err.code))
      await refresh().catch(() => {});
  } finally {
    b.disabled = false;
  }
});
document.addEventListener("change", (e) => {
  const el = e.target;
  const recipeForm = el.closest('[data-form="ai-recipes"]');
  if (recipeForm) {
    recipeForm.dataset.dirty = "true";
    recipeDraft = true;
    recipeOptions = readRecipeOptions();
    if (el?.name === "scope") updateRecipeFoods();
    else if (el.name === "avoid") updateRecipeFoods();
    else if (recipeResult) displayRecipes(route()[1]);
  }
  if (el.closest('[data-form="ai-recipes"]') && (el.name === "mode" || el.name === "pantry_staples"))
    updatePantryUI();
  if (el.matches("[data-select]")) {
    const id = Number(el.dataset.select);
    if (el.checked) selection.add(id);
    else selection.delete(id);
    recipeOptions.scope = "selected";
    recipeDraft = true;
    storeSelection();
    updateDock();
  }
  if (el.matches("[data-show-password]"))
    for (const input of el
      .closest("form")
      .querySelectorAll('input[name*="password"]'))
      input.type = el.checked ? "text" : "password";
  if (el.name === "mode" && el.closest('[data-form="ai-recipes"]'))
    $("#mode-hint").textContent = t("mode_hint_" + el.value);
  if (el.id === "inventory-status") {
    inventoryStatus = el.value;
    $("#food-list").innerHTML = filteredList(route()[1] || "all");
  }
});
document.addEventListener("input", (e) => {
  const recipeForm = e.target.closest('[data-form="ai-recipes"]');
  if (recipeForm && e.target.id !== "recipe-food-search") {
    recipeForm.dataset.dirty = "true";
    recipeDraft = true;
    recipeOptions = readRecipeOptions();
    if (e.target.name === "avoid") updateRecipeFoods();
    else if (recipeResult) displayRecipes(route()[1]);
  }
  if (e.target.id === "recipe-food-search") {
    recipeFoodSearch = e.target.value;
    recipePickerOpen = true;
    document.querySelectorAll("[data-food-search]").forEach((b) => {
      b.hidden = !b.dataset.foodSearch.includes(recipeFoodSearch.toLowerCase());
    });
  }
  if (e.target.id === "food-photo") recognizePhoto(e.target.files?.[0]);
  if (e.target.id === "search") {
    search = e.target.value;
    $("#food-list").innerHTML = filteredList(route()[1] || "all");
  }
  if (e.target.name === "code") {
    invitePreview = null;
    $(".invitation-preview")?.remove();
  }
});
window.addEventListener("hashchange", () => {
  render();
  $("#main")?.focus();
  if ($("#main")) $("#main").scrollTop = 0;
});
let polling = false;
async function poll() {
  if (polling || !state?.user || document.hidden) return;
  polling = true;
  try {
    const p = route()[0] || "kitchen",
      draw =
        !!state.kitchen &&
        ["kitchen", "category"].includes(p) &&
        !document.activeElement?.matches("input,textarea,select") &&
        !$("#confirm").open &&
        !$("#scanner").open &&
        !$("#used-picker").open;
    await refresh(draw);
  } catch (_) {
    offline = true;
    const p = route()[0] || "kitchen";
    if (
      state.kitchen &&
      ["kitchen", "category"].includes(p) &&
      !document.activeElement?.matches("input")
    )
      render();
  } finally {
    polling = false;
  }
}
setInterval(poll, 5000);
window.addEventListener("focus", poll);
refresh().catch((err) => {
  app.innerHTML = `<main id="main"><h1>Last Minute Bites</h1><p role="alert">${E(navigator.onLine ? errorText(err) : t("offline_start"))}</p>${button("retry", t("retry"))}</main>`;
});

function updateDock() {
  const old = $(".selection"),
    html = selectionBar();
  if (old) old.outerHTML = html;
  else if (html) $(".app-dock")?.insertAdjacentHTML("afterbegin", html);
}
async function manageFoods(foods, action) {
  if (!foods.length) return;
  if (action === "used") return consumeFoods(foods);
  if (action === "restore") {
    if (
      !(await confirmAction(
        t("restore"),
        foods
          .map(
            (f) =>
              `${f.name} · ${batchLine(f)}\n${t("restore_amount")}: ${amountText(f.restore_quantity ?? null, f.unit)}`,
          )
          .join("\n"),
      ))
    )
      return;
  }
  if (
    action !== "restore" &&
    !(await confirmAction(
      t(action === "used" ? "mark_used" : "delete"),
      `${foods
        .map((f) => f.name)
        .slice(0, 4)
        .join(
          "、",
        )}\n${t(action === "used" ? "used_confirm" : "delete_confirm")}`,
    ))
  )
    return;
  await api("food/batch", {
    action,
    items: foods.map((f) => ({ id: f.id, version: f.version })),
    confirmed: true,
  });
  await refresh(false);
  render();
  notify(t("saved"));
}
async function chooseUsedFoods(recipe) {
  const ids = new Set(recipe.uses.map((f) => f.food_id));
  const suggested = new Map(
    recipe.uses
      .filter((use) => typeof use.quantity === "number")
      .map((use) => [use.food_id, use]),
  );
  return consumeFoods(
    state.foods.filter((f) => ids.has(f.id) && f.status === "active"),
    suggested,
  );
}
async function consumeFoods(foods, suggested = new Map()) {
  if (!foods.length) {
    notify(t("none"));
    return;
  }
  const dialog = $("#used-picker"),
    form = $("form", dialog);
  if (dialog.open) return;
  form.noValidate = true;
  $("#used-title").textContent = t("usage_title");
  $("#used-note").textContent = t(
    suggested.size ? "usage_recipe_hint" : "usage_hint",
  );
  const duplicates = new Map();
  for (const f of foods)
    duplicates.set(f.name, (duplicates.get(f.name) || 0) + 1);
  $("#used-foods").innerHTML = foods
    .map((f) => {
      const known = typeof f.quantity === "number" && f.quantity > 0;
      const recommendation = suggested.get(f.id);
      const preset =
        known &&
        recommendation?.unit === f.unit &&
        recommendation.quantity <= f.quantity &&
        f.version === recipeResult?.versions[f.id]
          ? recommendation.quantity
          : "";
      const detail = [
        state.kitchen?.kind === "party" ? f.kitchen_name : "",
        typeof f.quantity === "number"
          ? `${t("left_short")} ${amountText(f.quantity, f.unit)}`
          : t("quantity_unknown"),
        f.effective_date ? dateText(f.effective_date) : "",
        duplicates.get(f.name) > 1
          ? f.purchased_date
            ? `${t("bought_short")} ${dateText(f.purchased_date)}`
            : `${t("batch")} #${f.id}`
          : "",
      ]
        .filter(Boolean)
        .join(" · ");
      return `<section class="consume-item" data-id="${f.id}"><div class="consume-main"><div class="consume-info"><div class="consume-name"><strong>${E(f.name)}</strong><button type="button" class="consume-reset" data-consume-reset aria-label="${E(t("skip_food") + ": " + f.name)}" title="${E(t("skip_food"))}">×</button></div><small>${E(detail)}</small></div><div class="consume-control"><label class="consume-input-label"><span class="sr-only">${E(f.name + ": " + t("consumed_amount"))}</span><input type="number" data-consume-amount min="0" max="${known ? f.quantity : 1000000}" step="0.001" inputmode="decimal" placeholder="0" value="${preset}"></label><span class="consume-unit">${E(known ? t("unit_" + f.unit) : t("unit_" + (f.unit || "pcs")))}</span><button type="button" data-consume-all>${E(t("all_short"))}</button></div></div>${known ? "" : `<details class="consume-setup"><summary>${E(t("set_stock_here"))}</summary><div class="consume-before-fields"><label>${E(t("stock_before"))}<input type="number" data-consume-before min="0.001" max="1000000" step="0.001" inputmode="decimal" placeholder="${E(t("stock_before_example"))}"></label><label>${E(t("unit"))}<select data-consume-unit>${quantityUnits.map((unit) => option(unit, t("unit_" + unit), f.unit || "pcs")).join("")}</select></label></div></details>`}<small class="consume-remainder" aria-live="polite"></small></section>`;
    })
    .join("");
  $("#used-cancel").textContent = t("cancel");
  $("#used-error").textContent = "";
  let busy = false;
  const available = (row, f) =>
    typeof f.quantity === "number"
      ? f.quantity
      : $("[data-consume-before]", row)?.value
        ? Number($("[data-consume-before]", row).value)
        : null;
  const active = (row) =>
    row.dataset.all === "true" ||
    $("[data-consume-amount]", row).validity.badInput ||
    ($("[data-consume-amount]", row).value !== "" &&
      Number($("[data-consume-amount]", row).value) !== 0);
  const update = (event) => {
    if (event?.target.matches("[data-consume-amount]"))
      event.target.closest(".consume-item").dataset.all = "false";
    let count = 0;
    for (const row of dialog.querySelectorAll(".consume-item")) {
      const f = foods.find((f) => f.id === Number(row.dataset.id)),
        amount = $("[data-consume-amount]", row),
        before = $("[data-consume-before]", row),
        all = row.dataset.all === "true",
        stock = available(row, f),
        unit = $("[data-consume-unit]", row)?.value || f.unit || "pcs";
      if (active(row)) count++;
      amount.disabled = all && !(typeof stock === "number" && stock > 0);
      if (all && typeof stock === "number" && stock > 0)
        amount.value = String(stock);
      amount.placeholder = all ? t("all_short") : "0";
      amount.max =
        typeof stock === "number" && stock > 0 ? String(stock) : "1000000";
      $(".consume-unit", row).textContent = t("unit_" + unit);
      $("[data-consume-all]", row).setAttribute(
        "aria-pressed",
        String(all || (stock > 0 && Number(amount.value) === stock)),
      );
      $("[data-consume-reset]", row).hidden = !active(row);
      if (before) {
        before.required = active(row) && !all;
        if (active(row) && !all && stock === null)
          $(".consume-setup", row).open = true;
      }
      const remainder = $(".consume-remainder", row),
        left =
          typeof stock === "number"
            ? Math.round(
                (stock - (all ? stock : Number(amount.value || 0))) * 1000,
              ) / 1000
            : null;
      remainder.textContent = !active(row)
        ? ""
        : all && stock === null
          ? t("used")
          : left === null
            ? t("enter_stock_before")
            : left < 0
              ? t("insufficient_quantity")
              : `${t("left_short")} ${amountText(left, unit)}`;
    }
    const confirmText = count
      ? `${t("save_usage")} (${count})`
      : t("save_usage");
    // Safari can cancel a click if blur/change replaces the button's text node.
    if ($("#used-confirm").textContent !== confirmText)
      $("#used-confirm").textContent = confirmText;
  };
  const clickRow = (event) => {
    const allButton = event.target.closest("[data-consume-all]"),
      reset = event.target.closest("[data-consume-reset]");
    if ((!allButton && !reset) || busy) return;
    const row = event.target.closest(".consume-item"),
      f = foods.find((f) => f.id === Number(row.dataset.id)),
      amount = $("[data-consume-amount]", row),
      stock = available(row, f);
    if (reset) {
      row.dataset.all = "false";
      amount.value = "";
    } else {
      row.dataset.all = "true";
      amount.value = stock > 0 ? String(stock) : "";
      const before = $("[data-consume-before]", row);
      if (before && !before.checkValidity()) before.value = "";
    }
    update();
  };
  const submit = async (event) => {
    if (event.submitter?.value !== "confirm") return;
    event.preventDefault();
    if (busy) return;
    const picked = [...dialog.querySelectorAll(".consume-item")].filter(active),
      error = $("#used-error");
    error.textContent = "";
    if (!picked.length) {
      error.textContent = t("usage_empty");
      return;
    }
    const items = [];
    for (const row of picked) {
      const f = foods.find((f) => f.id === Number(row.dataset.id)),
        amount = $("[data-consume-amount]", row),
        before = $("[data-consume-before]", row),
        all = row.dataset.all === "true";
      if (!all && (!amount.reportValidity() || Number(amount.value) <= 0))
        return;
      if (
        before &&
        ((before.value && !before.reportValidity()) ||
          (!all && !before.reportValidity()))
      )
        return;
      const item = {
        id: f.id,
        version: f.version,
        quantity: Number(amount.value || 0),
        all,
      };
      if (before?.value) {
        item.initial_quantity = Number(before.value);
        item.unit = $("[data-consume-unit]", row).value;
      }
      items.push(item);
    }
    busy = true;
    $("#used-confirm").disabled = true;
    $("#used-cancel").disabled = true;
    try {
      await api("food/consume", { items, confirmed: true });
      await refresh(false);
      dialog.close("saved");
      render();
      notify(t("saved"));
    } catch (err) {
      error.textContent = ["conflict", "quantity_already_set"].includes(
        err.code,
      )
        ? t("consumption_conflict")
        : errorText(err);
      if (["no_kitchen", "unauthorized", "party_ended", "agreement_required"].includes(err.code))
        await refresh(false).catch(() => {});
    } finally {
      busy = false;
      $("#used-confirm").disabled = false;
      $("#used-cancel").disabled = false;
    }
  };
  const preventCancel = (event) => {
    if (busy) event.preventDefault();
  };
  form.addEventListener("submit", submit);
  form.addEventListener("input", update);
  form.addEventListener("change", update);
  form.addEventListener("click", clickRow);
  dialog.addEventListener("cancel", preventCancel);
  update();
  dialog.returnValue = "cancel";
  dialog.showModal();
  try {
    await new Promise((resolve) =>
      dialog.addEventListener("close", resolve, { once: true }),
    );
  } finally {
    form.removeEventListener("submit", submit);
    form.removeEventListener("input", update);
    form.removeEventListener("change", update);
    form.removeEventListener("click", clickRow);
    dialog.removeEventListener("cancel", preventCancel);
  }
}
async function recognizePhoto(file) {
  if (!file || photoBusy) return;
  const output = $("#photo-results"),
    error = $("#photo-error"),
    input = $("#food-photo");
  if (file.size > 12 * 1024 * 1024) {
    error.textContent = t("photo_large");
    return;
  }
  const uid = state.user?.id,
    kid = state.kitchen?.id;
  photoBusy = true;
  input.disabled = true;
  error.textContent = "";
  output.innerHTML = `<p role="status">${E(t("photo_busy"))}</p>`;
  let objectUrl;
  try {
    if (!(await ensureAI("photo"))) { output.innerHTML=""; return; }
    objectUrl = URL.createObjectURL(file);
    const image = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = objectUrl;
    });
    const ratio = Math.min(
        1,
        1024 / Math.max(image.naturalWidth, image.naturalHeight),
      ),
      canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const context = canvas.getContext("2d");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const result = await api("food/recognize", {
      image: canvas.toDataURL("image/jpeg", 0.78),
    });
    if (state.user?.id !== uid || state.kitchen?.id !== kid) return;
    photoCandidates = result.foods;
    if ($("#photo-results"))
      $("#photo-results").innerHTML = photoCandidates.length
        ? photoCandidateHTML()
        : `<p>${E(t("photo_empty"))}</p>`;
  } catch (err) {
    if ($("#photo-error"))
      $("#photo-error").textContent = err?.code
        ? t(
            ["ai_unavailable", "ai_invalid"].includes(err.code)
              ? "photo_failed"
              : err.code,
          )
        : t("photo_failed");
    if ($("#photo-results")) $("#photo-results").innerHTML = "";
  } finally {
    photoBusy = false;
    input.disabled = false;
    input.value = "";
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

function fitViewport() {
  const vv = window.visualViewport;
  const unzoomed = vv && Math.abs(vv.scale - 1) < 0.01;
  const height = unzoomed ? Math.round(vv.height) : window.innerHeight;
  // Signed-in screens follow Safari's visual viewport, including its pan.
  // Auth keeps native document scrolling so its keyboard cannot clip a form.
  app.style.height = state?.user && unzoomed ? height + "px" : "";
  document.documentElement.style.setProperty(
    "--visible-height",
    unzoomed ? height + "px" : "100dvh",
  );
  document.documentElement.style.setProperty(
    "--visible-top",
    unzoomed ? Math.round(vv.offsetTop) + "px" : "0px",
  );
  const active = document.activeElement;
  const editing = active?.matches(
    "input:not([type=checkbox]):not([type=radio]),textarea,select",
  );
  document.documentElement.classList.toggle(
    "keyboard-open",
    !!(
      state?.user &&
      editing &&
      (height < document.documentElement.clientHeight - 120 || height <= 480)
    ),
  );
}
function revealFocusedField() {
  if (!state?.user) return;
  const field = document.activeElement;
  if (!field?.matches("input,textarea,select")) return;
  const scroller =
    field.closest("#used-foods") || field.closest("dialog") || $("#main");
  if (!scroller?.contains(field)) return;
  const bounds = scroller.getBoundingClientRect();
  const rect = field.getBoundingClientRect();
  const inset = Math.min(8, Math.max(0, (bounds.height - rect.height) / 2));
  const top = bounds.top + inset, bottom = bounds.bottom - inset;
  // Scroll the field's own container; never move the document or recreate inputs.
  if (rect.height > bottom - top) {
    if (rect.top < top || rect.top >= bottom) scroller.scrollTop += rect.top - top;
  } else if (rect.bottom > bottom) scroller.scrollTop += rect.bottom - bottom;
  else if (rect.top < top) scroller.scrollTop += rect.top - top;
}
function syncInputViewport() {
  fitViewport();
  requestAnimationFrame(revealFocusedField);
}
window.visualViewport?.addEventListener("resize", syncInputViewport);
window.visualViewport?.addEventListener("scroll", fitViewport);
window.addEventListener("resize", syncInputViewport);
document.addEventListener("focusin", syncInputViewport);
document.addEventListener("focusout", () =>
  requestAnimationFrame(syncInputViewport),
);
fitViewport();
