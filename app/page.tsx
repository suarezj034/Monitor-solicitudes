"use client";

import { useEffect, useMemo, useState } from "react";
import type { DataPayload, Solicitud } from "@/lib/types";
import { FORM_COMPRAS_URL, FORM_TRANSPORTE_URL } from "@/lib/forms";
import { UserMenu } from "@/components/UserMenu";

const ESTADO_STYLES: Record<string, string> = {
  PENDIENTE: "bg-amber-100 text-amber-800 ring-amber-200",
  COTIZANDO: "bg-blue-100 text-blue-800 ring-blue-200",
  COTIZACION: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  COMPRADO: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  CANCELADO: "bg-rose-100 text-rose-700 ring-rose-200",
};

function EstadoBadge({ estado }: { estado: string }) {
  if (!estado) return <span className="text-slate-300">—</span>;
  const style = ESTADO_STYLES[estado] ?? "bg-slate-100 text-slate-700 ring-slate-200";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${style}`}
    >
      {estado}
    </span>
  );
}

const CELERIDAD_STYLES: Record<string, string> = {
  URGENTE: "bg-rose-100 text-rose-700 ring-rose-200",
  SEMANA: "bg-amber-100 text-amber-800 ring-amber-200",
  PLANIFICADA: "bg-blue-100 text-blue-800 ring-blue-200",
  RECURRENTE: "bg-indigo-100 text-indigo-800 ring-indigo-200",
};
const CELERIDAD_LABELS: Record<string, string> = {
  URGENTE: "Urgente",
  SEMANA: "Dentro de la semana (7 días hábiles)",
  PLANIFICADA: "Planificada",
  RECURRENTE: "Recurrente",
};
const CELERIDAD_DETALLE_LABELS: Record<string, string> = {
  MENSUAL: "Mensual",
  SEMESTRAL: "Semestral",
};

function textoCeleridad(celeridad?: string, detalle?: string): string {
  if (!celeridad) return "";
  const base = CELERIDAD_LABELS[celeridad] ?? celeridad;
  if (!detalle) return base;
  if (celeridad === "PLANIFICADA") return `${base} · ${detalle} días`;
  if (celeridad === "RECURRENTE") return `${base} · ${CELERIDAD_DETALLE_LABELS[detalle] ?? detalle}`;
  return base;
}

function CeleridadBadge({ celeridad, celeridadDetalle }: { celeridad?: string; celeridadDetalle?: string }) {
  if (!celeridad) return <span className="text-slate-300">—</span>;
  const style = CELERIDAD_STYLES[celeridad] ?? "bg-slate-100 text-slate-700 ring-slate-200";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${style}`}
    >
      {textoCeleridad(celeridad, celeridadDetalle)}
    </span>
  );
}

/** Nombre corto para el botón de un adjunto: el nombre del archivo si se puede. */
function nombreAdjunto(url: string, i: number): string {
  try {
    const u = new URL(url);
    const seg = decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() || "");
    if (seg && /\.[a-z0-9]{2,5}$/i.test(seg)) return seg;
  } catch {
    /* URL rara: caemos al genérico */
  }
  return `Adjunto ${i + 1}`;
}

/** Devuelve las primeras `max` palabras del detalle, con … si fue recortado. */
function resumirDetalle(texto: string, max = 7): string {
  const palabras = texto.split(/\s+/).filter(Boolean);
  if (palabras.length <= max) return texto;
  return palabras.slice(0, max).join(" ") + "…";
}

export default function Home() {
  const [data, setData] = useState<DataPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [sector, setSector] = useState<string>("__todos__");
  const [search, setSearch] = useState("");

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/solicitudes", { cache: "no-store" });
      if (res.status === 403) {
        // La habilitación de sector venció: volver a pedir el código.
        window.location.href = "/sector";
        return;
      }
      const json: DataPayload = await res.json();
      // Blindaje: datos cargados con versiones anteriores pueden no traer
      // fechaRecepcion/adjuntos. Se completan con valores seguros para no
      // romper la vista hasta que se resuba el Excel.
      const filas = (json.filas ?? []).map((f) => ({
        nroSolicitud: f.nroSolicitud ?? "",
        sector: f.sector ?? "",
        detalle: f.detalle ?? "",
        estado: f.estado ?? "",
        oc: f.oc ?? "",
        fechaRecepcion: f.fechaRecepcion ?? "",
        adjuntos: Array.isArray(f.adjuntos) ? f.adjuntos : [],
        solicitante: f.solicitante ?? "",
        origen: f.origen,
        celeridad: f.celeridad,
        celeridadDetalle: f.celeridadDetalle,
        ocArchivo: f.ocArchivo,
      }));
      setData({ ...json, filas });
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  async function cambiarSector() {
    await fetch("/api/sector", { method: "DELETE" });
    window.location.href = "/sector";
  }

  useEffect(() => {
    fetchData();
  }, []);

  const sectores = useMemo(() => {
    const set = new Set<string>();
    data?.filas.forEach((f) => f.sector && set.add(f.sector));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [data]);

  const filas = useMemo<Solicitud[]>(() => {
    let rows = data?.filas ?? [];
    if (sector !== "__todos__") rows = rows.filter((f) => f.sector === sector);
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (f) =>
          f.detalle.toLowerCase().includes(q) ||
          f.oc.toLowerCase().includes(q) ||
          f.estado.toLowerCase().includes(q) ||
          f.nroSolicitud.toLowerCase().includes(q) ||
          f.fechaRecepcion.toLowerCase().includes(q) ||
          f.solicitante.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [data, sector, search]);

  /** true = código maestro: puede ver y filtrar todos los sectores. */
  const esMaestro = data?.sectorActivo === "*";

  const conteoEstados = useMemo(() => {
    const m = new Map<string, number>();
    filas.forEach((f) => {
      if (!f.estado) return;
      m.set(f.estado, (m.get(f.estado) ?? 0) + 1);
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [filas]);

  const actualizado = data?.actualizado
    ? new Date(data.actualizado).toLocaleString("es-AR", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-slate-50">
      {/* Barra superior con logo */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/dromex-logo.svg" alt="DROMEX SRL" className="h-11 w-auto" />
            <div className="hidden h-9 w-px bg-slate-200 sm:block" />
            <div className="hidden sm:block">
              <p className="text-sm font-semibold leading-tight text-slate-800">
                Monitor de Solicitudes
              </p>
              <p className="text-xs leading-tight text-slate-500">Estado de compras</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              title="Actualizar"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              <span className={loading ? "animate-spin" : ""}>⟳</span>
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            <div className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />

            <a
              href="/transporte"
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 shadow-sm transition hover:bg-amber-100"
              title="Ver pedidos de transporte"
            >
              🚚 <span className="hidden sm:inline">Transporte</span>
            </a>
            <a
              href="/solicitud/nueva"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              title="Cargar una nueva solicitud de compra"
            >
              + Nueva solicitud
            </a>

            <UserMenu
              actions={[
                { label: "Cambiar sector", onClick: cambiarSector },
                { label: "Cerrar sesión", onClick: logout, danger: true },
              ]}
            />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* Encabezado */}
        <header className="mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Solicitudes de compra
            </h1>
            {data?.sectorActivo && (
              <span className="inline-flex items-center rounded-full bg-brand-100 px-3 py-1 text-sm font-semibold text-brand-800 ring-1 ring-inset ring-brand-200">
                {esMaestro ? "Todos los sectores" : data.sectorActivo}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {actualizado
              ? `Última actualización: ${actualizado}`
              : "Aún no hay datos cargados."}
          </p>
        </header>

        {/* Accesos a los formularios */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Formularios
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={FORM_COMPRAS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-1 items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 transition hover:border-brand-300 hover:bg-brand-100"
            >
              <span className="text-2xl" aria-hidden="true">
                🛒
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold text-brand-800">
                  Solicitud de compra
                </span>
                <span className="text-xs text-brand-700/70">
                  Abrir formulario ↗
                </span>
              </span>
            </a>

            <a
              href={FORM_TRANSPORTE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-1 items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 transition hover:border-amber-300 hover:bg-amber-100"
            >
              <span className="text-2xl" aria-hidden="true">
                🚚
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold text-amber-800">
                  Pedido de transporte
                </span>
                <span className="text-xs text-amber-700/70">
                  Abrir formulario ↗
                </span>
              </span>
            </a>
          </div>
        </div>

        {/* Resumen por estado */}
        {conteoEstados.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-2">
            {conteoEstados.map(([est, n]) => (
              <span
                key={est}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                  ESTADO_STYLES[est] ?? "bg-slate-100 text-slate-700 ring-slate-200"
                }`}
              >
                {est}
                <span className="rounded-full bg-white/70 px-1.5 py-px text-[11px] font-bold">
                  {n}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Controles */}
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
          {/* El desplegable de sector solo tiene sentido con el código maestro:
              los demás ya vienen filtrados desde el servidor. */}
          {esMaestro && (
            <div className="flex flex-col sm:w-64">
              <label className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Sector
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              >
                <option value="__todos__">Todos los sectores</option>
                {sectores.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-1 flex-col">
            <label className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Buscar
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nº, detalle, OC o estado…"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="bg-brand-700 text-white">
                  <th className="px-4 py-3 text-left font-semibold">Nº (sector)</th>
                  <th className="px-4 py-3 text-left font-semibold">Sector</th>
                  <th className="px-4 py-3 text-left font-semibold">Solicitante</th>
                  <th className="px-4 py-3 text-left font-semibold">Detalle</th>
                  <th className="px-4 py-3 text-left font-semibold">Estado</th>
                  <th className="px-4 py-3 text-left font-semibold">Celeridad</th>
                  <th className="px-4 py-3 text-left font-semibold">OC</th>
                  <th className="px-4 py-3 text-left font-semibold">Fecha estimada de recepción</th>
                  <th className="px-4 py-3 text-left font-semibold">Adjuntos</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                      Cargando…
                    </td>
                  </tr>
                ) : filas.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                      No hay solicitudes para mostrar.
                    </td>
                  </tr>
                ) : (
                  filas.map((f, i) => (
                    <tr key={i} className="odd:bg-white even:bg-slate-50/60 hover:bg-brand-50">
                      <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3 font-mono text-xs text-slate-500">
                        {f.nroSolicitud || "—"}
                      </td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3 font-medium text-slate-700">
                        {f.sector || "—"}
                      </td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-slate-600">
                        {f.solicitante || "—"}
                      </td>
                      <td
                        className="max-w-md border-b border-slate-100 px-4 py-3 text-slate-700"
                        title={f.detalle}
                      >
                        {f.detalle ? resumirDetalle(f.detalle) : "—"}
                      </td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3">
                        <EstadoBadge estado={f.estado} />
                      </td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3">
                        <CeleridadBadge celeridad={f.celeridad} celeridadDetalle={f.celeridadDetalle} />
                      </td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3 font-mono text-xs text-slate-600">
                        {f.oc || "—"}
                        {f.ocArchivo && (
                          <a
                            href={f.ocArchivo}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Ver orden de compra"
                            className="ml-1.5 font-sans text-brand-600 hover:text-brand-800"
                          >
                            📎
                          </a>
                        )}
                      </td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-slate-700">
                        {f.fechaRecepcion || "—"}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        {f.adjuntos.length === 0 ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {f.adjuntos.map((url, k) => {
                              const nombre = nombreAdjunto(url, k);
                              return (
                                <a
                                  key={k}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={nombre}
                                  className="inline-flex max-w-[11rem] items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                                >
                                  <span aria-hidden="true">📎</span>
                                  <span className="truncate">
                                    {f.adjuntos.length > 1 ? `Adjunto ${k + 1}` : "Ver adjunto"}
                                  </span>
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          {filas.length} solicitud{filas.length === 1 ? "" : "es"} mostrada
          {filas.length === 1 ? "" : "s"}
          {data ? ` de ${data.total} en total` : ""}. Pasá el cursor sobre el detalle para verlo completo.
        </p>
      </main>
    </div>
  );
}
