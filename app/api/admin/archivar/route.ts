import { NextRequest, NextResponse } from "next/server";
import { adminOk } from "@/lib/adminAuth";
import { ejecutarArchivado } from "@/lib/archivado";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Corre el archivado a demanda desde el panel (además del cron diario automático). */
export async function POST(req: NextRequest) {
  if (!(await adminOk(req))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const resultado = await ejecutarArchivado();
  return NextResponse.json(resultado);
}
