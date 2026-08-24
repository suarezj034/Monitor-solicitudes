import { NextRequest, NextResponse } from "next/server";
import { readSectorToken, SECTOR_COOKIE, TODOS_LOS_SECTORES } from "@/lib/auth";
import { crearSolicitudApp } from "@/lib/solicitudesApp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Crea una solicitud de compra desde el formulario propio (requiere sector habilitado). */
export async function POST(req: NextRequest) {
  const secret = process.env.AUTH_SECRET || "";
  const sectorHabilitado = await readSectorToken(req.cookies.get(SECTOR_COOKIE)?.value, secret);
  if (!sectorHabilitado) {
    return NextResponse.json({ error: "Sector no habilitado." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    solicitante?: string;
    detalle?: string;
    sector?: string;
  };
  const solicitante = String(body.solicitante ?? "").replace(/\s+/g, " ").trim();
  const detalle = String(body.detalle ?? "").replace(/\s+/g, " ").trim();

  // Con el código maestro hay que elegir a qué sector corresponde la solicitud.
  const sector =
    sectorHabilitado === TODOS_LOS_SECTORES
      ? String(body.sector ?? "").trim()
      : sectorHabilitado;

  if (!solicitante) {
    return NextResponse.json({ error: "Falta el nombre de quien solicita." }, { status: 400 });
  }
  if (!detalle) {
    return NextResponse.json({ error: "Falta el detalle de la solicitud." }, { status: 400 });
  }
  if (!sector) {
    return NextResponse.json({ error: "Falta el sector." }, { status: 400 });
  }

  const nueva = await crearSolicitudApp({ solicitante, sector, detalle });
  return NextResponse.json({ ok: true, solicitud: nueva });
}
