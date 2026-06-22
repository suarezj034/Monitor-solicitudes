export interface Solicitud {
  nroSolicitud: string;
  sector: string;
  detalle: string;
  estado: string;
  oc: string;
}

export interface DataPayload {
  actualizado: string | null;
  total: number;
  filas: Solicitud[];
}
