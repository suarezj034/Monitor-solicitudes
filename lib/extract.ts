import type { DatosExtraidos, Presupuesto } from "./types";
import { montoComparable } from "./moneda";

/** La lectura con IA usa Google Gemini (nivel gratuito). */
export const IA_HABILITADA = () => !!process.env.GEMINI_API_KEY;

const MODELO = "gemini-2.5-flash";

type Parte =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

/** Llama a Gemini y devuelve el texto de la respuesta. */
async function llamarGemini(
  sistema: string,
  partes: Parte[],
  temperature = 0
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("La IA no está configurada (falta GEMINI_API_KEY).");
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: sistema }] },
        contents: [{ role: "user", parts: partes }],
        generationConfig: { temperature, responseMimeType: "application/json" },
      }),
    }
  );

  if (!res.ok) {
    let detalle = "";
    try {
      const err = await res.json();
      detalle = err?.error?.message ? `: ${err.error.message}` : "";
    } catch {
      /* sin cuerpo */
    }
    throw new Error(`Gemini respondió ${res.status}${detalle}`);
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    promptFeedback?: { blockReason?: string };
  };
  if (json.promptFeedback?.blockReason) {
    throw new Error(`Gemini bloqueó el pedido (${json.promptFeedback.blockReason}).`);
  }
  const texto =
    json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";
  if (!texto) throw new Error("Gemini no devolvió una respuesta legible.");
  return texto;
}

const SISTEMA = `Sos un asistente de compras. Te paso un documento (presupuesto, factura o remito de un proveedor) y extraés los datos clave.
Respondé ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown, con exactamente estas claves:
{
  "proveedor": string,        // razón social del proveedor
  "monto": number|null,       // importe total; solo el número, sin símbolos ni separadores de miles
  "moneda": string,           // "ARS", "USD" u otra; "" si no se indica
  "incluyeIva": boolean,      // true si el precio es final / IVA incluido; false si es neto o no se aclara
  "plazoEntrega": string,     // plazo/fecha de entrega tal como figura; "" si no está
  "plazoPago": string,        // condición de pago (ej. "30 días", "contado"); "" si no está
  "validez": string,          // validez de la oferta; "" si no está
  "detalle": string           // breve descripción de lo cotizado (1 línea)
}
Sobre incluyeIva: poné true si el documento dice "IVA incluido", "precio final", "final", "IVA inc." o es de Mercado Libre; en caso de duda, false.
Si un dato no aparece, poné "" (o null en monto). No inventes valores.`;

/** Lee un documento con Gemini y devuelve los datos estructurados. */
export async function extraerDatos(
  base64: string,
  mediaType: string
): Promise<DatosExtraidos> {
  const texto = await llamarGemini(SISTEMA, [
    { inline_data: { mime_type: mediaType, data: base64 } },
    { text: "Extraé los datos de este documento." },
  ]);
  return parseJson(texto);
}

const SISTEMA_ANALISIS = `Sos analista de compras de un laboratorio. Te paso las cotizaciones de una misma solicitud, con el monto ya convertido a PESOS argentinos.
Respondé ÚNICAMENTE con un objeto JSON válido, sin markdown, con estas claves:
{
  "recomendado": string,   // SOLO la razón social del proveedor elegido, sin verbos ni frases (ej.: "DISCAMP")
  "analisis": string       // UNA sola oración de máximo 20 palabras
}
Reglas de decisión:
- El criterio PRINCIPAL es el menor monto NETO EN PESOS (sin IVA). Recomendá al más barato en pesos netos, salvo que tenga una desventaja clara y GRAVE en entrega o pago.
- El plazo de entrega puede venir como texto ("7 días") o como fecha concreta ("24/08/2026"). Una fecha del mes en curso o cercana es un plazo CORTO; NO la interpretes como meses o años, ni la penalices como "plazo largo".
- No inventes duraciones ni datos que no figuran.
- Mencioná el ahorro concreto en pesos. Español rioplatense. UNA sola oración breve, sin repetir "recomendado".`;

export interface AnalisisCompra {
  recomendado: string;
  analisis: string;
}

/** Genera una evaluación analítica de las cotizaciones de una solicitud. */
export async function analizarCompra(
  items: Presupuesto[],
  nroSolicitud: string
): Promise<AnalisisCompra> {
  const lineas = items.map((p, i) => {
    const orig =
      typeof p.monto === "number"
        ? `${p.moneda || ""} ${p.monto.toLocaleString("es-AR")}${p.incluyeIva ? " (IVA incl.)" : ""}`.trim()
        : "sin monto";
    const neto = montoComparable(p);
    const pesos =
      neto != null
        ? `$${neto.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`
        : "no comparable (falta tipo de cambio)";
    return [
      `Cotización ${i + 1}:`,
      `  Proveedor: ${p.proveedor || "(sin nombre)"}`,
      `  Producto/detalle: ${p.detalle || "-"}`,
      `  Monto original: ${orig}`,
      `  Monto NETO EN PESOS (sin IVA, base de comparación): ${pesos}`,
      `  Entrega: ${p.plazoEntrega || "-"}`,
      `  Pago: ${p.plazoPago || "-"}`,
    ].join("\n");
  });

  const hoy = new Date().toLocaleDateString("es-AR");
  const prompt = `Fecha de referencia (hoy): ${hoy}.
Solicitud ${nroSolicitud}. Cotizaciones recibidas:\n\n${lineas.join(
    "\n\n"
  )}\n\nEvaluá y recomendá la más conveniente (criterio principal: menor monto en pesos).`;

  const texto = await llamarGemini(SISTEMA_ANALISIS, [{ text: prompt }], 0.2);
  const match = texto.match(/\{[\s\S]*\}/);
  let obj: Record<string, unknown> = {};
  if (match) {
    try {
      obj = JSON.parse(match[0]);
    } catch {
      obj = {};
    }
  }
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return {
    recomendado: str(obj.recomendado),
    analisis: str(obj.analisis) || "No se pudo generar el análisis.",
  };
}

const SISTEMA_DATOS_OC = `Sos un asistente de compras. Te paso una orden de compra (OC) y tenés que encontrar dos datos: su número y la fecha estimada de entrega/recepción de la mercadería.
Respondé ÚNICAMENTE con un objeto JSON válido, sin markdown, con estas claves:
{
  "numero": string|null,  // solo los dígitos/código del número de OC (sin la palabra "OC", sin espacios ni guiones), o null si no figura
  "fecha": string|null    // fecha estimada de entrega/recepción en formato dd/mm/aaaa, o null si el documento no la indica
}
Reglas para "numero":
- Buscá "Nº de OC", "Orden de Compra Nº", "N° de Orden de Compra", "Purchase Order", o el número que encabeza el documento.
- Devolvé SOLO el código (ej. si dice "Orden de Compra Nº 4019" devolvé "4019"; si dice "OC-4019" devolvé "4019").
Reglas para "fecha":
- El dato está en la sección/solapa "Entrega" de la OC: es la fuente principal y la que tiene prioridad. Fijate ahí primero.
- Si esa sección no tiene una fecha (solo un plazo, ej. "7 días") y hay una fecha de emisión de la OC, calculá la fecha resultante.
- Si no aparece la sección "Entrega", buscá términos equivalentes: "fecha de entrega", "plazo de entrega", "entrega estimada", "recepción estimada".
- Si no hay forma de determinar una fecha concreta, devolvé null. No inventes.`;

export interface DatosOC {
  /** Número de OC ya formateado como "OC<número>" (ej. "OC4019"), o null. */
  numero: string | null;
  /** Fecha estimada de entrega/recepción en dd/mm/aaaa, o null. */
  fecha: string | null;
}

/** Lee una orden de compra con Gemini: número de OC y fecha estimada de recepción. */
export async function extraerDatosOC(base64: string, mediaType: string): Promise<DatosOC> {
  const hoy = new Date().toLocaleDateString("es-AR");
  const texto = await llamarGemini(SISTEMA_DATOS_OC, [
    { inline_data: { mime_type: mediaType, data: base64 } },
    {
      text: `Fecha de referencia (hoy): ${hoy}. Extraé el número de OC y la fecha estimada de entrega/recepción de esta orden de compra, tomando la fecha de la solapa/sección "Entrega".`,
    },
  ]);
  const match = texto.match(/\{[\s\S]*\}/);
  if (!match) return { numero: null, fecha: null };
  try {
    const obj = JSON.parse(match[0]) as { numero?: unknown; fecha?: unknown };
    const numeroLimpio =
      typeof obj.numero === "string" ? obj.numero.replace(/[^\w-]/g, "").trim() : "";
    return {
      numero: numeroLimpio ? `OC${numeroLimpio}` : null,
      fecha: typeof obj.fecha === "string" && obj.fecha.trim() ? obj.fecha.trim() : null,
    };
  } catch {
    return { numero: null, fecha: null };
  }
}

/** Parseo defensivo: toma el primer objeto JSON del texto y normaliza los campos. */
function parseJson(texto: string): DatosExtraidos {
  const match = texto.match(/\{[\s\S]*\}/);
  let obj: Record<string, unknown> = {};
  if (match) {
    try {
      obj = JSON.parse(match[0]);
    } catch {
      obj = {};
    }
  }
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  let monto: number | null = null;
  if (typeof obj.monto === "number") monto = obj.monto;
  else if (typeof obj.monto === "string") {
    const n = Number(obj.monto.replace(/[^\d.-]/g, ""));
    monto = Number.isFinite(n) ? n : null;
  }
  return {
    proveedor: str(obj.proveedor),
    monto,
    moneda: str(obj.moneda).toUpperCase(),
    incluyeIva: obj.incluyeIva === true,
    plazoEntrega: str(obj.plazoEntrega),
    plazoPago: str(obj.plazoPago),
    validez: str(obj.validez),
    detalle: str(obj.detalle),
  };
}
