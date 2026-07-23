/**
 * Códigos de acceso por sector.
 *
 * Se configuran con la variable de entorno SECTOR_CODES, en formato:
 *   SECTOR_CODES=PROD:Prod7,MANT:Mant2,Control de calidad:Ctrl3
 *
 * Y un código maestro opcional (ve todos los sectores):
 *   MASTER_CODE=Master6
 */

/** { "PROD": "Prod7", ... } tal como están configurados. */
export function getSectorCodes(): Record<string, string> {
  const raw = process.env.SECTOR_CODES || "";
  const map: Record<string, string> = {};
  for (const parte of raw.split(",")) {
    const i = parte.indexOf(":");
    if (i < 0) continue;
    const sector = parte.slice(0, i).trim();
    const code = parte.slice(i + 1).trim();
    if (sector && code) map[sector] = code;
  }
  return map;
}

/** Nombres de sector disponibles para el desplegable (sin exponer códigos). */
export function getSectoresDisponibles(): string[] {
  return Object.keys(getSectorCodes()).sort((a, b) => a.localeCompare(b, "es"));
}

/**
 * Valida el código ingresado.
 * Devuelve el sector habilitado, "*" si es el maestro, o null si no coincide.
 * La comparación es insensible a mayúsculas para que sea cómodo de tipear.
 */
export function validarCodigo(sector: string, code: string): string | null {
  const codigo = (code ?? "").trim();
  if (!codigo) return null;

  const master = (process.env.MASTER_CODE || "").trim();
  if (master && codigo.toLowerCase() === master.toLowerCase()) return "*";

  const codes = getSectorCodes();
  const esperado = codes[sector];
  if (!esperado) return null;
  if (codigo.toLowerCase() !== esperado.toLowerCase()) return null;
  return sector;
}
