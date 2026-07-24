import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
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
    it('GET /api/v1/user/profile returns user profile', async () => {
        const res = await request(app).get('/api/v1/user/profile');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.user.name).toBeDefined();
    });
});
