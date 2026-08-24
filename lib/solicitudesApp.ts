import { loadJson, saveJson } from "./storage";
import type { Solicitud, SolicitudAppPayload } from "./types";

const KEY = "solicitudes-app.json";

export async function loadSolicitudesApp(): Promise<SolicitudAppPayload> {
  const data = await loadJson<SolicitudAppPayload>(KEY);
  return data ?? { siguienteId: 1, filas: [] };
}

/** Crea una nueva solicitud cargada desde el formulario propio. */
export async function crearSolicitudApp(input: {
  solicitante: string;
  sector: string;
  detalle: string;
}): Promise<Solicitud> {
  const { siguienteId, filas } = await loadSolicitudesApp();
  const nueva: Solicitud = {
    nroSolicitud: `S-${siguienteId}`,
    sector: input.sector,
    detalle: input.detalle,
    estado: "PENDIENTE",
    oc: "",
    fechaRecepcion: "",
    adjuntos: [],
    solicitante: input.solicitante,
    origen: "app",
  };
  filas.push(nueva);
  await saveJson(KEY, { siguienteId: siguienteId + 1, filas } satisfies SolicitudAppPayload);
  return nueva;
}

/** Actualiza estado/OC/fecha de una solicitud cargada por la app (progreso de compra). */
export async function actualizarSolicitudApp(
  nroSolicitud: string,
  cambios: Partial<Pick<Solicitud, "estado" | "oc" | "fechaRecepcion">>
): Promise<Solicitud | null> {
  const { siguienteId, filas } = await loadSolicitudesApp();
  const i = filas.findIndex((f) => f.nroSolicitud === nroSolicitud);
  if (i === -1) return null;
  filas[i] = { ...filas[i], ...cambios };
  await saveJson(KEY, { siguienteId, filas } satisfies SolicitudAppPayload);
  return filas[i];
}
