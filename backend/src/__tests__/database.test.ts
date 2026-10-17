import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { UserService } from '../services/user.service.js';

describe('Postgres concurrency guarantees', () => {
  it('lets exactly one of several simultaneous sign-ups with the same email through', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app).post('/api/v1/auth/register').send({ email: 'race@example.com', password: 'longenough', name: 'R' })
      )
    );
    expect(results.map(r => r.status).sort()).toEqual([201, 409, 409, 409, 409]);
  });

  it('counts simultaneous attempts exactly, so a burst cannot slip past the limit', async () => {
    const outcomes = await Promise.all(Array.from({ length: 25 }, () => UserService.hitRateLimit('burst', 10, 60_000)));
    expect(outcomes.filter(o => o === null)).toHaveLength(10);
  });

  it('restarts the count once the window has passed', async () => {
    for (let i = 0; i < 3; i++) await UserService.hitRateLimit('window', 2, -1); // already-expired window
    expect(await UserService.hitRateLimit('window', 2, 60_000)).toBeNull();
  });
});
