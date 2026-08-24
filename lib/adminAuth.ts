import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, readAdminToken } from "./auth";

/**
 * Autorización de administrador para las rutas de /gestion.
 * Acepta, en orden: la cookie de sesión de admin (dura horas), el header
 * x-admin-password, o el parámetro ?password= (para abrir documentos).
 */
export async function adminOk(req: NextRequest): Promise<boolean> {
  const secret = process.env.AUTH_SECRET || "";
  if (secret) {
    const token = req.cookies.get(ADMIN_COOKIE)?.value;
    if (await readAdminToken(token, secret)) return true;
  }
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) return false;
  if (req.headers.get("x-admin-password") === pass) return true;
  if (req.nextUrl.searchParams.get("password") === pass) return true;
  return false;
}
