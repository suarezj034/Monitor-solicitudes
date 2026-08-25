"use client";

import { useEffect, useMemo, useState } from "react";
import type { LogisticaPayload, Pedido } from "@/lib/types";

const ESTADO_STYLES: Record<string, string> = {
  PENDIENTE: "bg-amber-100 text-amber-800 ring-amber-200",
  CONFIRMADO: "bg-emerald-100 text-emerald-800 ring-emerald-200",
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

export default function TransportePage() {
  const [data, setData] = useState<LogisticaPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/logistica", { cache: "no-store" });
      const json: LogisticaPayload = await res.json();
      const filas = (json.filas ?? []).map((f) => ({
        id: f.id ?? "",
        nombre: f.nombre ?? "",
        detalle: f.detalle ?? "",
        estado: f.estado ?? "",
        celeridad: f.celeridad,
        celeridadDetalle: f.celeridadDetalle,
        adjuntos: Array.isArray(f.adjuntos) ? f.adjuntos : [],
      }));
      setData({ ...json, filas });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const filas = useMemo<Pedido[]>(() => {
    let rows = data?.filas ?? [];
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter((f) => f.nombre.toLowerCase().includes(q));
    return rows;
  }, [data, search]);

  const actualizado = data?.actualizado
    ? new Date(data.actualizado).toLocaleString("es-AR", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-slate-50">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/dromex-logo.svg" alt="DROMEX SRL" className="h-11 w-auto" />
            <div className="hidden h-9 w-px bg-slate-200 sm:block" />
            <div className="hidden sm:block">
              <p className="text-sm font-semibold leading-tight text-slate-800">Transporte</p>
              <p className="text-xs leading-tight text-slate-500">Estado de pedidos de logística</p>
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
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              🛒 <span className="hidden sm:inline">Solicitudes</span>
            </a>
            <a
              href="/transporte/nueva"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              + Nuevo pedido
            </a>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Pedidos de transporte
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {actualizado ? `Última actualización: ${actualizado}` : "Aún no hay datos cargados."}
          </p>
        </header>

        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col sm:max-w-xs">
            <label className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Buscar por nombre
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre de quien pidió…"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="bg-brand-700 text-white">
                  <th className="px-4 py-3 text-left font-semibold">Nombre</th>
                  <th className="px-4 py-3 text-left font-semibold">Detalle</th>
                  <th className="px-4 py-3 text-left font-semibold">Estado</th>
                  <th className="px-4 py-3 text-left font-semibold">Celeridad</th>
                  <th className="px-4 py-3 text-left font-semibold">Presupuesto</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                      Cargando…
                    </td>
                  </tr>
                ) : filas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                      No hay pedidos para mostrar.
                    </td>
                  </tr>
                ) : (
                  filas.map((f, i) => (
                    <tr key={f.id || i} className="odd:bg-white even:bg-slate-50/60 hover:bg-brand-50">
                      <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3 font-medium text-slate-700">
                        {f.nombre || "—"}
                      </td>
                      <td className="max-w-xl border-b border-slate-100 px-4 py-3 text-slate-700" title={f.detalle}>
                        {f.detalle || "—"}
                      </td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3">
                        <EstadoBadge estado={f.estado} />
                      </td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3">
                        <CeleridadBadge celeridad={f.celeridad} celeridadDetalle={f.celeridadDetalle} />
                      </td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3">
                        {(f.adjuntos ?? []).length === 0 ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {(f.adjuntos ?? []).map((url, k) => (
                              <a
                                key={k}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                              >
                                📎 Ver
                              </a>
                            ))}
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
          {filas.length} pedido{filas.length === 1 ? "" : "s"} mostrado{filas.length === 1 ? "" : "s"}
          {data ? ` de ${data.total} en total` : ""}.
        </p>
      </main>
    </div>
  );
}
