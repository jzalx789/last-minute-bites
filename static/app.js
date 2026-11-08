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
  join_kitchen: ["Join a kitchen", "加入冰箱"],
  setup_intro: [
    "Start your own kitchen, or join someone you cook with. Each account can belong to one kitchen.",
    "建立自己的冰箱，或加入親友的冰箱。每個帳戶只可加入一個冰箱。",
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
  enable_reminders: ["Show in-app date reminders", "顯示 App 內日期提醒"],
  remind_before: ["Remind before date", "日期前提醒"],
  reminder_note: [
    "Reminders appear only while using this app. No email, push or background notifications. Unknown dates never trigger reminders. Sorting and use-by restrictions always remain active.",
    "提醒只在使用本 App 時顯示，沒有電郵、推播或背景通知。未知日期不會提醒。優先排序與食用期限限制始終生效。",
  ],
  due: ["Date reminders", "日期提醒"],
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
  already_member: ["You already belong to a kitchen.", "你已加入一個冰箱。"],
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
  recipe_mode: ["What is your goal?", "這次想做甚麼？"],
  mode_use_up: ["Use up stock · no shopping", "清庫存・不另外採購"],
  mode_plan: ["Design a meal · shopping allowed", "設計一餐・可以添購"],
  mode_hint_use_up: [
    "Prioritise food approaching expiry, using stock only. Small stocks may only make sides or snacks.",
    "優先使用快到期食材，只用現有庫存；份量少時可能只夠小菜。",
  ],
  mode_hint_plan: [
    "Plan for your group and preferences. Extra ingredients appear in the shopping list.",
    "按人數與偏好設計菜式，缺少食材會列入採購清單。",
  ],
  shopping_list: ["Shopping / preparation list", "待採購／準備清單"],
  shopping_note: [
    "Amounts are listed per dish. Add purchases to your inventory before recording their consumption.",
    "以下列出各菜式所需份量；買好後請先加入庫存，再記錄消耗。",
  ],
  no_shopping: [
    "Uses stock only · no extra purchases",
    "只用現有庫存・不用添購",
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
  dish_count: ["Number of dishes", "菜式數目"],
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
  mode: "use_up",
  servings: 2,
  portion: "standard",
  max_minutes: null,
  avoid: "",
  use_all: true,
  exact_count: true,
});
let recipeOptions = defaultRecipeOptions();
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
async function api(path, data) {
  let res, result;
  try {
    res = await fetch("/api/" + path, {
      method: data === undefined ? "GET" : "POST",
      headers:
        data === undefined
          ? {}
          : {
              "Content-Type": "application/json",
              "X-CSRF-Token": state?.csrf || "",
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
        "lmb-selection-" + state.user.id,
        JSON.stringify([...selection]),
      );
    } catch (_) {}
}
async function refresh(draw = true) {
  const next = await api("state"),
    uid = next.user?.id ?? null,
    kid = next.kitchen?.id ?? null;
  if (uid !== lastUser) {
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
          JSON.parse(sessionStorage.getItem("lmb-selection-" + uid) || "[]"),
        );
      } catch (_) {}
    view = null;
    search = "";
  }
  const lost = lastUser === uid && lastKitchen && lastKitchen !== kid;
  if (lost) {
    recipeDraft = false;
    recipeOptions = defaultRecipeOptions();
    if ($("#confirm").open) $("#confirm").close("cancel");
    if ($("#used-picker").open) $("#used-picker").close("cancel");
    selection.clear();
    recipeResult = null;
    recipeHistoryLoaded = false;
    photoCandidates = [];
    recipeSeq++;
    notify(t("lost_access"));
    location.hash = "kitchen";
  }
  lastUser = uid;
  lastKitchen = kid;
  state = next;
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
  if (draw || lost) render(!lost);
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
    !selection.size ||
    !["kitchen", "category"].includes(route()[0] || "kitchen")
  )
    return "";
  return `<aside class="selection" aria-label="${E(t("selected"))}"><div class="selection-summary"><strong id="selected-count">${selection.size}</strong> ${E(t("selected"))}${button("clear-selection", t("clear"), "quiet")}</div><div class="selection-actions">${button("batch-used", t("consume"))}${button("batch-delete", t("remove_short"), "danger")}${button("find-recipes", t("find"), "primary")}</div></aside>`;
}
function render(keepScroll = false) {
  if (!state) return;
  const scrollTop = keepScroll ? $("#main")?.scrollTop || 0 : 0;
  document.documentElement.lang = language();
  document.documentElement.classList.toggle(
    "large",
    state.preferences?.text_size === "large",
  );
  $(".skip").textContent = t("skip");
  const [page = "kitchen", arg] = route();
  let content;
  if (!state.user) content = auth();
  else if (
    !state.kitchen &&
    !["settings", "preferences", "help"].includes(page)
  )
    content = setup();
  else if (page === "food") content = foodForm(arg);
  else if (page === "category") content = categoryPage(arg || "all");
  else if (page === "recipes") content = recipesPage(arg);
  else if (page === "settings") content = settings();
  else if (page === "shared") content = shared();
  else if (page === "preferences") content = preferences();
  else if (page === "reminders") content = reminders();
  else if (page === "help") content = help();
  else content = kitchen();
  app.innerHTML = `<header class="topbar"><button class="brand" data-action="go" data-path="kitchen">${icon("leaf")}<span>Last Minute <b>Bites</b></span></button><div class="header-actions">${state.user ? button("go", t("settings"), "", 'data-path="settings"') : button("language", language() === "en" ? "繁體中文" : "English")}</div></header><main id="main" tabindex="-1">${offline ? `<p class="error">${E(t("offline"))} ${button("retry", t("retry"))}</p>` : ""}${content}</main>${state.user && state.kitchen ? `<footer class="app-dock">${selectionBar()}<nav class="bottom-nav" aria-label="${E(t("kitchen"))}"><button data-action="go" data-path="kitchen" ${page === "kitchen" ? 'aria-current="page"' : ""}>${icon("home")}${E(t("kitchen"))}</button><button data-action="go" data-path="category/all" ${page === "category" ? 'aria-current="page"' : ""}>${icon("bag")}${E(t("inventory"))}</button><button data-action="go" data-path="recipes" ${page === "recipes" ? 'aria-current="page"' : ""}>${icon("book")}${E(t("recipes"))}</button></nav></footer>` : ""}`;
  if (page === "food") bindFoodForm();
  if (page === "recipes") displayRecipes(arg);
  if ($("#main")) $("#main").scrollTop = scrollTop;
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
  return `<div class="auth-layout"><section class="auth-story"><div class="little-leaf">${icon("leaf")}</div><h1>${E(t("welcome"))}</h1><p>${E(t("intro"))}</p><div class="mini-fridge" aria-hidden="true"><span></span><span></span></div></section><section class="auth-panel"><div class="switcher">${button("auth-login", t("sign_in"), authMode === "login" ? "chosen" : "")}${button("auth-register", t("register"), authMode === "register" ? "chosen" : "")}</div><h2>${E(t(authMode === "login" ? "sign_in" : "register"))}</h2><p>${E(t("auth_hint"))}</p><form data-form="auth">${field("email", t("email"), "", "email", 'required maxlength="254" autocomplete="username"')}${field("password", t("password"), "", "password", `required minlength="10" maxlength="128" autocomplete="${authMode === "login" ? "current-password" : "new-password"}"`)}${authMode === "register" ? field("confirm_password", t("confirm_password"), "", "password", 'required minlength="10" maxlength="128" autocomplete="new-password"') : ""}<p class="hint">${E(t("password_hint"))}</p><label class="check"><input type="checkbox" data-show-password>${E(t("show_password"))}</label>${formError()}<button class="primary full">${E(t(authMode === "login" ? "sign_in" : "register"))}</button></form></section></div>`;
}
function setup() {
  return `<section class="page-heading"><h1>${E(t("welcome_kitchen"))}</h1><p>${E(t("setup_intro"))}</p><details><summary>${E(t("help"))}</summary><p>${E(t("help_steps"))}</p></details></section><div class="two-column"><section class="panel"><h2>${E(t("create_kitchen"))}</h2><form data-form="create-kitchen">${field("name", t("kitchen_name"), "", "text", 'required maxlength="80"')}${formError()}<button class="primary">${E(t("create_kitchen"))}</button></form></section><section class="panel"><h2>${E(t("join_kitchen"))}</h2><form data-form="preview-invite">${field("code", t("invite_code"), invitePreview?.code || "", "text", 'required maxlength="100" autocomplete="off"')}${formError()}<div class="actions"><button>${E(t("preview_invite"))}</button>${button("scan-invite", t("scan_invite"))}</div></form>${invitePreview ? `<div class="invitation-preview"><h3>${E(invitePreview.name)}</h3><p>${E(t("preview_note"))}</p>${button("accept-invite", t("join_confirm"), "primary")}</div>` : ""}</section></div>${button("sign-out", t("sign_out"), "quiet")}`;
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
    ? `<aside class="reminder-banner"><strong>${E(t("due"))}</strong><span>${foods
        .slice(0, 3)
        .map(
          (f) =>
            `${E(f.name)}: ${E(t(f.date_source === "personal" ? "personal_reminder" : f.date_kind))} ${E(dateText(f.effective_date))}`,
        )
        .join("; ")}</span><small>${E(t("due_hint"))}</small></aside>`
    : "";
}
function kitchen() {
  return `<section class="page-heading kitchen-heading"><div><p class="kitchen-label">${E(state.kitchen.name)} <span class="role">${E(t(state.kitchen.role))}</span></p><h1>${E(t("kitchen_intro"))}</h1></div>${button("add", t("add"), "primary")}</section><div class="kitchen-toolbar"><div class="switcher">${button("view-categories", t("categories"), view === "categories" ? "chosen" : "")}${button("view-first", t("use_first"), view === "use_first" ? "chosen" : "")}</div>${button("category", t("all"), "quiet", 'data-category="all"')}</div>${reminderBanner()}${
    view === "categories"
      ? `<div class="kitchen-illustration"><section class="fridge" aria-label="${E(t("fridge"))}"><div class="fridge-top"><span>Last Minute Bites</span><span class="fridge-hinge"></span></div><div class="fridge-shelves">${categoryButton("produce", "leaf")}${categoryButton("dairy", "egg")}${categoryButton("protein", "fish")}${categoryButton("cooked", "bowl")}</div><div class="freezer-drawer">${categoryButton("freezer", "snow")}</div></section><aside class="pantry-rack"><div class="rack-top">${icon("jar")}${icon("jar")}${icon("jar")}</div>${categoryButton("condiments", "jar", "rack-category")}${categoryButton("dryother", "bag", "dry-category")}</aside></div>`
      : foodList(
          state.foods.filter((f) => f.status === "active"),
          "use_first",
        )
  }`;
}
function categoryPage(key) {
  return `${back()}<section class="page-heading kitchen-heading"><h1>${E(key === "all" ? t("inventory") : t(key))}</h1>${button("add", t("add"), "primary", `data-category="${E(key)}"`)}</section><div class="list-tools"><label class="search-label"><span>${E(t("search"))}</span><input type="search" id="search" value="${E(search)}"></label><label>${E(t("inventory"))}<select id="inventory-status"><option value="active" ${inventoryStatus === "active" ? "selected" : ""}>${E(t("active_food"))}</option><option value="used" ${inventoryStatus === "used" ? "selected" : ""}>${E(t("used_food"))}</option></select></label></div><div id="food-list">${filteredList(key)}</div>`;
}
function filteredList(key) {
  return foodList(
    state.foods.filter(
      (f) =>
        f.status === inventoryStatus &&
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
    return `<section class="empty">${icon("leaf")}<h2>${E(t(search ? "no_results" : "empty"))}</h2><p>${E(t("empty_hint"))}</p>${button("add", t("add"), "primary", `data-category="${E(key)}"`)}</section>`;
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
  return `${t("batch")} #${food.id} · ${food.purchased_date ? t("purchased_date") + " " + dateText(food.purchased_date) : t("purchase_unknown")}`;
}
function foodRow(f) {
  return `<article class="food-row" data-food-id="${f.id}"><label class="food-select"><input type="checkbox" data-select="${f.id}" ${selection.has(f.id) ? "checked" : ""} ${f.eligible ? "" : "disabled"} aria-label="${E(t("selected") + " " + f.name)}"><span><strong>${E(f.name)}</strong><span class="stock-quantity">${E(t("remaining"))}: ${E(amountText(f.quantity, f.unit))}</span>${f.food_warning ? `<small class="warning">${E(t("not_food"))}</small>` : ""}<small class="batch-label">${E(batchLine(f))}</small><small class="${!f.eligible && f.status !== "used" ? "warning" : ""}">${E(dateLine(f))}</small><small>${E(t(f.category))} · ${E(t(f.location))}</small></span></label><div class="food-actions">${button("edit", t("edit"), "quiet", `data-id="${f.id}"`)}${f.status === "used" ? button("row-restore", t("restore"), "", 'data-id="' + f.id + '"') : f.food_warning ? "" : button("row-used", t("consume"), "", 'data-id="' + f.id + '"')}${button("row-delete", t("remove_short"), "danger", `data-id="${f.id}"`)}</div></article>`;
}
function foodForm(id) {
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
            ? assessment.source === "unavailable"
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
    (k) => k !== "exact_count" && (options[k] ?? "") !== (saved[k] ?? ""),
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
    `data-id="${r.id}" ${recipeBusy || recipeResult?.stale || recipeInputsChanged() ? "disabled" : ""}`,
  );
}
function recipesPage(id) {
  if (id)
    return `<div class="narrow"><div id="recipe-content" aria-live="polite"></div></div>`;
  const selected = selection.size;
  if (!selected && recipeOptions.scope === "selected" && !recipeDraft)
    recipeOptions.scope = "all";
  return `<section class="page-heading"><h1>${E(t("recipe_title"))}</h1></section>
  <form data-form="ai-recipes" class="recipe-controls">
    ${recipeFoodsHTML()}
    <label>${E(t("recipe_mode"))}<select name="mode">${["use_up", "plan"].map((v) => option(v, t("mode_" + v), recipeOptions.mode)).join("")}</select></label>
    <p id="mode-hint" class="hint">${E(t("mode_hint_" + recipeOptions.mode))}</p>
    <div class="two-fields recipe-dish-fields"><label>${E(t("dish_style"))}<select name="style">${["auto", "mixed", "cold", "soup", "main", "meat", "vegetable"].map((v) => option(v, t("style_" + v), recipeOptions.style)).join("")}</select></label><label>${E(t("dish_count"))}<select name="count">${[1, 2, 3, 4].map((v) => option(v, String(v), recipeOptions.count)).join("")}</select></label></div>
    <div class="two-fields"><label>${E(t("diners"))}<input name="servings" type="number" min="1" max="12" step="1" inputmode="numeric" value="${recipeOptions.servings}" required></label><label>${E(t("per_person_portion"))}<select name="portion">${["light", "standard", "hearty"].map((v) => option(v, t("portion_" + v), recipeOptions.portion)).join("")}</select></label></div>
    <label>${E(t("scope"))}<select name="scope"><option value="selected" ${recipeOptions.scope === "selected" ? "selected" : ""}>${E(t("scope_selected"))} (${selected})</option><option value="all" ${recipeOptions.scope === "all" ? "selected" : ""}>${E(t("scope_all"))}</option></select></label>
    <label class="check"><input type="checkbox" name="use_all" ${recipeOptions.use_all ? "checked" : ""}>${E(t("recipe_use_all"))}</label>
    <details class="recipe-preferences"><summary>${E(t("more_preferences"))}</summary>
      <label>${E(t("max_minutes"))}<select name="max_minutes">${option("", t("any_time"), recipeOptions.max_minutes ?? "")}${[15, 30, 45, 60].map((v) => option(v, `${v} ${t("minutes")}`, recipeOptions.max_minutes)).join("")}</select></label>
      <label>${E(t("avoid"))}<input name="avoid" value="${E(recipeOptions.avoid)}" maxlength="120" placeholder="${E(t("avoid_hint"))}"></label>
      <label>${E(t("preference"))}<input name="preference" value="${E(recipeOptions.preference)}" maxlength="120" placeholder="${E(t("preference_hint"))}"></label>
    </details>
    ${formError()}<button class="primary full" ${recipeBusy ? "disabled" : ""}>${E(t(recipeBusy ? "generating" : recipeResult ? "regenerate" : "generate"))}</button>
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
  if (!items.length) return "";
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
        mode: saved.mode || "plan",
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
    root.innerHTML = `${back("recipes")}${status}<p class="recipe-source">${E(recipeSummary(recipeResult))}</p>${recipeResult.stale ? `<p class="warning">${E(t("generation_stale"))}</p>` : ""}<article class="recipe-detail"><span class="dish-tag">${E(t("recipe_dish"))} ${r.id} · ${E(t("style_" + r.kind))}</span><h2>${E(r.title)}</h2><p>${r.minutes} ${E(t("minutes"))} · ${r.servings} ${E(t("servings"))}</p>${r.uses.length ? `<h3>${E(t("used_ingredients"))}</h3><ul>${r.uses.map((use) => `<li>${E(use.name)} <span>${E(use.amount)}</span>${typeof use.quantity === "number" ? `<small class="recipe-stock">${E(t("suggested_amount"))}: ${E(amountText(use.quantity, use.unit))}</small>` : ""}<small class="recipe-stock">${E(t("remaining"))}: ${E(amountText(state.foods.find((f) => f.id === use.food_id)?.quantity, use.unit))} · ${E(batchLine({ id: use.food_id, purchased_date: use.purchased_date }))}</small></li>`).join("")}</ul>` : ""}${r.additional.length ? `<h3>${E(t("extra_ingredients"))}</h3><ul>${r.additional.map((item) => `<li>${E(item.name)} ${E(item.amount)}</li>`).join("")}</ul>` : ""}<h3>${E(t("steps"))}</h3><ol>${r.steps.map((step) => `<li>${E(step)}</li>`).join("")}</ol>${recipeResult.options?.mode !== "use_up" && r.pairing ? `<h3>${E(t("pairing"))}</h3><p>${E(r.pairing)}</p>` : ""}${r.notes ? `<p class="hint">${E(r.notes)}</p>` : ""}<p class="hint">${E(t("ai_note"))}</p>${recipeSwapButton(r)}${r.uses.length ? button("cooked-recipe", t("cooked"), "primary full", `data-id="${r.id}"`) : `<p class="hint">${E(t("shopping_note"))}</p>`}</article>${shoppingHTML({ ...recipeResult, recipes: [r] })}`;
    return;
  }
  root.innerHTML = `${status}<div class="recipe-source">${E(t("ai_provider"))}<br>${E(recipeSummary(recipeResult))}</div>${recipeResult.stale ? `<p class="warning">${E(t("generation_stale"))}</p>` : ""}<div class="recipe-grid">${recipes.map((r) => `<article class="recipe-card"><div class="recipe-art">${icon(r.kind === "soup" ? "bowl" : r.kind === "meat" ? "fish" : r.kind === "main" ? "bowl" : "leaf")}</div><div class="recipe-copy"><span class="dish-tag">${E(t("recipe_dish"))} ${r.id} · ${E(t("style_" + r.kind))}</span><h2>${E(r.title)}</h2><p>${r.minutes} ${E(t("minutes"))} · ${r.servings} ${E(t("servings"))}</p><p class="recipe-used">${r.uses.map((f) => E(f.name) + (typeof f.quantity === "number" ? " · " + E(amountText(f.quantity, f.unit)) : "")).join(" / ")}</p>${recipeResult.options?.mode !== "use_up" && r.pairing ? `<p class="hint">${E(r.pairing)}</p>` : ""}<div class="actions">${button("recipe-detail", t("details"), "primary", `data-id="${r.id}"`)}${recipeSwapButton(r)}${r.uses.length ? button("cooked-recipe", t("cooked"), "", `data-id="${r.id}"`) : ""}</div></div></article>`).join("")}</div>${shoppingHTML(recipeResult)}<p class="hint">${E(t("ai_note"))}</p>`;
}

const settingsLink = (path, key) =>
  `<button class="settings-link" data-action="go" data-path="${path}"><span>${E(t(key))}</span><span aria-hidden="true">›</span></button>`;
function settings() {
  return `<div class="narrow">${back()}<h1>${E(t("settings"))}</h1>${state.kitchen ? `<h2>${E(t("kitchen"))}</h2><p>${E(state.kitchen.name)} · ${E(t(state.kitchen.role))}</p>${settingsLink("shared", "shared")}` : ""}<h2>${E(t("personal"))}</h2>${settingsLink("preferences", "preferences")}${state.kitchen ? settingsLink("reminders", "reminders") : ""}<h2>${E(t("help"))}</h2>${settingsLink("help", "help")}${state.web_app ? "" : button("install", t("install"), "settings-link")}<p class="hint" id="install-guide" hidden>${E(t("install_note"))}</p>${state.kitchen?.role === "owner" ? `<h2>${E(t("kitchen_data"))}</h2>${button("clear-kitchen", t("clear_kitchen"), "danger full")}` : ""}<hr><p class="hint">${E(t("signout_note"))}</p>${button("sign-out", t("sign_out"), "full")}</div>`;
}
function shared() {
  return `<div class="narrow">${back("settings")}<h1>${E(t("shared"))}</h1><h2>${E(state.kitchen.name)}</h2><h3>${E(t("members"))}</h3><ul class="member-list">${state.members.map((m) => `<li><span>${E(m.email)}<small>${E(t(m.role))}</small></span>${state.kitchen.role === "owner" && m.role === "editor" ? button("remove-member", t("remove"), "danger", `data-id="${m.id}"`) : ""}</li>`).join("")}</ul>${state.kitchen.role === "owner" ? `<h3>${E(t("invite_editor"))}</h3><p>${E(t("invite_policy"))}</p>${button("invite", t("invite_editor"), "primary")}<div id="invite-output" aria-live="polite"></div>` : `<p>${E(t("preview_note"))}</p>${button("leave", t("leave"), "danger")}`}</div>`;
}
function preferences() {
  const p = state.preferences;
  return `<div class="narrow">${back("settings")}<h1>${E(t("preferences"))}</h1><form data-form="preferences"><label>${E(t("language"))}<select name="language">${option("en", "English", p.language)}${option("zh-Hant", "繁體中文", p.language)}</select></label>${select("text_size", t("text_size"), ["standard", "large"], p.text_size)}${select("default_view", t("default_view"), ["categories", "use_first"], p.default_view)}${select("date_format", t("date_format"), ["iso", "dmy", "mdy"], p.date_format)}<p class="hint">${E(t("timezone"))}: ${E(p.timezone)}</p>${formError()}<button class="primary">${E(t("save"))}</button></form></div>`;
}
function reminders() {
  const p = state.preferences;
  return `<div class="narrow">${back("settings")}<h1>${E(t("reminders"))}</h1><p>${E(t("reminder_note"))}</p><form data-form="reminders"><label class="check"><input type="checkbox" name="reminders" ${p.reminders ? "checked" : ""}>${E(t("enable_reminders"))}</label><label>${E(t("remind_before"))}<select name="reminder_days">${[1, 3, 7].map((d) => option(d, `${d} ${t("days")}`, p.reminder_days)).join("")}</select></label>${formError()}<button class="primary">${E(t("save"))}</button></form></div>`;
}
function help() {
  return `<div class="narrow">${back("settings")}<h1>${E(t("help"))}</h1><p>${E(t("help_text"))}</p><h2>Last Minute Bites 0.9</h2><p>${E(t("limitations"))}</p><p>${E(t("note_hint"))}</p></div>`;
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
      case "ai-recipes": {
        recipeOptions = readRecipeOptions();
        recipeDraft = true;
        if (
          recipeOptions.scope === "selected" &&
          !selection.size &&
          recipeOptions.mode === "use_up"
        )
          throw { code: "recipe_empty_choice" };
        recipeSeq++;
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
            state.user?.id === uid &&
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
        });
        await refresh(false);
        go("kitchen");
        render();
        break;
      case "create-kitchen":
        await api("kitchen/create", data);
        await refresh(false);
        go("kitchen");
        render();
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
    if (["no_kitchen", "unauthorized"].includes(err.code))
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
      case "accept-invite":
        await api("invitation/accept", {
          code: invitePreview.code,
          confirmed: true,
        });
        invitePreview = null;
        await refresh(false);
        go("kitchen");
        render();
        break;
      case "sign-out":
        await api("logout", {});
        selection.clear();
        storeSelection();
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
        if (!(await confirmAction(t("invite_editor"), t("invite_policy"))))
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
    if (["no_kitchen", "unauthorized"].includes(err.code))
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
      if (["no_kitchen", "unauthorized"].includes(err.code))
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
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

function fitViewport() {
  if (window.visualViewport && Math.abs(window.visualViewport.scale - 1) < 0.01)
    app.style.height = Math.round(window.visualViewport.height) + "px";
  else app.style.height = "";
  document.documentElement.style.setProperty(
    "--visible-height",
    app.style.height || "100dvh",
  );
}
window.visualViewport?.addEventListener("resize", fitViewport);
fitViewport();
