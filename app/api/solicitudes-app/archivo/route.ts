import { NextRequest, NextResponse } from "next/server";
import { readSectorToken, SECTOR_COOKIE } from "@/lib/auth";
import { adminOk } from "@/lib/adminAuth";
import { loadBinary } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sirve un adjunto de solicitud (presupuesto u OC). Acepta sector habilitado
 * (para quien la ve en el monitor) o sesión de admin (para el panel de
 * gestión, que no siempre tiene cookie de sector).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.AUTH_SECRET || "";
  const sectorHabilitado = await readSectorToken(req.cookies.get(SECTOR_COOKIE)?.value, secret);
  if (!sectorHabilitado && !(await adminOk(req))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  const key = req.nextUrl.searchParams.get("key") ?? "";
  if (!key.startsWith("solicitudes-app/")) {
    return NextResponse.json({ error: "Clave inválida." }, { status: 400 });
  }
  const archivo = await loadBinary(key);
  if (!archivo) {
    return NextResponse.json({ error: "Archivo no encontrado." }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(archivo.bytes), {
    headers: {
      "Content-Type": archivo.contentType,
      "Content-Disposition": "inline",
      "Cache-Control": "no-store",
    },
  });
}
