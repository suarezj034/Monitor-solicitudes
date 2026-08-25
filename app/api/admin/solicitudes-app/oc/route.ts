import { NextRequest, NextResponse } from "next/server";
import { adminOk } from "@/lib/adminAuth";
import { actualizarSolicitudApp, loadSolicitudesApp } from "@/lib/solicitudesApp";
import { saveBinary } from "@/lib/storage";
import { extraerFechaOC, IA_HABILITADA } from "@/lib/extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIPOS_OK = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"]);

/**
 * Sube el documento de la orden de compra (OC) de una solicitud cargada por la
 * app. Si la IA está habilitada, lee la fecha estimada de recepción y la
 * completa automáticamente en la solicitud.
 */
export async function POST(req: NextRequest) {
  if (!(await adminOk(req))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const nroSolicitud = String(form.get("nroSolicitud") ?? "").trim();
  if (!nroSolicitud) {
    return NextResponse.json({ error: "Falta el número de solicitud." }, { status: 400 });
  }

  const { filas } = await loadSolicitudesApp();
  if (!filas.some((f) => f.nroSolicitud === nroSolicitud)) {
    return NextResponse.json(
      { error: "Esa solicitud no está cargada por el formulario propio." },
      { status: 404 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
  }
  if (!TIPOS_OK.has(file.type)) {
    return NextResponse.json(
      { error: "La OC debe ser PDF o imagen (PNG, JPG, WEBP, GIF)." },
      { status: 400 }
    );
  }
  if (file.size > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "El archivo supera los 15 MB." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const nombreLimpio = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
  const key = `solicitudes-app/oc/${crypto.randomUUID()}-${nombreLimpio}`;
  await saveBinary(key, bytes, file.type);
  const url = `/api/solicitudes-app/archivo?key=${encodeURIComponent(key)}`;

  let fechaRecepcion: string | undefined;
  let avisoIA: string | null = null;
  if (IA_HABILITADA()) {
    try {
      const b64 = Buffer.from(bytes).toString("base64");
      const fecha = await extraerFechaOC(b64, file.type);
      if (fecha) fechaRecepcion = fecha;
      else avisoIA = "La IA no encontró una fecha de entrega en el documento.";
    } catch (e) {
      avisoIA = e instanceof Error ? e.message : "No se pudo leer la fecha con IA.";
    }
  }

  const actualizada = await actualizarSolicitudApp(nroSolicitud, {
    ocArchivo: url,
    ocArchivoNombre: file.name,
    ...(fechaRecepcion ? { fechaRecepcion } : {}),
  });

  return NextResponse.json({ ok: true, solicitud: actualizada, avisoIA });
}
