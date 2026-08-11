import type { DatosExtraidos } from "./types";

export const IA_HABILITADA = () => !!process.env.ANTHROPIC_API_KEY;

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

interface Bloque {
  type: "document" | "image";
  source: {
    type: "base64";
    media_type: string;
    data: string;
  };
}

/** Lee un documento con Opus 4.8 y devuelve los datos estructurados. */
export async function extraerDatos(
  base64: string,
  mediaType: string
): Promise<DatosExtraidos> {
  if (!IA_HABILITADA()) {
    throw new Error("La lectura con IA no está configurada (falta ANTHROPIC_API_KEY).");
  }

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();

  const esPdf = mediaType === "application/pdf";
  const bloque: Bloque = esPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
    : { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } };

  const res = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    system: SISTEMA,
    messages: [
      {
        role: "user",
        // @ts-expect-error: los bloques document/image son válidos en el runtime del SDK
        content: [bloque, { type: "text", text: "Extraé los datos de este documento." }],
      },
    ],
  });

  const texto = res.content
    .map((b) => ("text" in b ? b.text : ""))
    .join("")
    .trim();

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
