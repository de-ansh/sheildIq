import { describe, it, expect } from 'vitest';
import { ActuarialService, type StrategyProfile } from '../services/actuarial.service.js';
import { PlansService, PLAN_PRODUCTS } from '../services/plans.service.js';

const family: StrategyProfile = {
  age: 34, income: 2400000, dependents: 2, maritalStatus: 'Married', occupation: 'Engineer', cityTier: 'Tier 1 (Metro)',
  homeLoan: 4500000, otherLoans: 500000, monthlyExpenses: 85000, existingLifeCover: 15000000, existingHealthCover: 0, liquidSavings: 0, spouseIncome: 0, dependentDetails: [], parentsHealthCover: 0, loanEmi: 0, homeLoanYearsLeft: 0, existingCiCover: 0, existingPaCover: 0,
  employerBenefits: [], lifestyleRisks: [], spouseAge: 0, healthConditions: [], heightCm: 0, weightKg: 0,
};
const options = (p: StrategyProfile) => PlansService.optionsFor(p, ActuarialService.buildStrategy(p));
const byType = (p: StrategyProfile, type: string) => options(p).find(t => t.type === type)!;

describe('Plan options', () => {
  it('offers four options for each of four insurance types', () => {
    const types = options(family);
    expect(types.map(t => t.type)).toEqual(['term_life', 'health', 'critical_illness', 'personal_accident']);
    for (const t of types) {
      expect(t.options).toHaveLength(4);
      expect(t.options.filter(o => o.recommended).length).toBeLessThanOrEqual(1);
      if (t.recommendedId) expect(t.options.find(o => o.recommended)?.id).toBe(t.recommendedId);
      for (const o of t.options) {
        expect(o.annualPremium).toBeGreaterThan(0);
        expect(o.cover).toBeGreaterThan(0);
        expect(o.monthlyPremium).toBe(Math.round(o.annualPremium / 12));
        expect(o).not.toHaveProperty('multiplier');
      }
    }
  });

  it('describes plan types without fictional insurers or invented claim ratios', () => {
    for (const p of PLAN_PRODUCTS) {
      expect(p.insurer).toMatch(/insurers/);
      expect(p).not.toHaveProperty('claimSettlementRatio');
    }
  });

  it('sizes term cover to the life gap and prices options by structure', () => {
    const s = ActuarialService.buildStrategy(family);
    const term = byType(family, 'term_life');
    expect(term.cover).toBeGreaterThanOrEqual(s.life.gap);
    expect(term.cover - s.life.gap).toBeLessThan(500000);
    const price = (id: string) => term.options.find(o => o.id === id)!.annualPremium;
    expect(price('TL-BASIC')).toBeLessThan(price('TL-RIDERS'));
    expect(price('TL-RIDERS')).toBeLessThan(price('TL-INCREASING'));
    expect(price('TL-INCREASING')).toBeLessThan(price('TL-ROP'));
  });

  it('never recommends return-of-premium term, and recommends nothing when there is no gap', () => {
    for (const age of [22, 34, 50]) for (const income of [600000, 2400000, 20000000])
      expect(byType({ ...family, age, income }, 'term_life').recommendedId).not.toBe('TL-ROP');
    const covered = byType({ ...family, existingLifeCover: 1e9 }, 'term_life');
    expect(covered.recommendedId).toBeNull();
    expect(covered.options.every(o => !o.recommended)).toBe(true);
  });

  it('charges tobacco users more for term and critical illness', () => {
    const smoker = { ...family, lifestyleRisks: ['Tobacco/Smoking'] };
    for (const type of ['term_life', 'critical_illness']) {
      const a = byType(family, type).options[0];
      const b = byType(smoker, type).options[0];
      expect(b.annualPremium / b.cover).toBeGreaterThan(a.annualPremium / a.cover);
    }
  });

  it('picks the health structure from existing cover', () => {
    expect(byType({ ...family, existingHealthCover: 0 }, 'health').recommendedId).toBe('HL-BASE-TOPUP');
    expect(byType({ ...family, existingHealthCover: 500000 }, 'health').recommendedId).toBe('HL-TOPUP-ONLY');
    const noGap = byType({ ...family, existingHealthCover: 1e8 }, 'health');
    expect(noGap.recommendedId).toBeNull();
    // Base + top-up reaches the same cover as a single floater for less
    const h = byType(family, 'health');
    const floater = h.options.find(o => o.id === 'HL-FLOATER')!;
    const split = h.options.find(o => o.id === 'HL-BASE-TOPUP')!;
    expect(split.cover).toBe(floater.cover);
    expect(split.annualPremium).toBeLessThan(floater.annualPremium);
  });

  it('recommends disability income for high-risk occupations', () => {
    expect(byType(family, 'personal_accident').recommendedId).toBe('PA-BASIC');
    expect(byType({ ...family, occupation: 'Delivery rider' }, 'personal_accident').recommendedId).toBe('PA-INCOME');
    expect(byType({ ...family, lifestyleRisks: ['High-Risk Hobbies'] }, 'personal_accident').recommendedId).toBe('PA-INCOME');
  });

  it('keeps critical illness and accident cover within market norms', () => {
    for (const income of [0, 500000, 2400000, 50000000]) {
      const ci = byType({ ...family, income }, 'critical_illness').cover;
      const pa = byType({ ...family, income }, 'personal_accident').cover;
      expect(ci).toBeGreaterThanOrEqual(1000000);
      expect(ci).toBeLessThanOrEqual(5000000);
      expect(pa).toBeGreaterThanOrEqual(2500000);
      expect(pa).toBeLessThanOrEqual(20000000);
    }
  });
});

describe('Affordability and Plan Options price the gaps identically', () => {
  it('recommended options cost exactly what the strategy says, for every household', () => {
    let checked = 0;
    for (const age of [22, 34, 45, 58])
      for (const income of [400000, 1500000, 2400000, 9000000])
        for (const dependents of [0, 1, 3])
          for (const existingHealthCover of [0, 200000, 500000, 5000000])
            for (const existingLifeCover of [0, 15000000, 1e9])
              for (const cityTier of ['Tier 1 (Metro)', 'Tier 3 (Urban Center)'] as const)
                for (const lifestyleRisks of [[], ['Tobacco/Smoking']]) {
                  const p: StrategyProfile = { ...family, age, income, dependents, existingHealthCover, existingLifeCover, cityTier, lifestyleRisks };
                  const s = ActuarialService.buildStrategy(p);
                  const types = PlansService.optionsFor(p, s);
                  const rec = (t: string) => types.find(x => x.type === t)!.options.find(o => o.recommended);
                  const term = rec('term_life');
                  const health = rec('health');

                  expect(term?.annualPremium ?? 0).toBe(s.life.estimatedAnnualPremiumForGap);
                  const parents = s.parentsHealth?.estimatedAnnualPremium ?? 0;
                  expect(health?.annualPremium ?? 0).toBe(s.affordability.estimatedAnnualPremium - s.life.estimatedAnnualPremiumForGap - parents);
                  expect(Boolean(term)).toBe(s.life.gap > 0);
                  expect(Boolean(health)).toBe(s.health.gap > 0);
                  checked++;
                }
    expect(checked).toBe(2304);
  });

  it('demo household: Affordability matches the recommended plans', () => {
    const demo = { ...family, existingHealthCover: 500000, employerBenefits: ['Group Term Life'] };
    const s = ActuarialService.buildStrategy(demo);
    const types = PlansService.optionsFor(demo, s);
    const term = types[0].options.find(o => o.recommended)!;
    const health = types[1].options.find(o => o.recommended)!;
    expect(s.affordability.estimatedAnnualPremium).toBe(term.annualPremium + health.annualPremium);
  });
});

describe('medical loading in plan quotes', () => {
  it('scales term and critical illness quotes, not accident cover', () => {
    const diabetic = { ...family, healthConditions: ['diabetes' as const] };
    for (const [type, ratio] of [['term_life', 1.5], ['critical_illness', 1.5], ['personal_accident', 1]] as const) {
      const a = byType(family, type).options[0].annualPremium;
      const b = byType(diabetic, type).options[0].annualPremium;
      expect(b / a, type).toBeCloseTo(ratio, 1);
    }
  });
});
