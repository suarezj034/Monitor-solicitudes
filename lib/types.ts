export interface Solicitud {
  nroSolicitud: string;
  sector: string;
  detalle: string;
  estado: string;
  oc: string;
  fechaRecepcion: string;
  /** URLs de archivos adjuntos (0, 1 o varias). */
  adjuntos: string[];
}

export interface DataPayload {
  actualizado: string | null;
  total: number;
  filas: Solicitud[];
  /** Sector habilitado en la sesión: nombre del sector o "*" (todos). */
  sectorActivo?: string;
}

/** Un pedido de la planilla de logística/transporte. */
export interface Pedido {
  id: string;
  nombre: string;
  detalle: string;
  estado: string;
}

export interface LogisticaPayload {
  actualizado: string | null;
  total: number;
  filas: Pedido[];
}

/**
 * Un presupuesto/cotización cargado en el área de gestión (compras).
 * Vive en un almacén aparte que sobrevive a cada subida del Excel.
 */
export interface Presupuesto {
  id: string;
  /** Identificador de la solicitud (el valor del Nº o de la ID). */
  nroSolicitud: string;
  /** Cómo se identifica la solicitud: por su Nº de sector o por su ID. */
  refTipo: "nro" | "id";
  proveedor: string;
  monto: number | null;
  moneda: string; // ARS | USD | ...
  /** Si el monto ya incluye IVA (ej. Mercado Libre = precio final). */
  incluyeIva: boolean;
  /** Alícuota de IVA a descontar cuando incluyeIva (por defecto 21). */
  alicuotaIva: number | null;
  /** Dólar venta (BNA) capturado al cargar, para convertir USD a pesos. */
  tipoCambio: number | null;
  /** Fecha del dólar usado (dd/mm/aaaa). */
  tipoCambioFecha: string | null;
  plazoEntrega: string;
  plazoPago: string;
  validez: string;
  detalle: string;
  notas: string;
  /** Clave del documento en el almacén (para servirlo via proxy). */
  archivoKey: string;
  archivoNombre: string;
  creado: string;
  actualizado: string;
}

export interface GestionPayload {
  actualizado: string | null;
  presupuestos: Presupuesto[];
}

/** Campos que la IA intenta extraer de un documento. */
export interface DatosExtraidos {
  proveedor: string;
  monto: number | null;
  moneda: string;
  /** true si el documento indica que el precio ya incluye IVA / es final. */
  incluyeIva: boolean;
  plazoEntrega: string;
  plazoPago: string;
  validez: string;
  detalle: string;
}
