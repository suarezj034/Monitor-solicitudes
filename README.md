# Monitor de Solicitudes

App simple para monitorear el estado de las solicitudes de compra a partir de un archivo Excel.

- **Login** (`/login`): usuario + contraseña ÚNICOS compartidos para todos los clientes.
- **Selección de sector** (`/sector`): cada sector ingresa su **código de acceso**; el maestro ve todos.
- **Vista de clientes** (`/`): tabla de solo lectura con **Nº (sector)**, **Sector**, **Detalle**, **Estado** y **OC**.
- **Ingesta de admin** (`/admin`): subida del archivo `SOLICITUDES.xlsx` (protegida por contraseña de admin).
- **Gestión de compras** (`/gestion`): carga de presupuestos/facturas/remitos por solicitud, comparación de cotizaciones (proveedor, monto, plazos) con ahorro potencial, y lectura opcional de documentos con IA (Opus 4.8). Protegida por la contraseña de admin. Los presupuestos viven en un almacén aparte (`presupuestos.json`) que **sobrevive a cada subida del Excel**.

Todo el sitio queda detrás del login; el `/admin` además pide la contraseña de admin para subir.

### Aislamiento por sector

El filtrado se hace **en el servidor** (`app/api/solicitudes/route.ts`): al navegador solo
viajan las filas del sector habilitado, así que un sector no puede ver las compras de otro
ni inspeccionando el tráfico de red. La habilitación viaja en una cookie firmada (HMAC).

### Normalización de sectores

El Excel trae "proyectos" que no son sectores reales (INAME, INVIMA, Remodelación Lavadero,
"Solicitud vieja"). Esas filas se reasignan **al sector del solicitante**, tomando el sector
donde esa persona carga la mayoría de sus pedidos (ver `lib/normalize.ts` y `lib/parseXlsx.ts`).
`CTRL (Adjuntar Archivo de Solicitud)` se mapea a **Control de calidad**.

La app **no lee el Excel en tiempo real**: el admin lo sube, se parsea la hoja **“SOLICITUDES DE COMPRA”** y se guarda el resultado en almacenamiento persistente (Vercel Blob).

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · SheetJS (`xlsx`) · Vercel Blob.

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # editá ADMIN_PASSWORD
npm run dev
```

Abrí <http://localhost:3000> (vista) y <http://localhost:3000/admin> (ingesta).

> En local **no hace falta** Vercel Blob: si no hay `BLOB_READ_WRITE_TOKEN`, los datos se
> guardan en `./.data/solicitudes.json` (ignorado por git).

## Deploy en Vercel

1. Subí el repo a GitHub e **importalo** en [vercel.com/new](https://vercel.com/new).
2. En el proyecto de Vercel → **Storage** → creá un **Blob Store** y conectalo al proyecto.
   - Los stores nuevos de Vercel son **privados**; la app guarda con `access: "private"`
     y lee el contenido server-side autenticando con el token (nunca expone la URL al cliente).
   - El store **no** agrega solo la variable del token. Copiala de la pestaña **`.env.local`**
     del store (empieza con `vercel_blob_rw_`) y agregala manualmente como `BLOB_READ_WRITE_TOKEN`
     (¡cuidado con el nombre exacto: `WRITE`, no `WHITE`!).
3. En **Settings → Environment Variables** agregá:
   - `VIEW_USER` = usuario compartido para los clientes (login de la web).
   - `VIEW_PASSWORD` = contraseña compartida para los clientes.
   - `AUTH_SECRET` = secreto largo y aleatorio para firmar la sesión
     (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
   - `SECTOR_CODES` = códigos por sector, formato `SECTOR:CODIGO` separados por coma.
   - `MASTER_CODE` = código que habilita ver todos los sectores.
   - `ADMIN_PASSWORD` = contraseña para `/admin` (subir el `.xlsx`) y `/gestion`.
   - `ANTHROPIC_API_KEY` (opcional) = habilita "Leer con IA" (Opus 4.8) en `/gestion`. Sin ella, la gestión funciona con carga manual.
4. **Deploy**. Listo.

### Cómo se usa

1. Entrá a `/admin`, ingresá la contraseña y subí el `.xlsx`.
2. Los clientes ven los datos actualizados en `/` (con filtro por sector y buscador).

Para actualizar la información, el admin simplemente vuelve a subir el archivo.

## Columnas que se leen

De la hoja **“SOLICITUDES DE COMPRA”** se toman únicamente: `SECTOR`, `DETALLE`, `ESTADO`, `OC`.
El nombre del sector se normaliza para unificar variantes de tipeo en el filtro.
