import { NextRequest, NextResponse } from "next/server";
import { loadGestion } from "@/lib/gestion";
import { analizarCompra, IA_HABILITADA } from "@/lib/extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function adminOk(req: NextRequest): boolean {
  const pass = req.headers.get("x-admin-password") ?? "";
  return !!process.env.ADMIN_PASSWORD && pass === process.env.ADMIN_PASSWORD;
}

/** POST { nroSolicitud }: evalúa las cotizaciones de esa solicitud con IA. */
export async function POST(req: NextRequest) {
  if (!adminOk(req)) {
    return NextResponse.json({ error: "Contraseña de admin incorrecta." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { nroSolicitud?: string };
  const nro = (body.nroSolicitud ?? "").replace(/\s+/g, " ").trim();
  if (!nro) {
    return NextResponse.json({ error: "Falta el Nº de solicitud." }, { status: 400 });
  }

  if (!IA_HABILITADA()) {
    return NextResponse.json(
      { error: "La evaluación con IA no está configurada (falta GEMINI_API_KEY)." },
      { status: 400 }
    );
  }

  const { presupuestos } = await loadGestion();
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  const items = presupuestos
    .filter((p) => norm(p.nroSolicitud) === norm(nro))
    .sort((a, b) => (a.monto ?? Infinity) - (b.monto ?? Infinity));

  if (items.length === 0) {
    return NextResponse.json(
      { error: `No hay presupuestos cargados para la solicitud ${nro}.` },
      { status: 404 }
    );
  }

  try {
    const analisis = await analizarCompra(items, nro);
    return NextResponse.json({ ok: true, ...analisis });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al evaluar.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
