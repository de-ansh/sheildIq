import { describe, it, expect, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { closeDatabase, getDatabase, initDatabase } from '../db/database.js';
import { resetAuthRateLimit } from '../routes/user.routes.js';

const DEMO = 'alex.vance@shieldiq.internal';
const env = { ...process.env };

// Each case starts a fresh in-memory database under the environment being tested.
function freshDb(vars: Record<string, string | undefined>) {
  process.env = { ...env };
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  closeDatabase();
  initDatabase(':memory:');
}
const demoExists = () => Boolean(getDatabase().prepare('SELECT id FROM users WHERE email = ?').get(DEMO));

describe('production safety does not depend on remembering NODE_ENV', () => {
  afterEach(() => {
    process.env = { ...env };
    vi.restoreAllMocks();
    closeDatabase();
  });

  it('with NODE_ENV missing: no demo account, Secure cookies, no reset links in logs', async () => {
    freshDb({ NODE_ENV: undefined, SEED_DEMO: undefined });
    expect(demoExists()).toBe(false);

    const reg = await request(app).post('/api/v1/auth/register').send({ email: 'prod@example.com', password: 'longenough', name: 'P' });
    expect((reg.headers['set-cookie'] as unknown as string[])[0]).toMatch(/;\s*Secure/i);

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    resetAuthRateLimit();
    await request(app).post('/api/v1/auth/forgot-password').send({ email: 'prod@example.com' });
    expect(log.mock.calls.flat().join(' ')).not.toMatch(/reset=/);
  });

  it('treats a misspelt NODE_ENV as production', () => {
    freshDb({ NODE_ENV: 'prodution' });
    expect(demoExists()).toBe(false);
  });

  it('SEED_DEMO=true creates the demo account outside development', () => {
    freshDb({ NODE_ENV: undefined, SEED_DEMO: 'true' });
    expect(demoExists()).toBe(true);
  });

  it('development keeps its conveniences', async () => {
    freshDb({ NODE_ENV: 'development' });
    expect(demoExists()).toBe(true);
    const login = await request(app).post('/api/v1/auth/login').send({ email: DEMO, password: 'Password123!' });
    expect((login.headers['set-cookie'] as unknown as string[])[0]).not.toMatch(/;\s*Secure/i);
  });
});
