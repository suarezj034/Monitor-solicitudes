/**
 * Qué tan urgente es y con qué previsión se puede planificar:
 * - URGENTE: hay que resolverlo ya.
 * - SEMANA: dentro de la semana (7 días hábiles).
 * - PLANIFICADA: compra planificada a N días (ver celeridadDetalle: "15"|"30"|"45"|"60").
 * - RECURRENTE: se repite en el tiempo (ver celeridadDetalle: "MENSUAL"|"SEMESTRAL"),
 *   sirve para prever compras futuras.
 */
export type Celeridad = "URGENTE" | "SEMANA" | "PLANIFICADA" | "RECURRENTE";

export interface Solicitud {
  nroSolicitud: string;
  sector: string;
  detalle: string;
  estado: string;
  oc: string;
  fechaRecepcion: string;
  /** URLs de archivos adjuntos (hasta 3). */
  adjuntos: string[];
  /** Quién la pidió. Vacío en cargas viejas del Excel que no lo traían. */
  solicitante: string;
  /** "app" si se cargó con el formulario propio; ausente = viene del Excel. */
  origen?: "app";
  /** Urgencia declarada al cargar (solo en las de la app). */
  celeridad?: Celeridad;
  /** Detalle de la celeridad: días (PLANIFICADA) o periodicidad (RECURRENTE). */
  celeridadDetalle?: string;
}

export interface DataPayload {
  actualizado: string | null;
  total: number;
  filas: Solicitud[];
  /** Sector habilitado en la sesión: nombre del sector o "*" (todos). */
  sectorActivo?: string;
}

/** Solicitudes cargadas con el formulario propio (no vienen del Excel). */
export interface SolicitudAppPayload {
  /** Próximo correlativo a usar (nroSolicitud = "S-<siguienteId>"). */
  siguienteId: number;
  filas: Solicitud[];
}

/** Un pedido de la planilla de logística/transporte. */
export interface Pedido {
  id: string;
  nombre: string;
  detalle: string;
  estado: string;
  /** "app" si se cargó con el formulario propio; ausente = viene del Excel. */
  origen?: "app";
  /** Urgencia declarada al cargar (solo en los de la app). */
  celeridad?: Celeridad;
  /** Detalle de la celeridad: días (PLANIFICADA) o periodicidad (RECURRENTE). */
  celeridadDetalle?: string;
  /** URLs de archivos adjuntos (hasta 3, solo en los de la app). */
  adjuntos?: string[];
  /** Sector que pide el transporte (solo en los de la app). */
  sector?: string;
  /** Fecha en la que hay que coordinar el retiro/entrega (dd/mm/aaaa). */
  fechaCoordinar?: string;
  /** Dirección del retiro/entrega. */
  direccion?: string;
  /** Horarios en los que se puede retirar/entregar. */
  horarios?: string;
}

export interface LogisticaPayload {
  actualizado: string | null;
  total: number;
  filas: Pedido[];
}

/** Pedidos de transporte cargados con el formulario propio. */
export interface PedidoAppPayload {
  /** Próximo correlativo a usar (id = "T-<siguienteId>"). */
  siguienteId: number;
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
