# Monitor de Solicitudes

App simple para monitorear el estado de las solicitudes de compra a partir de un archivo Excel.

- **Vista de clientes** (`/`): tabla de solo lectura con **Nº (sector)**, **Sector** (filtro), **Detalle**, **Estado** y **OC**. Requiere iniciar sesión.
- **Login** (`/login`): usuario + contraseña ÚNICOS compartidos para todos los clientes.
- **Ingesta de admin** (`/admin`): subida del archivo `SOLICITUDES.xlsx` (protegida por contraseña de admin) que actualiza la fuente de datos.

Todo el sitio queda detrás del login; el `/admin` además pide la contraseña de admin para subir.

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
   - `ADMIN_PASSWORD` = contraseña para `/admin` (subir el `.xlsx`).
4. **Deploy**. Listo.

### Cómo se usa

1. Entrá a `/admin`, ingresá la contraseña y subí el `.xlsx`.
2. Los clientes ven los datos actualizados en `/` (con filtro por sector y buscador).

Para actualizar la información, el admin simplemente vuelve a subir el archivo.

## Columnas que se leen

De la hoja **“SOLICITUDES DE COMPRA”** se toman únicamente: `SECTOR`, `DETALLE`, `ESTADO`, `OC`.
El nombre del sector se normaliza para unificar variantes de tipeo en el filtro.
