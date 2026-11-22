// GLOBAL · Router del backend (routes/api.php)
// Solo lectura: se puede correr contra local o Hostinger sin riesgo.
const { test, expect } = require('../support/test');

const LECTURAS = [
  ['obtener_listas', {}, 'especialidad'],
  ['obtener_cupos', {}, 'especialidades'],
  ['obtener_cupos_actuales', {}, 'especialidades'],
  ['obtener_alumnos', { limit: '5' }, 'alumnos'],
  ['eleccion_alumnos', {}, 'data'],
  ['obtener_elecciones', {}, 'data'],
  ['dashboard_resumen', {}, 'resumen'],
  ['usuarios_listar', {}, 'usuarios'],
  ['historial_listar', {}, 'historial'],
  ['ordenar_obtener_tabla', {}, 'data'],
  ['ordenar_ranking', { preview: '1', limit: '3' }, 'preview'],
];

test.describe('Router api.php', () => {
  test('una acción inexistente responde "Acción no válida"', async ({ anon }) => {
    const r = await anon.get('accion_que_no_existe');
    expect(r.status).toBe(200);
    expect(r.data.exito).toBe(false);
    expect(r.data.mensaje).toMatch(/Acción no válida/);
  });

  test('sin parámetro action también responde JSON controlado', async ({ anon }) => {
    const r = await anon.get('');
    expect(r.data.exito).toBe(false);
  });

  test('preflight OPTIONS (CORS) responde 200 y permite el origen', async ({ playwright }) => {
    const { ENV } = require('../support/env');
    const ctx = await playwright.request.newContext();
    const res = await ctx.fetch(`${ENV.apiPhp}?action=obtener_listas`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
      failOnStatusCode: false,
    });
    expect([200, 204]).toContain(res.status());
    const allow = res.headers()['access-control-allow-origin'];
    expect(allow === '*' || allow === 'http://localhost:3000').toBeTruthy();
    await ctx.dispose();
  });

  for (const [action, params, clave] of LECTURAS) {
    test(`GET ${action} responde exito:true con "${clave}"`, async ({ anon }) => {
      const r = await anon.get(action, params);
      expect(r.status, JSON.stringify(r.data)).toBe(200);
      expect(r.data.exito, r.data.mensaje).toBe(true);
      expect(r.data[clave], `falta "${clave}" en la respuesta`).toBeDefined();
    });
  }

  for (const action of ['eleccion_resetear', 'reset_elecciones', 'usuarios_guardar', 'usuarios_eliminar', 'historial_eliminar']) {
    test(`GET ${action} es rechazado (solo POST) y no borra nada`, async ({ anon }) => {
      const r = await anon.get(action);
      expect(r.data.exito).toBe(false);
    });
  }
});
