/**
 * Development behaviour (demo account, reset links in the console, non-Secure cookies) only when explicitly asked for.
 * A missing or misspelt NODE_ENV is treated as production, so a forgotten variable fails safe.
 */
export const isDevelopment = () => process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

/** The demo account has a published password, so it exists only in development or when explicitly requested. */
export const shouldSeedDemo = () => isDevelopment() || process.env.SEED_DEMO === 'true';
