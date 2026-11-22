// testing/playwright.config.js
// Todo el testing del sistema vive en esta carpeta. El destino (backend local
// o Hostinger) se elige en testing/.env con TEST_API_URL.
const { defineConfig, devices } = require('@playwright/test');
const { ENV, AUTH_FILE } = require('./support/env');

const webServer = [];

// Backend local automático (opcional): php -S sobre backend/routes.
if (ENV.startBackend) {
  const u = new URL(ENV.apiBase);
  const ini = ENV.phpIni ? ` -c "${ENV.phpIni}"` : '';
  webServer.push({
    name: 'backend',
    command: `"${ENV.phpBin}" -S ${u.hostname}:${u.port || 80} -t "${ENV.backendDir}/routes"${ini}`,
    url: `${ENV.apiPhp}?action=obtener_listas`,
    reuseExistingServer: true, // si ya lo tenés corriendo, lo usa
    timeout: 30_000,
    stdout: 'ignore',
    stderr: 'ignore', // php -S escribe cada pedido en stderr: se silencia
  });
}

// Frontend (React) para las pruebas de pantallas, apuntando al backend elegido.
if (ENV.ui) {
  webServer.push({
    name: 'frontend',
    command: 'npm start',
    cwd: ENV.frontendDir,
    url: ENV.frontUrl,
    reuseExistingServer: false,
    timeout: 240_000,
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      ...process.env,
      PORT: String(ENV.frontPort),
      BROWSER: 'none',
      REACT_APP_API_URL: ENV.apiBase,
    },
  });
}

const projects = [
  {
    name: 'api',
    testMatch: /.*\.api\.spec\.js$/,
  },
];

if (ENV.ui) {
  projects.push(
    {
      name: 'setup',
      testMatch: /.*\.setup\.js$/,
      use: { ...devices['Desktop Chrome'], baseURL: ENV.frontUrl },
    },
    {
      name: 'ui',
      testMatch: /.*\.ui\.spec\.js$/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: ENV.frontUrl,
        storageState: AUTH_FILE,
        viewport: { width: 1440, height: 900 },
      },
    },
  );
}

module.exports = defineConfig({
  testDir: '.',
  testIgnore: ['**/node_modules/**'],
  outputDir: 'test-results',
  timeout: ENV.timeoutMs,
  expect: { timeout: ENV.expectTimeoutMs },
  fullyParallel: false,
  workers: 1, // la base es compartida: nunca en paralelo
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  globalSetup: require.resolve('./support/global-setup.js'),
  globalTeardown: require.resolve('./support/global-teardown.js'),
  use: {
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Cordoba',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: { slowMo: ENV.slowMo },
  },
  projects,
  webServer: webServer.length ? webServer : undefined,
});
