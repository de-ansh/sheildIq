import { Router, Response } from 'express';
import { UserService } from '../services/user.service.js';
import { ActuarialService } from '../services/actuarial.service.js';
import { PlansService } from '../services/plans.service.js';
import { GENERAL_HEALTH_INSURER_RECORDS, INSURER_RECORDS_SOURCE } from '../services/insurer-records.js';
import { rankInsurers } from '../services/insurer-ranking.js';
import { planFamily } from '../services/family.service.js';
import { AiService, configuredProvider } from '../services/ai.service.js';
import { asyncHandler, requireAuth, type AuthedRequest } from './middleware.js';

const router = Router();

// GET /api/v1/strategy — deterministic strategy from the stored profile, plus any cached AI narrative
router.get('/strategy', requireAuth, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await UserService.getUserProfile(req.userId!);
  const profile = user && UserService.toStrategyProfile(user);
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
    ai: await AiService.getCached(req.userId!, profile, user.language),
    aiProvider: configuredProvider(),
  });
}));

// GET /api/v1/plan-options — 4 options per insurance type, quoted for this household, with a rule-based pick
router.get('/plan-options', requireAuth, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await UserService.getUserProfile(req.userId!);
  const profile = user && UserService.toStrategyProfile(user);
  if (!user || !profile || !user.onboardingCompleted) {
    res.status(409).json({ success: false, error: 'Complete onboarding to see plan options.', code: 'ONBOARDING_REQUIRED' });
    return;
  }
  const strategy = ActuarialService.buildStrategy(profile);
  res.json({
    success: true,
    data: PlansService.optionsFor(profile, strategy),
    disclaimer: 'Plan types with indicative premiums from ShieldIQ rate tables, not insurer quotes. Insurer claim records are official IRDAI figures; get actual quotes before buying.',
    // Ranked best first for this household; see insurer-ranking.ts for the method.
    insurerRecords: { source: INSURER_RECORDS_SOURCE, ...rankInsurers(profile, strategy), generalHealth: GENERAL_HEALTH_INSURER_RECORDS },
  });
}));

// GET /api/v1/family-plan — what each household member should hold, how to buy it, and estimated premiums
router.get('/family-plan', requireAuth, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await UserService.getUserProfile(req.userId!);
  const profile = user && UserService.toStrategyProfile(user);
  if (!user || !profile || !user.onboardingCompleted) {
    res.status(409).json({ success: false, error: 'Complete onboarding to see your family plan.', code: 'ONBOARDING_REQUIRED' });
    return;
  }
  res.json({
    success: true,
    data: planFamily(profile, ActuarialService.buildStrategy(profile)),
    disclaimer: 'Cover amounts follow common planning rules and premiums are ShieldIQ estimates, not insurer quotes.',
  });
}));

export const strategyRouter: Router = router;
