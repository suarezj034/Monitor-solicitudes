import { loadJson, saveJson } from "./storage";
import type { Celeridad, Solicitud, SolicitudAppPayload } from "./types";

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
  celeridad?: Celeridad;
  celeridadDetalle?: string;
  adjuntos?: string[];
}): Promise<Solicitud> {
  const { siguienteId, filas } = await loadSolicitudesApp();
  const nueva: Solicitud = {
    nroSolicitud: `S-${siguienteId}`,
    sector: input.sector,
    detalle: input.detalle,
    estado: "PENDIENTE",
    oc: "",
    fechaRecepcion: "",
    adjuntos: input.adjuntos ?? [],
    solicitante: input.solicitante,
    origen: "app",
    celeridad: input.celeridad,
    celeridadDetalle: input.celeridadDetalle,
  };
  filas.push(nueva);
  await saveJson(KEY, { siguienteId: siguienteId + 1, filas } satisfies SolicitudAppPayload);
  return nueva;
}

/** Actualiza estado/OC/fecha/adjuntos de una solicitud cargada por la app. */
export async function actualizarSolicitudApp(
  nroSolicitud: string,
  cambios: Partial<Pick<Solicitud, "estado" | "oc" | "fechaRecepcion" | "adjuntos">>
): Promise<Solicitud | null> {
  const { siguienteId, filas } = await loadSolicitudesApp();
  const i = filas.findIndex((f) => f.nroSolicitud === nroSolicitud);
  if (i === -1) return null;
  filas[i] = { ...filas[i], ...cambios };
  await saveJson(KEY, { siguienteId, filas } satisfies SolicitudAppPayload);
  return filas[i];
}
