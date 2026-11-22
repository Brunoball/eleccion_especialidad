// GLOBAL · navegación por el menú, rutas y cierre de sesión (admin)
const { test, expect, soloPantallas } = require('../support/test');
const { vigilarErrores, irPorMenu, esperarTitulo } = require('../support/ui');

const SECCIONES = [
  ['Elección de Especialidad', /\/eleccion-especialidad$/, 'Elección de especialidad'],
  ['Cupos', /\/cupos$/, 'Cupos por especialidad'],
  ['Cargar y ordenar', /\/ordenar$/, 'Ordenamiento de alumnos'],
  ['Inicio', /\/panel$/, 'Panel de la elección'],
];

test.describe('Navegación (admin)', () => {
  soloPantallas();

  test('el menú lleva a cada sección sin errores', async ({ page }) => {
    const errores = vigilarErrores(page);
    await page.goto('/panel');
    await esperarTitulo(page, 'Panel de la elección');
    for (const [item, url, titulo] of SECCIONES) {
      await irPorMenu(page, item);
      await expect(page).toHaveURL(url);
      await esperarTitulo(page, titulo);
    }
    expect(errores).toEqual([]);
  });

  test('Configuración (engranaje) y su acceso a Usuarios', async ({ page }) => {
    await page.goto('/panel');
    await page.getByRole('button', { name: 'Abrir configuración' }).click();
    await expect(page).toHaveURL(/\/configuracion$/);
    await esperarTitulo(page, 'Configuración');
    await page.locator('.cfg-card', { hasText: 'Usuarios y roles' }).click();
    await expect(page).toHaveURL(/\/configuracion\/usuarios$/);
    await esperarTitulo(page, 'Usuarios y roles');
    await page.getByRole('button', { name: 'Volver a Configuración' }).click();
    await expect(page).toHaveURL(/\/configuracion$/);
  });

  test('la ruta vieja /registro redirige a Usuarios', async ({ page }) => {
    await page.goto('/registro');
    await expect(page).toHaveURL(/\/configuracion\/usuarios$/);
  });

  test('cada ruta abre directo (recarga de página)', async ({ page }) => {
    for (const [, url, titulo] of SECCIONES) {
      const ruta = url.source.replace(/\\\//g, '/').replace(/[$^]/g, '');
      await page.goto(ruta);
      await esperarTitulo(page, titulo);
    }
  });

  test('cerrar sesión: cancelar no sale, confirmar vuelve al login', async ({ page }) => {
    await page.goto('/panel');
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page.getByText('¿Estás seguro de que deseas cerrar la sesión?')).toBeVisible();
    await page.locator('.modalprincipal-buttons').getByRole('button', { name: 'Cancelar' }).click();
    await expect(page).toHaveURL(/\/panel$/);

    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await page.locator('.modalprincipal-buttons').getByRole('button', { name: 'Confirmar' }).click();
    await expect(page).toHaveURL(/\/$/);
    expect(await page.evaluate(() => localStorage.getItem('usuario'))).toBeNull();
    await page.goto('/panel');
    await expect(page).toHaveURL(/\/$/);
  });
});
