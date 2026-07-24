import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PolicyService } from '../services/policy.service.js';

const router = Router();

const compareSchema = z.object({
  policyIds: z.array(z.string()),
});

// GET /api/v1/policies
router.get('/', (_req: Request, res: Response) => {
  const policies = PolicyService.getAllPolicies();
  res.json({ success: true, count: policies.length, data: policies });
});

// GET /api/v1/policies/:id
router.get('/:id', (req: Request, res: Response) => {
  const policyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const policy = PolicyService.getPolicyById(policyId);
  if (!policy) {
    res.status(404).json({ success: false, error: 'Policy record not found' });
    return;
  }
  res.json({ success: true, data: policy });
});

// POST /api/v1/policies/compare
router.post('/compare', (req: Request, res: Response) => {
  const parse = compareSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid policy comparison request', details: parse.error.format() });
    return;
  }
  const comparison = PolicyService.comparePolicies(parse.data.policyIds);
  res.json({ success: true, data: comparison });
});

export const policyRouter = router;
