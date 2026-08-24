"use client";

import { useEffect, useState } from "react";
import type { DataPayload } from "@/lib/types";

export default function NuevaSolicitudPage() {
  const [sectorActivo, setSectorActivo] = useState<string | null>(null);
  const [sectores, setSectores] = useState<string[]>([]);
  const [sector, setSector] = useState("");
  const [solicitante, setSolicitante] = useState("");
  const [detalle, setDetalle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const esMaestro = sectorActivo === "*";

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/solicitudes", { cache: "no-store" });
        const json: DataPayload = await res.json();
        setSectorActivo(json.sectorActivo ?? null);
        if (json.sectorActivo === "*") {
          const r = await fetch("/api/sector", { cache: "no-store" });
          const j = await r.json();
          setSectores(j.sectores ?? []);
        }
      } catch {
        /* se muestra el formulario igual; el POST validará el sector */
      }
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/solicitudes-app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ solicitante, detalle, sector: esMaestro ? sector : undefined }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setOk(`Solicitud cargada: Nº ${json.solicitud.nroSolicitud}.`);
        setDetalle("");
      } else {
        setError(json.error ?? "No se pudo cargar la solicitud.");
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
            href="/"
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
            <h1 className="text-lg font-bold text-slate-900">Nueva solicitud de compra</h1>
            <p className="text-sm text-slate-500">
              {esMaestro
                ? "Elegí el sector y completá los datos."
                : sectorActivo
                ? `Se carga para el sector: ${sectorActivo}.`
                : "Cargando sector…"}
            </p>
          </div>

          {esMaestro && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Sector</label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              >
                <option value="">— Elegí un sector —</option>
                {sectores.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Nombre de quien solicita
            </label>
            <input
              type="text"
              value={solicitante}
              onChange={(e) => setSolicitante(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Detalle</label>
            <textarea
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              rows={4}
              placeholder="Qué se necesita, cantidad, para qué es, referencias…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Enviando…" : "Enviar solicitud"}
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
