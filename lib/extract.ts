import type { DatosExtraidos } from "./types";

/** La lectura con IA usa Google Gemini (nivel gratuito). */
export const IA_HABILITADA = () => !!process.env.GEMINI_API_KEY;

const MODELO = "gemini-2.5-flash";

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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("La lectura con IA no está configurada (falta GEMINI_API_KEY).");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`;

  const body = {
    system_instruction: { parts: [{ text: SISTEMA }] },
    contents: [
      {
        role: "user",
        parts: [
          { inline_data: { mime_type: mediaType, data: base64 } },
          { text: "Extraé los datos de este documento." },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

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
    throw new Error(`Gemini bloqueó el documento (${json.promptFeedback.blockReason}).`);
  }

  const texto =
    json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";

  if (!texto) {
    throw new Error("Gemini no devolvió datos legibles del documento.");
  }

  return parseJson(texto);
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
