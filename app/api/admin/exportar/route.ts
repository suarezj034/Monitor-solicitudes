import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { adminOk } from "@/lib/adminAuth";
import { loadData } from "@/lib/storage";
import { loadSolicitudesApp } from "@/lib/solicitudesApp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Exporta las solicitudes (Excel original + cargadas por la app) a un .xlsx
 * descargable, para quien quiera tenerlas también en OneDrive/SharePoint/Teams.
 */
export async function GET(req: NextRequest) {
  if (!(await adminOk(req))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const [data, appData] = await Promise.all([loadData(), loadSolicitudesApp()]);
  const filas = [...(data?.filas ?? []), ...appData.filas];

  const rows = filas.map((f) => ({
    "Nº (sector)": f.nroSolicitud,
    Sector: f.sector,
    Solicitante: f.solicitante || "",
    Detalle: f.detalle,
    Estado: f.estado,
    Celeridad: f.celeridad || "",
    OC: f.oc,
    "Fecha estimada de recepción": f.fechaRecepcion,
    "Origen": f.origen === "app" ? "Formulario propio" : "Excel",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 10 },
    { wch: 14 },
    { wch: 20 },
    { wch: 50 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Solicitudes");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  const fecha = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="solicitudes-${fecha}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
