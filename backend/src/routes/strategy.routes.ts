import { Router, Response } from 'express';
import { UserService } from '../services/user.service.js';
import { ActuarialService } from '../services/actuarial.service.js';
import { PlansService } from '../services/plans.service.js';
import { HEALTH_INSURER_RECORDS, INSURER_RECORDS_SOURCE, LIFE_INSURER_RECORDS } from '../services/insurer-records.js';
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
  res.json({
    success: true,
    data: PlansService.optionsFor(profile, ActuarialService.buildStrategy(profile)),
    disclaimer: 'Plan types with indicative premiums from ShieldIQ rate tables, not insurer quotes. Insurer claim records are official IRDAI figures; get actual quotes before buying.',
    insurerRecords: { source: INSURER_RECORDS_SOURCE, life: LIFE_INSURER_RECORDS, health: HEALTH_INSURER_RECORDS },
  });
}));

export const strategyRouter: Router = router;
