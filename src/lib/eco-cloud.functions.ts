import { createServerFn } from "@tanstack/react-start";
import {
  DEFAULT_ADMIN_HASH,
  createToken,
  getAdmin,
  hashPassword,
  loadEcoState,
  replaceDataUrls,
  saveEcoState,
  setAdmin,
  storeAssetFromBase64,
  verifyPassword,
  verifyToken,
} from "./eco-cloud.server";
import { defaultData, type EcoData } from "@/lib/eco-store";

export interface EcoCloudResult {
  ok: boolean;
  hasData: boolean;
  data: EcoData | null;
  defaultLogin: boolean;
  error?: string;
}

/** Public read: seluruh data aplikasi untuk pengunjung & admin dari D1. */
export const getEcoData = createServerFn({ method: "GET" }).handler(async (): Promise<EcoCloudResult> => {
  try {
    const stored = await loadEcoState();
    const admin = await getAdmin();
    const merged = { ...defaultData, ...stored } as EcoData;
    merged.credentials = { username: admin?.username ?? defaultData.credentials.username, password: "" };
    return {
      ok: true,
      hasData: Object.keys(stored).some((k) => k !== "auth_secret"),
      data: merged,
      defaultLogin: admin ? admin.passwordHash === DEFAULT_ADMIN_HASH : true,
    };
  } catch (error) {
    console.error("getEcoData failed:", error);
    return { ok: false, hasData: false, data: null, defaultLogin: false, error: "Tidak dapat terhubung ke penyimpanan Cloudflare." };
  }
});

export const loginAdmin = createServerFn({ method: "POST" })
  .inputValidator((input: { username?: unknown; password?: unknown }) => input)
  .handler(async ({ data }) => {
    try {
      const username = typeof data.username === "string" ? data.username.trim() : "";
      const password = typeof data.password === "string" ? data.password : "";
      if (!username || !password) return { ok: false, error: "Username dan password wajib diisi." };
      const admin = await getAdmin(username);
      if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
        return { ok: false, error: "Username atau password salah!" };
      }
      return { ok: true, token: await createToken(admin.username), username: admin.username };
    } catch (error) {
      console.error("loginAdmin failed:", error);
      return { ok: false, error: "Tidak dapat terhubung ke penyimpanan Cloudflare." };
    }
  });

export const checkSession = createServerFn({ method: "POST" })
  .inputValidator((input: { token?: unknown }) => input)
  .handler(async ({ data }) => {
    try {
      const username = await verifyToken(typeof data.token === "string" ? data.token : null);
      return username ? { ok: true, username } : { ok: false };
    } catch {
      return { ok: false };
    }
  });

export const saveEcoData = createServerFn({ method: "POST" })
  .inputValidator((input: { token?: unknown; data?: unknown }) => input)
  .handler(async ({ data }) => {
    try {
      const username = await verifyToken(typeof data.token === "string" ? data.token : null);
      if (!username) return { ok: false, error: "Sesi admin berakhir. Silakan login kembali." };
      if (!data.data || typeof data.data !== "object") return { ok: false, error: "Data tidak valid." };
      const clean = (await replaceDataUrls(data.data)) as EcoData;
      const entries: Record<string, unknown> = { ...clean };
      delete entries.credentials;
      await saveEcoState(entries);
      return { ok: true, data: clean };
    } catch (error) {
      console.error("saveEcoData failed:", error);
      return { ok: false, error: error instanceof Error ? error.message : "Gagal menyimpan ke Cloudflare." };
    }
  });

export const changeCredentials = createServerFn({ method: "POST" })
  .inputValidator((input: { token?: unknown; username?: unknown; password?: unknown }) => input)
  .handler(async ({ data }) => {
    try {
      const current = await verifyToken(typeof data.token === "string" ? data.token : null);
      if (!current) return { ok: false, error: "Sesi admin berakhir. Silakan login kembali." };
      const username = typeof data.username === "string" ? data.username.trim() : "";
      const password = typeof data.password === "string" ? data.password : "";
      if (!username) return { ok: false, error: "Username tidak boleh kosong." };
      if (password.length < 6) return { ok: false, error: "Password minimal 6 karakter!" };
      await setAdmin(current, username, await hashPassword(password));
      return { ok: true, username };
    } catch (error) {
      console.error("changeCredentials failed:", error);
      return { ok: false, error: error instanceof Error ? error.message : "Gagal memperbarui akun admin." };
    }
  });

export const uploadAsset = createServerFn({ method: "POST" })
  .inputValidator((input: { token?: unknown; dataUrl?: unknown }) => input)
  .handler(async ({ data }) => {
    try {
      const username = await verifyToken(typeof data.token === "string" ? data.token : null);
      if (!username) return { ok: false, error: "Sesi admin berakhir. Silakan login kembali." };
      if (typeof data.dataUrl !== "string") return { ok: false, error: "Foto tidak valid." };
      const m = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(data.dataUrl);
      if (!m) return { ok: false, error: "Format foto tidak didukung." };
      return { ok: true, url: await storeAssetFromBase64(m[1]!, m[2]!) };
    } catch (error) {
      console.error("uploadAsset failed:", error);
      return { ok: false, error: error instanceof Error ? error.message : "Gagal mengunggah foto." };
    }
  });
