import { loadSolicitudesApp, actualizarSolicitudApp } from "./solicitudesApp";
import { loadLogisticaApp, actualizarPedidoApp } from "./logisticaApp";
import { loadBinary, deleteBinary } from "./storage";
import { subirAR2, R2_HABILITADO } from "./r2";

/**
 * Plan "Base" vs. "Ampliado": lo controla el operador (no el cliente) con
 * RETENCION_ARCHIVOS en las variables de entorno de cada instalación.
 *   - Sin definir o "0": retención ilimitada (plan Ampliado) — no se purga nada.
 *   - Un número de días (ej. "30"): a partir de esa antigüedad, los documentos
 *     de compras/pedidos ya cerrados se mueven a almacenamiento frío (R2).
 */
export function diasRetencion(): number {
  const n = Number(process.env.RETENCION_ARCHIVOS ?? "0");
  return Number.isFinite(n) && n > 0 ? n : 0;
}

const PREFIJO_FRIO = "r2:";

function diasDesdeFecha(ddmmaaaa: string | null | undefined): number | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((ddmmaaaa ?? "").trim());
  if (!m) return null;
  const fecha = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  if (isNaN(fecha.getTime())) return null;
  return Math.floor((Date.now() - fecha.getTime()) / 86_400_000);
}

function extraerKeyDeUrl(url: string): string | null {
  const marca = "?key=";
  const i = url.indexOf(marca);
  if (i === -1) return null;
  try {
    return decodeURIComponent(url.slice(i + marca.length));
  } catch {
    return null;
  }
}

/** Mueve un archivo (por su URL de proxy) de Vercel Blob a R2; devuelve la nueva URL, o null si no hacía falta/no se pudo. */
async function archivarUnArchivo(url: string, rutaProxy: string): Promise<string | null> {
  const key = extraerKeyDeUrl(url);
  if (!key || key.startsWith(PREFIJO_FRIO)) return null; // sin key reconocible, o ya está frío
  const archivo = await loadBinary(key);
  if (!archivo) return null;
  await subirAR2(key, archivo.bytes, archivo.contentType);
  await deleteBinary(key);
  const nuevaKey = PREFIJO_FRIO + key;
  return `${rutaProxy}?key=${encodeURIComponent(nuevaKey)}`;
}

export interface ResultadoArchivado {
  /** false = retención ilimitada (RETENCION_ARCHIVOS sin configurar): no se hizo nada. */
  habilitado: boolean;
  solicitudesRevisadas: number;
  solicitudesArchivadas: number;
  pedidosRevisados: number;
  pedidosArchivados: number;
  errores: string[];
}

/** Recorre solicitudes/pedidos cerrados hace más de RETENCION_ARCHIVOS días y mueve sus adjuntos a R2. */
export async function ejecutarArchivado(): Promise<ResultadoArchivado> {
  const dias = diasRetencion();
  const resultado: ResultadoArchivado = {
    habilitado: dias > 0,
    solicitudesRevisadas: 0,
    solicitudesArchivadas: 0,
    pedidosRevisados: 0,
    pedidosArchivados: 0,
    errores: [],
  };
  if (dias === 0) return resultado; // plan Ampliado: sin purga

  if (!R2_HABILITADO()) {
    resultado.errores.push(
      "RETENCION_ARCHIVOS está configurado pero faltan las variables de Cloudflare R2 (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET)."
    );
    return resultado;
  }

  // --- Solicitudes de compra ---
  const { filas: solicitudes } = await loadSolicitudesApp();
  for (const s of solicitudes) {
    if (s.estado !== "COMPRADO") continue;
    const edad = diasDesdeFecha(s.fechaRecepcion);
    if (edad === null || edad < dias) continue;

    resultado.solicitudesRevisadas++;
    let cambio = false;

    const adjuntos: string[] = [];
    for (const url of s.adjuntos ?? []) {
      try {
        const nueva = await archivarUnArchivo(url, "/api/solicitudes-app/archivo");
        if (nueva) {
          adjuntos.push(nueva);
          cambio = true;
        } else {
          adjuntos.push(url);
        }
      } catch (e) {
        resultado.errores.push(`Solicitud ${s.nroSolicitud}: ${e instanceof Error ? e.message : "error"}`);
        adjuntos.push(url);
      }
    }

    let ocArchivo = s.ocArchivo;
    if (ocArchivo) {
      try {
        const nueva = await archivarUnArchivo(ocArchivo, "/api/solicitudes-app/archivo");
        if (nueva) {
          ocArchivo = nueva;
          cambio = true;
        }
      } catch (e) {
        resultado.errores.push(`Solicitud ${s.nroSolicitud} (OC): ${e instanceof Error ? e.message : "error"}`);
      }
    }

    if (cambio) {
      await actualizarSolicitudApp(s.nroSolicitud, { adjuntos, ...(ocArchivo ? { ocArchivo } : {}) });
      resultado.solicitudesArchivadas++;
    }
  }

  // --- Pedidos de transporte ---
  const { filas: pedidos } = await loadLogisticaApp();
  for (const p of pedidos) {
    if (p.estado !== "CONFIRMADO") continue; // equivalente a "cerrado" en transporte
    const edad = diasDesdeFecha(p.fechaCoordinar);
    if (edad === null || edad < dias) continue;

    resultado.pedidosRevisados++;
    let cambio = false;

    const adjuntos: string[] = [];
    for (const url of p.adjuntos ?? []) {
      try {
        const nueva = await archivarUnArchivo(url, "/api/logistica-app/archivo");
        if (nueva) {
          adjuntos.push(nueva);
          cambio = true;
        } else {
          adjuntos.push(url);
        }
      } catch (e) {
        resultado.errores.push(`Pedido ${p.id}: ${e instanceof Error ? e.message : "error"}`);
        adjuntos.push(url);
      }
    }

    if (cambio) {
      await actualizarPedidoApp(p.id, { adjuntos });
      resultado.pedidosArchivados++;
    }
  }

  return resultado;
}
