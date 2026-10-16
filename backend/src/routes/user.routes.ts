import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserService } from '../services/user.service.js';
import { getDatabase } from '../db/database.js';
import { ActuarialService, CITY_TIERS } from '../services/actuarial.service.js';
import { PlansService } from '../services/plans.service.js';
import {
  AiService,
  AiNotConfiguredError,
  configuredProvider,
  chatMessageSchema,
  EXPLAIN_SCREENS,
} from '../services/ai.service.js';

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

const money = z.number().min(0).max(1e11);
const profileSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    age: z.number().int().min(18).max(100),
    income: money,
    dependents: z.number().int().min(0).max(20),
    maritalStatus: z.enum(['Single', 'Married']),
    occupation: z.string().trim().max(100),
    city: z.string().trim().max(100),
    cityTier: z.enum(CITY_TIERS),
    homeLoan: money,
    otherLoans: money,
    monthlyExpenses: money,
    existingLifeCover: money,
    existingHealthCover: money,
    employerBenefits: z.array(z.string().max(50)).max(10),
    lifestyleRisks: z.array(z.string().max(50)).max(10),
  })
  .partial();

// Onboarding is where the strategy inputs come from, so the essentials are required there.
const onboardingSchema = profileSchema.required({ age: true, income: true, dependents: true, cityTier: true, monthlyExpenses: true });

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
  const parse = onboardingSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid onboarding payload', details: parse.error.format() });
    return;
  }
  res.json({
    success: true,
    user: UserService.updateUserProfile(req.userId!, { ...parse.data, onboardingCompleted: true }),
    message: 'Onboarding data processed and baseline actuarial risk profile initialized.',
  });
});

// GET /api/v1/strategy — deterministic strategy from the stored profile, plus any cached AI narrative
router.get('/strategy', requireAuth, (req: AuthedRequest, res: Response) => {
  const user = UserService.getUserProfile(req.userId!);
  const profile = UserService.getStrategyProfile(req.userId!);
  if (!user || !profile) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }
  if (!user.onboardingCompleted) {
    res.status(409).json({ success: false, error: 'Complete onboarding to build your strategy.', code: 'ONBOARDING_REQUIRED' });
    return;
  }
  res.json({
    success: true,
    data: ActuarialService.buildStrategy(profile),
    ai: AiService.getCached(req.userId!, profile),
    aiProvider: configuredProvider(),
  });
});

// GET /api/v1/plan-options — 4 options per insurance type, quoted for this household, with a rule-based pick
router.get('/plan-options', requireAuth, (req: AuthedRequest, res: Response) => {
  const user = UserService.getUserProfile(req.userId!);
  const profile = UserService.getStrategyProfile(req.userId!);
  if (!user || !profile || !user.onboardingCompleted) {
    res.status(409).json({ success: false, error: 'Complete onboarding to see plan options.', code: 'ONBOARDING_REQUIRED' });
    return;
  }
  res.json({
    success: true,
    data: PlansService.optionsFor(profile, ActuarialService.buildStrategy(profile)),
    disclaimer: 'Sample plans with indicative premiums from ShieldIQ rate tables. Insurer names are illustrative; get actual quotes before buying.',
  });
});

// Shared plumbing for paid AI endpoints: onboarding gate, per-user hourly limit, provider error mapping.
const ONBOARDING_REQUIRED = { success: false, error: 'Complete onboarding to build your strategy.', code: 'ONBOARDING_REQUIRED' };

function aiLimit(res: Response, feature: string, userId: string, perHour: number): boolean {
  const retryAfter = UserService.hitRateLimit(`ai:${feature}:${userId}`, perHour, 60 * 60 * 1000);
  if (retryAfter === null) return true;
  res.set('Retry-After', String(retryAfter));
  res.status(429).json({ success: false, error: 'AI usage limit reached for now. Please try again later.' });
  return false;
}

function aiRoute(handler: (req: AuthedRequest, res: Response) => Promise<void>) {
  return async (req: AuthedRequest, res: Response) => {
    try {
      await handler(req, res);
    } catch (err) {
      if (err instanceof AiNotConfiguredError) {
        res.status(503).json({ success: false, error: 'AI features are not configured on this server.' });
        return;
      }
      console.error('[ShieldIQ AI]', err);
      res.status(502).json({ success: false, error: 'The AI provider could not complete this request. Please try again.' });
    }
  };
}

/** Profile + computed strategy for an onboarded user, or null after sending the 409. */
function onboardedContext(req: AuthedRequest, res: Response) {
  const user = UserService.getUserProfile(req.userId!);
  const profile = UserService.getStrategyProfile(req.userId!);
  if (!user || !profile || !user.onboardingCompleted) {
    res.status(409).json(ONBOARDING_REQUIRED);
    return null;
  }
  return { profile, strategy: ActuarialService.buildStrategy(profile) };
}

// POST /api/v1/strategy/ai — cached per profile; regenerates only on request
router.post('/strategy/ai', requireAuth, aiRoute(async (req, res) => {
  const ctx = onboardedContext(req, res);
  if (!ctx) return;
  const cached = AiService.getCached(req.userId!, ctx.profile);
  if (cached && !req.body?.refresh) {
    res.json({ success: true, ai: cached });
    return;
  }
  if (!aiLimit(res, 'strategy', req.userId!, 10)) return;
  res.json({ success: true, ai: await AiService.generate(req.userId!, ctx.profile, ctx.strategy) });
}));

const chatSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(20).refine(m => m[m.length - 1].role === 'user', 'Last message must be from the user'),
});

// POST /api/v1/ai/chat — "Ask ShieldIQ"; history is held by the client and capped
router.post('/ai/chat', requireAuth, aiRoute(async (req, res) => {
  const parse = chatSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid chat request', details: parse.error.format() });
    return;
  }
  const ctx = onboardedContext(req, res);
  if (!ctx || !aiLimit(res, 'chat', req.userId!, 40)) return;
  const planOptions = PlansService.optionsFor(ctx.profile, ctx.strategy);
  const { data, provider } = await AiService.chat(ctx.profile, ctx.strategy, parse.data.messages, planOptions);
  res.json({ success: true, reply: data, provider });
}));

const scalar = z.union([z.number().finite(), z.string().max(200), z.boolean(), z.null(), z.array(z.string().max(100)).max(10)]);
const explainSchema = z.object({
  screen: z.enum(EXPLAIN_SCREENS),
  inputs: z.record(scalar).refine(o => Object.keys(o).length <= 20, 'Too many inputs'),
  result: z.record(scalar).refine(o => Object.keys(o).length <= 20, 'Too many result fields'),
});

// POST /api/v1/ai/explain — plain-language explanation of a calculator result
router.post('/ai/explain', requireAuth, aiRoute(async (req, res) => {
  const parse = explainSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid explain request', details: parse.error.format() });
    return;
  }
  const ctx = onboardedContext(req, res);
  if (!ctx || !aiLimit(res, 'explain', req.userId!, 30)) return;
  const { screen, inputs, result } = parse.data;
  const explained = await AiService.explain(req.userId!, ctx.profile, screen, inputs, result);
  res.json({ success: true, explanation: explained.data, provider: explained.provider });
}));

const parseProfileSchema = z.object({ description: z.string().trim().min(20).max(2000) });

// POST /api/v1/ai/parse-profile — drafts onboarding answers; nothing is saved until the user submits onboarding
router.post('/ai/parse-profile', requireAuth, aiRoute(async (req, res) => {
  const parse = parseProfileSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Describe yourself in 20 to 2000 characters.', details: parse.error.format() });
    return;
  }
  if (!aiLimit(res, 'parse-profile', req.userId!, 10)) return;
  const { data, provider } = await AiService.parseProfile(parse.data.description);
  res.json({ success: true, draft: data, provider });
}));

const MAX_PDF_BYTES = 10 * 1024 * 1024;
const policyUploadSchema = z.object({
  filename: z.string().trim().min(1).max(200).regex(/\.pdf$/i, 'Only PDF files are supported'),
  data: z.string().min(1).max(Math.ceil((MAX_PDF_BYTES * 4) / 3) + 4).regex(/^[A-Za-z0-9+/]+={0,2}$/, 'File must be base64-encoded'),
});

// POST /api/v1/ai/policy-analysis — PDF in, key terms + fit against the user's gaps out; the file is never stored
router.post('/ai/policy-analysis', requireAuth, aiRoute(async (req, res) => {
  const parse = policyUploadSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Upload a PDF up to 10 MB.', details: parse.error.format() });
    return;
  }
  const bytes = Buffer.from(parse.data.data, 'base64');
  if (bytes.length > MAX_PDF_BYTES || bytes.subarray(0, 5).toString('latin1') !== '%PDF-') {
    res.status(400).json({ success: false, error: 'That file is not a valid PDF up to 10 MB.' });
    return;
  }
  if (!aiLimit(res, 'policy', req.userId!, 10)) return;
  const user = UserService.getUserProfile(req.userId!);
  const profile = UserService.getStrategyProfile(req.userId!);
  const strategy = user?.onboardingCompleted && profile ? ActuarialService.buildStrategy(profile) : null;
  const result = await AiService.analyzePolicy({ base64: parse.data.data, filename: parse.data.filename }, strategy);
  res.json({ success: true, ...result });
}));

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
