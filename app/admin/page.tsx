"use client";

import { useState } from "react";

type Result =
  | { ok: true; total: number; actualizado: string }
  | { ok: false; error: string };

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setResult({ ok: false, error: "Seleccioná un archivo .xlsx." });
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("password", password);
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();
      if (res.ok && json.ok) {
        setResult({ ok: true, total: json.total, actualizado: json.actualizado });
      } else {
        setResult({ ok: false, error: json.error ?? "Error desconocido." });
      }
    } catch {
      setResult({ ok: false, error: "No se pudo conectar con el servidor." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <header className="mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dromex-logo.svg" alt="DROMEX SRL" className="mb-5 h-12 w-auto" />
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ingesta de datos</h1>
        <p className="mt-1 text-sm text-slate-500">
          Subí el archivo <code className="rounded bg-slate-100 px-1">SOLICITUDES.xlsx</code> para
          actualizar la fuente de datos. Se lee la hoja{" "}
          <strong>“SOLICITUDES DE COMPRA”</strong>.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Contraseña de administrador
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            autoComplete="current-password"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Archivo Excel (.xlsx)
          </label>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Procesando…" : "Subir y actualizar"}
        </button>

        {result && (
          <div
            className={`rounded-lg p-3 text-sm ${
              result.ok
                ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
            }`}
          >
            {result.ok ? (
              <>
                ✅ Datos actualizados: <strong>{result.total}</strong> solicitudes cargadas.
              </>
            ) : (
              <>⚠️ {result.error}</>
            )}
          </div>
        )}
      </form>

      <p className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-center text-sm">
        <a href="/gestion" className="font-medium text-brand-700 underline hover:text-brand-800">
          Gestión de compras (presupuestos) →
        </a>
        <a href="/" className="font-medium text-brand-700 underline hover:text-brand-800">
          Ver la vista de solicitudes →
        </a>
      </p>
    </main>
  );
}
