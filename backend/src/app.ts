import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { actuarialRouter } from './routes/actuarial.routes.js';
import { policyRouter } from './routes/policy.routes.js';
import { apiRouter } from './routes/index.js';
import { configuredProvider } from './services/ai.service.js';
import { query } from './db/database.js';
import { log } from './log.js';

export const app: Express = express();

// Credentialed CORS must only trust known frontends, never reflect arbitrary origins.
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(o => o.trim());

app.disable('x-powered-by');

// Every request gets an id (a proxy's X-Request-Id is kept if it looks sane), echoed back and on every log line,
// so a user's error report can be matched to the server log.
app.use((req: Request, res: Response, next: NextFunction) => {
  const incoming = req.get('X-Request-Id');
  const id = incoming && /^[\w.-]{1,64}$/.test(incoming) ? incoming : crypto.randomUUID();
  res.locals.requestId = id;
  res.set('X-Request-Id', id);
  const started = process.hrtime.bigint();
  res.on('finish', () => {
    // Path only: query strings can carry secrets (password-reset links put the token there).
    const path = req.originalUrl.split('?')[0];
    if (path === '/api/v1/health') return; // polled by uptime checks; would drown the log
    log(res.statusCode >= 500 ? 'error' : 'info', 'request', {
      requestId: id, method: req.method, path, status: res.statusCode,
      ms: Math.round(Number(process.hrtime.bigint() - started) / 1e6),
    });
  });
  next();
});
// Behind a reverse proxy set TRUST_PROXY (e.g. "1" hop) so req.ip is the client, not the proxy, for rate limiting.
if (process.env.TRUST_PROXY) {
  const hops = Number(process.env.TRUST_PROXY);
  app.set('trust proxy', Number.isNaN(hops) ? process.env.TRUST_PROXY : hops);
}
app.use((req: Request, res: Response, next: NextFunction) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
  });
  // API responses carry personal data and must never be cached; built frontend assets may be.
  if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store');
  next();
});
app.use(cors({ origin: allowedOrigins, credentials: true }));
// 50 KB bodies everywhere except the PDF upload, which parses its own larger body only after the login check.
const smallJson = express.json({ limit: '50kb' });
app.use((req: Request, res: Response, next: NextFunction) =>
  req.path === '/api/v1/ai/policy-analysis' ? next() : smallJson(req, res, next)
);

// Health check for uptime monitors and container orchestration: UP only if the database answers.
app.get('/api/v1/health', async (_req: Request, res: Response) => {
  const database = await Promise.race([
    query('SELECT 1').then(() => 'up' as const),
    new Promise<'down'>(resolve => setTimeout(() => resolve('down'), 3000)),
  ]).catch(() => 'down' as const);
  res.status(database === 'up' ? 200 : 503).json({
    status: database === 'up' ? 'UP' : 'DOWN',
    service: 'ShieldIQ Actuarial Intelligence API',
    version: '1.0.0',
    database,
    ai: configuredProvider(),
    timestamp: new Date().toISOString(),
  });
});

// Route Registrations
app.use('/api/v1/actuarial', actuarialRouter);
app.use('/api/v1/policies', policyRouter);
app.use('/api/v1', apiRouter);

// Serve the built frontend from this same origin, so session cookies (SameSite=Strict) always reach the API.
// Resolves to <repo>/frontend/dist from both src/ (tsx) and dist/ (compiled); FRONTEND_DIST overrides it.
const frontendDist = process.env.FRONTEND_DIST
  ? path.resolve(process.env.FRONTEND_DIST)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');
if (fs.existsSync(path.join(frontendDist, 'index.html'))) {
  app.use(express.static(frontendDist, { index: false, maxAge: '1h' }));
  // Client-side screens: any non-API GET gets the app shell.
  app.get(/^(?!\/api\/).*/, (_req: Request, res: Response) => {
    res.set('Cache-Control', 'no-cache').sendFile(path.join(frontendDist, 'index.html'));
  });
}

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Middleware
app.use((err: Error & { status?: number }, req: Request, res: Response, _next: NextFunction) => {
  // Client errors from body-parser (malformed JSON, oversized body) carry a 4xx status.
  if (err.status && err.status >= 400 && err.status < 500) {
    res.status(err.status).json({ error: 'Invalid request body' });
    return;
  }
  const requestId = res.locals.requestId;
  log('error', 'unhandled error', { requestId, method: req.method, path: req.originalUrl.split('?')[0], error: err.message, stack: err.stack });
  // The id lets support find the log line; internals stay out of the response.
  res.status(500).json({ error: 'Internal Server Error', requestId });
});
