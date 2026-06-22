import type { DataPayload } from "./types";

const BLOB_KEY = "solicitudes.json";

const hasBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;

/** Guarda el payload. Usa Vercel Blob si está configurado; si no, archivo local (dev). */
export async function saveData(data: DataPayload): Promise<void> {
  if (hasBlob()) {
    const { put } = await import("@vercel/blob");
    await put(BLOB_KEY, JSON.stringify(data), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      cacheControlMaxAge: 0,
    });
    return;
  }

  // Fallback de desarrollo local (sin token de Blob).
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const dir = path.join(process.cwd(), ".data");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, BLOB_KEY), JSON.stringify(data), "utf8");
}

/** Lee el último payload guardado, o null si nunca se cargó nada. */
export async function loadData(): Promise<DataPayload | null> {
  if (hasBlob()) {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: BLOB_KEY });
    const blob = blobs.find((b) => b.pathname === BLOB_KEY) ?? blobs[0];
    if (!blob) return null;
    const res = await fetch(blob.url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as DataPayload;
  }

  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const file = path.join(process.cwd(), ".data", BLOB_KEY);
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as DataPayload;
  } catch {
    return null;
  }
}
