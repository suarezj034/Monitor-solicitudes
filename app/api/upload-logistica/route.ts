import { NextRequest, NextResponse } from "next/server";
import { parseLogistica } from "@/lib/parseLogistica";
import { saveLogistica } from "@/lib/storage";
import type { LogisticaPayload } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const password = String(form.get("password") ?? "");
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "El servidor no tiene configurada ADMIN_PASSWORD." },
      { status: 500 }
    );
  }
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
  }

  try {
    const buf = await file.arrayBuffer();
    const filas = parseLogistica(buf);
    const payload: LogisticaPayload = {
      actualizado: new Date().toISOString(),
      total: filas.length,
      filas,
    };
    await saveLogistica(payload);
    return NextResponse.json({
      ok: true,
      total: payload.total,
      actualizado: payload.actualizado,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al procesar el archivo.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
