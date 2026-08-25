"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EMPRESA_NOMBRE, LOGO_SRC } from "@/lib/branding";

export default function SectorPage() {
  const router = useRouter();
  const [sectores, setSectores] = useState<string[]>([]);
  const [sector, setSector] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sector", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setSectores(j.sectores ?? []))
      .catch(() => setSectores([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sector) {
      setError("Seleccioná tu sector.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sector, code }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        router.replace("/");
        router.refresh();
      } else {
        setError(json.error ?? "No se pudo validar el código.");
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setBusy(false);
    }
  }

  async function salir() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-slate-100 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-2xl border border-slate-200 bg-white p-7 shadow-lg"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_SRC} alt={EMPRESA_NOMBRE} className="mx-auto h-14 w-auto" />

        <div className="text-center">
          <h1 className="text-lg font-bold text-slate-900">Seleccioná tu sector</h1>
          <p className="text-sm text-slate-500">
            Ingresá el código de tu sector para ver sus solicitudes.
          </p>
        </div>

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

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Código de acceso
          </label>
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Ej.: Abcd1"
            autoComplete="off"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Verificando…" : "Ver solicitudes"}
        </button>

        {error && (
          <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
            ⚠️ {error}
          </div>
        )}

        <p className="text-center text-xs text-slate-400">
          <button type="button" onClick={salir} className="underline hover:text-slate-600">
            Cerrar sesión
          </button>
        </p>
      </form>
    </div>
  );
}
