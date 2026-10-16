import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Express } from 'express';

// A fake built frontend; app.ts reads FRONTEND_DIST when it loads, so import it after setting the env.
let app: Express;
beforeAll(async () => {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'shieldiq-dist-'));
  fs.mkdirSync(path.join(dist, 'assets'));
  fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><div id="root">ShieldIQ shell</div>');
  fs.writeFileSync(path.join(dist, 'assets', 'app-abc123.js'), 'console.log(1)');
  process.env.FRONTEND_DIST = dist;
  ({ app } = await import('../app.js'));
});

describe('same-origin frontend serving', () => {
  it('serves the app shell at / and on client-side routes', async () => {
    for (const p of ['/', '/settings', '/policy-scan']) {
      const res = await request(app).get(p);
      expect(res.status).toBe(200);
      expect(res.text).toContain('ShieldIQ shell');
    }
  });

  it('serves built assets with caching', async () => {
    const res = await request(app).get('/assets/app-abc123.js');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toMatch(/max-age=3600/);
  });

  it('keeps API responses JSON and uncached, with JSON 404s', async () => {
    const health = await request(app).get('/api/v1/health');
    expect(health.body.status).toBe('UP');
    expect(health.headers['cache-control']).toBe('no-store');
    const missing = await request(app).get('/api/v1/does-not-exist');
    expect(missing.status).toBe(404);
    expect(missing.body.error).toBe('Endpoint not found');
  });
});
