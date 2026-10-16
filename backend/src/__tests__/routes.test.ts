import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { getDatabase } from '../db/database.js';
import { resetAuthRateLimit } from '../routes/user.routes.js';
import { UserService } from '../services/user.service.js';

const sessionCookie = (res: request.Response) => {
  const cookies = res.headers['set-cookie'] as unknown as string[];
  return { Cookie: cookies[0].split(';')[0] };
};

describe('ShieldIQ REST API Endpoints', () => {
  it('GET /api/v1/health returns HTTP 200 UP status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.service).toContain('ShieldIQ');
  });

  it('POST /api/v1/actuarial/hlv-calculator returns calculation payload', async () => {
    const res = await request(app)
      .post('/api/v1/actuarial/hlv-calculator')
      .send({ income: 120000, years: 25, inflation: 6, existingCover: 200000 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.recommendedCover).toBeGreaterThan(200000);
  });

  it('POST /api/v1/actuarial/risk-simulator runs scenario stress test', async () => {
    const res = await request(app)
      .post('/api/v1/actuarial/risk-simulator')
      .send({ scenario: 'illness', cost: 150000, years: 5, inflation: 4 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.depletionAge).toBeDefined();
  });

  it('GET /api/v1/policies returns policy catalog list', async () => {
    const res = await request(app).get('/api/v1/policies');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThan(0);
  });

  it('GET /api/v1/user/profile rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/v1/user/profile');
    expect(res.status).toBe(401);
  });
});

describe('Auth, profile and saved plans', () => {
  beforeEach(() => resetAuthRateLimit());

  const login = async (email = 'alex.vance@shieldiq.internal', password = 'Password123!') =>
    request(app).post('/api/v1/auth/login').send({ email, password });

  it('logs in the seeded demo user and rejects a wrong password', async () => {
    const ok = await login();
    expect(ok.status).toBe(200);
    expect(ok.body).not.toHaveProperty('token');
    const setCookie = (ok.headers['set-cookie'] as unknown as string[])[0];
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/SameSite=Strict/);
    const token = sessionCookie(ok).Cookie.split('=')[1];
    expect(getDatabase().prepare('SELECT token FROM sessions WHERE token = ?').get(token)).toBeUndefined();
    expect(ok.body.user.name).toBe('Alex Vance');
    expect(ok.body.user).not.toHaveProperty('password_hash');

    const bad = await login('alex.vance@shieldiq.internal', 'wrong');
    expect(bad.status).toBe(401);
  });

  it('registers, rejects duplicates, updates profile, and logs out', async () => {
    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'New.User@example.com', password: 'longenough', name: 'New User' });
    expect(reg.status).toBe(201);
    const auth = sessionCookie(reg);

    const dup = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'new.user@example.com', password: 'longenough', name: 'Dup' });
    expect(dup.status).toBe(409);

    const upd = await request(app).put('/api/v1/user/profile').set(auth).send({ age: 41, city: 'Pune' });
    expect(upd.body.user).toMatchObject({ age: 41, city: 'Pune', email: 'new.user@example.com' });

    const onboard = await request(app)
      .post('/api/v1/user/onboarding')
      .set(auth)
      .send({ income: 900000, dependents: 1, homeLoan: 123 });
    expect(onboard.body.user).toMatchObject({ income: 900000, dependents: 1 });

    expect((await request(app).put('/api/v1/user/profile').set(auth).send({ age: 5 })).status).toBe(400);

    await request(app).post('/api/v1/auth/logout').set(auth);
    expect((await request(app).get('/api/v1/user/profile').set(auth)).status).toBe(401);
  });

  it('scopes saved plans to their owner', async () => {
    const alex = sessionCookie(await login());
    const other = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'other@example.com', password: 'longenough', name: 'Other' });
    const otherAuth = sessionCookie(other);

    const list = await request(app).get('/api/v1/plans').set(alex);
    expect(list.body.data.length).toBe(5);

    const created = await request(app)
      .post('/api/v1/plans')
      .set(alex)
      .send({ name: 'Test Plan', coverageAmount: 100, monthlyPremium: 10 });
    expect(created.status).toBe(201);
    const id = created.body.data.id;

    expect((await request(app).get('/api/v1/plans').set(otherAuth)).body.data).toEqual([]);
    expect((await request(app).delete(`/api/v1/plans/${id}`).set(otherAuth)).status).toBe(404);
    expect((await request(app).delete(`/api/v1/plans/${id}`).set(alex)).status).toBe(200);
  });

  it('rate limits repeated login attempts', async () => {
    for (let i = 0; i < 10; i++) await login('alex.vance@shieldiq.internal', 'wrong');
    const blocked = await login();
    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after']).toBeDefined();
  });
});

describe('Password management', () => {
  beforeEach(() => resetAuthRateLimit());

  const register = (email: string, password = 'original-pass') =>
    request(app).post('/api/v1/auth/register').send({ email, password, name: 'Pw User' });
  const login = (email: string, password: string) =>
    request(app).post('/api/v1/auth/login').send({ email, password });

  it('forgot-password responds identically for known and unknown emails', async () => {
    await register('known@example.com');
    const known = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'known@example.com' });
    const unknown = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'nobody@example.com' });
    expect(known.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
  });

  it('resets a password with a one-time token and revokes sessions', async () => {
    const reg = await register('reset@example.com');
    const token = UserService.requestPasswordReset('reset@example.com')!;

    const ok = await request(app).post('/api/v1/auth/reset-password').send({ token, password: 'brand-new-pass' });
    expect(ok.status).toBe(200);
    expect((await request(app).get('/api/v1/user/profile').set(sessionCookie(reg))).status).toBe(401);
    expect((await login('reset@example.com', 'original-pass')).status).toBe(401);
    expect((await login('reset@example.com', 'brand-new-pass')).status).toBe(200);

    const reused = await request(app).post('/api/v1/auth/reset-password').send({ token, password: 'another-pass' });
    expect(reused.status).toBe(400);
  });

  it('changes password only with the current one and keeps the current session', async () => {
    const first = sessionCookie(await register('change@example.com'));
    const second = sessionCookie(await login('change@example.com', 'original-pass'));

    const wrong = await request(app)
      .post('/api/v1/auth/change-password')
      .set(first)
      .send({ currentPassword: 'nope', newPassword: 'changed-pass' });
    expect(wrong.status).toBe(400);

    const ok = await request(app)
      .post('/api/v1/auth/change-password')
      .set(first)
      .send({ currentPassword: 'original-pass', newPassword: 'changed-pass' });
    expect(ok.status).toBe(200);
    expect((await request(app).get('/api/v1/user/profile').set(first)).status).toBe(200);
    expect((await request(app).get('/api/v1/user/profile').set(second)).status).toBe(401);
  });

  it('logout-all revokes every session', async () => {
    const a = sessionCookie(await register('all@example.com'));
    const b = sessionCookie(await login('all@example.com', 'original-pass'));
    await request(app).post('/api/v1/auth/logout-all').set(a);
    expect((await request(app).get('/api/v1/user/profile').set(a)).status).toBe(401);
    expect((await request(app).get('/api/v1/user/profile').set(b)).status).toBe(401);
  });
});

describe('Hardening', () => {
  it('does not reflect untrusted CORS origins', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    const ok = await request(app).get('/api/v1/health').set('Origin', 'http://localhost:5173');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('returns 400 without internals for malformed JSON and sets security headers', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(/JSON|position/i);
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});
