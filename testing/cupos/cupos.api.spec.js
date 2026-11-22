// CUPOS · obtener_cupos / obtener_listas / obtener_cupos_actuales / editar_cupos
const { test, expect, soloConEscritura } = require('../support/test');

test.describe('Cupos · lectura', () => {
  test('las tres lecturas de especialidades coinciden', async ({ api }) => {
    const cupos = (await api.ok('obtener_cupos')).especialidades;
    const listas = (await api.ok('obtener_listas')).especialidad;
    const actuales = await api.cuposActuales();

    expect(cupos.length).toBeGreaterThan(0);
    expect(listas.length).toBe(cupos.length);
    expect(actuales.length).toBe(cupos.length);
    for (const c of cupos) {
      expect(listas.find((l) => Number(l.id) === Number(c.id))?.cupo).toBe(c.cupo);
      expect(actuales.find((a) => a.id === Number(c.id))?.cupo).toBe(Number(c.cupo));
    }
  });

  test('existe la especialidad AUSENTE con cupo 0', async ({ api }) => {
    const aus = (await api.cuposActuales()).find((c) => c.ausente);
    expect(aus, 'falta la especialidad AUSENTE').toBeTruthy();
    expect(aus.cupo).toBe(0);
  });

  test('disponibles = cupo − inscriptos en cada especialidad', async ({ api }) => {
    const actuales = await api.cuposActuales();
    const elecciones = await api.elecciones();
    for (const c of actuales) {
      const inscriptos = elecciones.filter((e) => Number(e.id_especialidad) === c.id).length;
      if (c.ausente) expect(c.disponibles, 'AUSENTE cuenta inscriptos').toBe(inscriptos);
      else expect(c.disponibles, c.nombre).toBe(c.cupo - inscriptos);
    }
  });
});

test.describe('Cupos · edición', () => {
  soloConEscritura();
  test.describe.configure({ mode: 'serial' });

  let foto = null;

  test.beforeAll(async ({ api }) => {
    foto = await api.cuposActuales();
  });

  test.afterAll(async ({ api }) => {
    // Restaura sólo si se llegó a editar (y nunca con inscriptos: ver skip abajo).
    if (foto && (await api.elecciones()).length === 0) {
      await api.ok('editar_cupos', foto.map((c) => ({ id: c.id, cupo: c.cupo })));
    }
  });

  test('rechaza cuerpos inválidos sin modificar nada', async ({ api }) => {
    expect((await api.postRaw('editar_cupos', 'esto no es json')).data.exito).toBe(false);
    expect((await api.post('editar_cupos', [])).data.exito).toBe(false);
    expect(await api.cuposActuales()).toEqual(foto);
  });

  test('edita uno, edita varios y AUSENTE siempre queda en 0', async ({ api }) => {
    test.skip(
      (await api.elecciones()).length > 0,
      'Hay inscripciones cargadas: editar_cupos reinicia los disponibles, así que no se prueba para no alterar la elección en curso.',
    );
    const [a, b] = foto.filter((c) => !c.ausente);
    const aus = foto.find((c) => c.ausente);

    // Formato objeto único
    const r1 = await api.ok('editar_cupos', { id: a.id, cupo: a.cupo + 3 });
    expect(r1.mensaje).toMatch(/Cupos actualizados/);
    let ahora = await api.cuposActuales();
    expect(ahora.find((c) => c.id === a.id)).toMatchObject({ cupo: a.cupo + 3, disponibles: a.cupo + 3 });

    // Formato lista + negativos se llevan a 0 + AUSENTE ignora el valor
    await api.ok('editar_cupos', [
      { id: a.id, cupo: a.cupo },
      { id: b.id, cupo: -5 },
      { id: aus.id, cupo: 40 },
    ]);
    ahora = await api.cuposActuales();
    expect(ahora.find((c) => c.id === a.id).cupo).toBe(a.cupo);
    expect(ahora.find((c) => c.id === b.id).cupo).toBe(0);
    expect(ahora.find((c) => c.id === aus.id).cupo).toBe(0);

    // Restaurar y comprobar
    await api.ok('editar_cupos', foto.map((c) => ({ id: c.id, cupo: c.cupo })));
    expect(await api.cuposActuales()).toEqual(foto);
  });
});
