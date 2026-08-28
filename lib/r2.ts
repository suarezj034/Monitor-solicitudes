import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

/**
 * Almacenamiento "frío" para documentos de solicitudes/pedidos cerrados hace
 * tiempo (ver lib/archivado.ts). Usa Cloudflare R2 vía su API compatible con
 * S3 — gratis hasta 10 GB y sin costo de bajada (a diferencia de Vercel Blob).
 */

export const R2_HABILITADO = () =>
  !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET
  );

function cliente(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export async function subirAR2(
  key: string,
  bytes: Uint8Array,
  contentType: string
): Promise<void> {
  await cliente().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: bytes,
      ContentType: contentType,
    })
  );
}

export async function leerDeR2(
  key: string
): Promise<{ bytes: Buffer; contentType: string } | null> {
  try {
    const res = await cliente().send(
      new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key })
    );
    if (!res.Body) return null;
    const bytes = Buffer.from(await res.Body.transformToByteArray());
    return { bytes, contentType: res.ContentType || "application/octet-stream" };
  } catch {
    return null;
  }
}

export async function borrarDeR2(key: string): Promise<void> {
  try {
    await cliente().send(
      new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key })
    );
  } catch {
    /* ya no estaba */
  }
}
