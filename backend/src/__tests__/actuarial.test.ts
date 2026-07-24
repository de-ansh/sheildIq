import { describe, it, expect } from 'vitest';
import { ActuarialService } from '../services/actuarial.service.js';

describe('ActuarialService Engine', () => {
  it('calculates Human Life Value (HLV) correctly', () => {
    const input = { income: 100000, years: 20, inflation: 5, existingCover: 500000 };
    const result = ActuarialService.calculateHLV(input);

    expect(result.recommendedCover).toBeGreaterThan(500000);
    expect(result.coverageGap).toBe(result.recommendedCover - 500000);
    expect(result.incomeReplacementWindow).toBe(20);
  });

  it('simulates critical illness scenario stress tests', () => {
    const input = { scenario: 'illness' as const, cost: 100000, years: 5, inflation: 4, existingCover: 150000 };
    const result = ActuarialService.simulateRiskScenario(input);

    expect(result.treatmentCostTotal).toBeGreaterThan(100000);
    expect(result.depletionAge).toBeGreaterThanOrEqual(40);
    expect(result.recommendation).toContain('critical illness');
  });

  it('computes portfolio protection score and red flags', () => {
    const result = ActuarialService.analyzePortfolio(100000, 1200000, 500000);

    expect(result.score).toBe(100);
    expect(result.rating).toBe('Optimal');
    expect(result.redFlags.length).toBe(0);
  });
});
