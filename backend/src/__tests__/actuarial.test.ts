import { describe, it, expect } from 'vitest';
import { ActuarialService, type StrategyProfile } from '../services/actuarial.service.js';

const family: StrategyProfile = {
  age: 34,
  income: 2400000,
  dependents: 2,
  maritalStatus: 'Married',
  occupation: 'Engineer',
  cityTier: 'Tier 1 (Metro)',
  homeLoan: 4500000,
  otherLoans: 500000,
  monthlyExpenses: 85000,
  existingLifeCover: 15000000,
  existingHealthCover: 500000,
  employerBenefits: ['Group Term Life'],
  lifestyleRisks: [],
};

describe('ActuarialService Engine', () => {
  it('values a life at roughly 14-16x income over a full career (no double-counted inflation)', () => {
    const result = ActuarialService.calculateHLV({ income: 1000000, years: 26, inflation: 6, existingCover: 5000000 });
    expect(result.recommendedCover / 1000000).toBeGreaterThan(13);
    expect(result.recommendedCover / 1000000).toBeLessThan(17);
    expect(result.coverageGap).toBe(result.recommendedCover - 5000000);
    expect(result.incomeReplacementWindow).toBe(26);
  });

  it('builds a life need from income replacement, loans and education', () => {
    const s = ActuarialService.buildStrategy(family);
    expect(s.life.liabilities).toBe(5000000);
    expect(s.life.educationCorpus).toBe(2500000); // married with 2 dependents → spouse + 1 child
    expect(s.life.totalNeed).toBe(s.life.humanLifeValue + 5000000 + 2500000);
    expect(s.life.gap).toBe(s.life.totalNeed - 15000000);
    expect(s.life.estimatedAnnualPremiumForGap).toBeGreaterThan(0);
  });

  it('needs no life cover for a single person with no dependents or debts', () => {
    const s = ActuarialService.buildStrategy({ ...family, maritalStatus: 'Single', dependents: 0, homeLoan: 0, otherLoans: 0, existingLifeCover: 0 });
    expect(s.life.totalNeed).toBe(0);
    expect(s.life.gap).toBe(0);
  });

  it('sizes health cover by city tier and family, splitting base and super top-up', () => {
    const metro = ActuarialService.planHealthCover({ adults: 2, children: 2, cityTier: 'Tier 1 (Metro)', employerCover: 0, existingCover: 0, risks: [] });
    const tier3 = ActuarialService.planHealthCover({ adults: 2, children: 2, cityTier: 'Tier 3 (Urban Center)', employerCover: 0, existingCover: 0, risks: [] });
    expect(metro.recommendedCover).toBeGreaterThan(tier3.recommendedCover);
    expect(metro.basePolicy + metro.superTopUp).toBe(metro.recommendedCover);
    expect(metro.recommendedCover % 500000).toBe(0);

    const smoker = ActuarialService.planHealthCover({ adults: 2, children: 2, cityTier: 'Tier 1 (Metro)', employerCover: 0, existingCover: 0, risks: ['Tobacco/Smoking'] });
    expect(smoker.recommendedCover).toBeGreaterThanOrEqual(metro.recommendedCover);
  });

  it('flags employer-dependent health cover', () => {
    const plan = ActuarialService.planHealthCover({ adults: 1, children: 0, cityTier: 'Tier 2 (Emerging Metro)', employerCover: 500000, existingCover: 200000, risks: [] });
    expect(plan.employerDependencyShare).toBe(71);
    expect(plan.notes.join(' ')).toMatch(/employer/i);
  });

  it('scores a family with large gaps as high risk and explains why', () => {
    const s = ActuarialService.buildStrategy(family);
    expect(s.rating).toBe('High Risk');
    const titles = s.insights.map(i => i.title).join(' | ');
    expect(titles).toMatch(/Life cover gap/);
    expect(titles).toMatch(/Health cover gap/);
    expect(titles).toMatch(/not portable/);
  });

  it('reports protection on track when cover meets the need', () => {
    const base = ActuarialService.buildStrategy(family);
    const s = ActuarialService.buildStrategy({ ...family, existingLifeCover: base.life.totalNeed, existingHealthCover: base.health.recommendedCover });
    expect(s.score).toBe(100);
    expect(s.rating).toBe('Optimal');
    expect(s.insights[0].title).toMatch(/on track/);
  });

  it('stress tests use the real age and expenses for depletion', () => {
    const r = ActuarialService.simulateRiskScenario({
      scenario: 'death', cost: 1000000, years: 1, inflation: 5, existingCover: 13000000, age: 40, income: 2000000, monthlyExpenses: 100000,
    });
    // (₹1.3 Cr − ₹10L final expenses) / ₹12L a year = 10 years of runway
    expect(r.yearsFunded).toBe(10);
    expect(r.depletionAge).toBe(50);
    expect(r.recommendation).toMatch(/term life/);
  });

  it('spreads illness treatment cost over the recovery window with medical inflation', () => {
    const r = ActuarialService.simulateRiskScenario({ scenario: 'illness', cost: 900000, years: 3, inflation: 4, existingCover: 0, age: 35, income: 1200000, monthlyExpenses: 50000 });
    expect(r.treatmentCostTotal).toBeGreaterThan(900000);
    expect(r.treatmentCostTotal).toBeLessThan(900000 * 1.1);
    expect(r.riskSeverity).toBe('CRITICAL');
    expect(r.recommendation).toMatch(/critical illness/);
  });

  it('computes the quick portfolio check', () => {
    const result = ActuarialService.analyzePortfolio(100000, 1200000, 500000);
    expect(result.score).toBe(100);
    expect(result.rating).toBe('Optimal');
    expect(result.redFlags.length).toBe(0);
  });
});
