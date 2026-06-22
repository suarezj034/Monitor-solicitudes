import { NextRequest, NextResponse } from "next/server";
import { createSession, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    user?: string;
    password?: string;
  };

  const secret = process.env.AUTH_SECRET;
  const U = process.env.VIEW_USER;
  const P = process.env.VIEW_PASSWORD;

  if (!secret || !U || !P) {
    return NextResponse.json(
      { error: "El servidor no tiene configuradas las credenciales de acceso." },
      { status: 500 }
    );
  }

  if (String(body.user ?? "") !== U || String(body.password ?? "") !== P) {
    return NextResponse.json(
      { error: "Usuario o contraseña incorrectos." },
      { status: 401 }
    );
  }

  const token = await createSession(U, secret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
