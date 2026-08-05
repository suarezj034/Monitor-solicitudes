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
