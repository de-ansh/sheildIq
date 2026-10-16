import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { actuarialRouter } from './routes/actuarial.routes.js';
import { policyRouter } from './routes/policy.routes.js';
import { userRouter } from './routes/user.routes.js';

export const app: Express = express();

// Credentialed CORS must only trust known frontends, never reflect arbitrary origins.
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(o => o.trim());

app.disable('x-powered-by');
// Behind a reverse proxy set TRUST_PROXY (e.g. "1" hop) so req.ip is the client, not the proxy, for rate limiting.
if (process.env.TRUST_PROXY) {
  const hops = Number(process.env.TRUST_PROXY);
  app.set('trust proxy', Number.isNaN(hops) ? process.env.TRUST_PROXY : hops);
}
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'no-store',
  });
  next();
});
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '50kb' }));

// Health Check Endpoint
app.get('/api/v1/health', (_req: Request, res: Response) => {
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
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Middleware
app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  // Client errors from body-parser (malformed JSON, oversized body) carry a 4xx status.
  if (err.status && err.status >= 400 && err.status < 500) {
    res.status(err.status).json({ error: 'Invalid request body' });
    return;
  }
  console.error('[ShieldIQ Error]:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});
