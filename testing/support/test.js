// testing/support/test.js
// "test" extendido: agrega el fixture `api` (cliente logueado como admin) y
// guardas para pruebas con escritura.
const base = require('@playwright/test');
const { Api } = require('./api');
const {
  ENV,
  puedeMutar,
  puedeDestruir,
  MOTIVO_MUTAR,
  MOTIVO_DESTRUIR,
  assertCredenciales,
} = require('./env');

const test = base.test.extend({
  // Un cliente por worker (workers=1): se loguea una sola vez.
  api: [
    async ({ playwright }, use) => {
      assertCredenciales();
      const request = await playwright.request.newContext({
        extraHTTPHeaders: { Accept: 'application/json' },
        ignoreHTTPSErrors: false,
      });
      const api = new Api(request);
      await api.login();
      await use(api);
      await request.dispose();
    },
    { scope: 'worker' },
  ],

  // Cliente sin sesión (para probar login, validaciones, etc.).
  anon: async ({ playwright }, use) => {
    const request = await playwright.request.newContext();
    await use(new Api(request));
    await request.dispose();
  },
});

/** Saltea el bloque si el .env no habilita escritura. */
function soloConEscritura() {
  test.skip(!puedeMutar(), MOTIVO_MUTAR);
}

/** Saltea el bloque si el .env no habilita pruebas destructivas. */
function soloDestructivo() {
  test.skip(!puedeDestruir(), MOTIVO_DESTRUIR);
}

/** Saltea el bloque si no se prueban pantallas. */
function soloPantallas() {
  test.skip(!ENV.ui, 'TEST_UI=0: sólo se prueba la API');
}

module.exports = { test, expect: base.expect, soloConEscritura, soloDestructivo, soloPantallas, ENV };
