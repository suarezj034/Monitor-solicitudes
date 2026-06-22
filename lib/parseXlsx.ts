import * as XLSX from "xlsx";
import { normalizeSector } from "./normalize";
import type { Solicitud } from "./types";

const SHEET_NAME = "SOLICITUDES DE COMPRA";

function norm(v: unknown): string {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Parsea el buffer de un .xlsx, lee la hoja "SOLICITUDES DE COMPRA" y devuelve
 * solo las columnas que interesan: SECTOR, DETALLE, ESTADO y OC.
 *
 * El encabezado no está en la primera fila, así que lo localizamos buscando la
 * fila que contiene SECTOR + DETALLE + ESTADO y mapeamos columnas por nombre
 * (más robusto que asumir posiciones fijas).
 */
export function parseSolicitudes(buf: ArrayBuffer): Solicitud[] {
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[SHEET_NAME];
  if (!sheet) {
    throw new Error(
      `No se encontró la hoja "${SHEET_NAME}". Hojas disponibles: ${wb.SheetNames.join(", ")}`
    );
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
  });

  // Localizar la fila de encabezado.
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const cells = (rows[i] ?? []).map((c) => norm(c).toUpperCase());
    if (
      cells.includes("SECTOR") &&
      cells.includes("DETALLE") &&
      cells.includes("ESTADO")
    ) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    throw new Error(
      "No se encontró la fila de encabezado (debe contener SECTOR, DETALLE y ESTADO)."
    );
  }

  const header = (rows[headerIdx] ?? []).map((c) => norm(c).toUpperCase());
  const idx = (name: string) => header.indexOf(name);
  const iNro = header.findIndex((h) => h.includes("SOLICITUD(SECTOR)"));
  const iSector = idx("SECTOR");
  const iDetalle = idx("DETALLE");
  const iEstado = idx("ESTADO");
  const iOc = idx("OC");

  const out: Solicitud[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i] ?? [];
    const nroSolicitud = iNro >= 0 ? norm(r[iNro]) : "";
    const sectorRaw = norm(r[iSector]);
    const detalle = norm(r[iDetalle]);
    const estado = norm(r[iEstado]).toUpperCase();
    const oc = iOc >= 0 ? norm(r[iOc]) : "";

    // Saltar filas totalmente vacías en las columnas de interés.
    if (!nroSolicitud && !sectorRaw && !detalle && !estado && !oc) continue;

    out.push({
      nroSolicitud,
      sector: normalizeSector(sectorRaw),
      detalle,
      estado,
      oc,
    });
  }

  return out;
}
