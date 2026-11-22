// CONFIGURACIÓN · Usuarios: listar / crear / editar / eliminar + reglas
// Crea usuarios "e2e_..." y los borra al final (escritura reversible).
const { test, expect, soloConEscritura } = require('../support/test');

test.describe('Usuarios · lectura', () => {
  test('usuarios_listar no expone contraseñas y trae al admin de pruebas', async ({ api }) => {
    const lista = await api.usuarios();
    expect(lista.length).toBeGreaterThan(0);
    for (const u of lista) {
      expect(Object.keys(u)).not.toContain('Hash_Contrasena');
      expect(Object.keys(u)).not.toContain('contrasena');
      expect(['admin', 'vista']).toContain(u.rol);
    }
    expect(lista.some((u) => Number(u.id) === api.idActual)).toBe(true);
    expect(lista.filter((u) => u.rol === 'admin').length).toBeGreaterThan(0);
  });
});

test.describe('Usuarios · alta, edición y baja', () => {
  soloConEscritura();
  test.describe.configure({ mode: 'serial' });

  let creado = null;

  test.afterAll(async ({ api }) => {
    if (creado) await api.eliminarUsuario(creado.id);
  });

  test('validaciones al crear', async ({ api }) => {
    const casos = [
      [{ nombre: 'abc', rol: 'vista', contrasena: 'clave123' }, /entre 4 y 100/],
      [{ nombre: api.nombrePrueba(), rol: 'jefe', contrasena: 'clave123' }, /Rol inválido/],
      [{ nombre: api.nombrePrueba(), rol: 'vista' }, /obligatoria/],
      [{ nombre: api.nombrePrueba(), rol: 'vista', contrasena: '123' }, /al menos 6/],
      [{ nombre: '', rol: 'vista', contrasena: 'clave123' }, /usuario/i],
    ];
    for (const [body, msg] of casos) {
      const r = await api.post('usuarios_guardar', { ...body, id_actual: api.idActual });
      expect(r.data.exito, JSON.stringify(body)).toBe(false);
      expect(r.data.mensaje).toMatch(msg);
    }
  });

  test('crea un usuario vista que puede iniciar sesión', async ({ api, anon }) => {
    creado = await api.crearUsuario({ rol: 'vista', contrasena: 'clave123' });
    expect(creado.id).toBeGreaterThan(0);
    const lista = await api.usuarios();
    expect(lista.find((u) => Number(u.id) === creado.id)?.rol).toBe('vista');

    const u = await anon.login(creado.nombre, 'clave123');
    expect(String(u.rol).toLowerCase()).toBe('vista');
  });

  test('no permite nombres repetidos (sin importar mayúsculas)', async ({ api }) => {
    const r = await api.post('usuarios_guardar', {
      nombre: creado.nombre.toUpperCase(),
      rol: 'vista',
      contrasena: 'clave123',
      id_actual: api.idActual,
    });
    expect(r.data.exito).toBe(false);
    expect(r.data.mensaje).toMatch(/Ya existe/);
  });

  test('edita nombre y rol conservando la contraseña si viene vacía', async ({ api, anon }) => {
    const nuevoNombre = `${creado.nombre}x`;
    const d = await api.ok('usuarios_guardar', {
      id: creado.id,
      nombre: nuevoNombre,
      rol: 'admin',
      contrasena: '',
      id_actual: api.idActual,
    });
    expect(d.usuario.rol).toBe('admin');
    creado.nombre = nuevoNombre;
    const u = await anon.login(nuevoNombre, 'clave123');
    expect(String(u.rol).toLowerCase()).toBe('admin');
  });

  test('cambia la contraseña: la vieja deja de funcionar', async ({ api, anon }) => {
    await api.ok('usuarios_guardar', {
      id: creado.id,
      nombre: creado.nombre,
      rol: 'vista',
      contrasena: 'nueva456',
      id_actual: api.idActual,
    });
    const vieja = await anon.post('inicio', { nombre: creado.nombre, contrasena: 'clave123' });
    expect(vieja.data.exito).toBe(false);
    const nueva = await anon.login(creado.nombre, 'nueva456');
    expect(String(nueva.rol).toLowerCase()).toBe('vista');
  });

  test('editar un usuario inexistente falla', async ({ api }) => {
    const r = await api.post('usuarios_guardar', {
      id: 99999999,
      nombre: api.nombrePrueba(),
      rol: 'vista',
      id_actual: api.idActual,
    });
    expect(r.data.exito).toBe(false);
    expect(r.data.mensaje).toMatch(/no existe/);
  });

  test('protecciones de la propia sesión', async ({ api }) => {
    const propio = (await api.usuarios()).find((u) => Number(u.id) === api.idActual);
    const borrarme = await api.eliminarUsuario(api.idActual);
    expect(borrarme.data.exito).toBe(false);
    expect(borrarme.data.mensaje).toMatch(/propio usuario/);

    // (el nombre del admin de pruebas tiene que pasar la validación de 4+ caracteres)
    test.skip(propio.nombre.length < 4, 'El nombre de TEST_USER tiene menos de 4 letras: no se puede probar el cambio de rol propio.');
    const cambioRol = await api.post('usuarios_guardar', {
      id: api.idActual,
      nombre: propio.nombre,
      rol: 'vista',
      id_actual: api.idActual,
    });
    expect(cambioRol.data.exito).toBe(false);
    expect(cambioRol.data.mensaje).toMatch(/propia sesión/);
  });

  test('eliminar: inválido, inexistente y real', async ({ api, anon }) => {
    expect((await api.eliminarUsuario(0)).data.exito).toBe(false);
    expect((await api.eliminarUsuario(99999999)).data.mensaje).toMatch(/no existe/);

    const r = await api.eliminarUsuario(creado.id);
    expect(r.data.exito, r.data.mensaje).toBe(true);
    const lista = await api.usuarios();
    expect(lista.some((u) => Number(u.id) === creado.id)).toBe(false);
    const login = await anon.post('inicio', { nombre: creado.nombre, contrasena: 'nueva456' });
    expect(login.data.exito).toBe(false);
    creado = null;
  });
});
