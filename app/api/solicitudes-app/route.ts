import { NextRequest, NextResponse } from "next/server";
import { readSectorToken, SECTOR_COOKIE, TODOS_LOS_SECTORES } from "@/lib/auth";
import { actualizarSolicitudApp, crearSolicitudApp } from "@/lib/solicitudesApp";
import { saveBinary } from "@/lib/storage";
import type { Celeridad } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CELERIDADES: Celeridad[] = ["URGENTE", "SEMANA", "PLANIFICADA", "RECURRENTE"];
const TIPOS_OK = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_ARCHIVOS = 3;

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
  const celeridadDetalle = String(form.get("celeridadDetalle") ?? "").trim() || undefined;

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

  // Presupuestos adjuntos (opcionales, hasta 3).
  const archivos = form.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (archivos.length > MAX_ARCHIVOS) {
    return NextResponse.json(
      { error: `Se pueden adjuntar hasta ${MAX_ARCHIVOS} presupuestos.` },
      { status: 400 }
    );
  }
  const adjuntos: string[] = [];
  for (const file of archivos) {
    if (!TIPOS_OK.has(file.type)) {
      return NextResponse.json(
        { error: "Los presupuestos deben ser PDF o imagen (PNG, JPG, WEBP, GIF)." },
        { status: 400 }
      );
    }
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "Cada archivo debe pesar hasta 15 MB." }, { status: 400 });
    }
    const nombreLimpio = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
    const key = `solicitudes-app/${crypto.randomUUID()}-${nombreLimpio}`;
    await saveBinary(key, new Uint8Array(await file.arrayBuffer()), file.type);
    adjuntos.push(`/api/solicitudes-app/archivo?key=${encodeURIComponent(key)}`);
  }

  const nueva = await crearSolicitudApp({
    solicitante,
    sector,
    detalle,
    celeridad,
    celeridadDetalle,
  });
  if (adjuntos.length > 0) {
    const actualizada = await actualizarSolicitudApp(nueva.nroSolicitud, { adjuntos });
    return NextResponse.json({ ok: true, solicitud: actualizada ?? nueva });
  }
  return NextResponse.json({ ok: true, solicitud: nueva });
}
