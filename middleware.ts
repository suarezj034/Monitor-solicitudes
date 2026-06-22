import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const secret = process.env.AUTH_SECRET || "";
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const ok = secret ? await verifySession(token, secret) : false;

  if (ok) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // Las APIs responden 401; las páginas redirigen al login.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Protege todo menos: estáticos, login, API de login y los assets del logo.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|dromex-logo.svg|login|api/login).*)",
  ],
};
