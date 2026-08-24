import { NextRequest, NextResponse } from "next/server";
import { readSectorToken, SECTOR_COOKIE, TODOS_LOS_SECTORES } from "@/lib/auth";
import { actualizarSolicitudApp, crearSolicitudApp } from "@/lib/solicitudesApp";
import { saveBinary } from "@/lib/storage";
import type { Celeridad } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CELERIDADES: Celeridad[] = ["URGENTE", "SEMANA", "NEGOCIAR"];
const TIPOS_OK = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"]);

/** Crea una solicitud de compra desde el formulario propio (requiere sector habilitado). */
export async function POST(req: NextRequest) {
  const secret = process.env.AUTH_SECRET || "";
  const sectorHabilitado = await readSectorToken(req.cookies.get(SECTOR_COOKIE)?.value, secret);
  if (!sectorHabilitado) {
    return NextResponse.json({ error: "Sector no habilitado." }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const solicitante = String(form.get("solicitante") ?? "").replace(/\s+/g, " ").trim();
  const detalle = String(form.get("detalle") ?? "").replace(/\s+/g, " ").trim();
  const celeridadRaw = String(form.get("celeridad") ?? "").toUpperCase();
  const celeridad = CELERIDADES.includes(celeridadRaw as Celeridad)
    ? (celeridadRaw as Celeridad)
    : undefined;

  // Con el código maestro hay que elegir a qué sector corresponde la solicitud.
  const sector =
    sectorHabilitado === TODOS_LOS_SECTORES
      ? String(form.get("sector") ?? "").trim()
      : sectorHabilitado;

  if (!solicitante) {
    return NextResponse.json({ error: "Falta el nombre de quien solicita." }, { status: 400 });
  }
  if (!detalle) {
    return NextResponse.json({ error: "Falta el detalle de la solicitud." }, { status: 400 });
  }
  if (!sector) {
    return NextResponse.json({ error: "Falta el sector." }, { status: 400 });
  }

  // Presupuesto adjunto (opcional).
  let key = "";
  const file = form.get("file");
  if (file instanceof File && file.size > 0) {
    if (!TIPOS_OK.has(file.type)) {
      return NextResponse.json(
        { error: "El presupuesto debe ser PDF o imagen (PNG, JPG, WEBP, GIF)." },
        { status: 400 }
      );
    }
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "El archivo supera los 15 MB." }, { status: 400 });
    }
    const nombreLimpio = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
    key = `solicitudes-app/${crypto.randomUUID()}-${nombreLimpio}`;
    await saveBinary(key, new Uint8Array(await file.arrayBuffer()), file.type);
  }

  const nueva = await crearSolicitudApp({ solicitante, sector, detalle, celeridad });
  if (key) {
    const url = `/api/solicitudes-app/archivo?key=${encodeURIComponent(key)}`;
    const actualizada = await actualizarSolicitudApp(nueva.nroSolicitud, { adjuntos: [url] });
    return NextResponse.json({ ok: true, solicitud: actualizada ?? nueva });
  }
  return NextResponse.json({ ok: true, solicitud: nueva });
}
