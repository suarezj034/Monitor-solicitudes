import type { Presupuesto } from "./types";

/**
 * Convierte el monto de un presupuesto a PESOS para poder compararlos.
 * - ARS: se usa tal cual.
 * - USD: se multiplica por el tipo de cambio (dólar venta BNA) capturado al cargar.
 * - Otra moneda sin tipo de cambio: no comparable (null).
 */
export function montoEnPesos(p: Presupuesto): number | null {
  if (p.monto == null) return null;
  const m = (p.moneda || "ARS").toUpperCase();
  if (m === "ARS") return p.monto;
  if (p.tipoCambio && p.tipoCambio > 0) return p.monto * p.tipoCambio;
  return null;
}
