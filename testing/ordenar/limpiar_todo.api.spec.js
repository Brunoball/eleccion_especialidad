// CARGAR Y ORDENAR · importar alumnos, aplicar ranking y "Limpiar todo"
// DESTRUCTIVA: "Limpiar todo" borra alumnos e inscripciones. Se respalda todo
// y se restaura al final (alumnos reimportados, ranking reaplicado,
// inscripciones en el mismo orden y cupos). Solo con TEST_ALLOW_DESTRUCTIVE=1.
const { test, expect, soloDestructivo } = require('../support/test');
const { HIST_PREFIX } = require('../support/env');
const {
  respaldar,
  restaurarAlumnos,
  restaurarEleccion,
  borrarHistorialNuevo,
  diferenciasCupos,
  clave,
} = require('../support/estado');

// DNI ficticio fuera de rango real para el alumno de prueba
const DNI_PRUEBA = String(90000000 + Math.floor(Math.random() * 999999));

test.describe('Importar, ordenar y limpiar todo', () => {
  soloDestructivo();
  test.describe.configure({ mode: 'serial' });

  let foto = null;

  test.beforeAll(async ({ api }) => {
    foto = await respaldar(api);
  });

  test.afterAll(async ({ api }) => {
    if (!foto) return;
    // Si quedó el alumno de prueba (falló antes de limpiar), no hay endpoint
    // para borrarlo: se avisa en consola.
    const resto = (await api.tablaAlumnos()).data.find((r) => String(r.dni) === DNI_PRUEBA);
    if (resto) console.warn(`[testing] Quedó el alumno de prueba DNI ${DNI_PRUEBA}: borralo a mano.`);
    await restaurarAlumnos(api, foto);
    await restaurarEleccion(api, foto);
    await borrarHistorialNuevo(api, foto);
  });

  test('importa un alumno nuevo y al reimportar el mismo DNI lo actualiza', async ({ api }) => {
    const base = (await api.tablaAlumnos()).data.length;
    const fila = {
      dni: DNI_PRUEBA,
      alumno: 'E2E, ALUMNO DE PRUEBA',
      promedio_final: '7.50',
      promedio_1a: '7',
      promedio_1et: '8',
      repite_1a: 'no',
      trayectoria_institucional: 0,
    };
    const r1 = await api.ok('alumnos_import_json', { rows: [fila, { dni: '', alumno: '' }] });
    expect(r1.data).toBeTruthy();
    let tabla = (await api.tablaAlumnos()).data;
    expect(tabla.length).toBe(base + 1);
    expect(tabla.find((r) => String(r.dni) === DNI_PRUEBA)?.alumno).toBe(fila.alumno);

    await api.ok('alumnos_import_json', { rows: [{ ...fila, alumno: 'E2E, ALUMNO EDITADO' }] });
    tabla = (await api.tablaAlumnos()).data;
    expect(tabla.length).toBe(base + 1);
    expect(tabla.find((r) => String(r.dni) === DNI_PRUEBA)?.alumno).toBe('E2E, ALUMNO EDITADO');
  });

  test('aplicar el ranking guarda la columna orden igual a la vista previa', async ({ api }) => {
    const r = await api.ok('ordenar_ranking', { aplicar: 1 }, { aplicar: 1 });
    expect(r.mensaje).toMatch(/Ranking aplicado/);
    const { data } = await api.tablaAlumnos();
    expect(data.every((x) => Number(x.orden) > 0)).toBe(true);
    const porOrden = [...data].sort((a, b) => a.orden - b.orden).map((x) => Number(x.id_alumno));
    const prev = await api.ok('ordenar_ranking', undefined, { preview: '1', limit: String(data.length) });
    expect(porOrden).toEqual(prev.preview.map((x) => Number(x.id_alumno)));
    // y la pantalla de elección usa ese mismo orden
    expect((await api.alumnosOrden()).map((a) => Number(a.id_alumno))).toEqual(porOrden);
  });

  test('"Limpiar todo" con historial guarda la elección y vacía alumnos e inscripciones', async ({ api }) => {
    // asegurar al menos una inscripción
    const libre = (await api.alumnosOrden()).find((a) => !a.confirmado);
    const esp = (await api.cuposActuales()).find((c) => !c.ausente && c.disponibles > 0);
    if (libre && esp) await api.ok('eleccion_confirmar', { id_alumno: Number(libre.id_alumno), id_especialidad: esp.id });
    const inscriptos = (await api.elecciones()).length;
    const alumnos = (await api.tablaAlumnos()).data.length;

    const titulo = `${HIST_PREFIX}limpiar ${Date.now()}`;
    const r = await api.ok('reset_elecciones', { guardar_historial: true, titulo_historial: titulo, usuario: api.nombreActual });
    expect(r.historial.guardado).toBe(inscriptos > 0);

    expect((await api.tablaAlumnos()).data).toHaveLength(0);
    expect(await api.elecciones()).toHaveLength(0);
    for (const c of await api.cuposActuales()) expect(c.disponibles).toBe(c.ausente ? 0 : c.cupo);
    const { resumen } = await api.ok('dashboard_resumen');
    expect(resumen.alumnos.total).toBe(0);

    if (inscriptos > 0) {
      const h = (await api.historial()).find((x) => Number(x.id) === Number(r.historial.id));
      expect(h).toMatchObject({ titulo, origen: 'limpiar_todo', total_alumnos: alumnos, total_inscriptos: inscriptos });
    }
  });

  test('"Limpiar todo" sin historial no deja registro', async ({ api }) => {
    const cantidad = (await api.historial()).length;
    const r = await api.ok('reset_elecciones', { guardar_historial: false });
    expect(r.mensaje).toMatch(/No se guardó historial/);
    expect(await api.historial()).toHaveLength(cantidad);
  });

  test('restaura alumnos, ranking, inscripciones y cupos', async ({ api }) => {
    await restaurarAlumnos(api, foto);
    const tabla = (await api.tablaAlumnos()).data;
    expect(tabla.length).toBe(foto.alumnos.length);
    expect(tabla.some((r) => String(r.dni) === DNI_PRUEBA)).toBe(false);
    const claves = new Set(tabla.map((r) => clave(r.dni, r.alumno)));
    for (const a of foto.alumnos) expect(claves.has(clave(a.dni, a.alumno)), a.alumno).toBe(true);

    const errores = await restaurarEleccion(api, foto);
    expect(errores).toEqual([]);
    expect(await diferenciasCupos(api, foto)).toEqual([]);
    expect((await api.elecciones()).sort((a, b) => a.id_eleccion - b.id_eleccion).map((e) => clave(e.dni, e.nombre))).toEqual(foto.elecciones.map((e) => e.clave));
  });
});
