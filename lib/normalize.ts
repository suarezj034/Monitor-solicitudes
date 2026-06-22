/**
 * Normaliza el nombre del SECTOR para usarlo como filtro.
 * El archivo trae ~29 variantes con tipeos e inconsistencias; las agrupamos
 * en un conjunto limpio sin perder distinciones importantes (ej. INAME vs INVIMA).
 */
export function normalizeSector(raw: string): string {
  const s = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!s) return "Sin sector";

  const u = s.toUpperCase();

  if (u.includes("SOLICITUD VIEJA")) return "Solicitud vieja";
  if (u.includes("REMODELAC")) return "Remodelación";
  if (u.startsWith("CTRL")) return "CTRL";
  if (u.includes("INVIMA")) return "INVIMA";
  if (u.includes("INAME")) return "INAME";
  if (u === "CONTROL DE CALIDAD") return "Control de calidad";

  // Siglas / códigos cortos en mayúscula (PROD, ADM, QA, GG, MANT, RRHH, ...)
  if (u.length <= 5) return u;

  return s;
}
