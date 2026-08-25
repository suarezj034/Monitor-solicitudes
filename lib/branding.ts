/**
 * Marca blanca: nombre y logo del cliente que usa esta instalación.
 *
 * Para adaptar el sistema a un cliente nuevo NO hace falta tocar código:
 *   1) Reemplazar public/logo.svg por el logo del cliente (mismo nombre
 *      de archivo), o setear NEXT_PUBLIC_LOGO_URL con la URL del logo.
 *   2) Setear NEXT_PUBLIC_COMPANY_NAME con la razón social.
 *   3) Si hace falta, ajustar la paleta "brand" en tailwind.config.ts al
 *      color institucional del cliente.
 *
 * Estas variables llevan el prefijo NEXT_PUBLIC_ porque se usan tanto en
 * componentes de servidor como de cliente (los `"use client"` solo pueden
 * leer variables de entorno con ese prefijo).
 */
export const EMPRESA_NOMBRE = process.env.NEXT_PUBLIC_COMPANY_NAME || "Tu Empresa";
export const LOGO_SRC = process.env.NEXT_PUBLIC_LOGO_URL || "/logo.svg";
