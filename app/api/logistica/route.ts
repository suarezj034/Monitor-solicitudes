import { NextRequest, NextResponse } from "next/server";
import { loadLogistica } from "@/lib/storage";
import { loadLogisticaApp } from "@/lib/logisticaApp";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import type { LogisticaPayload } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Planilla de transporte: solo requiere el login general (no hace falta
 * código de sector). El middleware ya exige la sesión para llegar acá.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.AUTH_SECRET || "";
  const logueado = secret
    ? await verifySession(req.cookies.get(SESSION_COOKIE)?.value, secret)
    : false;
  if (!logueado) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const [data, appData] = await Promise.all([loadLogistica(), loadLogisticaApp()]);
  const base: LogisticaPayload = data ?? { actualizado: null, total: 0, filas: [] };
  // Se combinan los del Excel con los cargados por el formulario propio.
  const filas = [...base.filas, ...appData.filas];
  const payload: LogisticaPayload = { actualizado: base.actualizado, total: filas.length, filas };

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
