// CARGAR Y ORDENAR · pantalla de tabla, criterios y limpieza
const { test, expect, soloPantallas } = require('../support/test');
const { vigilarErrores, esperarTitulo } = require('../support/ui');

test.describe('Ordenar (pantalla)', () => {
  soloPantallas();

  test('muestra la tabla de alumnos', async ({ page, api }) => {
    const errores = vigilarErrores(page);
    const { data } = await api.tablaAlumnos();
    await page.goto('/ordenar');
    await esperarTitulo(page, 'Ordenamiento de alumnos');
    if (data.length) {
      const primero = [...data].sort((a, b) => (a.orden ?? 1e9) - (b.orden ?? 1e9))[0];
      await expect(page.getByText(primero.alumno).first()).toBeVisible();
    }
    expect(errores).toEqual([]);
  });

  test('"Limpiar todo" trae "Guardar historial" marcado y Cancelar no borra nada', async ({ page, api }) => {
    const antes = (await api.tablaAlumnos()).data.length;
    await page.goto('/ordenar');
    const boton = page.getByRole('button', { name: /Limpiar todo/ }).first();
    test.skip(await boton.isDisabled(), 'Botón deshabilitado (no hay datos).');
    await boton.click();
    const check = page.getByRole('checkbox', { name: /Guardar historial de la elección/ });
    await expect(check).toBeChecked();
    // la casilla es un checkbox estilizado: se hace clic en su etiqueta
    await page.locator('.hist-opt__check').click();
    await expect(check).not.toBeChecked();
    await page.locator('.modalprincipal-buttons').getByRole('button', { name: 'Cancelar' }).click();
    await expect(check).toBeHidden();
    expect((await api.tablaAlumnos()).data.length).toBe(antes);
  });
});
