import { Router, Response } from 'express';
import { z } from 'zod';
import { UserService } from '../services/user.service.js';
import { ActuarialService } from '../services/actuarial.service.js';
import { asyncHandler, requireAuth, type AuthedRequest } from './middleware.js';

const router = Router();

const planSchema = z.object({
  name: z.string().trim().min(1).max(200),
  category: z.string().max(100).default('Custom Bundle'),
  coverageAmount: z.number().min(0),
  monthlyPremium: z.number().min(0),
  status: z.enum(['Adequate', 'Gap Detected', 'Incomplete', 'Archived']).default('Incomplete'),
  description: z.string().max(1000).default(''),
});

// GET /api/v1/plans
router.get('/plans', requireAuth, asyncHandler(async (req: AuthedRequest, res: Response) => {
  res.json({ success: true, data: await UserService.listPlans(req.userId!) });
}));

// POST /api/v1/plans
router.post('/plans', requireAuth, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const parse = planSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid plan payload', details: parse.error.format() });
    return;
  }
  // The snapshot is computed here from the stored profile, never taken from the client.
  const profile = await UserService.getStrategyProfile(req.userId!);
  const s = profile && ActuarialService.buildStrategy(profile);
  const snapshot = s && {
    score: s.score,
    lifeGap: s.life.gap,
    healthGap: s.health.gap + (s.parentsHealth?.gap ?? 0),
    annualPremium: s.affordability.estimatedAnnualPremium,
  };
  res.status(201).json({ success: true, data: await UserService.createPlan(req.userId!, parse.data, snapshot) });
}));

// DELETE /api/v1/plans/:id
router.delete('/plans/:id', requireAuth, asyncHandler(async (req: AuthedRequest, res: Response) => {
  if (!(await UserService.deletePlan(req.userId!, String(req.params.id)))) {
    res.status(404).json({ success: false, error: 'Plan not found' });
    return;
  }
  res.json({ success: true });
}));

export const plansRouter: Router = router;
