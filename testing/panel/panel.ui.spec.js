// INICIO · el dashboard muestra los mismos números que el backend
const { test, expect, soloPantallas } = require('../support/test');
const { vigilarErrores, esperarTitulo } = require('../support/ui');

test.describe('Panel (dashboard)', () => {
  soloPantallas();

  test('carga el resumen y muestra cada especialidad', async ({ page, api }) => {
    const errores = vigilarErrores(page);
    const { resumen } = await api.ok('dashboard_resumen');
    await page.goto('/panel');
    await esperarTitulo(page, 'Panel de la elección');
    for (const e of resumen.especialidades.filter((x) => !x.es_ausente)) {
      await expect(page.getByText(e.nombre, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByText(String(resumen.alumnos.total)).first()).toBeVisible();
    expect(errores).toEqual([]);
  });
});
