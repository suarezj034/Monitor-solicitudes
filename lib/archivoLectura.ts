import { loadBinary } from "./storage";
import { leerDeR2 } from "./r2";

const PREFIJO_FRIO = "r2:";

/**
 * Lee un adjunto sin importar dónde vive: si la clave está marcada como
 * archivada ("r2:...") lo busca en el almacenamiento frío (R2); si no, en
 * Vercel Blob de siempre. Usado por los proxies que sirven presupuestos/OC.
 */
export async function leerArchivoUnificado(
  key: string
): Promise<{ bytes: Buffer; contentType: string } | null> {
  if (key.startsWith(PREFIJO_FRIO)) {
    return leerDeR2(key.slice(PREFIJO_FRIO.length));
  }
  return loadBinary(key);
}
