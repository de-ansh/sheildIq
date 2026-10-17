import { Request, Response, NextFunction, RequestHandler } from 'express';
import { UserService } from '../services/user.service.js';
import { run } from '../db/database.js';
import { isDevelopment } from '../config.js';

// Shared by every router: async error routing, the session cookie, sign-in rate limits and the auth gate.

/** Express 4 does not catch rejected promises; route async handler errors to the error middleware. */
export const asyncHandler =
  <R extends Request>(fn: (req: R, res: Response, next: NextFunction) => Promise<void>) =>
  (req: R, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

export interface AuthedRequest extends Request {
  userId?: string;
  token?: string;
}

export const SESSION_COOKIE = 'siq_session';

// httpOnly keeps the token away from page scripts; SameSite=Strict blocks cross-site (CSRF) requests.
export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: !isDevelopment(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api',
  });
}

function readSessionCookie(req: Request): string | undefined {
  const match = req.headers.cookie?.split(';').map(c => c.trim()).find(c => c.startsWith(`${SESSION_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(SESSION_COOKIE.length + 1)) : undefined;
}

// Stored in the database so the limit holds across restarts and across instances sharing it.
export const AUTH_WINDOW_MS = 15 * 60 * 1000;
// Overridable only so automated browser tests, which sign in many times from one address, can run; production keeps 10.
export const AUTH_MAX_ATTEMPTS = Number(process.env.AUTH_RATE_LIMIT_MAX) || 10;

export const rateLimitAuth: RequestHandler = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const retryAfter = await UserService.hitRateLimit(`ip:${req.ip ?? 'unknown'}`, AUTH_MAX_ATTEMPTS, AUTH_WINDOW_MS);
  if (retryAfter !== null) {
    res.set('Retry-After', String(retryAfter));
    res.status(429).json({ success: false, error: 'Too many attempts. Please try again later.' });
    return;
  }
  next();
});

export async function resetAuthRateLimit() {
  await run('DELETE FROM auth_attempts');
}

export const requireAuth: RequestHandler = asyncHandler(async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const token = readSessionCookie(req);
  const userId = token ? await UserService.resolveSession(token) : null;
  if (!token || !userId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  req.userId = userId;
  req.token = token;
  next();
});
