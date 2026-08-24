import { NextRequest, NextResponse } from "next/server";
import { adminOk } from "@/lib/adminAuth";
import { actualizarPedidoApp } from "@/lib/logisticaApp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Actualiza el estado de un pedido de transporte cargado por el formulario propio. */
export async function PATCH(req: NextRequest) {
  if (!(await adminOk(req))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { id?: string; estado?: string };
  const id = String(body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "Falta el ID del pedido." }, { status: 400 });
  }
  if (typeof body.estado !== "string" || !body.estado.trim()) {
    return NextResponse.json({ error: "Falta el estado." }, { status: 400 });
  }

  const actualizado = await actualizarPedidoApp(id, { estado: body.estado.trim().toUpperCase() });
  if (!actualizado) {
    return NextResponse.json({ error: "No se encontró ese pedido." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, pedido: actualizado });
}
