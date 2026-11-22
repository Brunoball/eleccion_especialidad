#!/usr/bin/env node
'use strict';
/**
 * IPET 50 · Elección de Especialidad — ejecución de tests por módulo.
 *
 *   node ejecutar.cjs global          login + router + navegación
 *   node ejecutar.cjs <modulo>        tests del módulo y sus impactos directos
 *   node ejecutar.cjs completo        TODO el sistema
 *
 * Opciones:  --api (solo API, sin abrir el navegador)   --ui (solo pantallas)
 *            --headed (ver el navegador)   --list (solo listar archivos)
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { modulos } = require('./perfiles.json');

const raiz = __dirname;
const pedido = (process.argv[2] || '').trim().toLowerCase().replaceAll('-', '_');
const flags = process.argv.slice(3);
const VALIDAS = ['--api', '--ui', '--headed', '--list'];

const fail = (m) => { console.error(`ERROR: ${m}`); process.exit(1); };
const rel = (p) => path.relative(raiz, p).split(path.sep).join('/');

function descubrir(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const it of fs.readdirSync(dir, { withFileTypes: true })) {
    if (it.name === 'node_modules' || it.name.startsWith('.')) continue;
    const full = path.join(dir, it.name);
    if (it.isDirectory()) out.push(...descubrir(full));
    else if (/\.spec\.js$/.test(it.name)) out.push(full);
  }
  return out.sort();
}

function verificar() {
  const todos = new Set(descubrir(raiz).map(rel));
  const asignados = new Set();
  for (const [nombre, p] of Object.entries(modulos)) {
    for (const c of p.carpetas) {
      for (const f of descubrir(path.join(raiz, c)).map(rel)) {
        if (asignados.has(f)) fail(`Test asignado a dos módulos: ${f}`);
        asignados.add(f);
      }
    }
    for (const imp of p.impactos) {
      if (!fs.existsSync(path.join(raiz, imp))) fail(`Impacto inexistente en "${nombre}": ${imp}`);
    }
  }
  const huerfanos = [...todos].filter((f) => !asignados.has(f));
  if (huerfanos.length) fail(`Tests sin módulo en perfiles.json: ${huerfanos.join(', ')}`);
  return todos.size;
}

if (!pedido || ['ayuda', 'help', '--help'].includes(pedido)) {
  console.log('Uso: node ejecutar.cjs global | <modulo> | completo   [--api | --ui] [--headed] [--list]');
  for (const [n, p] of Object.entries(modulos)) console.log(`  ${n.padEnd(10)} ${p.descripcion}`);
  console.log(`  ${'completo'.padEnd(10)} todo el sistema`);
  process.exit(0);
}
const raras = flags.filter((f) => !VALIDAS.includes(f));
if (raras.length) fail(`Opciones no reconocidas: ${raras.join(' ')}`);
if (flags.includes('--api') && flags.includes('--ui')) fail('Usá --api o --ui, no los dos.');

if (pedido === 'verificar') {
  console.log(`OK: ${verificar()} archivos de test, todos asignados a un módulo.`);
  process.exit(0);
}
if (pedido !== 'completo' && !modulos[pedido]) fail(`Módulo desconocido: ${pedido}. Corré "node ejecutar.cjs ayuda".`);
verificar();

let archivos = [];
if (pedido !== 'completo') {
  const p = modulos[pedido];
  archivos = [...new Set([
    ...p.carpetas.flatMap((c) => descubrir(path.join(raiz, c)).map(rel)),
    ...p.impactos,
  ])].sort();
}

// La configuración (destino, permisos) sale de testing/.env
const { ENV, resumen, puedeDestruir } = require('./support/env');

console.log(`\nIPET 50 · TESTING · ${pedido.toUpperCase()}`);
console.log(resumen());
if (!ENV.isLocal && puedeDestruir()) {
  console.log('\n⚠  ATENCIÓN: pruebas DESTRUCTIVAS habilitadas contra HOSTINGER (se respalda y restaura, pero son datos reales).');
}
if (pedido === 'completo') console.log('\nSuite completa.');
else console.log(`\n${archivos.length} archivo(s): módulo + impactos directos.`);

if (flags.includes('--list')) {
  (archivos.length ? archivos : descubrir(raiz).map(rel)).forEach((f) => console.log(`  ${f}`));
  process.exit(0);
}

const candidatos = [
  path.join(raiz, 'node_modules', '@playwright', 'test', 'cli.js'),
  path.join(raiz, 'node_modules', 'playwright', 'cli.js'),
];
const cli = candidatos.find((p) => fs.existsSync(p));
if (!cli) fail('No encontré Playwright. Dentro de la carpeta testing corré: npm install  y  npx playwright install chromium');

const args = [cli, 'test', ...archivos, '--workers=1', '--reporter=list'];
if (flags.includes('--api')) args.push('--project=api');
if (flags.includes('--ui')) {
  if (!ENV.ui) fail('TEST_UI=0 en testing/.env: no hay pruebas de pantallas habilitadas.');
  args.push('--project=setup', '--project=ui');
}
if (flags.includes('--headed')) args.push('--headed');
if (pedido !== 'completo') args.push('--max-failures=3');

// Si sólo corre la API, no hace falta levantar el frontend.
const env = { ...process.env };
if (flags.includes('--api')) env.TEST_UI = '0';

const r = spawnSync(process.execPath, args, { cwd: raiz, stdio: 'inherit', env });
if (r.error) fail(r.error.message);
process.exit(r.status ?? 1);
