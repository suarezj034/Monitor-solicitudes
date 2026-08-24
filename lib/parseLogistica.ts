import * as XLSX from "xlsx";
import type { Pedido } from "./types";

function norm(v: unknown): string {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Parsea el .xlsx de logística/transporte. Busca, en cualquier hoja, la fila
 * de encabezado que tenga NOMBRE, ESTADO y una columna de detalle (el título
 * real varía, ej. "DETALLE DE RETIRO/ENTREGA - ..."), y devuelve ID, Nombre,
 * Detalle y Estado.
 */
export function parseLogistica(buf: ArrayBuffer): Pedido[] {
  const wb = XLSX.read(buf, { type: "array", cellDates: true });

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      blankrows: false,
      defval: "",
    });

    let headerIdx = -1;
    let iNombre = -1;
    let iEstado = -1;
    let iDetalle = -1;
    let iId = -1;

    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const cells = (rows[i] ?? []).map((c) => norm(c).toUpperCase());
      const n = cells.indexOf("NOMBRE");
      const e = cells.indexOf("ESTADO");
      const d = cells.findIndex((c) => c.includes("DETALLE"));
      if (n >= 0 && e >= 0 && d >= 0) {
        headerIdx = i;
        iNombre = n;
        iEstado = e;
        iDetalle = d;
        iId = cells.indexOf("ID");
        break;
      }
    }

    if (headerIdx === -1) continue; // esta hoja no tiene el formato esperado

    const filas: Pedido[] = [];
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const r = rows[i] ?? [];
      const nombre = norm(r[iNombre]);
      const detalle = norm(r[iDetalle]);
      const estado = norm(r[iEstado]).toUpperCase();
      const id = iId >= 0 ? norm(r[iId]) : "";
      if (!nombre && !detalle && !estado) continue;
      filas.push({ id, nombre, detalle, estado });
    }
    return filas;
  }

  throw new Error(
    'No se encontró una hoja con columnas "NOMBRE", "ESTADO" y una de detalle.'
  );
}
