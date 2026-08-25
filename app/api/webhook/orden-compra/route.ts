import { NextRequest, NextResponse } from "next/server";
import { actualizarSolicitudApp, loadSolicitudesApp } from "@/lib/solicitudesApp";
import { saveBinary } from "@/lib/storage";
import { extraerDatosOC, IA_HABILITADA } from "@/lib/extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIPOS_OK = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"]);

/**
 * Webhook para cargar automáticamente la OC de una solicitud, pensado para
 * dispararse desde un flujo de Power Automate ("cuando llega un correo
 * nuevo" a un buzón compartido en copia). No usa cookies: se autentica con
 * un secreto compartido en el header x-webhook-secret.
 *
 * FormData esperado: nroSolicitud (ej. "S-42", tomado del Asunto del mail),
 * file (el adjunto de la OC).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "El servidor no tiene configurado WEBHOOK_SECRET." },
      { status: 500 }
    );
  }
  if (req.headers.get("x-webhook-secret") !== secret) {
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
    return NextResponse.json({ error: "Falta nroSolicitud." }, { status: 400 });
  }

  const { filas } = await loadSolicitudesApp();
  if (!filas.some((f) => f.nroSolicitud === nroSolicitud)) {
    return NextResponse.json(
      { error: `No se encontró la solicitud ${nroSolicitud} entre las cargadas por el formulario propio.` },
      { status: 404 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
  }
  if (!TIPOS_OK.has(file.type)) {
    return NextResponse.json(
      { error: "El adjunto debe ser PDF o imagen (PNG, JPG, WEBP, GIF)." },
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
  let oc: string | undefined;
  if (IA_HABILITADA()) {
    try {
      const b64 = Buffer.from(bytes).toString("base64");
      const datos = await extraerDatosOC(b64, file.type);
      if (datos.fecha) fechaRecepcion = datos.fecha;
      if (datos.numero) oc = datos.numero;
    } catch {
      /* si la IA falla, igual queda guardado el archivo */
    }
  }

  const actualizada = await actualizarSolicitudApp(nroSolicitud, {
    ocArchivo: url,
    ocArchivoNombre: file.name,
    ...(fechaRecepcion ? { fechaRecepcion } : {}),
    ...(oc ? { oc } : {}),
  });

  return NextResponse.json({
    ok: true,
    solicitud: actualizada,
    fechaDetectada: fechaRecepcion ?? null,
    ocDetectada: oc ?? null,
  });
}
