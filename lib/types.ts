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

/**
 * Un presupuesto/cotización cargado en el área de gestión (compras).
 * Vive en un almacén aparte que sobrevive a cada subida del Excel.
 */
export interface Presupuesto {
  id: string;
  /** Nº de solicitud (sector) al que corresponde. */
  nroSolicitud: string;
  proveedor: string;
  monto: number | null;
  moneda: string; // ARS | USD | ...
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
  plazoEntrega: string;
  plazoPago: string;
  validez: string;
  detalle: string;
}
