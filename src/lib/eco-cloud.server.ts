/**
 * Server-only helpers: menyimpan seluruh data aplikasi di Cloudflare D1
 * melalui connector gateway. Tidak boleh diimpor dari kode client.
 */

const GATEWAY_BASE = (process.env["CONNECTOR_GATEWAY_BASE_URL"] ?? "https://connector-gateway.lovable.dev").replace(/\/$/, "");
const CF_API = `${GATEWAY_BASE}/cloudflare/client/v4`;
const ACCOUNT_ID = "c29c172f6c6488512065c8efbd4fadc4";
const DB_ID = "4cde2ee1-4e25-4762-a79b-b073f32e38f5";
/** Satu pernyataan SQL D1 dibatasi ~100KB, jadi aset disimpan per potongan. */
const ASSET_CHUNK = 60_000;
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Hash kata sandi admin awal (palapa2026) untuk mendeteksi login default. */
export const DEFAULT_ADMIN_HASH = "pbkdf2$120000$6Nx9lPy+WDHeo2G6tPrKUQ==$dmXt3S3w6e4r9TRfqE5v5IiRfkIxGyVqON4tJXEeSM8=";

interface D1StatementResult {
  results: Array<Record<string, unknown>>;
  success: boolean;
}

export async function d1Query(sql: string, params: unknown[] = []): Promise<D1StatementResult[]> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const cfKey = process.env["CLOUDFLARE_API_KEY"];
  if (!lovableKey || !cfKey) throw new Error("Missing Cloudflare connector credentials");
  const res = await fetch(`${CF_API}/accounts/${ACCOUNT_ID}/d1/database/${DB_ID}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": cfKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });
  if (!res.ok) throw new Error(`D1 request failed [${res.status}]: ${await res.text()}`);
  const json = (await res.json()) as { success: boolean; errors?: Array<{ message: string }>; result: D1StatementResult[] };
  if (!json.success || json.errors?.length) {
    throw new Error(`D1 error: ${json.errors?.[0]?.message ?? "unknown"}`);
  }
  return json.result;
}

/* ---------------- base64 helpers (workerd-safe, tanpa Buffer) ---------------- */

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    let chunk = "";
    for (let j = i; j < Math.min(i + 0x8000, bytes.length); j++) chunk += String.fromCharCode(bytes[j]!);
    bin += chunk;
  }
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ---------------- password hashing (PBKDF2 via Web Crypto) ---------------- */

const enc = new TextEncoder();

async function pbkdf2Bits(password: string, saltB64: string, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: base64ToBytes(saltB64) as BufferSource, iterations },
    key,
    256,
  );
  return bytesToBase64(new Uint8Array(bits));
}

export async function hashPassword(password: string): Promise<string> {
  const saltB64 = bytesToBase64(crypto.getRandomValues(new Uint8Array(16)));
  const iterations = 120000;
  return `pbkdf2$${iterations}$${saltB64}$${await pbkdf2Bits(password, saltB64, iterations)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]) || 120000;
  const hash = await pbkdf2Bits(password, parts[2]!, iterations);
  return timingSafeEqual(hash, parts[3]!);
}

/* ---------------- session token (HMAC-SHA256) ---------------- */

function b64urlEncode(text: string): string {
  return bytesToBase64(enc.encode(text)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): string {
  let t = s.replace(/-/g, "+").replace(/_/g, "/");
  while (t.length % 4) t += "=";
  return new TextDecoder().decode(base64ToBytes(t));
}

async function getAuthSecret(): Promise<Uint8Array> {
  const rows = await d1Query("SELECT v FROM state WHERE k = 'auth_secret'");
  let secretB64 = rows[0]?.results?.[0]?.["v"] as string | undefined;
  if (!secretB64) {
    secretB64 = bytesToBase64(crypto.getRandomValues(new Uint8Array(32)));
    await d1Query(
      "INSERT INTO state (k, v) VALUES ('auth_secret', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v",
      [secretB64],
    );
  }
  return base64ToBytes(secretB64);
}

async function hmacSign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", (await getAuthSecret()) as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return bytesToBase64(new Uint8Array(sig)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function createToken(username: string): Promise<string> {
  const payload = b64urlEncode(JSON.stringify({ u: username, exp: Date.now() + TOKEN_TTL_MS }));
  return `${payload}.${await hmacSign(payload)}`;
}

export async function verifyToken(token: string | undefined | null): Promise<string | null> {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  if (!timingSafeEqual(sig, await hmacSign(payload))) return null;
  try {
    const parsed = JSON.parse(b64urlDecode(payload)) as { u?: unknown; exp?: unknown };
    if (typeof parsed.u !== "string" || typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    return parsed.u;
  } catch {
    return null;
  }
}

/* ---------------- admin credentials ---------------- */

export interface AdminRow {
  username: string;
  passwordHash: string;
}

export async function getAdmin(username?: string): Promise<AdminRow | null> {
  const rows = username
    ? await d1Query("SELECT username, password_hash FROM admin_auth WHERE username = ?", [username])
    : await d1Query("SELECT username, password_hash FROM admin_auth LIMIT 1");
  const r = rows[0]?.results?.[0];
  if (!r) return null;
  return { username: String(r["username"]), passwordHash: String(r["password_hash"]) };
}

export async function setAdmin(oldUsername: string, newUsername: string, passwordHash: string): Promise<void> {
  await d1Query(
    "UPDATE admin_auth SET username = ?, password_hash = ?, updated_at = datetime('now') WHERE username = ?",
    [newUsername, passwordHash, oldUsername],
  );
}

/* ---------------- application state ---------------- */

export async function loadEcoState(): Promise<Record<string, unknown>> {
  const rows = await d1Query("SELECT k, v FROM state");
  const out: Record<string, unknown> = {};
  for (const row of rows[0]?.results ?? []) {
    try {
      out[String(row["k"])] = JSON.parse(String(row["v"]));
    } catch {
      /* skip corrupt row */
    }
  }
  return out;
}

export async function saveEcoState(entries: Record<string, unknown>): Promise<void> {
  for (const [key, value] of Object.entries(entries)) {
    const json = JSON.stringify(value);
    if (json.length > 90_000) {
      throw new Error(`Data "${key}" terlalu besar untuk disimpan. Unggah ulang fotonya agar tersimpan sebagai berkas, bukan teks.`);
    }
    await d1Query(
      "INSERT INTO state (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v",
      [key, json],
    );
  }
}

/* ---------------- assets (foto) ---------------- */

export async function storeAssetFromBase64(mime: string, b64: string): Promise<string> {
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  const parts = Math.max(1, Math.ceil(b64.length / ASSET_CHUNK));
  for (let i = 0; i < parts; i++) {
    await d1Query(
      "INSERT INTO assets (id, mime, seq, data) VALUES (?, ?, ?, ?) ON CONFLICT (id, seq) DO UPDATE SET mime = excluded.mime, data = excluded.data",
      [id, mime, i, b64.slice(i * ASSET_CHUNK, (i + 1) * ASSET_CHUNK)],
    );
  }
  return `/api/public/asset/${id}`;
}

export async function readAsset(id: string): Promise<{ mime: string; bytes: Uint8Array } | null> {
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) return null;
  const rows = await d1Query("SELECT mime, seq, data FROM assets WHERE id = ? ORDER BY seq", [id]);
  const list = rows[0]?.results ?? [];
  if (!list.length) return null;
  let b64 = "";
  let mime = "image/jpeg";
  for (const row of list) {
    mime = String(row["mime"] ?? mime);
    b64 += String(row["data"] ?? "");
  }
  return { mime, bytes: base64ToBytes(b64) };
}

/** Ganti semua data-URL gambar di dalam struktur data dengan URL aset cloud. */
export async function replaceDataUrls(value: unknown): Promise<unknown> {
  if (typeof value === "string") {
    const m = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(value);
    if (!m) return value;
    return storeAssetFromBase64(m[1]!, m[2]!);
  }
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const item of value) out.push(await replaceDataUrls(item));
    return out;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = await replaceDataUrls(v);
    return out;
  }
  return value;
}
