import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import { crearPedidoApp } from "@/lib/logisticaApp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Crea un pedido de transporte desde el formulario propio (solo login general). */
export async function POST(req: NextRequest) {
  const secret = process.env.AUTH_SECRET || "";
  const logueado = secret
    ? await verifySession(req.cookies.get(SESSION_COOKIE)?.value, secret)
    : false;
  if (!logueado) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    nombre?: string;
    detalle?: string;
  };
  const nombre = String(body.nombre ?? "").replace(/\s+/g, " ").trim();
  const detalle = String(body.detalle ?? "").replace(/\s+/g, " ").trim();

  if (!nombre) {
    return NextResponse.json({ error: "Falta el nombre de quien solicita." }, { status: 400 });
  }
  if (!detalle) {
    return NextResponse.json({ error: "Falta el detalle del pedido." }, { status: 400 });
  }

  const nuevo = await crearPedidoApp({ nombre, detalle });
  return NextResponse.json({ ok: true, pedido: nuevo });
}
