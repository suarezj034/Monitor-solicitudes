import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import { actualizarPedidoApp, crearPedidoApp } from "@/lib/logisticaApp";
import { saveBinary } from "@/lib/storage";
import type { Celeridad } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CELERIDADES: Celeridad[] = ["URGENTE", "SEMANA", "NEGOCIAR"];
const TIPOS_OK = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"]);

/** Crea un pedido de transporte desde el formulario propio (solo login general). */
export async function POST(req: NextRequest) {
  const secret = process.env.AUTH_SECRET || "";
  const logueado = secret
    ? await verifySession(req.cookies.get(SESSION_COOKIE)?.value, secret)
    : false;
  if (!logueado) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const nombre = String(form.get("nombre") ?? "").replace(/\s+/g, " ").trim();
  const detalle = String(form.get("detalle") ?? "").replace(/\s+/g, " ").trim();
  const celeridadRaw = String(form.get("celeridad") ?? "").toUpperCase();
  const celeridad = CELERIDADES.includes(celeridadRaw as Celeridad)
    ? (celeridadRaw as Celeridad)
    : undefined;

  if (!nombre) {
    return NextResponse.json({ error: "Falta el nombre de quien solicita." }, { status: 400 });
  }
  if (!detalle) {
    return NextResponse.json({ error: "Falta el detalle del pedido." }, { status: 400 });
  }

  // Presupuesto adjunto (opcional).
  let key = "";
  const file = form.get("file");
  if (file instanceof File && file.size > 0) {
    if (!TIPOS_OK.has(file.type)) {
      return NextResponse.json(
        { error: "El presupuesto debe ser PDF o imagen (PNG, JPG, WEBP, GIF)." },
        { status: 400 }
      );
    }
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "El archivo supera los 15 MB." }, { status: 400 });
    }
    const nombreLimpio = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
    key = `logistica-app/${crypto.randomUUID()}-${nombreLimpio}`;
    await saveBinary(key, new Uint8Array(await file.arrayBuffer()), file.type);
  }

  const nuevo = await crearPedidoApp({ nombre, detalle, celeridad });
  if (key) {
    const url = `/api/logistica-app/archivo?key=${encodeURIComponent(key)}`;
    const actualizado = await actualizarPedidoApp(nuevo.id, { adjuntos: [url] });
    return NextResponse.json({ ok: true, pedido: actualizado ?? nuevo });
  }
  return NextResponse.json({ ok: true, pedido: nuevo });
}
