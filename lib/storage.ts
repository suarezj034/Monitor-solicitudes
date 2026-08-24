import type { DataPayload, LogisticaPayload } from "./types";

const BLOB_KEY = "solicitudes.json";
const LOGISTICA_BLOB_KEY = "logistica.json";

const hasBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;

/**
 * Guarda un objeto JSON en Vercel Blob (store privado) bajo la clave `key`.
 * En desarrollo, sin token de Blob, cae a ./.data/<key>.
 */
export async function saveJson(key: string, data: unknown): Promise<void> {
  if (hasBlob()) {
    const { put } = await import("@vercel/blob");
    await put(key, JSON.stringify(data), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 0,
    });
    return;
  }

  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const dir = path.join(process.cwd(), ".data");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, key), JSON.stringify(data), "utf8");
}

/** Lee un objeto JSON guardado bajo `key`, o null si no existe. */
export async function loadJson<T>(key: string): Promise<T | null> {
  if (hasBlob()) {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: key });
    const blob = blobs.find((b) => b.pathname === key) ?? blobs[0];
    if (!blob) return null;
    const res = await fetch(blob.url, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  }

  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const file = path.join(process.cwd(), ".data", key);
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Guarda un archivo binario (documento subido) bajo `key`. */
export async function saveBinary(
  key: string,
  bytes: Uint8Array,
  contentType: string
): Promise<void> {
  if (hasBlob()) {
    const { put } = await import("@vercel/blob");
    await put(key, Buffer.from(bytes), {
      access: "private",
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 0,
    });
    return;
  }
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const file = path.join(process.cwd(), ".data", key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, bytes);
}

/** Lee un archivo binario guardado bajo `key`, o null si no existe. */
export async function loadBinary(
  key: string
): Promise<{ bytes: Buffer; contentType: string } | null> {
  if (hasBlob()) {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: key });
    const blob = blobs.find((b) => b.pathname === key) ?? blobs[0];
    if (!blob) return null;
    const res = await fetch(blob.url, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return { bytes: buf, contentType: res.headers.get("content-type") || "application/octet-stream" };
  }
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  try {
    const buf = await fs.readFile(path.join(process.cwd(), ".data", key));
    return { bytes: buf, contentType: "application/octet-stream" };
  } catch {
    return null;
  }
}

/** Datos de las solicitudes (fuente: Excel subido por el admin). */
export async function saveData(data: DataPayload): Promise<void> {
  await saveJson(BLOB_KEY, data);
}

export async function loadData(): Promise<DataPayload | null> {
  return loadJson<DataPayload>(BLOB_KEY);
}

/** Datos de la planilla de logística/transporte (fuente: Excel subido por el admin). */
export async function saveLogistica(data: LogisticaPayload): Promise<void> {
  await saveJson(LOGISTICA_BLOB_KEY, data);
}

export async function loadLogistica(): Promise<LogisticaPayload | null> {
  return loadJson<LogisticaPayload>(LOGISTICA_BLOB_KEY);
}
