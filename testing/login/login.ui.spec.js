// LOGIN · pantalla de acceso (sin sesión guardada)
const { test, expect, soloPantallas } = require('../support/test');
const { ENV } = require('../support/env');
const { loginUI, vigilarErrores } = require('../support/ui');

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Pantalla de login', () => {
  soloPantallas();

  test('sin sesión, cualquier ruta interna vuelve al login', async ({ page }) => {
    for (const ruta of ['/panel', '/eleccion-especialidad', '/cupos', '/ordenar', '/configuracion']) {
      await page.goto(ruta);
      await expect(page, ruta).toHaveURL(/\/$/);
      await expect(page.getByPlaceholder('Usuario')).toBeVisible();
    }
  });

  test('contraseña incorrecta muestra error y no entra', async ({ page }) => {
    await loginUI(page, ENV.user, `${ENV.password}_mal`);
    await expect(page.getByText(/incorrect/i).first()).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    expect(await page.evaluate(() => localStorage.getItem('usuario'))).toBeNull();
  });

  test('login correcto entra al panel', async ({ page }) => {
    const errores = vigilarErrores(page);
    await loginUI(page, ENV.user, ENV.password);
    await expect(page).toHaveURL(/\/panel$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Panel de la elección' })).toBeVisible();
    expect(errores).toEqual([]);
  });

  test('mostrar / ocultar contraseña', async ({ page }) => {
    await page.goto('/');
    const pass = page.getByPlaceholder('Contraseña');
    await pass.fill('secreto');
    await expect(pass).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
    await expect(pass).toHaveAttribute('type', 'text');
  });
});
