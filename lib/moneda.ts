import type { Presupuesto } from "./types";

/** Convierte un valor a pesos según la moneda/tipo de cambio del presupuesto. */
function aPesos(valor: number, p: Presupuesto): number | null {
  const m = (p.moneda || "ARS").toUpperCase();
  if (m === "ARS") return valor;
  if (p.tipoCambio && p.tipoCambio > 0) return valor * p.tipoCambio;
  return null; // otra moneda sin tipo de cambio: no comparable
}

/**
 * Monto BRUTO en pesos (tal como figura, con o sin IVA según el documento).
 * Se usa para mostrar el equivalente informativo.
 */
export function montoEnPesos(p: Presupuesto): number | null {
  if (p.monto == null) return null;
  return aPesos(p.monto, p);
}

/**
 * Monto NETO (sin IVA): si el precio incluye IVA, se descuenta la alícuota.
 * Es la base para comparar todas las cotizaciones en igualdad de condiciones.
 */
export function montoNeto(p: Presupuesto): number | null {
  if (p.monto == null) return null;
  if (p.incluyeIva && p.alicuotaIva && p.alicuotaIva > 0) {
    return p.monto / (1 + p.alicuotaIva / 100);
  }
  return p.monto;
}

/** Monto de COMPARACIÓN: neto (sin IVA) convertido a pesos. */
export function montoComparable(p: Presupuesto): number | null {
  const neto = montoNeto(p);
  return neto == null ? null : aPesos(neto, p);
}
