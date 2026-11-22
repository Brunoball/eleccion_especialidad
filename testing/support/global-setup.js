// testing/support/global-setup.js
// Antes de correr: muestra el destino y verifica que el backend responda.
const { request } = require('@playwright/test');
const { ENV, resumen } = require('./env');

module.exports = async () => {
  console.log('\n──────── IPET 50 · Testing ────────');
  console.log(resumen());
  console.log('───────────────────────────────────\n');

  const ctx = await request.newContext();
  try {
    const res = await ctx.get(`${ENV.apiPhp}?action=obtener_listas`, { timeout: 20_000, failOnStatusCode: false });
    const txt = await res.text();
    let data = null;
    try { data = JSON.parse(txt); } catch { /* no JSON */ }
    if (!data || data.exito !== true) {
      throw new Error(
        `El backend respondió HTTP ${res.status()} pero no con JSON válido.\n` +
        `Respuesta: ${txt.slice(0, 300)}`,
      );
    }
  } catch (e) {
    const ayuda = ENV.isLocal
      ? 'Levantá el backend local (php -S ... desde backend/routes) o poné TEST_START_BACKEND=1 en testing/.env.'
      : 'Revisá que TEST_API_URL sea la URL correcta de Hostinger (la carpeta donde está api.php).';
    throw new Error(`\n[testing] No se pudo conectar con ${ENV.apiPhp}\n${e.message}\n${ayuda}\n`);
  } finally {
    await ctx.dispose();
  }
};
