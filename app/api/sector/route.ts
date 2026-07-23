import { NextRequest, NextResponse } from "next/server";
import { createSectorToken, SECTOR_COOKIE } from "@/lib/auth";
import { getSectoresDisponibles, validarCodigo } from "@/lib/sectores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lista de sectores para el desplegable (nunca devuelve los códigos). */
export async function GET() {
  return NextResponse.json(
    { sectores: getSectoresDisponibles() },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/** Valida sector + código y habilita la sesión de sector. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    sector?: string;
    code?: string;
  };

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "El servidor no tiene configurado AUTH_SECRET." },
      { status: 500 }
    );
  }
  if (!process.env.SECTOR_CODES) {
    return NextResponse.json(
      { error: "El servidor no tiene configurados los códigos de sector." },
      { status: 500 }
    );
  }

  const sector = String(body.sector ?? "").trim();
  const code = String(body.code ?? "");

  const habilitado = validarCodigo(sector, code);
  if (!habilitado) {
    return NextResponse.json(
      { error: "El código no corresponde al sector seleccionado." },
      { status: 401 }
    );
  }

  const token = await createSectorToken(habilitado, secret);
  const res = NextResponse.json({ ok: true, sector: habilitado });
  res.cookies.set(SECTOR_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

/** "Cambiar de sector": borra la habilitación actual. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SECTOR_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
