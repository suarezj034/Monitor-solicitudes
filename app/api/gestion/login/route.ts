import { NextRequest, NextResponse } from "next/server";
import { createAdminToken, ADMIN_COOKIE } from "@/lib/auth";
import { loadGestion } from "@/lib/gestion";
import { IA_HABILITADA } from "@/lib/extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { password }: valida la clave de admin y deja una cookie de sesión (8 h). */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { password?: string };
  const secret = process.env.AUTH_SECRET;
  const pass = process.env.ADMIN_PASSWORD;

  if (!secret || !pass) {
    return NextResponse.json(
      { error: "El servidor no tiene configurada la sesión de admin." },
      { status: 500 }
    );
  }
  if (String(body.password ?? "") !== pass) {
    return NextResponse.json({ error: "Contraseña de admin incorrecta." }, { status: 401 });
  }

  const data = await loadGestion();
  const token = await createAdminToken(secret);
  const res = NextResponse.json({
    ok: true,
    iaHabilitada: IA_HABILITADA(),
    ...data,
  });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}

/** DELETE: cierra la sesión de admin. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
