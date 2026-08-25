import { NextRequest, NextResponse } from "next/server";
import {
  verifySession,
  readSectorToken,
  SESSION_COOKIE,
  SECTOR_COOKIE,
} from "@/lib/auth";

/** Rutas que solo requieren estar logueado (no hace falta elegir sector). */
const SIN_SECTOR = [
  "/sector",
  "/admin",
  "/gestion",
  "/transporte",
  "/api/sector",
  "/api/upload",
  "/api/upload-logistica",
  "/api/logout",
  "/api/gestion",
  "/api/logistica",
  "/api/logistica-app",
  "/api/admin",
  "/api/solicitudes-app/archivo",
];

export async function middleware(req: NextRequest) {
  const secret = process.env.AUTH_SECRET || "";
  const { pathname } = req.nextUrl;

  // Los webhooks se autentican con su propio secreto (x-webhook-secret), no
  // con la sesión de usuario: no tiene cookie quien los dispara (Power
  // Automate, etc.).
  if (pathname.startsWith("/api/webhook/")) {
    return NextResponse.next();
  }

  // --- 1) Login general ---
  const logueado = secret
    ? await verifySession(req.cookies.get(SESSION_COOKIE)?.value, secret)
    : false;

  if (!logueado) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // --- 2) Habilitación de sector ---
  if (SIN_SECTOR.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const sector = await readSectorToken(
    req.cookies.get(SECTOR_COOKIE)?.value,
    secret
  );

  if (!sector) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sector no habilitado." }, { status: 403 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/sector";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Protege todo menos: estáticos, login, API de login y los assets del logo.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|dromex-logo.svg|login|api/login).*)",
  ],
};
