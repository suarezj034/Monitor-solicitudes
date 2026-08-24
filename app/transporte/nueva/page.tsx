"use client";

import { useState } from "react";

const CELERIDADES = [
  { value: "URGENTE", label: "Urgente", hint: "72 hs a 5-7 días hábiles" },
  { value: "PLANIFICADA", label: "Compra planificada", hint: "Elegí a cuántos días" },
  {
    value: "RECURRENTE",
    label: "Compra recurrente",
    hint: "Se repite en el tiempo (para poder preverla)",
  },
] as const;

const DIAS_PLANIFICADA = ["15", "30", "45", "60"];
const PERIODICIDAD_RECURRENTE = [
  { value: "MENSUAL", label: "Mensual" },
  { value: "SEMESTRAL", label: "Semestral" },
];
const MAX_ARCHIVOS = 3;

export default function NuevoPedidoTransportePage() {
  const [nombre, setNombre] = useState("");
  const [detalle, setDetalle] = useState("");
  const [celeridad, setCeleridad] = useState<string>("URGENTE");
  const [celeridadDetalle, setCeleridadDetalle] = useState<string>("");
  const [tienePresupuesto, setTienePresupuesto] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const form = new FormData();
      form.append("nombre", nombre);
      form.append("detalle", detalle);
      form.append("celeridad", celeridad);
      if (celeridadDetalle) form.append("celeridadDetalle", celeridadDetalle);
      if (tienePresupuesto) files.forEach((f) => form.append("file", f));
      const res = await fetch("/api/logistica-app", { method: "POST", body: form });
      const json = await res.json();
      if (res.ok && json.ok) {
        setOk(`Pedido cargado: ${json.pedido.id}.`);
        setDetalle("");
        setTienePresupuesto(false);
        setFiles([]);
      } else {
        setError(json.error ?? "No se pudo cargar el pedido.");
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-slate-100 px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-4 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/dromex-logo.svg" alt="DROMEX SRL" className="h-11 w-auto" />
          <a
            href="/transporte"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            Volver
          </a>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-7 shadow-lg"
        >
          <div>
            <h1 className="text-lg font-bold text-slate-900">Nuevo pedido de transporte</h1>
            <p className="text-sm text-slate-500">Completá los datos del retiro o entrega.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Nombre de quien solicita
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Detalle</label>
            <textarea
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              rows={4}
              placeholder="Qué hay que retirar/entregar, dirección, referencias del transporte…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              ¿Con qué celeridad se necesita / se debe enviar la OC?
            </label>
            <div className="space-y-2">
              {CELERIDADES.map((c) => (
                <label
                  key={c.value}
                  className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                    celeridad === c.value
                      ? "border-amber-400 bg-amber-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="celeridad"
                    value={c.value}
                    checked={celeridad === c.value}
                    onChange={(e) => {
                      setCeleridad(e.target.value);
                      setCeleridadDetalle("");
                    }}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block font-medium text-slate-800">{c.label}</span>
                    <span className="block text-xs text-slate-500">{c.hint}</span>
                  </span>
                </label>
              ))}
            </div>

            {celeridad === "PLANIFICADA" && (
              <div className="mt-2 flex flex-wrap gap-2">
                {DIAS_PLANIFICADA.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setCeleridadDetalle(d)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                      celeridadDetalle === d
                        ? "border-amber-400 bg-amber-50 font-semibold text-amber-800"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {d} días
                  </button>
                ))}
              </div>
            )}

            {celeridad === "RECURRENTE" && (
              <div className="mt-2 flex flex-wrap gap-2">
                {PERIODICIDAD_RECURRENTE.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setCeleridadDetalle(p.value)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                      celeridadDetalle === p.value
                        ? "border-amber-400 bg-amber-50 font-semibold text-amber-800"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={tienePresupuesto}
                onChange={(e) => {
                  setTienePresupuesto(e.target.checked);
                  if (!e.target.checked) setFiles([]);
                }}
                className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              Ya tengo presupuesto(s) para adjuntar (hasta {MAX_ARCHIVOS})
            </label>
            {tienePresupuesto && (
              <>
                <input
                  type="file"
                  multiple
                  accept=".pdf,image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => {
                    const elegidos = Array.from(e.target.files ?? []);
                    if (elegidos.length > MAX_ARCHIVOS) {
                      setError(`Se pueden adjuntar hasta ${MAX_ARCHIVOS} presupuestos.`);
                      setFiles(elegidos.slice(0, MAX_ARCHIVOS));
                    } else {
                      setError(null);
                      setFiles(elegidos);
                    }
                  }}
                  className="mt-2 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-amber-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-amber-700"
                />
                {files.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-xs text-slate-500">
                    {files.map((f, i) => (
                      <li key={i}>📎 {f.name}</li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Enviando…" : "Enviar pedido"}
          </button>

          {ok && (
            <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
              ✅ {ok}
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
              ⚠️ {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
