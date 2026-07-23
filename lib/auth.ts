/**
 * Sesión firmada con HMAC-SHA256 usando Web Crypto (funciona tanto en el
 * middleware de Edge como en rutas Node). El token es: base64url(payload).firma
 */

const enc = new TextEncoder();

function base64url(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  return atob(b64);
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return base64url(new Uint8Array(sig));
}

const DEFAULT_TTL = 60 * 60 * 24 * 7; // 7 días

export async function createSession(
  user: string,
  secret: string,
  ttlSec = DEFAULT_TTL
): Promise<string> {
  const payload = JSON.stringify({
    u: user,
    exp: Math.floor(Date.now() / 1000) + ttlSec,
  });
  const b64 = base64url(enc.encode(payload));
  const sig = await hmac(secret, b64);
  return `${b64}.${sig}`;
}

export async function verifySession(
  token: string | undefined,
  secret: string
): Promise<boolean> {
  if (!token) return false;
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return false;

  const expected = await hmac(secret, b64);
  if (sig !== expected) return false;

  try {
    const payload = JSON.parse(fromBase64url(b64)) as { exp?: number };
    if (typeof payload.exp !== "number") return false;
    if (payload.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

export const SESSION_COOKIE = "session";
export const SECTOR_COOKIE = "sector";

/** Valor que representa "ve todos los sectores" (código maestro). */
export const TODOS_LOS_SECTORES = "*";

/** Cookie firmada que habilita a ver un sector (o todos). */
export async function createSectorToken(
  sector: string,
  secret: string,
  ttlSec = DEFAULT_TTL
): Promise<string> {
  const payload = JSON.stringify({
    s: sector,
    exp: Math.floor(Date.now() / 1000) + ttlSec,
  });
  const b64 = base64url(enc.encode(payload));
  const sig = await hmac(secret, b64);
  return `${b64}.${sig}`;
}

/** Devuelve el sector habilitado, o null si el token es inválido/vencido. */
export async function readSectorToken(
  token: string | undefined,
  secret: string
): Promise<string | null> {
  if (!token) return null;
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return null;

  const expected = await hmac(secret, b64);
  if (sig !== expected) return null;

  try {
    const payload = JSON.parse(fromBase64url(b64)) as { s?: string; exp?: number };
    if (typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return typeof payload.s === "string" && payload.s ? payload.s : null;
  } catch {
    return null;
  }
}
