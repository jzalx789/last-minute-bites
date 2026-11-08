// RFC 8291 aes128gcm and RFC 8292 VAPID, using the runtime's Web Crypto API.
import { check } from "./domain.js";
const enc = new TextEncoder();
export const base64url = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
export function fromBase64url(value) {
  check(
    typeof value === "string" && /^[A-Za-z0-9_-]+={0,2}$/.test(value),
    "invalid_subscription",
  );
  try {
    return Uint8Array.from(
      atob(
        value.replace(/=+$/, "").replace(/-/g, "+").replace(/_/g, "/") +
          "=".repeat((4 - (value.replace(/=+$/, "").length % 4)) % 4),
      ),
      (c) => c.charCodeAt(0),
    );
  } catch {
    check(false, "invalid_subscription");
  }
}
const join = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.byteLength, 0));
  let n = 0;
  for (const p of parts) {
    out.set(new Uint8Array(p), n);
    n += p.byteLength;
  }
  return out;
};
async function hmac(key, data) {
  const k = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}
async function expand(key, info, length) {
  return (await hmac(key, join(info, new Uint8Array([1])))).slice(0, length);
}
export function pushEndpoint(value) {
  check(
    typeof value === "string" && value.length <= 4096,
    "invalid_subscription",
  );
  let u;
  try {
    u = new URL(value);
  } catch {
    check(false, "invalid_subscription");
  }
  const host = u.hostname;
  const supported =
    (host === "fcm.googleapis.com" &&
      /^\/(fcm\/send|wp)\/.+/.test(u.pathname)) ||
    (host === "updates.push.services.mozilla.com" &&
      /^\/wpush\/v[12]\/.+/.test(u.pathname)) ||
    (host === "web.push.apple.com" && u.pathname.length > 10) ||
    (host.endsWith(".notify.windows.com") && u.pathname.startsWith("/w/"));
  check(
    u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      !u.hash &&
      supported,
    "invalid_subscription",
  );
  return u.href;
}
export async function validateSubscription(raw) {
  check(
    raw && typeof raw === "object" && raw.keys && typeof raw.keys === "object",
    "invalid_subscription",
  );
  const endpoint = pushEndpoint(raw.endpoint),
    p = fromBase64url(raw.keys.p256dh),
    auth = fromBase64url(raw.keys.auth);
  check(
    p.length === 65 && p[0] === 4 && auth.length === 16,
    "invalid_subscription",
  );
  try {
    await crypto.subtle.importKey(
      "raw",
      p,
      { name: "ECDH", namedCurve: "P-256" },
      false,
      [],
    );
  } catch {
    check(false, "invalid_subscription");
  }
  const expiry = raw.expirationTime ?? null;
  check(
    expiry === null || (Number.isSafeInteger(expiry) && expiry > Date.now()),
    "invalid_subscription",
  );
  return {
    endpoint,
    keys: { p256dh: base64url(p), auth: base64url(auth) },
    expirationTime: expiry,
  };
}
export async function createVapidKeys() {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  return {
    publicKey: base64url(await crypto.subtle.exportKey("raw", pair.publicKey)),
    privateJwk: await crypto.subtle.exportKey("jwk", pair.privateKey),
  };
}
// Optional deterministic material is useful for the published RFC test vector.
export async function encryptPush(subscription, plaintext, material = {}) {
  const ua = fromBase64url(subscription.keys.p256dh),
    auth = fromBase64url(subscription.keys.auth);
  const pair =
    material.pair ||
    (await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveBits"],
    ));
  const asPublic = new Uint8Array(
    await crypto.subtle.exportKey("raw", pair.publicKey),
  );
  const uaPublic = await crypto.subtle.importKey(
    "raw",
    ua,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const shared = await crypto.subtle.deriveBits(
    { name: "ECDH", public: uaPublic },
    pair.privateKey,
    256,
  );
  const ikm = await expand(
    await hmac(auth, shared),
    join(enc.encode("WebPush: info\0"), ua, asPublic),
    32,
  );
  const salt = material.salt || crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm),
    cek = await expand(prk, enc.encode("Content-Encoding: aes128gcm\0"), 16),
    nonce = await expand(prk, enc.encode("Content-Encoding: nonce\0"), 12);
  const data =
    typeof plaintext === "string"
      ? enc.encode(plaintext)
      : new Uint8Array(plaintext);
  check(data.length <= 3000, "push_payload_large");
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, [
    "encrypt",
  ]);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce, tagLength: 128 },
    key,
    join(data, new Uint8Array([2])),
  );
  const header = new Uint8Array(21);
  header.set(salt);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = 65;
  return join(header, asPublic, encrypted);
}
export async function pushRequest(
  subscription,
  payload,
  keys,
  subject,
  now = Date.now(),
) {
  const endpoint = pushEndpoint(subscription.endpoint);
  const sub = new URL(subject);
  check(
    sub.protocol === "https:" && !sub.username && !sub.password,
    "push_configuration",
  );
  const jwt = [
    base64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" }))),
    base64url(
      enc.encode(
        JSON.stringify({
          aud: new URL(endpoint).origin,
          exp: Math.floor(now / 1000) + 21600,
          sub: sub.origin,
        }),
      ),
    ),
  ].join(".");
  const key = await crypto.subtle.importKey(
    "jwk",
    keys.privateJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    enc.encode(jwt),
  );
  return {
    endpoint,
    body: await encryptPush(subscription, JSON.stringify(payload)),
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: "14400",
      Urgency: "normal",
      Authorization: `vapid t=${jwt}.${base64url(signature)}, k=${keys.publicKey}`,
    },
  };
}
export async function deliverPush(request, transport = null) {
  try {
    if (transport) {
      const r = await transport.send({
        endpoint: request.endpoint,
        headers: request.headers,
        body: base64url(request.body),
      });
      return { status: r.status, retryAfter: r.retryAfter || 300 };
    }
    const r = await fetch(request.endpoint, {
      method: "POST",
      headers: request.headers,
      body: request.body,
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    const seconds = Number(r.headers.get("Retry-After"));
    return {
      status: r.status,
      retryAfter:
        Number.isFinite(seconds) && seconds > 0
          ? Math.min(seconds, 86400)
          : 300,
    };
  } catch {
    return { status: 0, retryAfter: 300 };
  }
}
