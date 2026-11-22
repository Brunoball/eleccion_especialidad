// testing/support/env.js
// Lee testing/.env (única fuente de verdad) y decide contra qué backend se prueba.
// TEST_API_URL elige el destino: si apunta a localhost corre contra tu backend
// local; si apunta a Hostinger corre contra el backend publicado.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT, '.env');

function parseEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim().replace(/^﻿/, '');
    let value = line.slice(eq + 1).trim();
    // comentario al final de la línea:  VALOR   # nota
    const hash = value.search(/\s#/);
    if (hash >= 0 && !/^["']/.test(value)) value = value.slice(0, hash).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

if (!fs.existsSync(ENV_FILE)) {
  console.error('\n[testing] Falta testing/.env. Copiá .env.example como .env y completalo.\n');
  process.exit(1);
}

// Las variables del .env mandan; una variable ya exportada en la consola puede pisarlas.
const fileValues = parseEnvFile(ENV_FILE);
const get = (k, d = '') => String(process.env[k] ?? fileValues[k] ?? d).trim();
const bool = (k, d = false) => {
  const v = get(k, '');
  if (v === '') return d;
  return ['1', 'true', 'si', 'sí', 'yes', 'on'].includes(v.toLowerCase());
};
const int = (k, d) => {
  const n = Number.parseInt(get(k, ''), 10);
  return Number.isFinite(n) ? n : d;
};

const rawApi = get('TEST_API_URL').replace(/\/+$/, '').replace(/\/api\.php$/i, '');
if (!rawApi) {
  console.error('\n[testing] Falta TEST_API_URL en testing/.env\n');
  process.exit(1);
}
let apiUrl;
try {
  apiUrl = new URL(rawApi);
} catch {
  console.error(`\n[testing] TEST_API_URL inválida: ${rawApi}\n`);
  process.exit(1);
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const isLocal = LOCAL_HOSTS.has(apiUrl.hostname.toLowerCase());
const frontPort = int('TEST_FRONT_PORT', 3100);

const ENV = Object.freeze({
  root: ROOT,
  envFile: ENV_FILE,

  apiBase: rawApi,                 // ej. http://localhost:3001  |  https://eleccion.ipet50.edu.ar/api/routes
  apiPhp: `${rawApi}/api.php`,     // endpoint real del router
  target: isLocal ? 'local' : 'hostinger',
  isLocal,

  user: get('TEST_USER'),
  password: get('TEST_PASSWORD'),

  // Backend local: si TEST_START_BACKEND=1 y la URL es local, Playwright levanta php -S solo.
  startBackend: isLocal && bool('TEST_START_BACKEND', false),
  backendDir: path.resolve(ROOT, get('TEST_BACKEND_DIR', '../backend')),
  phpBin: get('TEST_PHP_BIN', 'php'),
  phpIni: get('TEST_PHP_INI', ''),

  // Frontend (pruebas de pantallas)
  ui: bool('TEST_UI', true),
  frontendDir: path.resolve(ROOT, get('TEST_FRONTEND_DIR', '../frontend')),
  frontPort,
  frontUrl: `http://localhost:${frontPort}`,

  // Permisos de escritura
  allowMutations: bool('TEST_ALLOW_MUTATIONS', false),
  allowDestructive: bool('TEST_ALLOW_DESTRUCTIVE', false),
  allowRemoteDestructive: bool('TEST_ALLOW_REMOTE_DESTRUCTIVE', false),

  timeoutMs: int('TEST_TIMEOUT_MS', 60_000),
  expectTimeoutMs: int('TEST_EXPECT_TIMEOUT_MS', 10_000),
  slowMo: int('TEST_SLOW_MO_MS', 0),
});

/** Prefijo de todo lo que crean los tests (así la limpieza lo encuentra). */
const PREFIX = 'e2e_';
const HIST_PREFIX = 'E2E ';

const AUTH_FILE = path.join(ROOT, '.auth', 'admin.json');

function puedeMutar() {
  return ENV.allowMutations;
}

function puedeDestruir() {
  if (!ENV.allowMutations || !ENV.allowDestructive) return false;
  return ENV.isLocal || ENV.allowRemoteDestructive;
}

const MOTIVO_MUTAR =
  'Prueba con escritura: requiere TEST_ALLOW_MUTATIONS=1 en testing/.env';
const MOTIVO_DESTRUIR = ENV.isLocal
  ? 'Prueba destructiva: requiere TEST_ALLOW_MUTATIONS=1 y TEST_ALLOW_DESTRUCTIVE=1'
  : 'Prueba destructiva bloqueada en Hostinger (requiere además TEST_ALLOW_REMOTE_DESTRUCTIVE=1)';

function assertCredenciales() {
  const faltan = [];
  if (!ENV.user) faltan.push('TEST_USER');
  if (!ENV.password) faltan.push('TEST_PASSWORD');
  if (faltan.length) throw new Error(`Faltan ${faltan.join(' y ')} en testing/.env`);
}

function resumen() {
  const modo = puedeDestruir()
    ? 'escritura + destructivas (con respaldo y restauración)'
    : puedeMutar()
      ? 'escritura reversible'
      : 'solo lectura';
  return [
    `Destino : ${ENV.target.toUpperCase()}  →  ${ENV.apiPhp}`,
    `Usuario : ${ENV.user || '(sin definir)'}`,
    `Modo    : ${modo}`,
    `Pantallas: ${ENV.ui ? `sí (frontend en ${ENV.frontUrl})` : 'no (solo API)'}`,
  ].join('\n');
}

module.exports = {
  ENV,
  PREFIX,
  HIST_PREFIX,
  AUTH_FILE,
  puedeMutar,
  puedeDestruir,
  MOTIVO_MUTAR,
  MOTIVO_DESTRUIR,
  assertCredenciales,
  resumen,
};
