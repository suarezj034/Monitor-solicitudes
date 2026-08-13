import { NextRequest, NextResponse } from "next/server";
import {
  deletePresupuesto,
  loadGestion,
  upsertPresupuesto,
} from "@/lib/gestion";
import { IA_HABILITADA } from "@/lib/extract";
import type { Presupuesto } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Valida la contraseña de admin que viaja en el header. */
function adminOk(req: NextRequest): boolean {
  const pass = req.headers.get("x-admin-password") ?? "";
  return !!process.env.ADMIN_PASSWORD && pass === process.env.ADMIN_PASSWORD;
}

/** GET: lista de presupuestos (requiere admin). */
export async function GET(req: NextRequest) {
  if (!adminOk(req)) {
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
  if (!adminOk(req)) {
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
    monto: typeof body.monto === "number" ? body.monto : null,
    moneda: (body.moneda ?? "").trim().toUpperCase(),
    tipoCambio: typeof body.tipoCambio === "number" ? body.tipoCambio : null,
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
  return NextResponse.json({ ok: true, presupuesto: p, total: presupuestos.length });
}

/** DELETE: elimina un presupuesto por id (requiere admin). */
export async function DELETE(req: NextRequest) {
  if (!adminOk(req)) {
    return NextResponse.json({ error: "Contraseña de admin incorrecta." }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id." }, { status: 400 });
  const presupuestos = await deletePresupuesto(id);
  return NextResponse.json({ ok: true, total: presupuestos.length });
}
