import * as XLSX from "xlsx";
import {
  clasificarSector,
  esProyecto,
  etiquetaDesconocida,
  resolverPorSolicitante,
} from "./normalize";
import type { Solicitud } from "./types";

const SHEET_NAME = "SOLICITUDES DE COMPRA";

function norm(v: unknown): string {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

/** Formatea una fecha (dd/mm/aaaa). Si no es fecha, devuelve el texto tal cual. */
function formatFecha(v: unknown): string {
  if (v instanceof Date && !isNaN(v.getTime())) {
    const d = String(v.getDate()).padStart(2, "0");
    const m = String(v.getMonth() + 1).padStart(2, "0");
    return `${d}/${m}/${v.getFullYear()}`;
  }
  return norm(v);
}

/** Extrae las URLs de una celda (una o varias separadas por ";"). */
function parseAdjuntos(v: unknown): string[] {
  return norm(v)
    .split(";")
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s));
}

interface FilaCruda {
  nombre: string;
  sectorRaw: string;
  nroSolicitud: string;
  detalle: string;
  estado: string;
  oc: string;
  fechaRecepcion: string;
  adjuntos: string[];
}

/**
 * Parsea el .xlsx (hoja "SOLICITUDES DE COMPRA") y devuelve las columnas de
 * interés con el sector ya normalizado.
 *
 * Se hace en dos pasadas:
 *   1) se leen todas las filas y se calcula, por persona, en qué sector real
 *      carga la mayoría de sus solicitudes;
 *   2) las filas con sector ambiguo (proyectos, "solicitud vieja") se asignan
 *      al sector dominante de quien las pidió.
 */
export function parseSolicitudes(buf: ArrayBuffer): Solicitud[] {
  // cellDates: las celdas de fecha llegan como Date (para formatearlas bien).
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
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
  const iNombre = idx("NOMBRE");
  const iSector = idx("SECTOR");
  const iDetalle = idx("DETALLE");
  const iEstado = idx("ESTADO");
  const iOc = idx("OC");
  // "Fecha estimada Recep" (columna nueva, puede venir vacía).
  const iFechaRecep = header.findIndex(
    (h) => h.includes("FECHA ESTIMADA") && h.includes("RECEP")
  );

  // Columna de adjuntos: el encabezado no es confiable (Forms deja los archivos
  // en una columna mal rotulada), así que la detectamos por CONTENIDO: la que
  // tiene más celdas que son una URL. Se excluyen las columnas ya mapeadas
  // (DETALLE puede traer links dentro del texto).
  const conocidas = new Set(
    [iNro, iNombre, iSector, iDetalle, iEstado, iOc, iFechaRecep].filter((x) => x >= 0)
  );
  const anchoMax = rows.reduce((m, r) => Math.max(m, (r ?? []).length), 0);
  let iAdjuntos = -1;
  let mejorConteo = 0;
  for (let c = 0; c < anchoMax; c++) {
    if (conocidas.has(c)) continue;
    let count = 0;
    for (let i = headerIdx + 1; i < rows.length; i++) {
      if (/^https?:\/\//i.test(norm((rows[i] ?? [])[c]))) count++;
    }
    if (count > mejorConteo) {
      mejorConteo = count;
      iAdjuntos = c;
    }
  }

  // --- Pasada 1: leer filas ---
  const crudas: FilaCruda[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i] ?? [];
    const fila: FilaCruda = {
      nombre: iNombre >= 0 ? norm(r[iNombre]) : "",
      sectorRaw: norm(r[iSector]),
      nroSolicitud: iNro >= 0 ? norm(r[iNro]) : "",
      detalle: norm(r[iDetalle]),
      estado: norm(r[iEstado]).toUpperCase(),
      oc: iOc >= 0 ? norm(r[iOc]) : "",
      fechaRecepcion: iFechaRecep >= 0 ? formatFecha(r[iFechaRecep]) : "",
      adjuntos: iAdjuntos >= 0 ? parseAdjuntos(r[iAdjuntos]) : [],
    };
    // Saltar filas totalmente vacías en las columnas de interés.
    if (
      !fila.nroSolicitud &&
      !fila.sectorRaw &&
      !fila.detalle &&
      !fila.estado &&
      !fila.oc
    ) {
      continue;
    }
    crudas.push(fila);
  }

  // --- Sector dominante por persona (solo con sectores reales) ---
  const conteo = new Map<string, Map<string, number>>();
  for (const f of crudas) {
    const sector = clasificarSector(f.sectorRaw);
    if (!sector) continue;
    const persona = f.nombre.toUpperCase();
    if (!conteo.has(persona)) conteo.set(persona, new Map());
    const m = conteo.get(persona)!;
    m.set(sector, (m.get(sector) ?? 0) + 1);
  }

  const dominante = (nombre: string): string | null => {
    const m = conteo.get(nombre.toUpperCase());
    if (!m || m.size === 0) return null;
    let mejor: string | null = null;
    let max = -1;
    for (const [sector, c] of m) {
      if (c > max) {
        max = c;
        mejor = sector;
      }
    }
    return mejor;
  };

  // --- Pasada 2: resolver ambiguos ---
  const resolver = (f: FilaCruda): string => {
    // 1) Sector real reconocido.
    const canon = clasificarSector(f.sectorRaw);
    if (canon) return canon;

    // 2) Proyecto ("Solicitud vieja", INAME, INVIMA, Remodelación) o celda
    //    vacía: se asigna al sector donde esa persona pide habitualmente.
    if (!f.sectorRaw || esProyecto(f.sectorRaw)) {
      return resolverPorSolicitante(f.nombre, dominante(f.nombre));
    }

    // 3) Sector nuevo que todavía no conocemos: se conserva su nombre para que
    //    quede a la vista y se le pueda dar de alta un código de acceso.
    return etiquetaDesconocida(f.sectorRaw);
  };

  return crudas.map((f) => ({
    nroSolicitud: f.nroSolicitud,
    sector: resolver(f),
    detalle: f.detalle,
    estado: f.estado,
    oc: f.oc,
    fechaRecepcion: f.fechaRecepcion,
    adjuntos: f.adjuntos,
    solicitante: f.nombre,
  }));
}
