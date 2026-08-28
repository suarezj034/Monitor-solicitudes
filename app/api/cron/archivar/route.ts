import { NextRequest, NextResponse } from "next/server";
import { ejecutarArchivado } from "@/lib/archivado";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Corre una vez por día (ver vercel.json). Vercel Cron manda automáticamente
 * el header Authorization: Bearer <CRON_SECRET> cuando esa variable está
 * configurada — así nadie más puede disparar el archivado a mano.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
  }

  const resultado = await ejecutarArchivado();
  return NextResponse.json(resultado);
}
