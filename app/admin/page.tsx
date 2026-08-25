"use client";

import { useState } from "react";
import { EMPRESA_NOMBRE, LOGO_SRC } from "@/lib/branding";

type Result =
  | { ok: true; total: number; actualizado: string }
  | { ok: false; error: string };

const NAV_LINKS = [
  { href: "/admin/solicitudes-app", label: "Panel de gestión y reportes", icon: "📊" },
  { href: "/gestion", label: "Gestión de compras", icon: "🧾" },
  { href: "/transporte", label: "Ver transporte", icon: "🚚" },
  { href: "/", label: "Ver solicitudes", icon: "🛒" },
];

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const [fileLog, setFileLog] = useState<File | null>(null);
  const [busyLog, setBusyLog] = useState(false);
  const [resultLog, setResultLog] = useState<Result | null>(null);

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

  async function handleSubmitLog(e: React.FormEvent) {
    e.preventDefault();
    if (!fileLog) {
      setResultLog({ ok: false, error: "Seleccioná un archivo .xlsx." });
      return;
    }
    setBusyLog(true);
    setResultLog(null);
    try {
      const form = new FormData();
      form.append("password", password);
      form.append("file", fileLog);
      const res = await fetch("/api/upload-logistica", { method: "POST", body: form });
      const json = await res.json();
      if (res.ok && json.ok) {
        setResultLog({ ok: true, total: json.total, actualizado: json.actualizado });
      } else {
        setResultLog({ ok: false, error: json.error ?? "Error desconocido." });
      }
    } catch {
      setResultLog({ ok: false, error: "No se pudo conectar con el servidor." });
    } finally {
      setBusyLog(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-slate-50">
      <div className="border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_SRC} alt={EMPRESA_NOMBRE} className="h-11 w-auto" />
            <div className="hidden h-9 w-px bg-slate-200 sm:block" />
            <div className="hidden sm:block">
              <p className="text-sm font-semibold leading-tight text-slate-800">Ingesta de datos</p>
              <p className="text-xs leading-tight text-slate-500">Panel de administración</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
              >
                <span aria-hidden="true">{l.icon}</span>
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Ingesta de datos
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Subí los archivos Excel que actualizan las fuentes de datos del sistema.
          </p>
        </header>

        <div className="mb-6 max-w-md">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Contraseña de administrador
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            autoComplete="current-password"
          />
          <p className="mt-1 text-xs text-slate-400">Se usa para los dos formularios de abajo.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div>
              <h2 className="text-lg font-bold text-slate-900">Solicitudes de compra</h2>
              <p className="mt-1 text-sm text-slate-500">
                Archivo <code className="rounded bg-slate-100 px-1">SOLICITUDES.xlsx</code>, hoja{" "}
                <strong>“SOLICITUDES DE COMPRA”</strong>.
              </p>
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

          <form
            onSubmit={handleSubmitLog}
            className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div>
              <h2 className="text-lg font-bold text-slate-900">Logística / transporte</h2>
              <p className="mt-1 text-sm text-slate-500">
                Planilla de pedidos de transporte (hoja con columnas <strong>Nombre</strong>,{" "}
                <strong>Detalle</strong> y <strong>Estado</strong>).
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Archivo Excel (.xlsx)
              </label>
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => setFileLog(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-amber-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-amber-700"
              />
            </div>

            <button
              type="submit"
              disabled={busyLog}
              className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busyLog ? "Procesando…" : "Subir y actualizar transporte"}
            </button>

            {resultLog && (
              <div
                className={`rounded-lg p-3 text-sm ${
                  resultLog.ok
                    ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                    : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                }`}
              >
                {resultLog.ok ? (
                  <>
                    ✅ Datos actualizados: <strong>{resultLog.total}</strong> pedidos cargados.
                  </>
                ) : (
                  <>⚠️ {resultLog.error}</>
                )}
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
