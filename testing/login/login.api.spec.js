// LOGIN · acción "inicio" (y el registro heredado)
const { test, expect, soloConEscritura } = require('../support/test');
const { ENV } = require('../support/env');

test.describe('Login (API)', () => {
  test('credenciales correctas devuelven el usuario con su rol', async ({ anon }) => {
    const u = await anon.login();
    expect(Number(u.idUsuario)).toBeGreaterThan(0);
    expect(u.Nombre_Completo).toBe(ENV.user);
    expect(['admin', 'vista']).toContain(String(u.rol).toLowerCase());
  });

  test('el usuario de pruebas (TEST_USER) es administrador', async ({ anon }) => {
    const u = await anon.login();
    expect(String(u.rol).toLowerCase(), 'TEST_USER debe ser admin para probar todo').toBe('admin');
  });

  test('contraseña incorrecta es rechazada', async ({ anon }) => {
    const r = await anon.post('inicio', { nombre: ENV.user, contrasena: `${ENV.password}_mal` });
    expect(r.data.exito).toBe(false);
    expect(r.data.mensaje).toMatch(/incorrect/i);
    expect(r.data.usuario).toBeUndefined();
  });

  test('usuario inexistente es rechazado', async ({ anon }) => {
    const r = await anon.post('inicio', { nombre: 'no_existe_e2e_xyz', contrasena: 'loquesea' });
    expect(r.data.exito).toBe(false);
  });

  test('faltan datos', async ({ anon }) => {
    const r = await anon.post('inicio', { nombre: '', contrasena: '' });
    expect(r.data.exito).toBe(false);
    expect(r.data.mensaje).toMatch(/Faltan datos/i);
  });

  test('GET no está permitido', async ({ anon }) => {
    const r = await anon.get('inicio');
    expect(r.data.exito).toBe(false);
  });
});

test.describe('Registro heredado (action=registro)', () => {
  soloConEscritura();

  test('valida datos y crea un usuario que después se elimina', async ({ api }) => {
    const r1 = await api.post('registro', { nombre: 'abc', contrasena: '123456', rol: 'vista' });
    expect(r1.data.exito).toBe(false);
    const r2 = await api.post('registro', { nombre: api.nombrePrueba(), contrasena: '123', rol: 'vista' });
    expect(r2.data.exito).toBe(false);
    const r3 = await api.post('registro', { nombre: api.nombrePrueba(), contrasena: '123456', rol: 'otro' });
    expect(r3.data.exito).toBe(false);

    const nombre = api.nombrePrueba('r');
    const ok = await api.ok('registro', { nombre, contrasena: 'clave123', rol: 'vista' });
    const id = Number(ok.usuario.idUsuario);
    try {
      expect(id).toBeGreaterThan(0);
      const dup = await api.post('registro', { nombre, contrasena: 'clave123', rol: 'vista' });
      expect(dup.data.exito).toBe(false);
    } finally {
      await api.eliminarUsuario(id);
    }
  });
});
