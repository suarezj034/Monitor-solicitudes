import { NextRequest, NextResponse } from "next/server";
import { loadData } from "@/lib/storage";
import { readSectorToken, SECTOR_COOKIE, TODOS_LOS_SECTORES } from "@/lib/auth";
import { claveSector } from "@/lib/normalize";
import type { DataPayload } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.AUTH_SECRET || "";
  const sectorHabilitado = await readSectorToken(
    req.cookies.get(SECTOR_COOKIE)?.value,
    secret
  );

  // Sin sector habilitado no se devuelve ningún dato.
  if (!sectorHabilitado) {
    return NextResponse.json(
      { error: "Sector no habilitado." },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  const data = await loadData();
  const base: DataPayload = data ?? { actualizado: null, total: 0, filas: [] };

  // IMPORTANTE: el filtrado se hace acá, en el servidor. Al navegador solo
  // viajan las filas del sector habilitado.
  const objetivo = claveSector(sectorHabilitado);
  const filas =
    sectorHabilitado === TODOS_LOS_SECTORES
      ? base.filas
      : base.filas.filter((f) => claveSector(f.sector) === objetivo);

  const payload: DataPayload = {
    actualizado: base.actualizado,
    total: filas.length,
    filas,
    sectorActivo: sectorHabilitado,
  };

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
