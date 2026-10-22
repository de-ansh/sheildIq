import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { closeDatabase } from '../db/database.js';
import { reportError } from '../log.js';

const env = { ...process.env };
afterEach(() => {
  process.env = { ...env };
  vi.restoreAllMocks();
});

describe('health check', () => {
  it('reports UP with the database reachable', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'UP', database: 'up' });
  });

  it('reports DOWN with 503 when the database is unreachable, and 500s carry a request id', async () => {
    await closeDatabase();
    process.env.DATABASE_URL = 'postgres://nobody:nothing@127.0.0.1:1/none';
    try {
      const health = await request(app).get('/api/v1/health');
      expect(health.status).toBe(503);
      expect(health.body).toMatchObject({ status: 'DOWN', database: 'down' });

      const failed = await request(app).get('/api/v1/plans').set('Cookie', 'siq_session=abc');
      expect(failed.status).toBe(500);
      expect(failed.body).toEqual({ error: 'Internal Server Error', requestId: failed.headers['x-request-id'] });
    } finally {
      await closeDatabase(); // back to the in-memory database for the other tests
      process.env = { ...env };
    }
  });
});

describe('request ids and logs', () => {
  it('gives every response an id, keeping a sane one from a proxy', async () => {
    const own = await request(app).get('/api/v1/policies');
    expect(own.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect((await request(app).get('/api/v1/policies').set('X-Request-Id', 'lb-123.abc')).headers['x-request-id']).toBe('lb-123.abc');
    expect((await request(app).get('/api/v1/policies').set('X-Request-Id', 'not ok <script>')).headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('logs one JSON line per request without query strings, and skips health polls', async () => {
    process.env.NODE_ENV = 'production';
    const out = vi.spyOn(console, 'log').mockImplementation(() => {});
    await request(app).get('/api/v1/policies?reset=supersecrettoken');
    await request(app).get('/api/v1/health');
    await new Promise(r => setImmediate(r)); // 'finish' fires after the response is sent
    const lines = out.mock.calls.map(([l]) => JSON.parse(String(l)));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ level: 'info', message: 'request', method: 'GET', path: '/api/v1/policies', status: 200 });
    expect(typeof lines[0].ms).toBe('number');
    expect(JSON.stringify(lines)).not.toContain('supersecrettoken');
  });
});

describe('error tracking', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends nothing without SENTRY_DSN', () => {
    delete process.env.SENTRY_DSN;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    reportError(new Error('boom'));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts an envelope to the DSN project with only method, path and request id', () => {
    process.env.SENTRY_DSN = 'https://pubkey@o1.ingest.sentry.io/42';
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    reportError(new TypeError('boom'), { requestId: 'req-1', method: 'POST', path: '/api/v1/plans' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://o1.ingest.sentry.io/api/42/envelope/');
    expect(init.headers['X-Sentry-Auth']).toContain('sentry_key=pubkey');
    const [, item, event] = String(init.body).split('\n').map(l => JSON.parse(l));
    expect(item).toEqual({ type: 'event' });
    expect(event).toMatchObject({
      exception: { values: [{ type: 'TypeError', value: 'boom' }] },
      tags: { request_id: 'req-1' },
      request: { method: 'POST', url: '/api/v1/plans' },
    });
  });
});
