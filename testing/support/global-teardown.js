// testing/support/global-teardown.js
// Al terminar: borra cualquier usuario "e2e_..." o historial "E2E ..." que
// haya quedado por una prueba interrumpida.
const { request } = require('@playwright/test');
const { ENV, puedeMutar } = require('./env');
const { Api } = require('./api');

module.exports = async () => {
  if (!puedeMutar() || !ENV.user || !ENV.password) return;
  const ctx = await request.newContext();
  try {
    const api = new Api(ctx);
    await api.login();
    const r = await api.limpiarRestos();
    if (r.usuarios || r.historial) {
      console.log(`[testing] Limpieza final: ${r.usuarios} usuario(s) y ${r.historial} historial(es) de prueba eliminados.`);
    }
  } catch (e) {
    console.warn(`[testing] No se pudo hacer la limpieza final: ${e.message}`);
  } finally {
    await ctx.dispose();
  }
};
