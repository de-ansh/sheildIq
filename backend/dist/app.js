import express from 'express';
import cors from 'cors';
import { actuarialRouter } from './routes/actuarial.routes.js';
import { policyRouter } from './routes/policy.routes.js';
import { userRouter } from './routes/user.routes.js';
export const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
// Health Check Endpoint
app.get('/api/v1/health', (_req, res) => {
    res.json({
        status: 'UP',
        service: 'ShieldIQ Actuarial Intelligence API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});
// Route Registrations
app.use('/api/v1/actuarial', actuarialRouter);
app.use('/api/v1/policies', policyRouter);
app.use('/api/v1', userRouter);
// 404 Handler
app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});
// Global Error Middleware
app.use((err, _req, res, _next) => {
    console.error('[ShieldIQ Error]:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});
