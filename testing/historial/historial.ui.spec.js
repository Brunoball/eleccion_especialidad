// HISTORIAL · pestaña Historial de la pantalla de Elección
const { test, expect, soloPantallas } = require('../support/test');
const { vigilarErrores } = require('../support/ui');

test.describe('Historial (pantalla)', () => {
  soloPantallas();

  test('el selector lista las elecciones guardadas y muestra el detalle', async ({ page, api }) => {
    const errores = vigilarErrores(page);
    const lista = await api.historial();
    await page.goto('/eleccion-especialidad');
    await page.getByRole('tab', { name: 'Historial' }).click();
    if (lista.length === 0) {
      await expect(page.locator('.hist-empty, .mod-empty').first()).toBeVisible();
      return;
    }
    const selector = page.getByRole('combobox', { name: 'Elegir una elección del historial' });
    await expect(selector).toBeVisible();
    await expect(selector.locator('option')).toHaveCount(lista.length);

    const det = await api.ok('historial_detalle', undefined, { id: String(lista[0].id) });
    const conEsp = det.alumnos.find((a) => a.especialidad);
    if (conEsp) await expect(page.getByText(conEsp.alumno).first()).toBeVisible();

    // filtro por búsqueda
    if (conEsp) {
      await page.getByRole('textbox', { name: 'Buscar alumno, DNI u orden' }).fill(conEsp.alumno.slice(0, 6));
      await expect(page.getByText(conEsp.alumno).first()).toBeVisible();
    }

    if (lista.length > 1) {
      await selector.selectOption(String(lista[1].id));
      const det2 = await api.ok('historial_detalle', undefined, { id: String(lista[1].id) });
      const a2 = det2.alumnos.find((a) => a.especialidad);
      await page.getByRole('textbox', { name: 'Buscar alumno, DNI u orden' }).fill('');
      if (a2) await expect(page.getByText(a2.alumno).first()).toBeVisible();
    }
    expect(errores).toEqual([]);
  });
});
