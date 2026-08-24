import { NextRequest, NextResponse } from "next/server";
import { loadGestion } from "@/lib/gestion";
import { analizarCompra, IA_HABILITADA } from "@/lib/extract";
import { montoComparable } from "@/lib/moneda";
import { adminOk } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { nroSolicitud, refTipo }: evalúa las cotizaciones de esa solicitud con IA. */
export async function POST(req: NextRequest) {
  if (!(await adminOk(req))) {
    return NextResponse.json({ error: "Contraseña de admin incorrecta." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    nroSolicitud?: string;
    refTipo?: string;
  };
  const nro = (body.nroSolicitud ?? "").replace(/\s+/g, " ").trim();
  const refTipo = body.refTipo === "id" ? "id" : "nro";
  if (!nro) {
    return NextResponse.json({ error: "Falta el identificador de la solicitud." }, { status: 400 });
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
    .filter(
      (p) => norm(p.nroSolicitud) === norm(nro) && (p.refTipo === "id" ? "id" : "nro") === refTipo
    )
    .sort((a, b) => (montoComparable(a) ?? Infinity) - (montoComparable(b) ?? Infinity));

  if (items.length === 0) {
    return NextResponse.json(
      { error: `No hay presupuestos cargados para esa solicitud.` },
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
