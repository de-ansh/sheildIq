import express, { Router, Response } from 'express';
import { z } from 'zod';
import { CHAT_HISTORY_LIMIT, UserService } from '../services/user.service.js';
import { ActuarialService } from '../services/actuarial.service.js';
import { PlansService } from '../services/plans.service.js';
import { AiService, AiNotConfiguredError, AiLimitError, chatMessageSchema, EXPLAIN_SCREENS } from '../services/ai.service.js';
import { asyncHandler, requireAuth, type AuthedRequest } from './middleware.js';
import { log } from '../log.js';

const router = Router();

// Shared plumbing for paid AI endpoints: onboarding gate, usage limits, provider error mapping.
const ONBOARDING_REQUIRED = { success: false, error: 'Complete onboarding to build your strategy.', code: 'ONBOARDING_REQUIRED' };
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * Limits checked right before each paid provider call (cache hits never reach it):
 * per user per feature, per IP across features (new accounts don't reset it), and an app-wide daily cap on spend.
 */
function aiGuard(req: AuthedRequest, feature: string, perUserPerHour: number) {
  return async () => {
    const limits: [key: string, max: number, windowMs: number, message: string][] = [
      [`ai:${feature}:${req.userId}`, perUserPerHour, HOUR, 'You have reached the hourly limit for this AI feature. Please try again later.'],
      [`ai:ip:${req.ip ?? 'unknown'}`, Number(process.env.AI_IP_HOURLY_LIMIT) || 60, HOUR, 'Too many AI requests from your network. Please try again later.'],
      ['ai:global', Number(process.env.AI_DAILY_CALL_LIMIT) || 500, DAY, 'AI features have reached today’s usage limit. Please try again tomorrow.'],
    ];
    for (const [key, max, windowMs, message] of limits) {
      const retryAfter = await UserService.hitRateLimit(key, max, windowMs);
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
        log('error', 'AI request failed', { requestId: res.locals.requestId, error: err instanceof Error ? err.message : String(err) });
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
      log('error', 'AI request failed', { requestId: res.locals.requestId, error: err instanceof Error ? err.message : String(err) });
      res.status(502).json({ success: false, error: 'The AI provider could not complete this request. Please try again.' });
    }
  };
}

/** Profile + computed strategy for an onboarded user, or null after sending the 409. */
async function onboardedContext(req: AuthedRequest, res: Response) {
  const user = await UserService.getUserProfile(req.userId!);
  const profile = user && UserService.toStrategyProfile(user);
  if (!user || !profile || !user.onboardingCompleted) {
    res.status(409).json(ONBOARDING_REQUIRED);
    return null;
  }
  return { profile, strategy: ActuarialService.buildStrategy(profile), language: user.language };
}

// POST /api/v1/strategy/ai — cached per profile; regenerates only on request
router.post('/strategy/ai', requireAuth, aiRoute(async (req, res) => {
  const ctx = await onboardedContext(req, res);
  if (!ctx) return;
  const cached = await AiService.getCached(req.userId!, ctx.profile, ctx.language);
  if (cached && !req.body?.refresh) {
    res.json({ success: true, ai: cached });
    return;
  }
  res.json({ success: true, ai: await AiService.generate(req.userId!, ctx.profile, ctx.strategy, aiGuard(req, 'strategy', 10), ctx.language) });
}));

const chatSchema = z.object({ message: chatMessageSchema.shape.content });
/** Earlier messages sent to the model as context; the full history is still stored and shown. */
const CHAT_CONTEXT_MESSAGES = 12;

// GET /api/v1/ai/chat — the user's saved conversation, oldest first
router.get('/ai/chat', requireAuth, asyncHandler(async (req: AuthedRequest, res: Response) => {
  res.json({ success: true, messages: await UserService.listChat(req.userId!, CHAT_HISTORY_LIMIT) });
}));

// DELETE /api/v1/ai/chat — clears the saved conversation
router.delete('/ai/chat', requireAuth, asyncHandler(async (req: AuthedRequest, res: Response) => {
  await UserService.clearChat(req.userId!);
  res.json({ success: true });
}));

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
  const ctx = await onboardedContext(req, res);
  if (!ctx) return;
  const question = parse.data.message;
  const history = (await UserService.listChat(req.userId!, CHAT_CONTEXT_MESSAGES)).map(({ role, content }) => ({ role, content }));
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
    abort.signal,
    ctx.language
  );
  await UserService.saveChatTurn(req.userId!, question, data.answer);
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
  const ctx = await onboardedContext(req, res);
  if (!ctx) return;
  const { screen, inputs, result } = parse.data;
  const explained = await AiService.explain(req.userId!, ctx.profile, screen, inputs, result, aiGuard(req, 'explain', 30), ctx.language);
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
  const language = (await UserService.getUserProfile(req.userId!))?.language;
  const { data, provider } = await AiService.parseProfile(parse.data.description, aiGuard(req, 'parse-profile', 10), language);
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
  const user = await UserService.getUserProfile(req.userId!);
  const strategy = user?.onboardingCompleted ? ActuarialService.buildStrategy(UserService.toStrategyProfile(user)) : null;
  const result = await AiService.analyzePolicy({ base64: parse.data.data, filename: parse.data.filename }, strategy, aiGuard(req, 'policy', 10), user?.language);
  res.json({ success: true, ...result });
}));

export const aiRouter: Router = router;
