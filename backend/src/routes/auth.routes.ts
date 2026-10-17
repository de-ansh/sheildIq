import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { UserService } from '../services/user.service.js';
import { isDevelopment } from '../config.js';
import {
  AUTH_MAX_ATTEMPTS, AUTH_WINDOW_MS, SESSION_COOKIE, asyncHandler, rateLimitAuth, requireAuth, setSessionCookie, type AuthedRequest,
} from './middleware.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const newPassword = z.string().min(8).max(128);

const registerSchema = z.object({
  email: z.string().email(),
  password: newPassword,
  name: z.string().trim().min(1).max(100),
});

const forgotSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({ token: z.string().regex(/^[0-9a-f]{64}$/), password: newPassword });
const changePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword });

// POST /api/v1/auth/register
router.post('/auth/register', rateLimitAuth, asyncHandler(async (req: Request, res: Response) => {
  const parse = registerSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid registration payload', details: parse.error.format() });
    return;
  }
  const result = await UserService.register(parse.data.email, parse.data.password, parse.data.name);
  if (!result) {
    res.status(409).json({ success: false, error: 'An account with this email already exists' });
    return;
  }
  setSessionCookie(res, result.token);
  res.status(201).json({ success: true, user: result.user });
}));

// POST /api/v1/auth/login
router.post('/auth/login', rateLimitAuth, asyncHandler(async (req: Request, res: Response) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid login payload', details: parse.error.format() });
    return;
  }
  // Per-account limit on top of the per-IP one, so rotating IPs can't keep guessing one password.
  // Only failures count, so the real owner signing in never uses it up.
  const accountKey = `login:${parse.data.email.toLowerCase()}`;
  const lockedFor = await UserService.rateLimitRetryAfter(accountKey, AUTH_MAX_ATTEMPTS);
  if (lockedFor !== null) {
    res.set('Retry-After', String(lockedFor));
    res.status(429).json({ success: false, error: 'Too many failed sign-in attempts for this account. Please try again later.' });
    return;
  }
  const result = await UserService.login(parse.data.email, parse.data.password);
  if (!result) {
    await UserService.hitRateLimit(accountKey, AUTH_MAX_ATTEMPTS, AUTH_WINDOW_MS);
    res.status(401).json({ success: false, error: 'Invalid email or password' });
    return;
  }
  setSessionCookie(res, result.token);
  res.json({ success: true, user: result.user });
}));

// POST /api/v1/auth/logout
router.post('/auth/logout', requireAuth, asyncHandler(async (req: AuthedRequest, res: Response) => {
  await UserService.logout(req.token!);
  res.clearCookie(SESSION_COOKIE, { path: '/api' });
  res.json({ success: true });
}));

// POST /api/v1/auth/forgot-password — always 200 so the response never reveals whether an account exists
router.post('/auth/forgot-password', rateLimitAuth, asyncHandler(async (req: Request, res: Response) => {
  const parse = forgotSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid email', details: parse.error.format() });
    return;
  }
  const token = await UserService.requestPasswordReset(parse.data.email);
  if (token) {
    const link = `${process.env.APP_URL || 'http://localhost:5173'}/?reset=${token}`;
    // shortcut: no mail provider yet, so the link is only printed in development; wire an email service before production.
    if (isDevelopment()) console.log(`[ShieldIQ] Password reset link for ${parse.data.email}: ${link}`);
  }
  res.json({ success: true, message: 'If an account exists for that email, a reset link has been sent.' });
}));

// POST /api/v1/auth/reset-password
router.post('/auth/reset-password', rateLimitAuth, asyncHandler(async (req: Request, res: Response) => {
  const parse = resetSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid reset request', details: parse.error.format() });
    return;
  }
  if (!(await UserService.resetPassword(parse.data.token, parse.data.password))) {
    res.status(400).json({ success: false, error: 'This reset link is invalid or has expired.' });
    return;
  }
  res.json({ success: true });
}));

// POST /api/v1/auth/change-password
router.post('/auth/change-password', requireAuth, rateLimitAuth, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const parse = changePasswordSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid password change request', details: parse.error.format() });
    return;
  }
  if (!(await UserService.changePassword(req.userId!, req.token!, parse.data.currentPassword, parse.data.newPassword))) {
    res.status(400).json({ success: false, error: 'Current password is incorrect.' });
    return;
  }
  res.json({ success: true });
}));

// POST /api/v1/auth/logout-all
router.post('/auth/logout-all', requireAuth, asyncHandler(async (req: AuthedRequest, res: Response) => {
  await UserService.logoutAll(req.userId!);
  res.clearCookie(SESSION_COOKIE, { path: '/api' });
  res.json({ success: true });
}));

export const authRouter: Router = router;
