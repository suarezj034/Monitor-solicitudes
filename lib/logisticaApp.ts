import { loadJson, saveJson } from "./storage";
import type { Celeridad, Pedido, PedidoAppPayload } from "./types";

const KEY = "logistica-app.json";

export async function loadLogisticaApp(): Promise<PedidoAppPayload> {
  const data = await loadJson<PedidoAppPayload>(KEY);
  return data ?? { siguienteId: 1, filas: [] };
}

/** Crea un nuevo pedido de transporte cargado desde el formulario propio. */
export async function crearPedidoApp(input: {
  nombre: string;
  detalle: string;
  celeridad?: Celeridad;
  celeridadDetalle?: string;
  adjuntos?: string[];
}): Promise<Pedido> {
  const { siguienteId, filas } = await loadLogisticaApp();
  const nuevo: Pedido = {
    id: `T-${siguienteId}`,
    nombre: input.nombre,
    detalle: input.detalle,
    estado: "PENDIENTE",
    origen: "app",
    celeridad: input.celeridad,
    celeridadDetalle: input.celeridadDetalle,
    adjuntos: input.adjuntos ?? [],
  };
  filas.push(nuevo);
  await saveJson(KEY, { siguienteId: siguienteId + 1, filas } satisfies PedidoAppPayload);
  return nuevo;
}

/** Actualiza el estado/adjuntos de un pedido cargado por la app. */
export async function actualizarPedidoApp(
  id: string,
  cambios: Partial<Pick<Pedido, "estado" | "adjuntos">>
): Promise<Pedido | null> {
  const { siguienteId, filas } = await loadLogisticaApp();
  const i = filas.findIndex((f) => f.id === id);
  if (i === -1) return null;
  filas[i] = { ...filas[i], ...cambios };
  await saveJson(KEY, { siguienteId, filas } satisfies PedidoAppPayload);
  return filas[i];
}
