// INICIO · dashboard_resumen: estructura y coherencia con el resto de la base
const { test, expect } = require('../support/test');

test.describe('Panel / dashboard_resumen', () => {
  test('tiene todas las secciones del resumen', async ({ api }) => {
    const { resumen } = await api.ok('dashboard_resumen');
    expect(resumen.fecha).toMatch(/^\d{4}-\d{2}-\d{2}/);
    for (const k of ['total', 'con_orden', 'sin_trayectoria', 'repitentes', 'con_amonestacion']) {
      expect(typeof resumen.alumnos[k], `alumnos.${k}`).toBe('number');
    }
    for (const k of ['inscriptos', 'pendientes', 'ausentes', 'avance']) {
      expect(typeof resumen.eleccion[k], `eleccion.${k}`).toBe('number');
    }
    for (const k of ['total', 'ocupados', 'disponibles', 'completas']) {
      expect(typeof resumen.cupos[k], `cupos.${k}`).toBe('number');
    }
    expect(Array.isArray(resumen.especialidades)).toBe(true);
    expect(Array.isArray(resumen.ultimas)).toBe(true);
    expect(typeof resumen.usuarios.total).toBe('number');
  });

  test('los números cierran entre sí', async ({ api }) => {
    const { resumen } = await api.ok('dashboard_resumen');
    const { eleccion, cupos, alumnos } = resumen;

    expect(eleccion.inscriptos + eleccion.pendientes).toBe(alumnos.total);
    expect(eleccion.avance).toBeGreaterThanOrEqual(0);
    expect(eleccion.avance).toBeLessThanOrEqual(100);
    expect(cupos.ocupados + cupos.disponibles).toBe(cupos.total);
    expect(alumnos.con_orden).toBeLessThanOrEqual(alumnos.total);
  });

  test('coincide con alumnos, cupos, elecciones y usuarios', async ({ api }) => {
    const { resumen } = await api.ok('dashboard_resumen');
    const alumnos = await api.ok('obtener_alumnos', undefined, { limit: '5000' });
    expect(resumen.alumnos.total).toBe(alumnos.total);

    const elecciones = await api.elecciones();
    expect(resumen.eleccion.inscriptos).toBe(elecciones.length);

    const cupos = (await api.cuposActuales()).filter((c) => !c.ausente);
    expect(resumen.cupos.total).toBe(cupos.reduce((s, c) => s + c.cupo, 0));
    expect(resumen.cupos.disponibles).toBe(cupos.reduce((s, c) => s + Math.max(0, c.disponibles), 0));

    const usuarios = await api.usuarios();
    expect(resumen.usuarios.total).toBe(usuarios.length);
    expect(resumen.usuarios.admin + resumen.usuarios.vista).toBe(usuarios.length);
  });

  test('el próximo en elegir es el primer alumno pendiente del orden', async ({ api }) => {
    const { resumen } = await api.ok('dashboard_resumen');
    const pendiente = (await api.alumnosOrden()).find((a) => !a.confirmado);
    if (!pendiente) {
      expect(resumen.eleccion.proximo ?? null).toBeFalsy();
      return;
    }
    expect(resumen.eleccion.proximo?.alumno).toBe(pendiente.alumno);
  });
});
