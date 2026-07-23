/**
 * Normalización de sectores.
 *
 * El Excel trae el campo SECTOR con muchas variantes y, además, con "proyectos"
 * que no son sectores reales (INAME, INVIMA, Remodelación Lavadero, Solicitud
 * vieja...). Esas filas se reasignan al sector del SOLICITANTE, tomando el
 * sector en el que esa persona carga la mayoría de sus pedidos.
 */

/** Sectores reales del sistema. */
export const SECTORES_CANONICOS = [
  "PROD",
  "MANT",
  "Control de calidad",
  "QA",
  "ADM",
  "RRHH",
  "GG",
  "PRECIOS APIS",
  "Depósito",
  "DESA",
] as const;

/** Siglas que se guardan en mayúscula tal cual vienen. */
const SIGLAS = new Set(["PROD", "MANT", "ADM", "RRHH", "GG", "QA", "DESA"]);

/**
 * Textos que NO son sectores sino proyectos o pedidos históricos: se resuelven
 * mirando quién los pidió.
 */
const PATRONES_PROYECTO = [
  "SOLICITUD VIEJA",
  "REMODELAC",
  "INAME",
  "INVIMA",
];

/**
 * Excepciones por persona para las filas ambiguas.
 * Jonathan Suárez carga pedidos de varios sectores; sus filas de proyecto
 * (chapa de obra en INAME) corresponden a Mantenimiento.
 */
const OVERRIDES_POR_PERSONA: Record<string, string> = {
  "JONATHAN SUAREZ": "MANT",
};

/** Normaliza espacios, mayúsculas y acentos para poder comparar. */
function clave(raw: string): string {
  return (raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Devuelve el sector canónico si la fila trae un sector real,
 * o `null` si hay que resolverlo por otro camino.
 */
export function clasificarSector(raw: string): string | null {
  const u = clave(raw);
  if (!u) return null;

  // "CTRL (Adjuntar Archivo de Solicitud)" es la opción del formulario para
  // Control de calidad.
  if (u.startsWith("CTRL")) return "Control de calidad";
  if (u === "CONTROL DE CALIDAD") return "Control de calidad";
  if (u === "PRECIOS APIS") return "PRECIOS APIS";
  // Depósito llega abreviado como "Depo".
  if (u === "DEPO" || u === "DEPOSITO") return "Depósito";
  if (SIGLAS.has(u)) return u;

  return null;
}

/**
 * true si el texto es un proyecto/pedido histórico, o una celda que combina
 * varios sectores ("Control de calidad / Producción"). En ambos casos no es un
 * sector real y se resuelve mirando quién lo pidió.
 */
export function esProyecto(raw: string): boolean {
  const u = clave(raw);
  if (!u) return false;
  if (u.includes("/")) return true;
  return PATRONES_PROYECTO.some((p) => u.includes(p));
}

/** Clave para comparar sectores sin importar mayúsculas ni acentos. */
export function claveSector(raw: string): string {
  return clave(raw);
}

/** Resuelve una fila ambigua usando al solicitante. */
export function resolverPorSolicitante(
  nombre: string,
  sectorDominante: string | null
): string {
  const key = clave(nombre);
  if (OVERRIDES_POR_PERSONA[key]) return OVERRIDES_POR_PERSONA[key];
  return sectorDominante ?? "Sin asignar";
}

/**
 * Etiqueta para un sector que no conocemos todavía: se conserva tal cual vino
 * (limpio) para que quede visible y se pueda dar de alta, en vez de perderse
 * dentro de "Sin asignar".
 */
export function etiquetaDesconocida(raw: string): string {
  const limpio = (raw ?? "").replace(/\s+/g, " ").trim();
  return limpio || "Sin asignar";
}
