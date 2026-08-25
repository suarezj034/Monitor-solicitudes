/**
 * Links a formularios externos (Microsoft Forms u otros) opcionales, para
 * clientes que todavía quieran usarlos en paralelo al formulario propio.
 * Vacíos por defecto: cada instalación los setea con sus propias variables
 * de entorno NEXT_PUBLIC_* si los necesita; si no, esa tarjeta no se muestra.
 *
 * IMPORTANTE (Microsoft Forms): usar SIEMPRE el link de "Recopilar
 * respuestas / Copiar vínculo" (ResponsePage.aspx). Los links de
 * DesignPageV2.aspx son de edición y no sirven para que los sectores
 * completen el formulario.
 */

export const FORM_COMPRAS_URL = process.env.NEXT_PUBLIC_FORM_COMPRAS_URL || "";

export const FORM_TRANSPORTE_URL = process.env.NEXT_PUBLIC_FORM_TRANSPORTE_URL || "";
