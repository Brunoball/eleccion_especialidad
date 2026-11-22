// ELECCIÓN · pantalla con sus pestañas Elección / Resultados / Historial
const { test, expect, soloPantallas } = require('../support/test');
const { puedeMutar } = require('../support/env');
const { vigilarErrores, esperarTitulo } = require('../support/ui');

test.describe('Elección de especialidad (pantalla)', () => {
  soloPantallas();

  test('lista los alumnos en el orden del ranking', async ({ page, api }) => {
    const errores = vigilarErrores(page);
    const alumnos = await api.alumnosOrden();
    await page.goto('/eleccion-especialidad');
    await esperarTitulo(page, 'Elección de especialidad');
    await expect(page.getByRole('tab', { name: 'Elección' })).toHaveAttribute('aria-selected', 'true');
    test.skip(alumnos.length === 0, 'No hay alumnos cargados.');
    const filas = page.locator('.grid-row .alumno-nombre');
    await expect(filas.first()).toHaveText(alumnos[0].alumno);
    const n = Math.min(5, alumnos.length);
    for (let i = 0; i < n; i++) await expect(filas.nth(i)).toHaveText(alumnos[i].alumno);
    expect(errores).toEqual([]);
  });

  test('las pestañas cambian de contenido', async ({ page }) => {
    const errores = vigilarErrores(page);
    await page.goto('/eleccion-especialidad');
    await page.getByRole('tab', { name: 'Resultados' }).click();
    await expect(page.getByRole('tab', { name: 'Resultados' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('button', { name: /Resetear elección/ })).toBeVisible();
    await page.getByRole('tab', { name: 'Historial' }).click();
    await expect(page.getByRole('tab', { name: 'Historial' })).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('tab', { name: 'Elección' }).click();
    await expect(page.locator('.cupos-strip').first()).toBeVisible();
    expect(errores).toEqual([]);
  });

  test('"Resetear elección" trae "Guardar historial" marcado y Cancelar no borra nada', async ({ page, api }) => {
    const antes = await api.elecciones();
    await page.goto('/eleccion-especialidad');
    await page.getByRole('tab', { name: 'Resultados' }).click();
    const boton = page.getByRole('button', { name: /Resetear elección/ }).first();
    test.skip(await boton.isDisabled(), 'El botón está deshabilitado (no hay inscripciones).');
    await boton.click();
    const check = page.getByRole('checkbox', { name: /Guardar historial de la elección/ });
    await expect(check).toBeVisible();
    await expect(check).toBeChecked();
    await page.getByRole('button', { name: 'Cancelar' }).last().click();
    await expect(check).toBeHidden();
    expect(await api.elecciones()).toEqual(antes);
  });

  test('confirmar y cancelar la inscripción de un alumno desde la grilla', async ({ page, api }) => {
    test.skip(!puedeMutar(), 'Requiere TEST_ALLOW_MUTATIONS=1');
    const alumno = (await api.alumnosOrden()).find((a) => !a.confirmado);
    const esp = (await api.cuposActuales()).find((c) => !c.ausente && c.disponibles > 0);
    test.skip(!alumno || !esp, 'No hay alumno libre o especialidad con cupo.');
    const fotoCupos = await api.cuposActuales();

    try {
      await page.goto('/eleccion-especialidad');
      const fila = page.locator('.grid-row:not(.grid-header)', { has: page.locator('.alumno-nombre', { hasText: alumno.alumno }) }).first();
      await fila.scrollIntoViewIfNeeded();
      await fila.locator('select').selectOption(String(esp.id));
      await fila.getByRole('button', { name: 'Confirmar' }).click();
      await expect(fila.locator('.tag-insc')).toHaveText(esp.nombre);
      await expect
        .poll(async () => (await api.elecciones()).some((e) => Number(e.id_alumno) === Number(alumno.id_alumno)))
        .toBe(true);

      await fila.getByRole('button', { name: 'Cancelar' }).click();
      await expect(fila.locator('.tag-insc')).toHaveText('Sin inscripción');
      await expect.poll(async () => api.cuposActuales()).toEqual(fotoCupos);
    } finally {
      await api.post('eleccion_cancelar', { id_alumno: Number(alumno.id_alumno) });
    }
  });

  test('Modo Pantalla abre y se cierra con Escape', async ({ page, api }) => {
    test.skip((await api.alumnosOrden()).length === 0, 'No hay alumnos.');
    await page.goto('/eleccion-especialidad');
    await page.locator('.grid-row:not(.grid-header)').first().getByRole('button', { name: 'Pantalla' }).click();
    const cerrar = page.locator('.present-close');
    await expect(cerrar).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(cerrar).toBeHidden();
  });
});
