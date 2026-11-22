// CONFIGURACIÓN · Usuarios desde la pantalla + permisos del rol "vista"
const { test, expect, soloPantallas, soloConEscritura } = require('../support/test');
const { esperarTitulo, loginUI } = require('../support/ui');

test.describe('Usuarios (pantalla)', () => {
  soloPantallas();

  test('lista los usuarios de la base', async ({ page, api }) => {
    const usuarios = await api.usuarios();
    await page.goto('/configuracion/usuarios');
    await esperarTitulo(page, 'Usuarios y roles');
    for (const u of usuarios.slice(0, 10)) await expect(page.getByText(u.nombre, { exact: true }).first()).toBeVisible();
  });

  test.describe('con escritura', () => {
    soloConEscritura();

    test('crear y eliminar un usuario desde la pantalla', async ({ page, api }) => {
      const nombre = api.nombrePrueba('ui');
      try {
        await page.goto('/configuracion/usuarios');
        await page.getByRole('button', { name: 'Nuevo usuario' }).click();
        await page.getByPlaceholder('Ej.: preceptoria').fill(nombre);
        await page.locator('.cfg-role', { hasText: 'Vista' }).click();
        const claves = page.locator('.cfg-modal input[autocomplete="new-password"]');
        await claves.nth(0).fill('clave123');
        await claves.nth(1).fill('clave123');
        await page.getByRole('button', { name: 'Crear usuario' }).click();
        await expect(page.getByText(nombre, { exact: true }).first()).toBeVisible();
        await expect.poll(async () => (await api.usuarios()).find((u) => u.nombre === nombre)?.rol).toBe('vista');

        await page.getByRole('button', { name: `Eliminar ${nombre}` }).click();
        await page.getByRole('dialog').getByRole('button', { name: /Eliminar/ }).last().click();
        await expect.poll(async () => (await api.usuarios()).some((u) => u.nombre === nombre)).toBe(false);
      } finally {
        const resto = (await api.usuarios()).find((u) => u.nombre === nombre);
        if (resto) await api.eliminarUsuario(resto.id);
      }
    });
  });
});

test.describe('Rol "vista" (pantalla)', () => {
  soloPantallas();
  soloConEscritura();
  test.use({ storageState: { cookies: [], origins: [] } });

  test('solo ve Inicio y Cargar y ordenar; Configuración lo devuelve al panel', async ({ page, api }) => {
    const u = await api.crearUsuario({ rol: 'vista', contrasena: 'clave123' });
    try {
      await loginUI(page, u.nombre, 'clave123');
      await expect(page).toHaveURL(/\/panel$/);
      const menu = page.locator('nav.pp-nav');
      await expect(menu.getByText('Cargar y ordenar')).toHaveCount(1);
      await expect(menu.getByText('Cupos')).toHaveCount(0);
      await expect(menu.getByText('Elección de Especialidad')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Abrir configuración' })).toHaveCount(0);

      await page.goto('/configuracion/usuarios');
      await expect(page).toHaveURL(/\/panel$/);
    } finally {
      await api.eliminarUsuario(u.id);
    }
  });
});
