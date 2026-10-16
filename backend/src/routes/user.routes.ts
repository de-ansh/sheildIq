import express, { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CHAT_HISTORY_LIMIT, UserService } from '../services/user.service.js';
import { getDatabase } from '../db/database.js';
import { isDevelopment } from '../config.js';
import { ActuarialService, CITY_TIERS, DEPENDENT_RELATIONS } from '../services/actuarial.service.js';
import { PlansService } from '../services/plans.service.js';
import { HEALTH_INSURER_RECORDS, INSURER_RECORDS_SOURCE, LIFE_INSURER_RECORDS } from '../services/insurer-records.js';
import {
  AiService,
  AiNotConfiguredError,
  AiLimitError,
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
    liquidSavings: money,
    spouseIncome: money,
    dependentDetails: z.array(z.object({ relation: z.enum(DEPENDENT_RELATIONS), age: z.number().int().min(0).max(110) })).max(12),
    parentsHealthCover: money,
    loanEmi: money,
    homeLoanYearsLeft: z.number().int().min(0).max(40),
    existingCiCover: money,
    existingPaCover: money,
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

/** Express 4 does not catch rejected promises; route async handler errors to the error middleware. */
const asyncHandler =
  <R extends Request>(fn: (req: R, res: Response, next: NextFunction) => Promise<void>) =>
  (req: R, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

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
    secure: !isDevelopment(),
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
  const lockedFor = UserService.rateLimitRetryAfter(accountKey, AUTH_MAX_ATTEMPTS);
  if (lockedFor !== null) {
    res.set('Retry-After', String(lockedFor));
    res.status(429).json({ success: false, error: 'Too many failed sign-in attempts for this account. Please try again later.' });
    return;
  }
  const result = await UserService.login(parse.data.email, parse.data.password);
  if (!result) {
    UserService.hitRateLimit(accountKey, AUTH_MAX_ATTEMPTS, AUTH_WINDOW_MS);
    res.status(401).json({ success: false, error: 'Invalid email or password' });
    return;
  }
  setSessionCookie(res, result.token);
  res.json({ success: true, user: result.user });
}));

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
    if (isDevelopment()) console.log(`[ShieldIQ] Password reset link for ${parse.data.email}: ${link}`);
  }
  res.json({ success: true, message: 'If an account exists for that email, a reset link has been sent.' });
});

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
router.post('/auth/logout-all', requireAuth, (req: AuthedRequest, res: Response) => {
  UserService.logoutAll(req.userId!);
  res.clearCookie(SESSION_COOKIE, { path: '/api' });
  res.json({ success: true });
});

// GET /api/v1/user/export — download of everything stored about the user
router.get('/user/export', requireAuth, (req: AuthedRequest, res: Response) => {
  const data = UserService.exportData(req.userId!);
  if (!data) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }
  res.attachment(`shieldiq-data-${data.exportedAt.slice(0, 10)}.json`).json(data);
});

// DELETE /api/v1/user/account — permanent erasure, confirmed with the current password
router.delete('/user/account', requireAuth, rateLimitAuth, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const parse = z.object({ password: z.string().min(1).max(128) }).safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, error: 'Enter your password to delete your account.' });
    return;
  }
  if (!(await UserService.deleteAccount(req.userId!, parse.data.password))) {
    res.status(400).json({ success: false, error: 'That password is incorrect.' });
    return;
  }
  res.clearCookie(SESSION_COOKIE, { path: '/api' });
  res.json({ success: true });
}));

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

// POST /api/v1/user/disclaimer — records that the user accepted the methodology & liability terms
router.post('/user/disclaimer', requireAuth, (req: AuthedRequest, res: Response) => {
  res.json({ success: true, user: UserService.acknowledgeDisclaimer(req.userId!) });
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
    disclaimer: 'Plan types with indicative premiums from ShieldIQ rate tables, not insurer quotes. Insurer claim records are official IRDAI figures; get actual quotes before buying.',
    insurerRecords: { source: INSURER_RECORDS_SOURCE, life: LIFE_INSURER_RECORDS, health: HEALTH_INSURER_RECORDS },
  });
});

// Shared plumbing for paid AI endpoints: onboarding gate, usage limits, provider error mapping.
const ONBOARDING_REQUIRED = { success: false, error: 'Complete onboarding to build your strategy.', code: 'ONBOARDING_REQUIRED' };
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * Limits checked right before each paid provider call (cache hits never reach it):
 * per user per feature, per IP across features (new accounts don't reset it), and an app-wide daily cap on spend.
 */
function aiGuard(req: AuthedRequest, feature: string, perUserPerHour: number) {
  return () => {
    const limits: [key: string, max: number, windowMs: number, message: string][] = [
      [`ai:${feature}:${req.userId}`, perUserPerHour, HOUR, 'You have reached the hourly limit for this AI feature. Please try again later.'],
      [`ai:ip:${req.ip ?? 'unknown'}`, Number(process.env.AI_IP_HOURLY_LIMIT) || 60, HOUR, 'Too many AI requests from your network. Please try again later.'],
      ['ai:global', Number(process.env.AI_DAILY_CALL_LIMIT) || 500, DAY, 'AI features have reached today’s usage limit. Please try again tomorrow.'],
    ];
    for (const [key, max, windowMs, message] of limits) {
      const retryAfter = UserService.hitRateLimit(key, max, windowMs);
      if (retryAfter !== null) throw new AiLimitError(message, retryAfter);
    }
  };
}

function aiRoute(handler: (req: AuthedRequest, res: Response) => Promise<void>) {
  return async (req: AuthedRequest, res: Response) => {
    try {
      await handler(req, res);
    } catch (err) {
      if (res.headersSent) {
        // Mid-stream failure: the status is already sent, so report it as a final event.
        console.error('[ShieldIQ AI]', err);
        if (!res.writableEnded) res.end(`data: ${JSON.stringify({ error: 'The answer was interrupted. Please try again.' })}\n\n`);
        return;
      }
      if (err instanceof AiLimitError) {
        res.set('Retry-After', String(err.retryAfter));
        res.status(429).json({ success: false, error: err.message });
        return;
      }
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
  res.json({ success: true, ai: await AiService.generate(req.userId!, ctx.profile, ctx.strategy, aiGuard(req, 'strategy', 10)) });
}));

const chatSchema = z.object({ message: chatMessageSchema.shape.content });
/** Earlier messages sent to the model as context; the full history is still stored and shown. */
const CHAT_CONTEXT_MESSAGES = 12;

// GET /api/v1/ai/chat — the user's saved conversation, oldest first
router.get('/ai/chat', requireAuth, (req: AuthedRequest, res: Response) => {
  res.json({ success: true, messages: UserService.listChat(req.userId!, CHAT_HISTORY_LIMIT) });
});

// DELETE /api/v1/ai/chat — clears the saved conversation
router.delete('/ai/chat', requireAuth, (req: AuthedRequest, res: Response) => {
  UserService.clearChat(req.userId!);
  res.json({ success: true });
});

/**
 * POST /api/v1/ai/chat — "Ask ShieldIQ". Streams server-sent events: {delta} pieces of the reply as they arrive,
 * then {done, reply, provider}; or {error} if the provider fails mid-reply. Errors before the first piece
 * (validation, limits, provider down) are ordinary JSON responses. The turn is saved only once complete.
 */
router.post('/ai/chat', requireAuth, aiRoute(async (req, res) => {
  const parse = chatSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid chat request', details: parse.error.format() });
    return;
  }
  const ctx = onboardedContext(req, res);
  if (!ctx) return;
  const question = parse.data.message;
  const history = UserService.listChat(req.userId!, CHAT_CONTEXT_MESSAGES).map(({ role, content }) => ({ role, content }));
  const planOptions = PlansService.optionsFor(ctx.profile, ctx.strategy);

  // Stop paying for tokens nobody will read once the client disconnects.
  const abort = new AbortController();
  res.on('close', () => !res.writableEnded && abort.abort());
  const send = (event: object) => res.write(`data: ${JSON.stringify(event)}\n\n`);
  const { data, provider } = await AiService.chat(
    ctx.profile, ctx.strategy, [...history, { role: 'user', content: question }], planOptions,
    delta => {
      if (!res.headersSent) {
        res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
      }
      send({ delta });
    },
    aiGuard(req, 'chat', 40),
    abort.signal
  );
  UserService.saveChatTurn(req.userId!, question, data.answer);
  send({ done: true, reply: data, provider });
  res.end();
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
  if (!ctx) return;
  const { screen, inputs, result } = parse.data;
  const explained = await AiService.explain(req.userId!, ctx.profile, screen, inputs, result, aiGuard(req, 'explain', 30));
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
  const { data, provider } = await AiService.parseProfile(parse.data.description, aiGuard(req, 'parse-profile', 10));
  res.json({ success: true, draft: data, provider });
}));

// Policy schedules are a few pages; 4 MB keeps one scan's provider cost bounded.
export const MAX_PDF_BYTES = 4 * 1024 * 1024;
const policyUploadSchema = z.object({
  filename: z.string().trim().min(1).max(200).regex(/\.pdf$/i, 'Only PDF files are supported'),
  data: z.string().min(1).max(Math.ceil((MAX_PDF_BYTES * 4) / 3) + 4).regex(/^[A-Za-z0-9+/]+={0,2}$/, 'File must be base64-encoded'),
});

// POST /api/v1/ai/policy-analysis — PDF in, key terms + fit against the user's gaps out; the file is never stored
// Body parser runs after requireAuth so anonymous requests are refused before anything is buffered.
router.post('/ai/policy-analysis', requireAuth, express.json({ limit: '6mb' }), aiRoute(async (req, res) => {
  const parse = policyUploadSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Upload a PDF up to 4 MB.', details: parse.error.format() });
    return;
  }
  const bytes = Buffer.from(parse.data.data, 'base64');
  if (bytes.length > MAX_PDF_BYTES || bytes.subarray(0, 5).toString('latin1') !== '%PDF-') {
    res.status(400).json({ success: false, error: 'That file is not a valid PDF up to 4 MB.' });
    return;
  }
  const user = UserService.getUserProfile(req.userId!);
  const profile = UserService.getStrategyProfile(req.userId!);
  const strategy = user?.onboardingCompleted && profile ? ActuarialService.buildStrategy(profile) : null;
  const result = await AiService.analyzePolicy({ base64: parse.data.data, filename: parse.data.filename }, strategy, aiGuard(req, 'policy', 10));
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
  // The snapshot is computed here from the stored profile, never taken from the client.
  const profile = UserService.getStrategyProfile(req.userId!);
  const s = profile && ActuarialService.buildStrategy(profile);
  const snapshot = s && {
    score: s.score,
    lifeGap: s.life.gap,
    healthGap: s.health.gap + (s.parentsHealth?.gap ?? 0),
    annualPremium: s.affordability.estimatedAnnualPremium,
  };
  res.status(201).json({ success: true, data: UserService.createPlan(req.userId!, parse.data, snapshot) });
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
