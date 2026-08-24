import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import { actualizarPedidoApp, crearPedidoApp } from "@/lib/logisticaApp";
import { saveBinary } from "@/lib/storage";
import type { Celeridad } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CELERIDADES: Celeridad[] = ["URGENTE", "SEMANA", "PLANIFICADA", "RECURRENTE"];
const TIPOS_OK = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_ARCHIVOS = 3;

/** El <input type="date"> manda "aaaa-mm-dd"; lo pasamos a "dd/mm/aaaa" como el resto del sistema. */
function formatFecha(v: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v.trim();
}

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
  const celeridadDetalle = String(form.get("celeridadDetalle") ?? "").trim() || undefined;
  const sector = String(form.get("sector") ?? "").trim() || undefined;
  const fechaCoordinarRaw = String(form.get("fechaCoordinar") ?? "").trim();
  const fechaCoordinar = fechaCoordinarRaw ? formatFecha(fechaCoordinarRaw) : undefined;
  const direccion = String(form.get("direccion") ?? "").trim() || undefined;
  const horarios = String(form.get("horarios") ?? "").trim() || undefined;

  if (!nombre) {
    return NextResponse.json({ error: "Falta el nombre de quien solicita." }, { status: 400 });
  }
  if (!detalle) {
    return NextResponse.json({ error: "Falta el detalle del pedido." }, { status: 400 });
  }

  // Presupuestos adjuntos (opcionales, hasta 3).
  const archivos = form.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (archivos.length > MAX_ARCHIVOS) {
    return NextResponse.json(
      { error: `Se pueden adjuntar hasta ${MAX_ARCHIVOS} presupuestos.` },
      { status: 400 }
    );
  }
  const adjuntos: string[] = [];
  for (const file of archivos) {
    if (!TIPOS_OK.has(file.type)) {
      return NextResponse.json(
        { error: "Los presupuestos deben ser PDF o imagen (PNG, JPG, WEBP, GIF)." },
        { status: 400 }
      );
    }
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "Cada archivo debe pesar hasta 15 MB." }, { status: 400 });
    }
    const nombreLimpio = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
    const key = `logistica-app/${crypto.randomUUID()}-${nombreLimpio}`;
    await saveBinary(key, new Uint8Array(await file.arrayBuffer()), file.type);
    adjuntos.push(`/api/logistica-app/archivo?key=${encodeURIComponent(key)}`);
  }

  const nuevo = await crearPedidoApp({
    nombre,
    detalle,
    celeridad,
    celeridadDetalle,
    sector,
    fechaCoordinar,
    direccion,
    horarios,
  });
  if (adjuntos.length > 0) {
    const actualizado = await actualizarPedidoApp(nuevo.id, { adjuntos });
    return NextResponse.json({ ok: true, pedido: actualizado ?? nuevo });
  }
  return NextResponse.json({ ok: true, pedido: nuevo });
}
