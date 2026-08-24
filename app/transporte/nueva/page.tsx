"use client";

import { useState } from "react";

export default function NuevoPedidoTransportePage() {
  const [nombre, setNombre] = useState("");
  const [detalle, setDetalle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/logistica-app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, detalle }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setOk(`Pedido cargado: ${json.pedido.id}.`);
        setDetalle("");
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
