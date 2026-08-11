import { NextRequest, NextResponse } from "next/server";
import { saveBinary } from "@/lib/storage";
import { extraerDatos, IA_HABILITADA } from "@/lib/extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function adminOk(req: NextRequest, pass: string): boolean {
  return !!process.env.ADMIN_PASSWORD && pass === process.env.ADMIN_PASSWORD;
}

const TIPOS_OK = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

/**
 * Sube un documento y (opcional) lo lee con IA.
 * FormData: password, file, leer ("1" para extraer con IA).
 */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  if (!adminOk(req, String(form.get("password") ?? ""))) {
    return NextResponse.json({ error: "Contraseña de admin incorrecta." }, { status: 401 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "El archivo supera los 20 MB." }, { status: 400 });
  }

  const tipo = file.type || "application/octet-stream";
  const bytes = new Uint8Array(await file.arrayBuffer());

  // Guardar el documento (mejor esfuerzo; no bloquea si falla el storage local).
  const nombreLimpio = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
  const key = `gestion/${crypto.randomUUID()}-${nombreLimpio}`;
  let archivoKey = "";
  try {
    await saveBinary(key, bytes, tipo);
    archivoKey = key;
  } catch {
    archivoKey = "";
  }

  // Extracción con IA (opcional).
  const quiereLeer = String(form.get("leer") ?? "") === "1";
  let datos = null;
  let errorIA: string | null = null;
  if (quiereLeer) {
    if (!IA_HABILITADA()) {
      errorIA = "La lectura con IA no está configurada (falta ANTHROPIC_API_KEY).";
    } else if (!TIPOS_OK.has(tipo)) {
      errorIA = "La IA solo lee PDF o imágenes (PNG, JPG, WEBP, GIF).";
    } else {
      try {
        const b64 = Buffer.from(bytes).toString("base64");
        datos = await extraerDatos(b64, tipo);
      } catch (e) {
        errorIA = e instanceof Error ? e.message : "Error al leer el documento.";
      }
    }
  }

  return NextResponse.json({
    ok: true,
    archivoKey,
    archivoNombre: file.name,
    datos,
    errorIA,
    iaHabilitada: IA_HABILITADA(),
  });
}
