import { loadJson, saveJson } from "./storage";
import type { GestionPayload, Presupuesto } from "./types";

const GESTION_KEY = "presupuestos.json";

export async function loadGestion(): Promise<GestionPayload> {
  const data = await loadJson<GestionPayload>(GESTION_KEY);
  return data ?? { actualizado: null, presupuestos: [] };
}

export async function saveGestion(presupuestos: Presupuesto[]): Promise<void> {
  await saveJson(GESTION_KEY, {
    actualizado: new Date().toISOString(),
    presupuestos,
  } satisfies GestionPayload);
}

/** Agrega o actualiza (por id) un presupuesto y persiste. */
export async function upsertPresupuesto(p: Presupuesto): Promise<Presupuesto[]> {
  const { presupuestos } = await loadGestion();
  const i = presupuestos.findIndex((x) => x.id === p.id);
  if (i >= 0) presupuestos[i] = p;
  else presupuestos.push(p);
  await saveGestion(presupuestos);
  return presupuestos;
}

export async function deletePresupuesto(id: string): Promise<Presupuesto[]> {
  const { presupuestos } = await loadGestion();
  const filtrados = presupuestos.filter((x) => x.id !== id);
  await saveGestion(filtrados);
  return filtrados;
}

/** Compara los presupuestos de una solicitud: ordena por monto y calcula ahorro. */
export function compararPorSolicitud(
  presupuestos: Presupuesto[],
  nroSolicitud: string
) {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  const objetivo = norm(nroSolicitud);
  const items = presupuestos
    .filter((p) => norm(p.nroSolicitud) === objetivo)
    .sort((a, b) => (a.monto ?? Infinity) - (b.monto ?? Infinity));

  const conMonto = items.filter((p) => typeof p.monto === "number");
  const masBarato = conMonto[0]?.monto ?? null;
  const masCaro = conMonto.length
    ? conMonto[conMonto.length - 1].monto!
    : null;
  const ahorro =
    masBarato != null && masCaro != null ? masCaro - masBarato : null;

  return { items, masBarato, masCaro, ahorro, monedas: new Set(conMonto.map((p) => p.moneda)) };
}
