import { Router, Response } from 'express';
import { z } from 'zod';
import { LANGUAGES, UserService } from '../services/user.service.js';
import { CITY_TIERS, DEPENDENT_RELATIONS } from '../services/actuarial.service.js';
import { SESSION_COOKIE, asyncHandler, rateLimitAuth, requireAuth, type AuthedRequest } from './middleware.js';

const router = Router();

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
    language: z.enum(LANGUAGES),
  })
  .partial();

// Onboarding is where the strategy inputs come from, so the essentials are required there.
const onboardingSchema = profileSchema.required({ age: true, income: true, dependents: true, cityTier: true, monthlyExpenses: true });

// GET /api/v1/user/export — download of everything stored about the user
router.get('/user/export', requireAuth, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await UserService.exportData(req.userId!);
  if (!data) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }
  res.attachment(`shieldiq-data-${data.exportedAt.slice(0, 10)}.json`).json(data);
}));

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
router.get('/user/profile', requireAuth, asyncHandler(async (req: AuthedRequest, res: Response) => {
  res.json({ success: true, user: await UserService.getUserProfile(req.userId!) });
}));

// PUT /api/v1/user/profile
router.put('/user/profile', requireAuth, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const parse = profileSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid profile payload', details: parse.error.format() });
    return;
  }
  res.json({ success: true, user: await UserService.updateUserProfile(req.userId!, parse.data) });
}));

// POST /api/v1/user/disclaimer — records that the user accepted the methodology & liability terms
router.post('/user/disclaimer', requireAuth, asyncHandler(async (req: AuthedRequest, res: Response) => {
  res.json({ success: true, user: await UserService.acknowledgeDisclaimer(req.userId!) });
}));

// POST /api/v1/user/onboarding — accepts the full onboarding form; only profile fields are persisted
router.post('/user/onboarding', requireAuth, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const parse = onboardingSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid onboarding payload', details: parse.error.format() });
    return;
  }
  res.json({
    success: true,
    user: await UserService.updateUserProfile(req.userId!, { ...parse.data, onboardingCompleted: true }),
    message: 'Onboarding data processed and baseline actuarial risk profile initialized.',
  });
}));

export const profileRouter: Router = router;
