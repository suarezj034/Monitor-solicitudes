import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import { leerArchivoUnificado } from "@/lib/archivoLectura";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Sirve un presupuesto adjunto a un pedido de transporte (requiere login general). */
export async function GET(req: NextRequest) {
  const secret = process.env.AUTH_SECRET || "";
  const logueado = secret
    ? await verifySession(req.cookies.get(SESSION_COOKIE)?.value, secret)
    : false;
  if (!logueado) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const key = req.nextUrl.searchParams.get("key") ?? "";
  if (!key.startsWith("logistica-app/") && !key.startsWith("r2:logistica-app/")) {
    return NextResponse.json({ error: "Clave inválida." }, { status: 400 });
  }
  const archivo = await leerArchivoUnificado(key);
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
