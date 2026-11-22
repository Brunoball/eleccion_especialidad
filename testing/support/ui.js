// testing/support/ui.js
// Ayudas para las pruebas de pantallas.
const { expect } = require('@playwright/test');
const { ENV } = require('./env');

/** Completa el login del sistema y espera el panel. */
async function loginUI(page, usuario, contrasena) {
  await page.goto('/');
  await page.getByPlaceholder('Usuario').fill(usuario);
  await page.getByPlaceholder('Contraseña').fill(contrasena);
  await page.getByRole('button', { name: /Iniciar Sesión/i }).click();
}

/**
 * Junta errores reales de la pantalla: excepciones de JS, console.error de la
 * app y llamadas al backend que fallan (red caída o HTTP 5xx). Se ignoran los
 * recursos externos (Google Fonts, favicon) que no dependen del sistema.
 */
function vigilarErrores(page) {
  const errores = [];
  const ruido = /Failed to load resource|fonts\.(googleapis|gstatic)|favicon|Download the React DevTools/i;
  page.on('pageerror', (e) => errores.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !ruido.test(m.text())) errores.push(`console: ${m.text()}`);
  });
  page.on('requestfailed', (r) => {
    // ERR_ABORTED = la pantalla canceló su propio pedido (AbortController al desmontar): no es error.
    if (/ERR_ABORTED|NS_BINDING_ABORTED/i.test(r.failure()?.errorText || '')) return;
    if (r.url().startsWith(ENV.apiPhp)) errores.push(`api caída: ${r.url()} (${r.failure()?.errorText})`);
  });
  page.on('response', (r) => {
    if (r.url().startsWith(ENV.apiPhp) && r.status() >= 500) errores.push(`api HTTP ${r.status()}: ${r.url()}`);
  });
  return errores;
}

/** Ir a una sección por el menú lateral (abre el menú si está colapsado). */
async function irPorMenu(page, texto) {
  const link = page.locator('nav.pp-nav a', { hasText: texto }).first();
  if (!(await link.isVisible())) {
    const abrir = page.getByRole('button', { name: 'Abrir menú' });
    if (await abrir.isVisible()) await abrir.click();
  }
  await link.click();
}

async function esperarTitulo(page, texto) {
  await expect(page.getByRole('heading', { level: 1, name: texto })).toBeVisible();
}

module.exports = { loginUI, vigilarErrores, irPorMenu, esperarTitulo };
