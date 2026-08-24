import { NextRequest, NextResponse } from "next/server";
import { adminOk } from "@/lib/adminAuth";
import { loadData, loadLogistica } from "@/lib/storage";
import { loadSolicitudesApp } from "@/lib/solicitudesApp";
import { loadLogisticaApp } from "@/lib/logisticaApp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vista admin: todas las solicitudes y pedidos (Excel + cargados por la app),
 * para el panel de gestión de progreso y los reportes.
 */
export async function GET(req: NextRequest) {
  if (!(await adminOk(req))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const [excelSolicitudes, appSolicitudes, excelLogistica, appLogistica] = await Promise.all([
    loadData(),
    loadSolicitudesApp(),
    loadLogistica(),
    loadLogisticaApp(),
  ]);

  const solicitudes = [...(excelSolicitudes?.filas ?? []), ...appSolicitudes.filas];
  const pedidos = [...(excelLogistica?.filas ?? []), ...appLogistica.filas];

  return NextResponse.json(
    { solicitudes, pedidos },
    { headers: { "Cache-Control": "no-store" } }
  );
}
