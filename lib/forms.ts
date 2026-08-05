/**
 * Links a los formularios externos (Microsoft Forms) que se muestran en el
 * tablero. Se dejan fijos por ahora; se pueden sobreescribir con variables de
 * entorno NEXT_PUBLIC_* sin tocar el código.
 *
 * IMPORTANTE: usar SIEMPRE el link de "Recopilar respuestas / Copiar vínculo"
 * (ResponsePage.aspx). Los links de DesignPageV2.aspx son de edición y no
 * sirven para que los sectores completen el formulario.
 */

export const FORM_COMPRAS_URL =
  process.env.NEXT_PUBLIC_FORM_COMPRAS_URL ||
  "https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=OkPHnwdIuUiI-pS4XBdytKISXxy6XwJDrCEpEZfNW6pUOVlNOU9QMlNQQzNRQzMyN1QzNjU2SDlVVi4u";

export const FORM_TRANSPORTE_URL =
  process.env.NEXT_PUBLIC_FORM_TRANSPORTE_URL ||
  "https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=OkPHnwdIuUiI-pS4XBdytKISXxy6XwJDrCEpEZfNW6pUNzJGUk5JVzhZMkJZMjFYMzY3UFE0WTdaRC4u";
