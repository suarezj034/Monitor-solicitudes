/**
 * Normalización de sectores.
 *
 * El Excel trae el campo SECTOR con muchas variantes y, además, con "proyectos"
 * que no son sectores reales (INAME, INVIMA, Remodelación Lavadero, Solicitud
 * vieja...). Esas filas se reasignan al sector del SOLICITANTE, tomando el
 * sector en el que esa persona carga la mayoría de sus pedidos.
 */

/** Los 8 sectores reales del sistema. */
export const SECTORES_CANONICOS = [
  "PROD",
  "MANT",
  "Control de calidad",
  "QA",
  "ADM",
  "RRHH",
  "GG",
  "PRECIOS APIS",
] as const;

/** Siglas que se guardan en mayúscula tal cual vienen. */
const SIGLAS = new Set(["PROD", "MANT", "ADM", "RRHH", "GG", "QA"]);

/**
 * Excepciones por persona para las filas ambiguas.
 * Jonathan Suárez carga pedidos de varios sectores; sus filas de proyecto
 * (chapa de obra en INAME) corresponden a Mantenimiento.
 */
const OVERRIDES_POR_PERSONA: Record<string, string> = {
  "JONATHAN SUAREZ": "MANT",
};

/**
 * Devuelve el sector canónico si la fila trae un sector real,
 * o `null` si es ambiguo (proyecto / solicitud vieja) y hay que
 * resolverlo por el solicitante.
 */
export function clasificarSector(raw: string): string | null {
  const u = (raw ?? "").replace(/\s+/g, " ").trim().toUpperCase();
  if (!u) return null;

  // "CTRL (Adjuntar Archivo de Solicitud)" es la opción del formulario para
  // Control de calidad.
  if (u.startsWith("CTRL")) return "Control de calidad";
  if (u === "CONTROL DE CALIDAD") return "Control de calidad";
  if (u === "PRECIOS APIS") return "PRECIOS APIS";
  if (SIGLAS.has(u)) return u;

  // Ambiguos: SOLICITUD VIEJA, INAME, INVIMA, REMODELACIÓN, u otros nuevos.
  return null;
}

/** Resuelve una fila ambigua usando al solicitante. */
export function resolverPorSolicitante(
  nombre: string,
  sectorDominante: string | null
): string {
  const key = (nombre ?? "").replace(/\s+/g, " ").trim().toUpperCase();
  if (OVERRIDES_POR_PERSONA[key]) return OVERRIDES_POR_PERSONA[key];
  return sectorDominante ?? "Sin asignar";
}
