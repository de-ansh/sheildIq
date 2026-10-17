import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Each test file boots its own embedded Postgres (WebAssembly); with files running in parallel the first query
    // in a file can take several seconds, so the 5s default is too tight.
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
