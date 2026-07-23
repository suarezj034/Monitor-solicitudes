"use client";

import { useEffect, useMemo, useState } from "react";
import type { DataPayload, Solicitud } from "@/lib/types";

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
      setData(json);
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
          f.nroSolicitud.toLowerCase().includes(q)
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
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
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
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              <span className={loading ? "animate-spin" : ""}>⟳</span>
              Actualizar
            </button>
            <button
              onClick={cambiarSector}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
              title="Elegir otro sector"
            >
              Cambiar sector
            </button>
            <button
              onClick={logout}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
              title="Cerrar sesión"
            >
              Salir
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
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
          <div className="max-h-[70vh] overflow-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-brand-700 text-white">
                  <th className="px-4 py-3 text-left font-semibold">Nº (sector)</th>
                  <th className="px-4 py-3 text-left font-semibold">Sector</th>
                  <th className="px-4 py-3 text-left font-semibold">Detalle</th>
                  <th className="px-4 py-3 text-left font-semibold">Estado</th>
                  <th className="px-4 py-3 text-left font-semibold">OC</th>
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
                      <td
                        className="max-w-md border-b border-slate-100 px-4 py-3 text-slate-700"
                        title={f.detalle}
                      >
                        {f.detalle ? resumirDetalle(f.detalle) : "—"}
                      </td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3">
                        <EstadoBadge estado={f.estado} />
                      </td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3 font-mono text-xs text-slate-600">
                        {f.oc || "—"}
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
