import { NextRequest, NextResponse } from "next/server";
import { adminOk } from "@/lib/adminAuth";
import { actualizarSolicitudApp } from "@/lib/solicitudesApp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Actualiza estado/OC/fecha de una solicitud cargada por el formulario propio. */
export async function PATCH(req: NextRequest) {
  if (!(await adminOk(req))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    nroSolicitud?: string;
    estado?: string;
    oc?: string;
    fechaRecepcion?: string;
  };
  const nroSolicitud = String(body.nroSolicitud ?? "").trim();
  if (!nroSolicitud) {
    return NextResponse.json({ error: "Falta el número de solicitud." }, { status: 400 });
  }

  const cambios: { estado?: string; oc?: string; fechaRecepcion?: string } = {};
  if (typeof body.estado === "string") cambios.estado = body.estado.trim().toUpperCase();
  if (typeof body.oc === "string") cambios.oc = body.oc.trim();
  if (typeof body.fechaRecepcion === "string") cambios.fechaRecepcion = body.fechaRecepcion.trim();

  const actualizada = await actualizarSolicitudApp(nroSolicitud, cambios);
  if (!actualizada) {
    return NextResponse.json({ error: "No se encontró esa solicitud." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, solicitud: actualizada });
}
