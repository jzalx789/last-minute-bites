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
    "Record a few foods, select across categories, then find a recipe. Edit a record to mark it fully used or delete it. Use-by dates limit recipe matching; best-before dates describe quality. Unknown dates are not proof of safety. Shared food updates by polling, not instantly. Personal preferences and ingredient selections are private to your account. Removed members may still hold copies saved earlier.",
    "先記下少量食物，跨分類選擇，再尋找食譜。編輯紀錄可標記完全用完或刪除。食用期限限制食譜匹配，最佳食用日期屬品質標示。未知日期不代表安全。共享資料定時更新，並非即時同步。偏好及食材選取只屬個人。被移除成員仍可能持有之前保存的副本。",
  ],
  limitations: [
    "Prototype 0.1. No photo recognition, safety assessment or external recipe API. Recipes need team review. This shared version requires the Python backend, not an offline HTML file.",
    "Prototype 0.1：未提供照片辨識、安全判斷或外部食譜 API；食譜待團隊審核。共享版本需要 Python 後端，並非離線單一 HTML。",
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
    if ($("#confirm").open) $("#confirm").close("cancel");
    selection.clear();
    notify(t("lost_access"));
    location.hash = "kitchen";
  }
  lastUser = uid;
  lastKitchen = kid;
  state = next;
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
  if (draw || lost) render();
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
  `${t(f.date_source === "unknown" ? "no_date" : f.date_source)} · ${foodStatus(f)}${f.effective_date ? " · " + dateText(f.effective_date) : ""}`;
function selectionBar() {
  return `<aside class="selection" aria-label="${E(t("selected"))}"><span><strong id="selected-count">${selection.size}</strong> ${E(t("selected"))}</span>${button("clear-selection", t("clear"))}${button("find-recipes", t("find"), "primary")}</aside>`;
}
function render() {
  if (!state) return;
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
  app.innerHTML = `<header class="topbar"><button class="brand" data-action="go" data-path="kitchen">${icon("leaf")}<span>Last Minute <b>Bites</b></span></button><div class="header-actions">${state.user ? button("go", t("settings"), "", 'data-path="settings"') : button("language", language() === "en" ? "繁體中文" : "English")}${state.user ? `<span class="account">${E(state.user.email)}</span>` : ""}</div></header><main id="main" tabindex="-1">${offline ? `<p class="error">${E(t("offline"))} ${button("retry", t("retry"))}</p>` : ""}${content}</main>${state.user && state.kitchen ? selectionBar() + `<nav class="bottom-nav" aria-label="${E(t("kitchen"))}"><button data-action="go" data-path="kitchen" ${["kitchen", "category"].includes(page) ? 'aria-current="page"' : ""}>${icon("home")}${E(t("kitchen"))}</button><button data-action="go" data-path="recipes" ${page === "recipes" ? 'aria-current="page"' : ""}>${icon("book")}${E(t("recipes"))}</button></nav>` : ""}`;
  if (page === "food") bindFoodForm();
  if (page === "recipes" && state.user && state.kitchen) loadRecipes(arg);
}
function auth() {
  return `<div class="auth-layout"><section class="auth-story"><div class="little-leaf">${icon("leaf")}</div><h1>${E(t("welcome"))}</h1><p>${E(t("intro"))}</p><div class="mini-fridge" aria-hidden="true"><span></span><span></span></div></section><section class="auth-panel"><div class="switcher">${button("auth-login", t("sign_in"), authMode === "login" ? "chosen" : "")}${button("auth-register", t("register"), authMode === "register" ? "chosen" : "")}</div><h2>${E(t(authMode === "login" ? "sign_in" : "register"))}</h2><p>${E(t("auth_hint"))}</p><form data-form="auth">${field("email", t("email"), "", "email", 'required maxlength="254" autocomplete="username"')}${field("password", t("password"), "", "password", `required minlength="10" maxlength="128" autocomplete="${authMode === "login" ? "current-password" : "new-password"}"`)}${authMode === "register" ? field("confirm_password", t("confirm_password"), "", "password", 'required minlength="10" maxlength="128" autocomplete="new-password"') : ""}<p class="hint">${E(t("password_hint"))}</p><label class="check"><input type="checkbox" data-show-password>${E(t("show_password"))}</label>${formError()}<button class="primary full">${E(t(authMode === "login" ? "sign_in" : "register"))}</button></form></section></div>`;
}
function setup() {
  return `<section class="page-heading"><h1>${E(t("welcome_kitchen"))}</h1><p>${E(t("setup_intro"))}</p></section><div class="two-column"><section class="panel"><h2>${E(t("create_kitchen"))}</h2><form data-form="create-kitchen">${field("name", t("kitchen_name"), "", "text", 'required maxlength="80"')}${formError()}<button class="primary">${E(t("create_kitchen"))}</button></form></section><section class="panel"><h2>${E(t("join_kitchen"))}</h2><form data-form="preview-invite">${field("code", t("invite_code"), invitePreview?.code || "", "text", 'required maxlength="100" autocomplete="off"')}${formError()}<button>${E(t("preview_invite"))}</button></form>${invitePreview ? `<div class="invitation-preview"><h3>${E(invitePreview.name)}</h3><p>${E(t("preview_note"))}</p>${button("accept-invite", t("join_confirm"), "primary")}</div>` : ""}</section></div>${button("sign-out", t("sign_out"), "quiet")}`;
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
  return `<button data-action="category" data-category="${key}" class="fridge-category ${cls}">${icon(svg)}<span>${E(t(key))}<small>${count} ${E(t("active"))}</small></span><span class="chevron" aria-hidden="true">›</span></button>`;
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
            `${E(f.name)}: ${E(t(f.date_kind))} ${E(dateText(f.effective_date))}`,
        )
        .join("; ")}</span><small>${E(t("due_hint"))}</small></aside>`
    : "";
}
function kitchen() {
  return `<section class="page-heading kitchen-heading"><div><p class="kitchen-label">${E(state.kitchen.name)} <span class="role">${E(t(state.kitchen.role))}</span></p><h1>${E(t("kitchen_intro"))}</h1><p>${E(t("kitchen_subtitle"))}</p></div>${button("add", t("add"), "primary")}</section><div class="kitchen-toolbar"><div class="switcher">${button("view-categories", t("categories"), view === "categories" ? "chosen" : "")}${button("view-first", t("use_first"), view === "use_first" ? "chosen" : "")}</div>${button("category", t("all"), "quiet", 'data-category="all"')}</div>${reminderBanner()}${
    view === "categories"
      ? `<div class="kitchen-illustration"><section class="fridge" aria-label="${E(t("fridge"))}"><div class="fridge-top"><span>Last Minute Bites</span><span class="fridge-hinge"></span></div><div class="fridge-shelves">${categoryButton("produce", "leaf")}${categoryButton("dairy", "egg")}${categoryButton("protein", "fish")}${categoryButton("cooked", "bowl")}</div><div class="freezer-drawer">${categoryButton("freezer", "snow")}</div></section><aside class="pantry-rack"><div class="rack-top">${icon("jar")}${icon("jar")}${icon("jar")}</div>${categoryButton("condiments", "jar", "rack-category")}${categoryButton("dryother", "bag", "dry-category")}<p class="hint">${E(t("storage_guidance"))}</p></aside></div>`
      : foodList(
          state.foods.filter((f) => f.status === "active"),
          "use_first",
        )
  }<p class="sync-note">${E(t("sync"))}</p>`;
}
function categoryPage(key) {
  return `${back()}<section class="page-heading kitchen-heading"><div><h1>${E(t(key))}</h1><p>${E(t("sync"))}</p></div>${button("add", t("add"), "primary", `data-category="${E(key)}"`)}</section><div class="list-tools"><label class="search-label">${E(t("search"))}<input type="search" id="search" value="${E(search)}"></label><label class="check"><input type="checkbox" id="include-used" ${includeUsed ? "checked" : ""}>${E(t("view_used"))}</label></div><div id="food-list">${filteredList(key)}</div>`;
}
function filteredList(key) {
  return foodList(
    state.foods.filter(
      (f) =>
        (includeUsed || f.status === "active") &&
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
          a.effective_date.localeCompare(b.effective_date) || a.id - b.id,
      ),
    unknown = foods.filter((f) => !f.effective_date);
  return `${known.length ? `<h2 class="list-heading">${E(t("known_dates"))}</h2><div class="food-rows">${known.map(foodRow).join("")}</div>` : ""}${unknown.length ? `<h2 class="list-heading">${E(t("unknown"))}</h2><p class="hint">${E(t("unknown_note"))}</p><div class="food-rows">${unknown.map(foodRow).join("")}</div>` : ""}`;
}
function foodRow(f) {
  return `<article class="food-row"><label class="food-select"><input type="checkbox" data-select="${f.id}" ${selection.has(f.id) ? "checked" : ""} ${f.eligible ? "" : "disabled"} aria-label="${E(t("selected") + " " + f.name)}"><span><strong>${E(f.name)}</strong><small class="${!f.eligible && f.status !== "used" ? "warning" : ""}">${E(dateLine(f))}</small><small>${E(t(f.category))} · ${E(t(f.location))}${f.ingredient ? " · " + E(t(f.ingredient)) : ""}</small></span></label>${button("edit", t("edit"), "quiet", `data-id="${f.id}"`)}</article>`;
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
  return `<div class="narrow">${back()}<h1>${E(t(f ? "edit" : "add"))}</h1><form data-form="food" data-id="${f?.id || ""}" data-version="${f?.version || ""}">${field("name", t("name"), v.name, "text", 'required maxlength="120" autocomplete="off"')}<label>${E(t("date_information"))}<select name="date_source">${["unknown", "printed", "production"].map((k) => option(k, t(k === "unknown" ? "no_date" : k), v.date_source)).join("")}</select></label><div id="dated-fields" ${v.date_source === "unknown" ? "hidden" : ""}>${select("date_kind", t("label_type"), ["unspecified", "use_by", "best_before"], v.date_kind)}<div id="printed-fields" ${v.date_source !== "printed" ? "hidden" : ""}>${field("effective_date", t("date"), v.effective_date || "", "date")}</div><div id="production-fields" ${v.date_source !== "production" ? "hidden" : ""}>${field("production_date", t("production_date"), v.production_date || "", "date")}<div class="two-fields">${field("shelf_life", t("shelf_life"), v.shelf_life || "", "number", 'min="1" max="10000" step="1"')}${select("shelf_unit", t("shelf_life"), ["days", "months", "years"], v.shelf_unit || "days")}</div>${button("calculate", t("calculate"))}<p id="calculation-result" role="status">${calculation ? E(t("reference") + ": " + dateText(calculation)) : ""}</p><label class="check"><input type="checkbox" name="date_confirmed" ${calculation ? "checked" : ""}>${E(t("confirm_date"))}</label><details><summary>${E(t("calc_explanation"))}</summary><p>${E(t("calc_note"))}</p></details></div></div><div class="two-fields">${select("category", t("category"), cats, v.category)}${select("location", t("location"), ["fridge", "freezer", "pantry", "other"], v.location)}</div><label>${E(t("recipe_ingredient"))}<select name="ingredient">${option("", t("unmapped"), v.ingredient)}${Object.keys(
    state.ingredients,
  )
    .map((i) => option(i, t(i), v.ingredient))
    .join(
      "",
    )}</select></label><p class="hint">${E(t("mapping_hint"))}</p><label>${E(t("note"))}<textarea name="note" maxlength="1000" rows="3">${E(v.note)}</textarea></label><p class="hint">${E(t("note_hint"))}</p>${formError()}<div class="actions"><button class="primary" ${f?.status === "used" ? "disabled" : ""}>${E(t(f ? "save" : "add"))}</button>${button("go", t("cancel"), "", 'data-path="kitchen"')}</div>${f ? `<div class="record-actions">${f.status === "active" ? button("mark-used", t("mark_used")) : ""}${button("delete-food", t("delete"), "danger")}${button("reload-record", t("reload_record"), "quiet")}</div>` : ""}</form></div>`;
}
function bindFoodForm() {
  const form = $('[data-form="food"]');
  if (!form) return;
  function fields() {
    const s = form.elements.date_source.value;
    $("#dated-fields").hidden = s === "unknown";
    $("#printed-fields").hidden = s !== "printed";
    $("#production-fields").hidden = s !== "production";
    form.elements.effective_date.required = s === "printed";
    form.elements.effective_date.disabled = s !== "printed";
    form.elements.date_kind.disabled = s === "unknown";
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
function recipesPage(id) {
  return `<section class="page-heading"><h1>${E(t("recipe_intro"))}</h1><p>${E(t("recipe_disclaimer"))}</p></section>${!selection.size ? `<p>${E(t("choose_food"))}</p>` : ""}<div id="recipe-content" data-id="${E(id || "")}"><p role="status">${E(t("loading"))}</p></div>`;
}
async function loadRecipes(id) {
  const seq = ++recipeSeq;
  try {
    const result = await api("recipes", { selected: [...selection] });
    if (seq !== recipeSeq || route()[0] !== "recipes") return;
    recipeResult = result;
    const before = selection.size;
    selection = new Set(result.selected);
    storeSelection();
    if (before !== selection.size) notify(t("selection_changed"));
    $("#selected-count").textContent = selection.size;
    displayRecipes(id);
  } catch (err) {
    if (seq === recipeSeq && $("#recipe-content"))
      $("#recipe-content").innerHTML =
        `<p class="error">${E(errorText(err))}</p>${button("reload-recipes", t("retry"))}`;
  }
}
const names = (keys) =>
  keys.length ? keys.map((k) => E(t(k))).join(", ") : E(t("none"));
function recipeFacts(r) {
  return `<dl class="recipe-facts"><dt>${E(t("matches"))}</dt><dd>${r.matched.length ? r.matched.map((id) => E(state.foods.find((f) => f.id === id)?.name || "")).join(", ") : E(t("none"))}</dd><dt>${E(t("available"))}</dt><dd>${names(r.available)}</dd><dt>${E(t("missing"))}</dt><dd>${names(r.missing.filter((i) => !r.check_at_home.includes(i)))}</dd><dt>${E(t("check_home"))}</dt><dd>${names(r.check_at_home)}</dd></dl>`;
}
function displayRecipes(id) {
  const root = $("#recipe-content");
  if (!root || !recipeResult) return;
  const recipes = recipeResult.recipes;
  if (id) {
    const r = recipes.find((r) => r.id === Number(id));
    if (!r) {
      root.innerHTML = E(t("not_found"));
      return;
    }
    root.innerHTML = `${back("recipes")}<article class="recipe-detail"><div class="recipe-icon">${icon(r.icon)}</div><h2>${E(r.name[language()])}</h2><p>${r.minutes} ${E(t("minutes"))}</p>${recipeFacts(r)}<h3>${E(t("ingredients"))}</h3><ul>${r.ingredients.map((i) => `<li>${E(t(i))} — ${E(t(r.available.includes(i) ? "available" : r.check_at_home.includes(i) ? "check_home" : "missing"))}</li>`).join("")}</ul><h3>${E(t("steps"))}</h3><ol>${r.steps[language()].map((s) => `<li>${E(s)}</li>`).join("")}</ol><p class="hint">${E(t("read_no_change"))}</p>${button("category", t("update_list"), "primary", 'data-category="all"')}</article>`;
    return;
  }
  const matched = recipes.filter((r) => r.matched.length),
    shown = !selection.size || browse ? recipes : matched;
  root.innerHTML = `${selection.size && !matched.length ? `<section class="empty"><h2>${E(t("no_match"))}</h2><p>${E(t("no_match_note"))}</p></section>` : ""}${selection.size ? button("browse-recipes", t("browse"), "quiet") : ""}<div class="recipe-grid">${shown.map((r) => `<article class="recipe-card"><div class="recipe-art">${icon(r.icon)}</div><div class="recipe-copy"><p class="hint">${r.minutes} ${E(t("minutes"))}</p><h2>${E(r.name[language()])}</h2>${recipeFacts(r)}${button("recipe-detail", t("details"), "primary", `data-id="${r.id}"`)}</div></article>`).join("")}</div>`;
}
const settingsLink = (path, key) =>
  `<button class="settings-link" data-action="go" data-path="${path}"><span>${E(t(key))}</span><span aria-hidden="true">›</span></button>`;
function settings() {
  return `<div class="narrow">${back()}<h1>${E(t("settings"))}</h1>${state.kitchen ? `<h2>${E(t("kitchen"))}</h2><p>${E(state.kitchen.name)} · ${E(t(state.kitchen.role))}</p>${settingsLink("shared", "shared")}` : ""}<h2>${E(t("personal"))}</h2>${settingsLink("preferences", "preferences")}${state.kitchen ? settingsLink("reminders", "reminders") : ""}<h2>${E(t("help"))}</h2>${settingsLink("help", "help")}${state.kitchen?.role === "owner" ? `<h2>${E(t("kitchen_data"))}</h2>${button("clear-kitchen", t("clear_kitchen"), "danger full")}` : ""}<hr><p class="hint">${E(t("signout_note"))}</p>${button("sign-out", t("sign_out"), "full")}</div>`;
}
function shared() {
  return `<div class="narrow">${back("settings")}<h1>${E(t("shared"))}</h1><h2>${E(state.kitchen.name)}</h2><p class="hint">${E(t("sync"))}</p><h3>${E(t("members"))}</h3><ul class="member-list">${state.members.map((m) => `<li><span>${E(m.email)}<small>${E(t(m.role))}</small></span>${state.kitchen.role === "owner" && m.role === "editor" ? button("remove-member", t("remove"), "danger", `data-id="${m.id}"`) : ""}</li>`).join("")}</ul>${state.kitchen.role === "owner" ? `<h3>${E(t("invite_editor"))}</h3><p>${E(t("invite_policy"))}</p>${button("invite", t("invite_editor"), "primary")}<div id="invite-output" aria-live="polite"></div>` : `<p>${E(t("preview_note"))}</p>${button("leave", t("leave"), "danger")}`}</div>`;
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
  return `<div class="narrow">${back("settings")}<h1>${E(t("help"))}</h1><p>${E(t("help_text"))}</p><h2>Last Minute Bites 0.1</h2><p>${E(t("limitations"))}</p><p>${E(t("note_hint"))}</p></div>`;
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
  data.shelf_life = Number(data.shelf_life);
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
    error.textContent = errorText(err);
    if (["no_kitchen", "unauthorized"].includes(err.code))
      await refresh().catch(() => {});
  } finally {
    submit.disabled = false;
  }
});
document.addEventListener("click", async (event) => {
  const b = event.target.closest("[data-action]");
  if (!b || b.disabled) return;
  const a = b.dataset.action;
  b.disabled = true;
  try {
    switch (a) {
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
        $("#selected-count").textContent = "0";
        if (route()[0] === "recipes") render();
        break;
      case "find-recipes":
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
  if (el.matches("[data-select]")) {
    const id = Number(el.dataset.select);
    if (el.checked) selection.add(id);
    else selection.delete(id);
    storeSelection();
    $("#selected-count").textContent = selection.size;
  }
  if (el.matches("[data-show-password]"))
    for (const input of el
      .closest("form")
      .querySelectorAll('input[name*="password"]'))
      input.type = el.checked ? "text" : "password";
  if (el.id === "include-used") {
    includeUsed = el.checked;
    $("#food-list").innerHTML = filteredList(route()[1] || "all");
  }
});
document.addEventListener("input", (e) => {
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
  window.scrollTo(0, 0);
});
let polling = false;
async function poll() {
  if (polling || !state?.user || document.hidden) return;
  polling = true;
  try {
    const p = route()[0] || "kitchen",
      draw =
        ["kitchen", "category", "recipes"].includes(p) &&
        !document.activeElement?.matches("input,textarea,select") &&
        !$("#confirm").open;
    await refresh(draw);
  } catch (_) {
    offline = true;
    const p = route()[0] || "kitchen";
    if (
      ["kitchen", "category", "recipes"].includes(p) &&
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
  app.innerHTML = `<main id="main"><h1>Last Minute Bites</h1><p role="alert">${E(errorText(err))}</p>${button("retry", t("retry"))}</main>`;
});
