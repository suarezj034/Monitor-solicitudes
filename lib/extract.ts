import type { DatosExtraidos, Presupuesto } from "./types";

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
  "plazoEntrega": string,     // plazo/fecha de entrega tal como figura; "" si no está
  "plazoPago": string,        // condición de pago (ej. "30 días", "contado"); "" si no está
  "validez": string,          // validez de la oferta; "" si no está
  "detalle": string           // breve descripción de lo cotizado (1 línea)
}
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

const SISTEMA_ANALISIS = `Sos analista de compras de un laboratorio. Te paso las cotizaciones de una misma solicitud y tenés que evaluarlas.
Respondé ÚNICAMENTE con un objeto JSON válido, sin markdown, con estas claves:
{
  "recomendado": string,   // razón social del proveedor más conveniente considerando precio, plazo de entrega y condición de pago
  "analisis": string       // UNA o dos líneas analíticas evaluando las cotizaciones: mencioná el ahorro concreto y por qué conviene esa opción
}
Escribí en español rioplatense, conciso y objetivo. No inventes datos que no estén en las cotizaciones.`;

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
    const monto =
      typeof p.monto === "number"
        ? `${p.moneda || ""} ${p.monto.toLocaleString("es-AR")}`.trim()
        : "sin monto";
    return [
      `Cotización ${i + 1}:`,
      `  Proveedor: ${p.proveedor || "(sin nombre)"}`,
      `  Producto/detalle: ${p.detalle || "-"}`,
      `  Monto: ${monto}`,
      `  Entrega: ${p.plazoEntrega || "-"}`,
      `  Pago: ${p.plazoPago || "-"}`,
      `  Validez: ${p.validez || "-"}`,
    ].join("\n");
  });

  const prompt = `Solicitud ${nroSolicitud}. Cotizaciones recibidas:\n\n${lineas.join(
    "\n\n"
  )}\n\nEvaluá y recomendá la más conveniente.`;

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
    plazoEntrega: str(obj.plazoEntrega),
    plazoPago: str(obj.plazoPago),
    validez: str(obj.validez),
    detalle: str(obj.detalle),
  };
}
