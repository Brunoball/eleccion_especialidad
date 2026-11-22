// ELECCIÓN · eleccion_alumnos / obtener_alumnos / obtener_elecciones /
//            eleccion_confirmar / eleccion_cancelar
// La escritura usa un alumno SIN inscripción y la deshace al final.
const { test, expect, soloConEscritura } = require('../support/test');

test.describe('Elección · lectura', () => {
  test('eleccion_alumnos viene ordenado por orden y marca confirmados', async ({ api }) => {
    const lista = await api.alumnosOrden();
    const ordenes = lista.map((a) => a.orden).filter((o) => o !== null);
    expect(ordenes).toEqual([...ordenes].sort((x, y) => x - y));
    const inscriptos = new Set((await api.elecciones()).map((e) => Number(e.id_alumno)));
    for (const a of lista) {
      expect(Boolean(a.confirmado), a.alumno).toBe(inscriptos.has(Number(a.id_alumno)));
    }
  });

  test('obtener_alumnos respeta orden, dirección y límite', async ({ api }) => {
    const asc = (await api.ok('obtener_alumnos', undefined, { order: 'alumno', dir: 'ASC', limit: '20' })).alumnos;
    const desc = (await api.ok('obtener_alumnos', undefined, { order: 'alumno', dir: 'DESC', limit: '20' })).alumnos;
    expect(asc.length).toBeLessThanOrEqual(20);
    if (asc.length > 1) expect(asc[0].alumno.localeCompare(desc[0].alumno)).toBeLessThanOrEqual(0);
    // un "order" fuera de la lista blanca no rompe (se ignora)
    const raro = await api.get('obtener_alumnos', { order: 'alumno; DROP TABLE x', limit: '3' });
    expect(raro.data.exito).toBe(true);
  });

  test('obtener_elecciones agrupa por especialidad y numera 1..N dentro de cada una', async ({ api }) => {
    const data = await api.elecciones();
    const porEsp = new Map();
    for (const e of data) {
      expect(e.nombre).toBeTruthy();
      expect(e.especialidad).toBeTruthy();
      if (!porEsp.has(e.especialidad)) porEsp.set(e.especialidad, []);
      porEsp.get(e.especialidad).push(e);
    }
    for (const [esp, filas] of porEsp) {
      expect(filas.map((f) => f.orden), esp).toEqual(filas.map((_, i) => i + 1));
      // dentro de la especialidad, respeta el orden del ranking
      const rk = filas.map((f) => f.orden_alumno).filter((o) => o !== null);
      expect(rk, esp).toEqual([...rk].sort((x, y) => x - y));
    }
  });
});

test.describe('Elección · confirmar y cancelar', () => {
  soloConEscritura();
  test.describe.configure({ mode: 'serial' });

  let alumno = null;
  let fotoCupos = null;
  let destinos = [];

  test.beforeAll(async ({ api }) => {
    fotoCupos = await api.cuposActuales();
    alumno = (await api.alumnosOrden()).find((a) => !a.confirmado) || null;
    destinos = fotoCupos.filter((c) => !c.ausente && c.disponibles > 0);
  });

  test.afterAll(async ({ api }) => {
    if (alumno) await api.post('eleccion_cancelar', { id_alumno: Number(alumno.id_alumno) });
  });

  test('validaciones (no escriben nada)', async ({ api }) => {
    const casos = [
      [{ id_alumno: 0, id_especialidad: 1 }, /Datos inválidos/],
      [{ id_alumno: 1 }, /Datos inválidos/],
      [{ id_alumno: 99999999, id_especialidad: fotoCupos[0].id }, /Alumno inexistente/],
    ];
    if (alumno) casos.push([{ id_alumno: Number(alumno.id_alumno), id_especialidad: 99999 }, /Especialidad inexistente/]);
    for (const [body, msg] of casos) {
      const r = await api.post('eleccion_confirmar', body);
      expect(r.data.exito, JSON.stringify(body)).toBe(false);
      expect(r.data.mensaje).toMatch(msg);
    }
    expect((await api.post('eleccion_cancelar', { id_alumno: 0 })).data.exito).toBe(false);
    expect(await api.cuposActuales()).toEqual(fotoCupos);
  });

  test('confirmar → cambiar → ausente → cancelar deja los cupos como estaban', async ({ api }) => {
    test.skip(!alumno, 'No hay alumnos sin inscripción para probar.');
    test.skip(destinos.length < 2, 'Se necesitan 2 especialidades con cupo disponible.');
    const id = Number(alumno.id_alumno);
    const [A, B] = destinos;
    const aus = fotoCupos.find((c) => c.ausente);
    const disp = async (esp) => (await api.cuposActuales()).find((c) => c.id === esp.id).disponibles;

    // 1) confirmar en A
    const r1 = await api.ok('eleccion_confirmar', { id_alumno: id, id_especialidad: A.id });
    expect(r1.mensaje).toContain(A.nombre);
    expect(await disp(A)).toBe(A.disponibles - 1);
    const el = (await api.elecciones()).find((e) => Number(e.id_alumno) === id);
    expect(Number(el.id_especialidad)).toBe(A.id);
    expect((await api.alumnosOrden()).find((a) => Number(a.id_alumno) === id).confirmado).toBeTruthy();

    // 2) cambiar a B: A recupera el cupo, B lo pierde, sigue habiendo una sola inscripción
    await api.ok('eleccion_confirmar', { id_alumno: id, id_especialidad: B.id });
    expect(await disp(A)).toBe(A.disponibles);
    expect(await disp(B)).toBe(B.disponibles - 1);
    expect((await api.elecciones()).filter((e) => Number(e.id_alumno) === id)).toHaveLength(1);

    // 3) marcar AUSENTE: el contador de ausentes sube y B recupera
    if (aus) {
      await api.ok('eleccion_confirmar', { id_alumno: id, id_especialidad: aus.id });
      expect(await disp(B)).toBe(B.disponibles);
      expect(await disp(aus)).toBe(aus.disponibles + 1);
    }

    // 4) cancelar: todo vuelve al estado inicial
    const rc = await api.ok('eleccion_cancelar', { id_alumno: id });
    expect(rc.mensaje).toMatch(/cancelada/);
    expect(await api.cuposActuales()).toEqual(fotoCupos);
    expect((await api.elecciones()).some((e) => Number(e.id_alumno) === id)).toBe(false);

    // 5) cancelar de nuevo no rompe
    const rc2 = await api.ok('eleccion_cancelar', { id_alumno: id });
    expect(rc2.mensaje).toMatch(/No había inscripción/);
  });

  test('una especialidad sin cupo rechaza la inscripción', async ({ api }) => {
    const llena = fotoCupos.find((c) => !c.ausente && c.disponibles <= 0);
    test.skip(!llena || !alumno, 'No hay una especialidad completa para probar este caso.');
    const r = await api.post('eleccion_confirmar', { id_alumno: Number(alumno.id_alumno), id_especialidad: llena.id });
    expect(r.data.exito).toBe(false);
    expect(r.data.mensaje).toMatch(/Sin cupo/);
    expect(await api.cuposActuales()).toEqual(fotoCupos);
  });
});
