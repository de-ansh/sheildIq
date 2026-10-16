import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ActuarialService, CITY_TIERS } from '../services/actuarial.service.js';

const router = Router();

const hlvSchema = z.object({
  income: z.number().positive(),
  years: z.number().min(1).max(60),
  inflation: z.number().min(0).max(20),
  existingCover: z.number().optional(),
});

const riskSimSchema = z.object({
  scenario: z.enum(['death', 'illness', 'disability']),
  cost: z.number().positive(),
  years: z.number().min(1).max(50),
  inflation: z.number().min(0).max(25),
  existingCover: z.number().min(0).optional(),
  age: z.number().int().min(18).max(100).optional(),
  income: z.number().min(0).optional(),
  monthlyExpenses: z.number().min(0).optional(),
});

const healthPlanSchema = z.object({
  adults: z.number().int().min(1).max(6),
  children: z.number().int().min(0).max(10),
  cityTier: z.enum(CITY_TIERS),
  employerCover: z.number().min(0).max(1e9),
  existingCover: z.number().min(0).max(1e9),
  risks: z.array(z.string().max(50)).max(10).default([]),
  eldestAge: z.number().int().min(18).max(100).default(35),
});

const coverageAnalysisSchema = z.object({
  income: z.number().positive(),
  existingLifeCover: z.number().min(0),
  existingHealthCover: z.number().min(0),
});

// POST /api/v1/actuarial/hlv-calculator
router.post('/hlv-calculator', (req: Request, res: Response) => {
  const parse = hlvSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid input parameters', details: parse.error.format() });
    return;
  }
  const result = ActuarialService.calculateHLV(parse.data);
  res.json({ success: true, data: result });
});

// POST /api/v1/actuarial/risk-simulator
router.post('/risk-simulator', (req: Request, res: Response) => {
  const parse = riskSimSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid simulation scenario parameters', details: parse.error.format() });
    return;
  }
  const result = ActuarialService.simulateRiskScenario(parse.data);
  res.json({ success: true, data: result });
});

// POST /api/v1/actuarial/health-plan
router.post('/health-plan', (req: Request, res: Response) => {
  const parse = healthPlanSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid health plan input', details: parse.error.format() });
    return;
  }
  const { eldestAge, ...input } = parse.data;
  res.json({ success: true, data: ActuarialService.planHealthCover(input, eldestAge) });
});

// POST /api/v1/actuarial/coverage-analysis
router.post('/coverage-analysis', (req: Request, res: Response) => {
  const parse = coverageAnalysisSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid coverage input', details: parse.error.format() });
    return;
  }
  const { income, existingLifeCover, existingHealthCover } = parse.data;
  const result = ActuarialService.analyzePortfolio(income, existingLifeCover, existingHealthCover);
  res.json({ success: true, data: result });
});

export const actuarialRouter: Router = router;
