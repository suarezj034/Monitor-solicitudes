"use client";

import { useMemo, useState } from "react";
import type { DatosExtraidos, Presupuesto } from "@/lib/types";
import { montoEnPesos } from "@/lib/moneda";

const MONEDAS = ["ARS", "USD", "EUR"];

type Grupo = {
  nro: string;
  refTipo: "nro" | "id";
  items: Presupuesto[];
  barato: number | null;
  caro: number | null;
  ahorro: number | null;
};

/** Etiqueta corta según se identifique por Nº o por ID. */
const refLabel = (t: "nro" | "id") => (t === "id" ? "ID" : "Nº");
/** Clave única de un grupo (tipo + valor), para no mezclar Nº 5 con ID 5. */
const gid = (g: Grupo) => `${g.refTipo}:${g.nro}`;
const hoyFecha = () => new Date().toLocaleDateString("es-AR");
function fechaCorta(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("es-AR");
}

const vacio = (nro = "", refTipo: "nro" | "id" = "nro"): Partial<Presupuesto> => ({
  id: "",
  nroSolicitud: nro,
  refTipo,
  proveedor: "",
  monto: null,
  moneda: "ARS",
  tipoCambio: null,
  tipoCambioFecha: null,
  plazoEntrega: "",
  plazoPago: "",
  validez: "",
  detalle: "",
  notas: "",
  archivoKey: "",
  archivoNombre: "",
});

function fmtMonto(monto: number | null, moneda: string): string {
  if (monto == null) return "—";
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: moneda || "ARS",
      maximumFractionDigits: 2,
    }).format(monto);
  } catch {
    return `${moneda} ${monto.toLocaleString("es-AR")}`;
  }
}

export default function GestionPage() {
  const [pass, setPass] = useState("");
  const [authed, setAuthed] = useState(false);
  const [iaHabilitada, setIaHabilitada] = useState(false);
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState<Partial<Presupuesto>>(vacio());
  const [subiendo, setSubiendo] = useState(false);
  const [avisoIA, setAvisoIA] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [verSolicitud, setVerSolicitud] = useState("");
  const [evaluando, setEvaluando] = useState<string | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);

  const authHeaders = { "x-admin-password": pass };

  async function ingresar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/gestion", { headers: authHeaders, cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No se pudo ingresar.");
        return;
      }
      setPresupuestos(json.presupuestos ?? []);
      setIaHabilitada(!!json.iaHabilitada);
      setAuthed(true);
    } finally {
      setBusy(false);
    }
  }

  async function recargar() {
    const res = await fetch("/api/gestion", { headers: authHeaders, cache: "no-store" });
    const json = await res.json();
    if (res.ok) setPresupuestos(json.presupuestos ?? []);
  }

  function set<K extends keyof Presupuesto>(k: K, v: Presupuesto[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  /** Trae el dólar venta BNA de hoy y lo carga en el formulario. */
  async function traerCotizacion() {
    try {
      const res = await fetch("/api/gestion/cotizacion", {
        headers: authHeaders,
        cache: "no-store",
      });
      const j = await res.json();
      if (res.ok && typeof j.venta === "number") {
        setForm((f) => ({
          ...f,
          tipoCambio: j.venta,
          tipoCambioFecha: fechaCorta(j.fecha) || hoyFecha(),
        }));
      }
    } catch {
      /* silencioso: se puede cargar a mano */
    }
  }

  async function subirArchivo(file: File, leer: boolean) {
    setSubiendo(true);
    setAvisoIA(null);
    try {
      const fd = new FormData();
      fd.append("password", pass);
      fd.append("file", file);
      if (leer) fd.append("leer", "1");
      const res = await fetch("/api/gestion/extraer", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setAvisoIA(json.error ?? "No se pudo subir el archivo.");
        return;
      }
      set("archivoKey", json.archivoKey ?? "");
      set("archivoNombre", json.archivoNombre ?? file.name);
      if (json.errorIA) setAvisoIA(json.errorIA);
      if (json.datos) {
        const d = json.datos as DatosExtraidos;
        setForm((f) => ({
          ...f,
          proveedor: d.proveedor || f.proveedor,
          monto: d.monto ?? f.monto,
          moneda: d.moneda || f.moneda,
          plazoEntrega: d.plazoEntrega || f.plazoEntrega,
          plazoPago: d.plazoPago || f.plazoPago,
          validez: d.validez || f.validez,
          detalle: d.detalle || f.detalle,
        }));
        setAvisoIA("✨ Datos leídos. Revisá y corregí lo que haga falta antes de guardar.");
        if ((d.moneda || "").toUpperCase() === "USD") traerCotizacion();
      }
    } finally {
      setSubiendo(false);
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    if (!form.nroSolicitud?.trim()) {
      setError(`Ingresá el ${refLabel(form.refTipo ?? "nro")} de solicitud.`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/gestion", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No se pudo guardar.");
        return;
      }
      setOkMsg(form.id ? "Presupuesto actualizado." : "Presupuesto guardado.");
      const nro = form.nroSolicitud;
      const tipo = (form.refTipo ?? "nro") as "nro" | "id";
      setForm(vacio(nro, tipo));
      await recargar();
    } finally {
      setBusy(false);
    }
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar este presupuesto?")) return;
    await fetch(`/api/gestion?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    await recargar();
  }

  function editar(p: Presupuesto) {
    setForm({ ...p });
    setOkMsg(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function verArchivo(key: string) {
    const url = `/api/gestion/archivo?key=${encodeURIComponent(key)}&password=${encodeURIComponent(pass)}`;
    window.open(url, "_blank", "noopener");
  }

  /** Pide la evaluación IA de una solicitud y descarga el PDF comparativo. */
  async function generarEvaluacion(g: Grupo) {
    setEvaluando(gid(g));
    setEvalError(null);
    try {
      const res = await fetch("/api/gestion/evaluar", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ nroSolicitud: g.nro, refTipo: g.refTipo }),
      });
      const json = await res.json();
      if (!res.ok) {
        setEvalError(json.error ?? "No se pudo generar la evaluación.");
        return;
      }
      await descargarPDF(g, json.recomendado ?? "", json.analisis ?? "");
    } catch {
      setEvalError("No se pudo generar la evaluación.");
    } finally {
      setEvaluando(null);
    }
  }

  /** Construye y descarga el PDF de comparación + análisis. */
  async function descargarPDF(g: Grupo, recomendado: string, analisis: string) {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const BR: [number, number, number] = [21, 122, 82];

    // Banda superior
    doc.setFillColor(BR[0], BR[1], BR[2]);
    doc.rect(0, 0, W, 20, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("DROMEX SRL", 14, 9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Gestión de compras", 14, 15);
    doc.text(new Date().toLocaleDateString("es-AR"), W - 14, 12, { align: "right" });

    // Título
    doc.setTextColor(16, 32, 26);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`Evaluación de compra — Solicitud ${refLabel(g.refTipo)} ${g.nro}`, 14, 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${g.items.length} cotización${g.items.length === 1 ? "" : "es"} comparada${
        g.items.length === 1 ? "" : "s"
      }`,
      14,
      36
    );

    const idxBarato = g.items.findIndex(
      (p) => montoEnPesos(p) != null && montoEnPesos(p) === g.barato
    );

    autoTable(doc, {
      startY: 42,
      head: [["Proveedor", "Producto / Detalle", "Monto", "Entrega", "Pago", "Validez"]],
      body: g.items.map((p) => {
        const ars = montoEnPesos(p);
        // El PDF usa una fuente sin "≈"; se usa "= $..." (sin decimales) y sin miles cortados.
        const montoTxt =
          p.moneda !== "ARS" && ars != null
            ? `${fmtMonto(p.monto, p.moneda)}\n= $${Math.round(ars).toLocaleString("es-AR")}`
            : fmtMonto(p.monto, p.moneda);
        return [
          p.proveedor || "—",
          p.detalle || "—",
          montoTxt,
          p.plazoEntrega || "—",
          p.plazoPago || "—",
          p.validez || "—",
        ];
      }),
      styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: BR, textColor: 255, fontStyle: "bold" },
      columnStyles: {
        1: { cellWidth: 42 },
        2: { halign: "right", cellWidth: 30 },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      didParseCell: (data: any) => {
        if (data.section === "body" && data.row.index === idxBarato) {
          data.cell.styles.fillColor = [227, 241, 233];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let y = ((doc as any).lastAutoTable?.finalY ?? 60) + 7;

    const usd = g.items.filter((p) => p.moneda === "USD" && p.tipoCambio);
    if (usd.length > 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(124, 143, 134);
      doc.text("Comparación en pesos · USD convertido al dólar venta BNA:", 14, y);
      y += 4;
      for (const p of usd) {
        const f = p.tipoCambioFecha ? ` (${p.tipoCambioFecha})` : "";
        doc.text(
          `   ${p.proveedor || "Proveedor"}: dólar ${fmtMonto(p.tipoCambio, "ARS")}${f}`,
          14,
          y
        );
        y += 4;
      }
      y += 2;
    }

    if (g.ahorro != null && g.ahorro > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(12, 75, 54);
      doc.text(`Ahorro potencial (en pesos): ${fmtMonto(g.ahorro, "ARS")}`, 14, y);
      y += 8;
    }

    if (recomendado) {
      doc.setTextColor(16, 32, 26);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Proveedor recomendado: ", 14, y);
      const w = doc.getTextWidth("Proveedor recomendado: ");
      doc.setFont("helvetica", "normal");
      doc.text(recomendado, 14 + w, y);
      y += 9;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(16, 32, 26);
    doc.text("Análisis:", 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(52, 101, 92);
    const lineas = doc.splitTextToSize(analisis, W - 28);
    doc.text(lineas, 14, y);

    doc.setDrawColor(206, 221, 212);
    doc.line(14, H - 12, W - 14, H - 12);
    doc.setFontSize(7.5);
    doc.setTextColor(124, 143, 134);
    doc.text(
      "DROMEX SRL · Sector Compras · Documento generado automáticamente",
      14,
      H - 8
    );

    const nombre = `Evaluacion-Solicitud-${g.nro.replace(/[^\w.-]+/g, "_")}.pdf`;
    doc.save(nombre);
  }

  // Agrupar por (tipo de referencia + valor), para no mezclar un Nº con una ID.
  const grupos = useMemo<Grupo[]>(() => {
    const norm = (s: string) => s.replace(/\s+/g, " ").trim();
    const map = new Map<string, Presupuesto[]>();
    for (const p of presupuestos) {
      const tipo: "nro" | "id" = p.refTipo === "id" ? "id" : "nro";
      const val = norm(p.nroSolicitud) || "(sin Nº)";
      const k = `${tipo}␟${val}`;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    }
    return Array.from(map.entries())
      .map(([k, items]) => {
        const [tipo, nro] = k.split("␟");
        // Comparación EN PESOS (USD convertido con el dólar de cada cotización).
        const ordenados = [...items].sort(
          (a, b) => (montoEnPesos(a) ?? Infinity) - (montoEnPesos(b) ?? Infinity)
        );
        const enPesos = ordenados
          .map((p) => montoEnPesos(p))
          .filter((v): v is number => v != null)
          .sort((a, b) => a - b);
        const barato = enPesos[0] ?? null;
        const caro = enPesos.length ? enPesos[enPesos.length - 1] : null;
        const ahorro = barato != null && caro != null ? caro - barato : null;
        return { nro, refTipo: tipo as "nro" | "id", items: ordenados, barato, caro, ahorro };
      })
      .sort((a, b) => a.nro.localeCompare(b.nro, "es", { numeric: true }));
  }, [presupuestos]);

  const gruposVisibles = useMemo(() => {
    const q = verSolicitud.replace(/\s+/g, " ").trim().toLowerCase();
    if (!q) return grupos;
    return grupos.filter((g) => g.nro.toLowerCase().includes(q));
  }, [grupos, verSolicitud]);

  // ---------- Login ----------
  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-slate-100 px-4">
        <form
          onSubmit={ingresar}
          className="w-full max-w-sm space-y-5 rounded-2xl border border-slate-200 bg-white p-7 shadow-lg"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/dromex-logo.svg" alt="DROMEX SRL" className="mx-auto h-14 w-auto" />
          <div className="text-center">
            <h1 className="text-lg font-bold text-slate-900">Gestión de compras</h1>
            <p className="text-sm text-slate-500">Presupuestos, proveedores y ahorros.</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Contraseña de administrador
            </label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
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

  // ---------- Panel ----------
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-slate-50">
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/dromex-logo.svg" alt="DROMEX SRL" className="h-10 w-auto" />
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-800">Gestión de compras</p>
              <p className="text-xs text-slate-500">
                {presupuestos.length} presupuesto{presupuestos.length === 1 ? "" : "s"} guardado
                {presupuestos.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
              iaHabilitada
                ? "bg-brand-100 text-brand-800 ring-brand-200"
                : "bg-slate-100 text-slate-500 ring-slate-200"
            }`}
            title={iaHabilitada ? "Lectura con IA activa" : "Carga manual (sin API key)"}
          >
            {iaHabilitada ? "IA activa" : "Carga manual"}
          </span>
        </div>
      </div>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        {/* ---- Cargar presupuesto ---- */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            {form.id ? "Editar presupuesto" : "Cargar presupuesto"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Arrastrá el documento{iaHabilitada ? " y leelo con IA" : ""}, revisá los datos y guardá.
          </p>

          <form onSubmit={guardar} className="mt-4 space-y-4">
            <div>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                ¿Cómo identificás la solicitud? *
              </span>
              <div className="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-0.5 text-sm">
                {(["nro", "id"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set("refTipo", t)}
                    className={`rounded-md px-4 py-1.5 font-semibold transition ${
                      (form.refTipo ?? "nro") === t
                        ? "bg-brand-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {t === "nro" ? "Nº de solicitud" : "ID"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label={`${refLabel(form.refTipo ?? "nro")} de solicitud *`}>
                <input
                  value={form.nroSolicitud ?? ""}
                  onChange={(e) => set("nroSolicitud", e.target.value)}
                  placeholder={
                    (form.refTipo ?? "nro") === "id" ? "Ej.: 508" : "Ej.: 128 o 2026-08"
                  }
                  className={inputCls}
                />
              </Campo>
              <Campo label="Proveedor">
                <input
                  value={form.proveedor ?? ""}
                  onChange={(e) => set("proveedor", e.target.value)}
                  className={inputCls}
                />
              </Campo>
            </div>

            {/* Zona de archivo */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) subirArchivo(f, iaHabilitada);
              }}
              className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center"
            >
              <p className="text-sm text-slate-600">
                Arrastrá un PDF o imagen acá, o
                <label className="mx-1 cursor-pointer font-semibold text-brand-700 underline">
                  elegí un archivo
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) subirArchivo(f, iaHabilitada);
                    }}
                  />
                </label>
              </p>
              {subiendo && <p className="mt-2 text-xs text-brand-700">Procesando documento…</p>}
              {form.archivoNombre && !subiendo && (
                <p className="mt-2 text-xs text-slate-500">
                  📎 {form.archivoNombre}
                  {form.archivoKey && (
                    <button
                      type="button"
                      onClick={() => verArchivo(form.archivoKey!)}
                      className="ml-2 text-brand-700 underline"
                    >
                      ver
                    </button>
                  )}
                </p>
              )}
              {iaHabilitada && !subiendo && (
                <p className="mt-1 text-[11px] text-slate-400">
                  La IA completa los campos; siempre podés editarlos.
                </p>
              )}
            </div>

            {avisoIA && (
              <div className="rounded-lg bg-brand-50 p-3 text-sm text-brand-800 ring-1 ring-brand-200">
                {avisoIA}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <Campo label="Monto">
                <input
                  type="number"
                  step="0.01"
                  value={form.monto ?? ""}
                  onChange={(e) =>
                    set("monto", e.target.value === "" ? null : Number(e.target.value))
                  }
                  className={inputCls}
                />
              </Campo>
              <Campo label="Moneda">
                <select
                  value={form.moneda ?? "ARS"}
                  onChange={(e) => set("moneda", e.target.value)}
                  className={inputCls}
                >
                  {MONEDAS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Validez de la oferta">
                <input
                  value={form.validez ?? ""}
                  onChange={(e) => set("validez", e.target.value)}
                  className={inputCls}
                />
              </Campo>
            </div>

            {form.moneda === "USD" && (
              <div className="rounded-lg bg-amber-50 p-3 ring-1 ring-amber-200">
                <Campo label="Dólar venta (BNA) al momento de cargar">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={form.tipoCambio ?? ""}
                      onChange={(e) => {
                        const v = e.target.value === "" ? null : Number(e.target.value);
                        setForm((f) => ({
                          ...f,
                          tipoCambio: v,
                          tipoCambioFecha: v == null ? null : hoyFecha(),
                        }));
                      }}
                      placeholder="Ej.: 1300"
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={traerCotizacion}
                      className="whitespace-nowrap rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                    >
                      Traer de hoy
                    </button>
                  </div>
                </Campo>
                <p className="mt-1 text-[11px] text-amber-700">
                  Se usa para convertir el monto a pesos y comparar contra cotizaciones en $.
                  {form.tipoCambioFecha && ` (dólar del ${form.tipoCambioFecha})`}
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Plazo de entrega">
                <input
                  value={form.plazoEntrega ?? ""}
                  onChange={(e) => set("plazoEntrega", e.target.value)}
                  className={inputCls}
                />
              </Campo>
              <Campo label="Plazo / condición de pago">
                <input
                  value={form.plazoPago ?? ""}
                  onChange={(e) => set("plazoPago", e.target.value)}
                  className={inputCls}
                />
              </Campo>
            </div>

            <Campo label="Detalle">
              <input
                value={form.detalle ?? ""}
                onChange={(e) => set("detalle", e.target.value)}
                className={inputCls}
              />
            </Campo>
            <Campo label="Notas internas">
              <textarea
                value={form.notas ?? ""}
                onChange={(e) => set("notas", e.target.value)}
                rows={2}
                className={inputCls}
              />
            </Campo>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
              >
                {busy ? "Guardando…" : form.id ? "Guardar cambios" : "Guardar presupuesto"}
              </button>
              {form.id && (
                <button
                  type="button"
                  onClick={() => setForm(vacio())}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancelar edición
                </button>
              )}
              {okMsg && <span className="text-sm font-medium text-brand-700">✓ {okMsg}</span>}
              {error && <span className="text-sm text-rose-600">⚠️ {error}</span>}
            </div>
          </form>
        </section>

        {/* ---- Presupuestos por solicitud ---- */}
        <section>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-bold text-slate-900">Presupuestos por solicitud</h2>
            <input
              value={verSolicitud}
              onChange={(e) => setVerSolicitud(e.target.value)}
              placeholder="Buscar Nº o ID de solicitud…"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 sm:w-64"
            />
          </div>

          {evalError && (
            <div className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
              ⚠️ {evalError}
            </div>
          )}

          {gruposVisibles.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm">
              No hay presupuestos cargados todavía.
            </div>
          ) : (
            <div className="space-y-4">
              {gruposVisibles.map((g) => (
                <div
                  key={gid(g)}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">
                        Solicitud {refLabel(g.refTipo)} {g.nro}
                      </span>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {g.items.length} {g.items.length === 1 ? "cotización" : "cotizaciones"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {g.ahorro != null && g.ahorro > 0 && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200">
                          Ahorro potencial {fmtMonto(g.ahorro, "ARS")}
                        </span>
                      )}
                      <button
                        onClick={() => generarEvaluacion(g)}
                        disabled={!iaHabilitada || evaluando === gid(g)}
                        title={
                          iaHabilitada
                            ? "Genera un PDF comparativo con evaluación de IA"
                            : "Requiere GEMINI_API_KEY para la evaluación"
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {evaluando === gid(g) ? "Generando…" : "📄 Generar evaluación"}
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs font-semibold text-slate-500">
                          <th className="px-4 py-2">Proveedor</th>
                          <th className="px-4 py-2">Monto</th>
                          <th className="px-4 py-2">Entrega</th>
                          <th className="px-4 py-2">Pago</th>
                          <th className="px-4 py-2">Doc.</th>
                          <th className="px-4 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {g.items.map((p) => {
                          const pesos = montoEnPesos(p);
                          const esBarato = pesos != null && pesos === g.barato;
                          return (
                            <tr key={p.id} className={esBarato ? "bg-emerald-50/60" : ""}>
                              <td className="px-4 py-2.5 font-medium text-slate-700">
                                {p.proveedor || "—"}
                                {esBarato && (
                                  <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                    MÁS BAJO
                                  </span>
                                )}
                                {p.detalle && (
                                  <div className="text-xs font-normal text-slate-400">{p.detalle}</div>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-slate-800">
                                {fmtMonto(p.monto, p.moneda)}
                                {p.moneda !== "ARS" && pesos != null && (
                                  <div className="text-xs font-normal text-slate-400">
                                    ≈ {fmtMonto(pesos, "ARS")}
                                  </div>
                                )}
                                {p.moneda === "USD" && p.tipoCambio && (
                                  <div className="text-[10px] font-normal text-slate-400">
                                    dólar {fmtMonto(p.tipoCambio, "ARS")}
                                    {p.tipoCambioFecha && ` · ${p.tipoCambioFecha}`}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-slate-600">{p.plazoEntrega || "—"}</td>
                              <td className="px-4 py-2.5 text-slate-600">{p.plazoPago || "—"}</td>
                              <td className="px-4 py-2.5">
                                {p.archivoKey ? (
                                  <button
                                    onClick={() => verArchivo(p.archivoKey)}
                                    className="text-xs text-brand-700 underline"
                                  >
                                    ver
                                  </button>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-4 py-2.5 text-right">
                                <button
                                  onClick={() => editar(p)}
                                  className="text-xs font-medium text-slate-500 hover:text-slate-800"
                                >
                                  editar
                                </button>
                                <button
                                  onClick={() => eliminar(p.id)}
                                  className="ml-3 text-xs font-medium text-rose-500 hover:text-rose-700"
                                >
                                  eliminar
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
