// testing/setup/auth.setup.js
// Inicia sesión una vez por la pantalla de login y guarda la sesión
// (localStorage) para el resto de las pruebas de pantallas.
const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { ENV, AUTH_FILE, assertCredenciales } = require('../support/env');
const { loginUI } = require('../support/ui');

test('login del administrador (guarda sesión)', async ({ page }) => {
  test.skip(!ENV.ui, 'TEST_UI=0');
  assertCredenciales();
  await loginUI(page, ENV.user, ENV.password);
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Panel de la elección' })).toBeVisible();

  const usuario = await page.evaluate(() => JSON.parse(localStorage.getItem('usuario') || 'null'));
  expect(usuario, 'el login debe guardar "usuario" en localStorage').toBeTruthy();
  expect(String(usuario.rol).toLowerCase(), 'TEST_USER tiene que ser administrador').toBe('admin');

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });
});
