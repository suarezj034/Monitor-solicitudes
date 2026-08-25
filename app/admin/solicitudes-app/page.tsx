"use client";

import { useEffect, useMemo, useState } from "react";
import type { Pedido, Solicitud } from "@/lib/types";

const ESTADOS_COMPRA = ["PENDIENTE", "COTIZANDO", "COTIZACION", "COMPRADO", "CANCELADO"];
const ESTADOS_TRANSPORTE = ["PENDIENTE", "CONFIRMADO", "CANCELADO"];
const CELERIDAD_LABELS: Record<string, string> = {
  URGENTE: "Urgente",
  SEMANA: "Dentro de la semana",
  PLANIFICADA: "Planificada",
  RECURRENTE: "Recurrente",
};
const CELERIDAD_DETALLE_LABELS: Record<string, string> = {
  MENSUAL: "Mensual",
  SEMESTRAL: "Semestral",
};

function textoCeleridad(celeridad?: string, detalle?: string): string {
  if (!celeridad) return "—";
  const base = CELERIDAD_LABELS[celeridad] ?? celeridad;
  if (!detalle) return base;
  if (celeridad === "PLANIFICADA") return `${base} (${detalle}d)`;
  if (celeridad === "RECURRENTE") return `${base} (${CELERIDAD_DETALLE_LABELS[detalle] ?? detalle})`;
  return base;
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function contarPor<T>(items: T[], clave: (x: T) => string): [string, number][] {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = clave(it) || "—";
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
}

export default function AdminSolicitudesAppPage() {
  const [pass, setPass] = useState("");
  const [authed, setAuthed] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  async function cargarResumen() {
    const res = await fetch("/api/admin/resumen", { cache: "no-store" });
    if (!res.ok) return false;
    const json = await res.json();
    setSolicitudes(json.solicitudes ?? []);
    setPedidos(json.pedidos ?? []);
    return true;
  }

  useEffect(() => {
    (async () => {
      try {
        if (await cargarResumen()) setAuthed(true);
      } catch {
        /* sin sesión: se muestra el login */
      } finally {
        setVerificando(false);
      }
    })();
  }, []);

  async function ingresar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/gestion/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pass }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No se pudo ingresar.");
        return;
      }
      await cargarResumen();
      setAuthed(true);
    } finally {
      setBusy(false);
    }
  }

  const solicitudesApp = useMemo(() => solicitudes.filter((s) => s.origen === "app"), [solicitudes]);
  const pedidosApp = useMemo(() => pedidos.filter((p) => p.origen === "app"), [pedidos]);

  async function guardarSolicitud(nroSolicitud: string, cambios: Partial<Solicitud>) {
    await fetch("/api/admin/solicitudes-app", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nroSolicitud, ...cambios }),
    });
    await cargarResumen();
  }

  async function guardarPedido(id: string, estado: string) {
    await fetch("/api/admin/logistica-app", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, estado }),
    });
    await cargarResumen();
  }

  const [subiendoOC, setSubiendoOC] = useState<string | null>(null);
  const [avisoOC, setAvisoOC] = useState<Record<string, string>>({});
  /** Nº de solicitud cuya fecha/OC se acaba de completar sola con IA (para resaltarla hasta que la confirmen). */
  const [fechaSugerida, setFechaSugerida] = useState<Record<string, boolean>>({});
  const [ocSugerida, setOcSugerida] = useState<Record<string, boolean>>({});

  /** Sube el documento de la OC; si hay IA, completa solos el número y la fecha estimada de recepción. */
  async function subirOC(nroSolicitud: string, file: File) {
    setSubiendoOC(nroSolicitud);
    try {
      const form = new FormData();
      form.append("nroSolicitud", nroSolicitud);
      form.append("file", file);
      const res = await fetch("/api/admin/solicitudes-app/oc", { method: "POST", body: form });
      const json = await res.json();
      if (res.ok && json.ok) {
        const fecha = json.solicitud?.fechaRecepcion;
        const oc = json.solicitud?.oc;
        const detectado = [oc && `OC ${oc}`, fecha && `entrega ${fecha}`].filter(Boolean).join(", ");
        setAvisoOC((m) => ({
          ...m,
          [nroSolicitud]: detectado
            ? `Detectado: ${detectado}. Revisá y confirmá →`
            : json.avisoIA || "OC cargada.",
        }));
        // Se actualiza el estado local al toque (no hace falta esperar el
        // refetch) para que los recuadros se completen de inmediato.
        if (json.solicitud) {
          setSolicitudes((prev) =>
            prev.map((s) => (s.nroSolicitud === nroSolicitud ? { ...s, ...json.solicitud } : s))
          );
        }
        if (fecha) setFechaSugerida((m) => ({ ...m, [nroSolicitud]: true }));
        if (oc) setOcSugerida((m) => ({ ...m, [nroSolicitud]: true }));
      } else {
        setAvisoOC((m) => ({ ...m, [nroSolicitud]: json.error ?? "No se pudo subir la OC." }));
      }
    } finally {
      setSubiendoOC(null);
    }
  }

  if (!authed && verificando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-slate-100 text-sm text-slate-400">
        Cargando…
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-slate-100 px-4">
        <form
          onSubmit={ingresar}
          className="w-full max-w-sm space-y-5 rounded-2xl border border-slate-200 bg-white p-7 shadow-lg"
        >
          <h1 className="text-lg font-bold text-slate-900">Panel de gestión</h1>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Contraseña de administrador
            </label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Ingresando…" : "Ingresar"}
          </button>
          {error && (
            <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
              ⚠️ {error}
            </div>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-slate-50">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/dromex-logo.svg" alt="DROMEX SRL" className="h-11 w-auto" />
            <div className="hidden h-9 w-px bg-slate-200 sm:block" />
            <div className="hidden sm:block">
              <p className="text-sm font-semibold leading-tight text-slate-800">
                Panel de gestión
              </p>
              <p className="text-xs leading-tight text-slate-500">Solicitudes y transporte</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/api/admin/exportar"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
              title="Descargar todas las solicitudes en Excel"
            >
              ⬇️ Descargar Excel
            </a>
            <a
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              ← Ingesta de datos
            </a>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Reportes y avance
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Lo cargado con los formularios propios, por sector y por estado.
          </p>
        </header>

      {/* Reportes */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Compras — {solicitudes.length} en total ({solicitudesApp.length} cargadas por la app)
        </h2>
        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {contarPor(solicitudes, (s) => s.estado).map(([k, n]) => (
            <Stat key={k} label={k} value={n} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {contarPor(solicitudes, (s) => s.sector)
            .slice(0, 8)
            .map(([k, n]) => (
              <Stat key={k} label={k} value={n} />
            ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Transporte — {pedidos.length} en total ({pedidosApp.length} cargados por la app)
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {contarPor(pedidos, (p) => p.estado).map(([k, n]) => (
            <Stat key={k} label={k} value={n} />
          ))}
        </div>
      </section>

      {/* Solicitudes de compra cargadas por la app: hacerlas avanzar */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold text-slate-900">
          Solicitudes de compra a gestionar ({solicitudesApp.length})
        </h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="bg-brand-700 text-white">
                  <th className="px-3 py-2 text-left font-semibold">Nº</th>
                  <th className="px-3 py-2 text-left font-semibold">Sector</th>
                  <th className="px-3 py-2 text-left font-semibold">Solicitante</th>
                  <th className="px-3 py-2 text-left font-semibold">Detalle</th>
                  <th className="px-3 py-2 text-left font-semibold">Celeridad</th>
                  <th className="px-3 py-2 text-left font-semibold">Presup.</th>
                  <th className="px-3 py-2 text-left font-semibold">Estado</th>
                  <th className="px-3 py-2 text-left font-semibold">OC</th>
                  <th className="px-3 py-2 text-left font-semibold">Archivo OC</th>
                  <th className="px-3 py-2 text-left font-semibold">Fecha estimada recep.</th>
                  <th className="px-3 py-2 text-left font-semibold">Cotizar</th>
                </tr>
              </thead>
              <tbody>
                {solicitudesApp.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-8 text-center text-slate-400">
                      No hay solicitudes cargadas por la app todavía.
                    </td>
                  </tr>
                ) : (
                  solicitudesApp.map((s) => (
                    <tr key={s.nroSolicitud} className="odd:bg-white even:bg-slate-50/60">
                      <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2 font-mono text-xs text-slate-500">
                        {s.nroSolicitud}
                      </td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2">{s.sector}</td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2">
                        {s.solicitante || "—"}
                      </td>
                      <td className="max-w-xs border-b border-slate-100 px-3 py-2" title={s.detalle}>
                        {s.detalle}
                      </td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2 text-xs">
                        {textoCeleridad(s.celeridad, s.celeridadDetalle)}
                      </td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2 text-xs">
                        {(s.adjuntos ?? []).length === 0 ? (
                          "—"
                        ) : (
                          <div className="flex gap-1">
                            {(s.adjuntos ?? []).map((url, k) => (
                              <a
                                key={k}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-brand-700 underline hover:text-brand-800"
                              >
                                Ver {k + 1}
                              </a>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        <select
                          defaultValue={s.estado}
                          onChange={(e) => guardarSolicitud(s.nroSolicitud, { estado: e.target.value })}
                          className="rounded border border-slate-300 px-2 py-1 text-xs"
                        >
                          {ESTADOS_COMPRA.map((e) => (
                            <option key={e} value={e}>
                              {e}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        <input
                          key={`${s.nroSolicitud}:oc:${s.oc}`}
                          defaultValue={s.oc}
                          onBlur={(e) => {
                            guardarSolicitud(s.nroSolicitud, { oc: e.target.value });
                            setOcSugerida((m) => {
                              if (!m[s.nroSolicitud]) return m;
                              const copia = { ...m };
                              delete copia[s.nroSolicitud];
                              return copia;
                            });
                          }}
                          title={
                            ocSugerida[s.nroSolicitud]
                              ? "Completado por IA a partir de la OC: revisalo y confirmá (hacé click afuera para confirmar)."
                              : undefined
                          }
                          className={`w-24 rounded border px-2 py-1 text-xs ${
                            ocSugerida[s.nroSolicitud]
                              ? "border-amber-400 bg-amber-50 ring-1 ring-amber-300"
                              : "border-slate-300"
                          }`}
                        />
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">
                          {subiendoOC === s.nroSolicitud ? "Subiendo…" : "📎 Subir"}
                          <input
                            type="file"
                            accept=".pdf,image/png,image/jpeg,image/webp,image/gif"
                            className="hidden"
                            disabled={subiendoOC === s.nroSolicitud}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) subirOC(s.nroSolicitud, f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        {s.ocArchivo && (
                          <a
                            href={s.ocArchivo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1 font-medium text-brand-700 underline hover:text-brand-800"
                          >
                            Ver
                          </a>
                        )}
                        {avisoOC[s.nroSolicitud] && (
                          <p
                            className={`mt-1 max-w-[10rem] text-[10px] ${
                              fechaSugerida[s.nroSolicitud] || ocSugerida[s.nroSolicitud]
                                ? "font-medium text-amber-700"
                                : "text-slate-500"
                            }`}
                          >
                            {avisoOC[s.nroSolicitud]}
                          </p>
                        )}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        <input
                          key={`${s.nroSolicitud}:${s.fechaRecepcion}`}
                          defaultValue={s.fechaRecepcion}
                          placeholder="dd/mm/aaaa"
                          onBlur={(e) => {
                            guardarSolicitud(s.nroSolicitud, { fechaRecepcion: e.target.value });
                            setFechaSugerida((m) => {
                              if (!m[s.nroSolicitud]) return m;
                              const copia = { ...m };
                              delete copia[s.nroSolicitud];
                              return copia;
                            });
                          }}
                          title={
                            fechaSugerida[s.nroSolicitud]
                              ? "Completada por IA a partir de la OC: revisala y confirmá (hacé click afuera para confirmar)."
                              : undefined
                          }
                          className={`w-24 rounded border px-2 py-1 text-xs ${
                            fechaSugerida[s.nroSolicitud]
                              ? "border-amber-400 bg-amber-50 ring-1 ring-amber-300"
                              : "border-slate-300"
                          }`}
                        />
                      </td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2">
                        <a
                          href={`/gestion?nro=${encodeURIComponent(s.nroSolicitud)}`}
                          className="text-xs font-medium text-brand-700 underline hover:text-brand-800"
                        >
                          Cargar cotización →
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pedidos de transporte cargados por la app */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">
          Pedidos de transporte a gestionar ({pedidosApp.length})
        </h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="bg-amber-700 text-white">
                  <th className="px-3 py-2 text-left font-semibold">ID</th>
                  <th className="px-3 py-2 text-left font-semibold">Nombre</th>
                  <th className="px-3 py-2 text-left font-semibold">Sector</th>
                  <th className="px-3 py-2 text-left font-semibold">A coordinar</th>
                  <th className="px-3 py-2 text-left font-semibold">Detalle</th>
                  <th className="px-3 py-2 text-left font-semibold">Celeridad</th>
                  <th className="px-3 py-2 text-left font-semibold">Presup.</th>
                  <th className="px-3 py-2 text-left font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {pedidosApp.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-slate-400">
                      No hay pedidos cargados por la app todavía.
                    </td>
                  </tr>
                ) : (
                  pedidosApp.map((p) => (
                    <tr key={p.id} className="odd:bg-white even:bg-slate-50/60">
                      <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2 font-mono text-xs text-slate-500">
                        {p.id}
                      </td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2">{p.nombre}</td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2 text-xs">
                        {p.sector || "—"}
                      </td>
                      <td
                        className="whitespace-nowrap border-b border-slate-100 px-3 py-2 text-xs"
                        title={p.direccion || ""}
                      >
                        {p.fechaCoordinar || "—"}
                        {p.horarios ? ` · ${p.horarios}` : ""}
                      </td>
                      <td className="max-w-md border-b border-slate-100 px-3 py-2" title={p.detalle}>
                        {p.detalle}
                      </td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2 text-xs">
                        {textoCeleridad(p.celeridad, p.celeridadDetalle)}
                      </td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2 text-xs">
                        {(p.adjuntos ?? []).length === 0 ? (
                          "—"
                        ) : (
                          <div className="flex gap-1">
                            {(p.adjuntos ?? []).map((url, k) => (
                              <a
                                key={k}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-brand-700 underline hover:text-brand-800"
                              >
                                Ver {k + 1}
                              </a>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        <select
                          defaultValue={p.estado}
                          onChange={(e) => guardarPedido(p.id, e.target.value)}
                          className="rounded border border-slate-300 px-2 py-1 text-xs"
                        >
                          {ESTADOS_TRANSPORTE.map((e) => (
                            <option key={e} value={e}>
                              {e}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      </main>
    </div>
  );
}
