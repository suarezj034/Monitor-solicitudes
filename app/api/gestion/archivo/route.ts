import { NextRequest, NextResponse } from "next/server";
import { loadBinary } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Sirve un documento guardado (proxy autenticado del Blob privado). */
export async function GET(req: NextRequest) {
  const pass = req.nextUrl.searchParams.get("password") ?? "";
  if (!process.env.ADMIN_PASSWORD || pass !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const key = req.nextUrl.searchParams.get("key") ?? "";
  if (!key.startsWith("gestion/")) {
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
