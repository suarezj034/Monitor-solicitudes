import { NextRequest, NextResponse } from "next/server";
import {
  deletePresupuesto,
  loadGestion,
  upsertPresupuesto,
} from "@/lib/gestion";
import { IA_HABILITADA } from "@/lib/extract";
import { adminOk } from "@/lib/adminAuth";
import type { Presupuesto } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET: lista de presupuestos (requiere admin). */
export async function GET(req: NextRequest) {
  if (!(await adminOk(req))) {
    return NextResponse.json({ error: "Contraseña de admin incorrecta." }, { status: 401 });
  }
  const data = await loadGestion();
  return NextResponse.json(
    { ...data, iaHabilitada: IA_HABILITADA() },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/** POST: crea o actualiza un presupuesto (requiere admin). */
export async function POST(req: NextRequest) {
  if (!(await adminOk(req))) {
    return NextResponse.json({ error: "Contraseña de admin incorrecta." }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as Partial<Presupuesto>;
  if (!body.nroSolicitud || !body.nroSolicitud.trim()) {
    return NextResponse.json({ error: "Falta el Nº de solicitud." }, { status: 400 });
  }
  const ahora = new Date().toISOString();
  const p: Presupuesto = {
    id: body.id || crypto.randomUUID(),
    nroSolicitud: body.nroSolicitud.trim(),
    proveedor: (body.proveedor ?? "").trim(),
    refTipo: body.refTipo === "id" ? "id" : "nro",
    monto: typeof body.monto === "number" ? body.monto : null,
    moneda: (body.moneda ?? "").trim().toUpperCase(),
    incluyeIva: body.incluyeIva === true,
    alicuotaIva: typeof body.alicuotaIva === "number" ? body.alicuotaIva : null,
    tipoCambio: typeof body.tipoCambio === "number" ? body.tipoCambio : null,
    tipoCambioFecha:
      typeof body.tipoCambioFecha === "string" && body.tipoCambioFecha.trim()
        ? body.tipoCambioFecha.trim()
        : null,
    plazoEntrega: (body.plazoEntrega ?? "").trim(),
    plazoPago: (body.plazoPago ?? "").trim(),
    validez: (body.validez ?? "").trim(),
    detalle: (body.detalle ?? "").trim(),
    notas: (body.notas ?? "").trim(),
    archivoKey: body.archivoKey ?? "",
    archivoNombre: body.archivoNombre ?? "",
    creado: body.creado || ahora,
    actualizado: ahora,
  };
  const presupuestos = await upsertPresupuesto(p);
  // Devolvemos la lista completa para que el cliente no tenga que releerla.
  return NextResponse.json({ ok: true, presupuesto: p, presupuestos, total: presupuestos.length });
}

/** DELETE: elimina un presupuesto por id (requiere admin). */
export async function DELETE(req: NextRequest) {
  if (!(await adminOk(req))) {
    return NextResponse.json({ error: "Contraseña de admin incorrecta." }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id." }, { status: 400 });
  const presupuestos = await deletePresupuesto(id);
  return NextResponse.json({ ok: true, presupuestos, total: presupuestos.length });
}
