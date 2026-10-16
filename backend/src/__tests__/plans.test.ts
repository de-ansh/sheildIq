import { describe, it, expect } from 'vitest';
import { ActuarialService, type StrategyProfile } from '../services/actuarial.service.js';
import { PlansService, PLAN_PRODUCTS } from '../services/plans.service.js';

const family: StrategyProfile = {
  age: 34, income: 2400000, dependents: 2, maritalStatus: 'Married', occupation: 'Engineer', cityTier: 'Tier 1 (Metro)',
  homeLoan: 4500000, otherLoans: 500000, monthlyExpenses: 85000, existingLifeCover: 15000000, existingHealthCover: 0,
  employerBenefits: [], lifestyleRisks: [],
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

  it('labels every insurer as a sample', () => {
    for (const p of PLAN_PRODUCTS) expect(p.insurer).toMatch(/\(sample\)$/);
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
