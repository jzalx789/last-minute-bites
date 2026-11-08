export class Problem extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}
export function check(condition, code = "invalid_input", status = 400) {
  if (!condition) throw new Problem(status, code);
}
export function text(value, max = 120) {
  check(
    typeof value === "string" &&
      value.trim().length > 0 &&
      value.trim().length <= max,
  );
  return value.trim();
}
export function integer(value, min = 1, max = Number.MAX_SAFE_INTEGER) {
  check(Number.isSafeInteger(value) && value >= min && value <= max);
  return value;
}
export const categories = [
  "produce",
  "dairy",
  "protein",
  "cooked",
  "condiments",
  "dry",
  "other",
];
export const ingredients = {
  tomato: ["tomato", "tomatoes", "番茄", "蕃茄"],
  egg: ["egg", "eggs", "雞蛋", "蛋"],
  rice: ["rice", "cooked rice", "米飯", "白飯", "飯"],
  spinach: ["spinach", "菠菜"],
  pasta: ["pasta", "spaghetti", "意粉", "意大利麵"],
  tofu: ["tofu", "豆腐"],
  soy_sauce: ["soy sauce", "豉油", "醬油"],
  oil: ["oil", "cooking oil", "食油", "油"],
  salt: ["salt", "鹽"],
};
export const units = [
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
// Calculate stock in thousandths to avoid floating-point subtraction drift.
export function quantityTicks(value) {
  check(
    typeof value === "number" &&
      Number.isFinite(value) &&
      value > 0 &&
      value <= 1000000,
    "invalid_quantity",
  );
  const ticks = Math.round(value * 1000);
  check(
    ticks > 0 && Math.abs(value * 1000 - ticks) < 0.000001,
    "invalid_quantity",
  );
  return ticks;
}
export function consumeFood(food, amount, all = false, at = Date.now()) {
  check(food.status === "active", "food_used", 409);
  const known = typeof food.quantity === "number" && food.quantity > 0;
  check(all === true || known, "quantity_required");
  const before = known ? quantityTicks(food.quantity) : null;
  const consumed = all === true ? before : quantityTicks(amount);
  check(before === null || consumed <= before, "insufficient_quantity", 409);
  const remaining = before === null ? null : (before - consumed) / 1000;
  const used = all === true || remaining === 0;
  return {
    ...food,
    quantity: remaining,
    status: used ? "used" : "active",
    restore_quantity: used ? (known ? food.quantity : null) : null,
    last_consumption: {
      quantity: consumed === null ? null : consumed / 1000,
      unit: food.unit ?? null,
      at,
    },
  };
}
export function restoreFood(food) {
  check(food.status === "used", "conflict", 409);
  const quantity = food.restore_quantity ?? null;
  if (quantity !== null) quantityTicks(quantity);
  return { ...food, quantity, status: "active", restore_quantity: null };
}
export function applyConsumption(food, item) {
  let current = food;
  if (Object.hasOwn(item, "initial_quantity")) {
    check(
      food.quantity === null || food.quantity === undefined,
      "quantity_already_set",
      409,
    );
    const quantity = quantityTicks(item.initial_quantity) / 1000;
    const unit = item.unit ?? food.unit ?? "pcs";
    check(units.includes(unit), "invalid_quantity");
    current = { ...food, quantity, unit };
  }
  return consumeFood(current, item.quantity, item.all === true);
}
export const defaults = {
  language: "en",
  text_size: "standard",
  default_view: "categories",
  date_format: "iso",
  reminders: true,
  reminder_days: 3,
  timezone: "Asia/Hong_Kong",
};
export function calendarDate(value) {
  check(
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value),
    "invalid_date",
  );
  const date = new Date(value + "T00:00:00Z");
  check(
    Number.isFinite(date.valueOf()) &&
      Number(value.slice(0, 4)) >= 1 &&
      date.toISOString().slice(0, 10) === value,
    "invalid_date",
  );
  return value;
}
export function calculateDate(production, amount, unit) {
  calendarDate(production);
  integer(amount, 1, 10000);
  check(["days", "months", "years"].includes(unit));
  const date = new Date(production + "T00:00:00Z");
  if (unit === "days") date.setUTCDate(date.getUTCDate() + amount);
  else {
    const total =
        date.getUTCFullYear() * 12 +
        date.getUTCMonth() +
        amount * (unit === "years" ? 12 : 1),
      year = Math.floor(total / 12),
      month = total % 12;
    check(year >= 1 && year <= 9999, "invalid_date");
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0),
      last = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
        month
      ],
      day = Math.min(date.getUTCDate(), last);
    date.setUTCDate(1);
    date.setUTCFullYear(year, month, day);
  }
  return calendarDate(date.toISOString().slice(0, 10));
}
export function todayIn(timezone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function validateFood(data) {
  const food = {
    name: text(data.name),
    category: data.category ?? "other",
    location: data.location ?? "other",
    note: data.note ?? "",
    ingredient: data.ingredient ?? "",
    quantity: data.quantity ?? null,
    unit: data.unit ?? "pcs",
    purchased_date: data.purchased_date || null,
  };
  if (food.quantity !== null)
    food.quantity = quantityTicks(food.quantity) / 1000;
  check(units.includes(food.unit), "invalid_quantity");
  if (food.purchased_date !== null) calendarDate(food.purchased_date);
  check(
    categories.includes(food.category) &&
      ["fridge", "freezer", "pantry", "other"].includes(food.location),
  );
  check(typeof food.note === "string" && food.note.length <= 1000);
  food.note = food.note.trim();
  check(food.ingredient === "" || Object.hasOwn(ingredients, food.ingredient));
  const source = data.date_source;
  check(["printed", "production", "personal", "unknown"].includes(source));
  Object.assign(food, {
    date_source: source,
    date_kind: "unspecified",
    effective_date: null,
    production_date: null,
    shelf_life: null,
    shelf_unit: null,
  });
  if (source === "personal") {
    if (data.effective_date)
      food.effective_date = calendarDate(data.effective_date);
  } else if (source !== "unknown") {
    check(["use_by", "best_before", "unspecified"].includes(data.date_kind));
    food.date_kind = data.date_kind;
    if (source === "printed")
      food.effective_date = calendarDate(data.effective_date);
    else {
      food.production_date = data.production_date;
      food.shelf_life = data.shelf_life;
      food.shelf_unit = data.shelf_unit;
      food.effective_date = calculateDate(
        data.production_date,
        data.shelf_life,
        data.shelf_unit,
      );
      check(data.date_confirmed === true, "confirm_calculation");
    }
  }
  return food;
}
export const eligible = (food, today) =>
  food.status === "active" &&
  (food.quantity === null ||
    food.quantity === undefined ||
    food.quantity > 0) &&
  !(
    food.date_kind === "use_by" &&
    food.effective_date &&
    food.effective_date < today
  );
export const equal = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string") return false;
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
};
export function token() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}
export const hex = (bytes) =>
  [...new Uint8Array(bytes)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
export const sha = async (value) =>
  hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
export async function passwordHash(
  password,
  salt = hex(crypto.getRandomValues(new Uint8Array(16))),
) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: new Uint8Array(salt.match(/../g).map((s) => parseInt(s, 16))),
      iterations: 100000,
    },
    material,
    256,
  );
  return `pbkdf2-sha256:100000:${salt}:${hex(bits)}`;
}
export async function verifyPassword(password, stored) {
  return equal(await passwordHash(password, stored.split(":")[2]), stored);
}
