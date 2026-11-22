// ELECCIÓN · eleccion_resetear (botón "Resetear elección" de Resultados)
// DESTRUCTIVA: borra inscripciones. Se respalda todo antes y se restaura al
// final (inscripciones en el mismo orden + cupos). Solo con
// TEST_ALLOW_DESTRUCTIVE=1 y, por defecto, solo contra el backend local.
const { test, expect, soloDestructivo } = require('../support/test');
const { HIST_PREFIX } = require('../support/env');
const { respaldar, restaurarEleccion, borrarHistorialNuevo, diferenciasCupos, clave } = require('../support/estado');

test.describe('Resetear elección + historial', () => {
  soloDestructivo();
  test.describe.configure({ mode: 'serial' });

  let foto = null;
  let idHistorial = null;

  test.beforeAll(async ({ api }) => {
    foto = await respaldar(api);
  });

  test.afterAll(async ({ api }) => {
    if (!foto) return;
    await restaurarEleccion(api, foto);
    await borrarHistorialNuevo(api, foto);
  });

  /** Inscribe `n` alumnos libres para que haya algo que guardar. */
  async function inscribirLibres(api, n) {
    const libres = (await api.alumnosOrden()).filter((a) => !a.confirmado).slice(0, n);
    const cupos = (await api.cuposActuales()).filter((c) => !c.ausente && c.disponibles > 0);
    const aus = (await api.cuposActuales()).find((c) => c.ausente);
    for (const [i, a] of libres.entries()) {
      // el último va como AUSENTE para probar el contador de ausentes
      const esp = i === libres.length - 1 && aus && libres.length > 1 ? aus : cupos[i % cupos.length];
      await api.ok('eleccion_confirmar', { id_alumno: Number(a.id_alumno), id_especialidad: esp.id });
    }
    return libres.length;
  }

  test('con "Guardar historial" guarda cada alumno, su orden y su especialidad', async ({ api }) => {
    await inscribirLibres(api, 3);
    const antes = await api.elecciones();
    expect(antes.length).toBeGreaterThan(0);
    const totalAlumnos = (await api.tablaAlumnos()).data.length;

    const titulo = `${HIST_PREFIX}reset ${Date.now()}`;
    const r = await api.ok('eleccion_resetear', {
      guardar_historial: true,
      titulo_historial: titulo,
      usuario: api.nombreActual,
    });
    expect(r.mensaje).toMatch(/Historial guardado con \d+ inscripciones/);
    expect(r.historial.guardado).toBe(true);
    expect(r.historial.inscriptos).toBe(antes.length);
    idHistorial = Number(r.historial.id);

    // la elección quedó vacía y los cupos completos
    expect(await api.elecciones()).toHaveLength(0);
    for (const c of await api.cuposActuales()) {
      expect(c.disponibles, c.nombre).toBe(c.ausente ? 0 : c.cupo);
    }
    // los alumnos NO se borran con este reseteo
    expect((await api.tablaAlumnos()).data.length).toBe(totalAlumnos);

    // aparece primero en el historial
    const lista = await api.historial();
    const h = lista.find((x) => Number(x.id) === idHistorial);
    expect(h).toMatchObject({ titulo, origen: 'resultados', usuario: api.nombreActual, total_inscriptos: antes.length });
    expect(Number(lista[0].id)).toBe(idHistorial);

    // el detalle conserva exactamente quién eligió qué
    const d = await api.ok('historial_detalle', undefined, { id: String(idHistorial) });
    for (const e of antes) {
      const fila = d.alumnos.find((a) => clave(a.dni, a.alumno) === clave(e.dni, e.nombre));
      expect(fila, `${e.nombre} en el historial`).toBeTruthy();
      expect(fila.especialidad).toBe(e.especialidad);
    }
    const ausentes = antes.filter((e) => String(e.especialidad).toUpperCase() === 'AUSENTE').length;
    expect(d.eleccion.total_ausentes).toBe(ausentes);
  });

  test('sin "Guardar historial" borra sin dejar registro', async ({ api }) => {
    await inscribirLibres(api, 1);
    const cantidad = (await api.historial()).length;
    const r = await api.ok('eleccion_resetear', { guardar_historial: false, titulo_historial: `${HIST_PREFIX}no` });
    expect(r.mensaje).toMatch(/No se guardó historial/);
    expect(r.historial.guardado).toBe(false);
    expect(await api.elecciones()).toHaveLength(0);
    expect(await api.historial()).toHaveLength(cantidad);
  });

  test('si no hay inscripciones no se guarda un historial vacío', async ({ api }) => {
    const cantidad = (await api.historial()).length;
    const r = await api.ok('eleccion_resetear', { guardar_historial: true, titulo_historial: `${HIST_PREFIX}vacio` });
    expect(r.mensaje).toMatch(/No había inscripciones/);
    expect(await api.historial()).toHaveLength(cantidad);
  });

  test('por defecto (sin indicar la opción) guarda historial', async ({ api }) => {
    await inscribirLibres(api, 1);
    const r = await api.ok('eleccion_resetear', { titulo_historial: `${HIST_PREFIX}default` });
    expect(r.historial.guardado).toBe(true);
    await api.ok('historial_eliminar', { id: r.historial.id });
  });

  test('eliminar un registro del historial', async ({ api }) => {
    const r = await api.ok('historial_eliminar', { id: idHistorial });
    expect(r.mensaje).toMatch(/eliminado/);
    expect((await api.historial()).some((h) => Number(h.id) === idHistorial)).toBe(false);
    expect((await api.get('historial_detalle', { id: String(idHistorial) })).data.mensaje).toMatch(/no existe/);
  });

  test('restaura las inscripciones y los cupos originales', async ({ api }) => {
    const errores = await restaurarEleccion(api, foto);
    expect(errores, 'inscripciones que no se pudieron restaurar').toEqual([]);
    expect(await diferenciasCupos(api, foto)).toEqual([]);
    const ahora = (await api.elecciones()).sort((a, b) => a.id_eleccion - b.id_eleccion).map((e) => `${clave(e.dni, e.nombre)}→${e.id_especialidad}`);
    expect(ahora).toEqual(foto.elecciones.map((e) => `${e.clave}→${e.id_especialidad}`));
  });
});
