import { defineConfig } from '@playwright/test';

/**
 * Browser tests against a real backend (embedded Postgres in memory, fresh every run) and the Vite dev server.
 * Ports 5291/5299 stay clear of the usual dev ports. AI calls are off unless E2E_AI=1 (they cost money).
 */
const BACKEND_PORT = 5291;
const FRONTEND_PORT = 5299;
const ai = process.env.E2E_AI === '1';

export default defineConfig({
  testDir: './e2e',
  // One backend and one sign-in limiter are shared, and journeys build on earlier steps, so run in order.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: ai ? 120_000 : 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    viewport: { width: 1440, height: 900 },
    // Locally the installed Chrome is used; CI installs Playwright's Chromium.
    ...(process.env.CI ? {} : { channel: 'chrome' }),
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      // Output goes to a file the password-reset test reads (reset links are logged in development).
      command:
        `mkdir -p e2e/.logs && cd ../backend && NODE_ENV=development PORT=${BACKEND_PORT} PGLITE_DIR=memory:// AUTH_RATE_LIMIT_MAX=10000 ` +
        (ai ? '' : 'GEMINI_API_KEY= OPENAI_API_KEY= ') +
        `./node_modules/.bin/tsx src/server.ts > ../frontend/e2e/.logs/backend.log 2>&1`,
      url: `http://localhost:${BACKEND_PORT}/api/v1/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `API_PROXY_TARGET=http://localhost:${BACKEND_PORT} ./node_modules/.bin/vite --port ${FRONTEND_PORT} --strictPort`,
      url: `http://localhost:${FRONTEND_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
