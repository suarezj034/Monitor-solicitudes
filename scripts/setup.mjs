#!/usr/bin/env node
/**
 * Asistente de instalación de SupplIA.
 * Pensado para poder correrlo alguien sin conocimientos de programación:
 * hace preguntas en español y arma el archivo .env.local solo.
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { randomBytes } from "node:crypto";
import { writeFileSync, existsSync, copyFileSync } from "node:fs";
import { spawn } from "node:child_process";

const rl = createInterface({ input: stdin, output: stdout });

async function pregunta(texto, def) {
  const sufijo = def ? ` (${def})` : "";
  const r = await rl.question(`${texto}${sufijo}: `);
  return r.trim() || def || "";
}

async function preguntaSiNo(texto, defSi = true) {
  const sufijo = defSi ? " (S/n)" : " (s/N)";
  const r = (await rl.question(`${texto}${sufijo}: `)).trim().toLowerCase();
  if (!r) return defSi;
  return r.startsWith("s");
}

function ejecutar(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit", shell: true });
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} salió con código ${code}`))));
  });
}

console.log("");
console.log("============================================");
console.log("   SupplIA — asistente de instalación");
console.log("============================================");
console.log("");
console.log("Respondé las preguntas. Cuando un valor tiene algo entre paréntesis,");
console.log("apretar Enter sin escribir nada usa ese valor por defecto.");
console.log("");

const nombreEmpresa = await pregunta("Nombre de la empresa (se muestra en el sistema)");
if (!nombreEmpresa) {
  console.log("\nEl nombre de la empresa es obligatorio. Volvé a ejecutar el instalador.");
  process.exit(1);
}

console.log("");
console.log("Ahora el acceso general: usuario y contraseña únicos, compartidos por todos los sectores.");
const viewUser = await pregunta("  Usuario", "cliente");
const viewPassword = await pregunta("  Contraseña");
if (!viewPassword) {
  console.log("\nLa contraseña no puede estar vacía. Volvé a ejecutar el instalador.");
  process.exit(1);
}

console.log("");
const adminPassword = await pregunta("Contraseña del panel de administración (distinta a la de arriba)");
if (!adminPassword) {
  console.log("\nLa contraseña de administrador no puede estar vacía. Volvé a ejecutar el instalador.");
  process.exit(1);
}

console.log("");
console.log("Ahora los sectores. Cada sector va a tener su propio código de acceso");
console.log("(por ejemplo: Producción, Mantenimiento, Compras...).");
console.log("Escribí el nombre de un sector, o dejalo vacío y Enter cuando termines.");
const sectores = [];
for (;;) {
  const nombre = await pregunta(`  Sector #${sectores.length + 1}`);
  if (!nombre) break;
  const codigo = await pregunta(`  Código de acceso para "${nombre}"`);
  if (!codigo) {
    console.log("  (sin código, se omite ese sector)");
    continue;
  }
  sectores.push(`${nombre}:${codigo}`);
}
if (sectores.length === 0) {
  console.log("");
  console.log("No cargaste ningún sector. Podés agregarlos después a mano en .env.local (SECTOR_CODES).");
}

console.log("");
const masterCode = await pregunta("Código maestro, para ver todos los sectores a la vez (opcional)");

console.log("");
const geminiKey = await pregunta("Clave de Google Gemini para lectura de documentos con IA (opcional)");

const authSecret = randomBytes(32).toString("hex");

const lineas = [
  "# Generado por scripts/setup.mjs — no compartir este archivo.",
  `NEXT_PUBLIC_COMPANY_NAME=${nombreEmpresa}`,
  `VIEW_USER=${viewUser}`,
  `VIEW_PASSWORD=${viewPassword}`,
  `AUTH_SECRET=${authSecret}`,
  `SECTOR_CODES=${sectores.join(",")}`,
  masterCode ? `MASTER_CODE=${masterCode}` : "# MASTER_CODE=",
  `ADMIN_PASSWORD=${adminPassword}`,
  geminiKey ? `GEMINI_API_KEY=${geminiKey}` : "# GEMINI_API_KEY=",
  "",
];

const destino = ".env.local";
if (existsSync(destino)) {
  const backup = `.env.local.bak-${Date.now()}`;
  copyFileSync(destino, backup);
  console.log("");
  console.log(`Ya existía un .env.local: se guardó una copia como ${backup}`);
}
writeFileSync(destino, lineas.join("\n"), "utf8");

console.log("");
console.log("✓ Configuración guardada en .env.local");
console.log("");
console.log("Recordá reemplazar el archivo public/logo.svg por el logo de la empresa");
console.log("(mismo nombre de archivo — no hace falta tocar nada de código).");
console.log("");

const arrancar = await preguntaSiNo("¿Querés compilar e iniciar el sistema ahora?", true);
rl.close();

if (arrancar) {
  try {
    console.log("");
    console.log("Compilando… esto puede tardar 1-2 minutos.");
    await ejecutar("npm", ["run", "build"]);
    console.log("");
    console.log("Iniciando en http://localhost:3000 — dejá esta ventana abierta mientras lo uses.");
    await ejecutar("npm", ["start"]);
  } catch (e) {
    console.log("");
    console.log("Hubo un problema al compilar o iniciar:", e.message);
    console.log("Revisá el mensaje de arriba, o pedile ayuda a quien te entregó el sistema.");
    process.exit(1);
  }
} else {
  console.log("Cuando quieras iniciarlo: ejecutá iniciar.bat (Windows) o ./iniciar.sh (Mac/Linux).");
}
