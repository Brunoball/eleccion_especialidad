// CUPOS · pantalla de edición de cupos
const { test, expect, soloPantallas } = require('../support/test');
const { puedeMutar } = require('../support/env');
const { vigilarErrores, esperarTitulo } = require('../support/ui');

test.describe('Cupos (pantalla)', () => {
  soloPantallas();

  test('muestra un campo por especialidad con el cupo guardado', async ({ page, api }) => {
    const errores = vigilarErrores(page);
    const cupos = (await api.cuposActuales()).filter((c) => !c.ausente);
    await page.goto('/cupos');
    await esperarTitulo(page, 'Cupos por especialidad');
    const inputs = page.locator('input[type="number"]');
    await expect(inputs.first()).toBeVisible();
    const valores = await inputs.evaluateAll((els) => els.map((e) => Number(e.value)));
    for (const c of cupos) expect(valores, c.nombre).toContain(c.cupo);
    expect(errores).toEqual([]);
  });

  test('"Guardar todos" guarda el cambio en la base', async ({ page, api }) => {
    test.skip(!puedeMutar(), 'Requiere TEST_ALLOW_MUTATIONS=1');
    test.skip((await api.elecciones()).length > 0, 'Hay inscripciones: no se tocan los cupos de una elección en curso.');
    const foto = await api.cuposActuales();
    try {
      await page.goto('/cupos');
      const input = page.locator('input[type="number"]').first();
      const original = Number(await input.inputValue());
      await input.fill(String(original + 1));
      await page.getByRole('button', { name: /Guardar todos/ }).click();
      await expect
        .poll(async () => (await api.cuposActuales()).some((c) => !c.ausente && c.cupo === original + 1 &&
          foto.find((f) => f.id === c.id)?.cupo === original))
        .toBe(true);
    } finally {
      await api.ok('editar_cupos', foto.map((c) => ({ id: c.id, cupo: c.cupo })));
    }
    expect(await api.cuposActuales()).toEqual(foto);
  });
});
