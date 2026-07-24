import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ActuarialService } from '../services/actuarial.service.js';

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
  existingCover: z.number().optional(),
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

export const actuarialRouter = router;
