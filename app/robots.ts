import type { MetadataRoute } from "next";

/**
 * Sitio privado: se pide a todos los buscadores que no rastreen ni indexen
 * ninguna ruta. Se complementa con la cabecera X-Robots-Tag (next.config.mjs)
 * y con la metadata `robots` del layout.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: "/",
      },
    ],
  };
}
