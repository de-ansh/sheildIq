import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserService } from '../services/user.service.js';
import { getDatabase } from '../db/database.js';

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

const profileSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    age: z.number().int().min(18).max(100),
    income: z.number().min(0),
    dependents: z.number().int().min(0).max(20),
    maritalStatus: z.enum(['Single', 'Married']),
    occupation: z.string().max(100),
    city: z.string().max(100),
  })
  .partial();

const planSchema = z.object({
  name: z.string().trim().min(1).max(200),
  category: z.string().max(100).default('Custom Bundle'),
  coverageAmount: z.number().min(0),
  monthlyPremium: z.number().min(0),
  status: z.enum(['Adequate', 'Gap Detected', 'Incomplete', 'Archived']).default('Incomplete'),
  description: z.string().max(1000).default(''),
});

interface AuthedRequest extends Request {
  userId?: string;
  token?: string;
}

const SESSION_COOKIE = 'siq_session';

// httpOnly keeps the token away from page scripts; SameSite=Strict blocks cross-site (CSRF) requests.
function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api',
  });
}

function readSessionCookie(req: Request): string | undefined {
  const match = req.headers.cookie?.split(';').map(c => c.trim()).find(c => c.startsWith(`${SESSION_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(SESSION_COOKIE.length + 1)) : undefined;
}

// Stored in SQLite so the limit holds across restarts and across instances sharing the DB.
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 10;

function rateLimitAuth(req: Request, res: Response, next: NextFunction) {
  const retryAfter = UserService.hitRateLimit(`ip:${req.ip ?? 'unknown'}`, AUTH_MAX_ATTEMPTS, AUTH_WINDOW_MS);
  if (retryAfter !== null) {
    res.set('Retry-After', String(retryAfter));
    res.status(429).json({ success: false, error: 'Too many attempts. Please try again later.' });
    return;
  }
  next();
}

export function resetAuthRateLimit() {
  getDatabase().exec('DELETE FROM auth_attempts');
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = readSessionCookie(req);
  const userId = token ? UserService.resolveSession(token) : null;
  if (!token || !userId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  req.userId = userId;
  req.token = token;
  next();
}

// POST /api/v1/auth/register
router.post('/auth/register', rateLimitAuth, (req: Request, res: Response) => {
  const parse = registerSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid registration payload', details: parse.error.format() });
    return;
  }
  const result = UserService.register(parse.data.email, parse.data.password, parse.data.name);
  if (!result) {
    res.status(409).json({ success: false, error: 'An account with this email already exists' });
    return;
  }
  setSessionCookie(res, result.token);
  res.status(201).json({ success: true, user: result.user });
});

// POST /api/v1/auth/login
router.post('/auth/login', rateLimitAuth, (req: Request, res: Response) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid login payload', details: parse.error.format() });
    return;
  }
  const result = UserService.login(parse.data.email, parse.data.password);
  if (!result) {
    res.status(401).json({ success: false, error: 'Invalid email or password' });
    return;
  }
  setSessionCookie(res, result.token);
  res.json({ success: true, user: result.user });
});

// POST /api/v1/auth/logout
router.post('/auth/logout', requireAuth, (req: AuthedRequest, res: Response) => {
  UserService.logout(req.token!);
  res.clearCookie(SESSION_COOKIE, { path: '/api' });
  res.json({ success: true });
});

// POST /api/v1/auth/forgot-password — always 200 so the response never reveals whether an account exists
router.post('/auth/forgot-password', rateLimitAuth, (req: Request, res: Response) => {
  const parse = forgotSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid email', details: parse.error.format() });
    return;
  }
  const token = UserService.requestPasswordReset(parse.data.email);
  if (token) {
    const link = `${process.env.APP_URL || 'http://localhost:5173'}/?reset=${token}`;
    // shortcut: no mail provider yet, so the link is only printed in development; wire an email service before production.
    if (process.env.NODE_ENV !== 'production') console.log(`[ShieldIQ] Password reset link for ${parse.data.email}: ${link}`);
  }
  res.json({ success: true, message: 'If an account exists for that email, a reset link has been sent.' });
});

// POST /api/v1/auth/reset-password
router.post('/auth/reset-password', rateLimitAuth, (req: Request, res: Response) => {
  const parse = resetSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid reset request', details: parse.error.format() });
    return;
  }
  if (!UserService.resetPassword(parse.data.token, parse.data.password)) {
    res.status(400).json({ success: false, error: 'This reset link is invalid or has expired.' });
    return;
  }
  res.json({ success: true });
});

// POST /api/v1/auth/change-password
router.post('/auth/change-password', requireAuth, rateLimitAuth, (req: AuthedRequest, res: Response) => {
  const parse = changePasswordSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid password change request', details: parse.error.format() });
    return;
  }
  if (!UserService.changePassword(req.userId!, req.token!, parse.data.currentPassword, parse.data.newPassword)) {
    res.status(400).json({ success: false, error: 'Current password is incorrect.' });
    return;
  }
  res.json({ success: true });
});

// POST /api/v1/auth/logout-all
router.post('/auth/logout-all', requireAuth, (req: AuthedRequest, res: Response) => {
  UserService.logoutAll(req.userId!);
  res.clearCookie(SESSION_COOKIE, { path: '/api' });
  res.json({ success: true });
});

// GET /api/v1/user/profile
router.get('/user/profile', requireAuth, (req: AuthedRequest, res: Response) => {
  res.json({ success: true, user: UserService.getUserProfile(req.userId!) });
});

// PUT /api/v1/user/profile
router.put('/user/profile', requireAuth, (req: AuthedRequest, res: Response) => {
  const parse = profileSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid profile payload', details: parse.error.format() });
    return;
  }
  res.json({ success: true, user: UserService.updateUserProfile(req.userId!, parse.data) });
});

// POST /api/v1/user/onboarding — accepts the full onboarding form; only profile fields are persisted
router.post('/user/onboarding', requireAuth, (req: AuthedRequest, res: Response) => {
  const parse = profileSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid onboarding payload', details: parse.error.format() });
    return;
  }
  res.json({
    success: true,
    user: UserService.updateUserProfile(req.userId!, parse.data),
    message: 'Onboarding data processed and baseline actuarial risk profile initialized.',
  });
});

// GET /api/v1/plans
router.get('/plans', requireAuth, (req: AuthedRequest, res: Response) => {
  res.json({ success: true, data: UserService.listPlans(req.userId!) });
});

// POST /api/v1/plans
router.post('/plans', requireAuth, (req: AuthedRequest, res: Response) => {
  const parse = planSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid plan payload', details: parse.error.format() });
    return;
  }
  res.status(201).json({ success: true, data: UserService.createPlan(req.userId!, parse.data) });
});

// DELETE /api/v1/plans/:id
router.delete('/plans/:id', requireAuth, (req: AuthedRequest, res: Response) => {
  if (!UserService.deletePlan(req.userId!, String(req.params.id))) {
    res.status(404).json({ success: false, error: 'Plan not found' });
    return;
  }
  res.json({ success: true });
});

export const userRouter: Router = router;
