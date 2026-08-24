import { NextRequest, NextResponse } from "next/server";

import { adminOk } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET: dólar venta oficial (Banco Nación), vía API pública gratuita. */
export async function GET(req: NextRequest) {
  if (!(await adminOk(req))) {
    return NextResponse.json({ error: "Contraseña de admin incorrecta." }, { status: 401 });
  }
  try {
    const r = await fetch("https://dolarapi.com/v1/dolares/oficial", { cache: "no-store" });
    if (!r.ok) throw new Error(String(r.status));
    const j = (await r.json()) as { venta?: number; fechaActualizacion?: string };
    if (typeof j.venta !== "number") throw new Error("respuesta inesperada");
    return NextResponse.json(
      { venta: j.venta, fecha: j.fechaActualizacion ?? null },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "No se pudo obtener la cotización del dólar. Cargala a mano." },
      { status: 502 }
    );
  }
}
