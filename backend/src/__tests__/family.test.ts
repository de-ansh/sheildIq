import { describe, it, expect } from 'vitest';
import { ActuarialService, type StrategyProfile } from '../services/actuarial.service.js';
import { planFamily } from '../services/family.service.js';

const base: StrategyProfile = {
  age: 34, income: 2400000, dependents: 0, maritalStatus: 'Married', occupation: 'Engineer', cityTier: 'Tier 1 (Metro)',
  homeLoan: 4500000, otherLoans: 0, monthlyExpenses: 85000, existingLifeCover: 0, existingHealthCover: 500000, liquidSavings: 0,
  spouseIncome: 0, spouseAge: 32, dependentDetails: [{ relation: 'child', age: 6 }, { relation: 'child', age: 2 }], parentsHealthCover: 0,
  loanEmi: 0, homeLoanYearsLeft: 0, existingCiCover: 0, existingPaCover: 0, employerBenefits: [], lifestyleRisks: [],
  healthConditions: [], heightCm: 0, weightKg: 0,
};
const plan = (p: StrategyProfile) => planFamily(p, ActuarialService.buildStrategy(p));
const policy = (f: ReturnType<typeof plan>, id: string) => f.policies.find(x => x.id === id);

describe('family plan', () => {
  it('a homemaker partner and young children: one floater, homemaker cover, no life cover for children', () => {
    const f = plan(base);
    expect(f.members.map(m => m.id)).toEqual(['you', 'spouse', 'child-1', 'child-2']);
    expect(policy(f, 'family-health')).toMatchObject({ buyAs: 'family_floater', covers: ['you', 'spouse', 'child-1', 'child-2'], inStrategy: true });
    expect(policy(f, 'spouse-term')).toMatchObject({ cover: 5000000, priority: 'recommended', inStrategy: false });
    expect(policy(f, 'spouse-ci')).toBeUndefined();
    expect(f.members.find(m => m.id === 'spouse')!.notNeeded.map(n => n.type)).toEqual(['critical_illness', 'personal_accident']);
    expect(f.members.find(m => m.id === 'child-1')!.notNeeded[0].type).toBe('term_life');
    // Feature checklist follows the household: metro room rent, maternity (under 35), newborn care (child under 5).
    const features = policy(f, 'family-health')!.lookFor.map(l => l.feature).join(' | ');
    expect(features).toMatch(/room-rent/);
    expect(features).toMatch(/Maternity/);
    expect(features).toMatch(/Newborn and vaccination/);
    expect(features).not.toMatch(/Pre-existing/);
    // ₹5L held: the strategy closes the gap with a super top-up, and the reason says so.
    expect(policy(f, 'family-health')!.reason).toMatch(/super top-up above the ₹5\.0L you already hold/);
  });

  it('an earning partner gets their own income-based term, CI and accident cover, priced at their age', () => {
    const f = plan({ ...base, spouseIncome: 1200000, spouseAge: 30 });
    const term = policy(f, 'spouse-term')!;
    expect(term.cover).toBeGreaterThan(1200000 * 10);
    expect(term.priority).toBe('essential');
    const older = policy(plan({ ...base, spouseIncome: 1200000, spouseAge: 45 }), 'spouse-term')!;
    expect(older.annualPremium / older.cover).toBeGreaterThan(term.annualPremium / term.cover); // priced at the partner's own age
    expect(policy(f, 'spouse-ci')).toBeDefined();
    expect(policy(f, 'spouse-pa')).toBeDefined();
  });

  it('parents get the strategy\'s senior policy; two parents over 70 are steered to separate policies', () => {
    const one = plan({ ...base, dependentDetails: [{ relation: 'parent', age: 64 }] });
    const s = ActuarialService.buildStrategy({ ...base, dependentDetails: [{ relation: 'parent', age: 64 }] });
    expect(policy(one, 'parents-health')).toMatchObject({ buyAs: 'senior_policy', covers: ['parent-1'], annualPremium: s.parentsHealth!.estimatedAnnualPremium });
    const two = plan({ ...base, dependentDetails: [{ relation: 'parent', age: 72 }, { relation: 'parent', age: 66 }] });
    expect(policy(two, 'parents-health')!.lookFor[0].feature).toMatch(/Two individual policies/);
    expect(policy(two, 'parents-health')!.lookFor.map(l => l.feature).join()).toMatch(/Co-pay of 20% or less/);
  });

  it('siblings and children over 25 need their own health policy, outside the floater', () => {
    const f = plan({ ...base, dependentDetails: [{ relation: 'sibling', age: 19 }, { relation: 'child', age: 26 }] });
    expect(policy(f, 'family-health')!.covers).toEqual(['you', 'spouse']);
    expect(policy(f, 'sibling-1-health')).toMatchObject({ buyAs: 'own_policy', inStrategy: false });
    expect(policy(f, 'child-1-health')).toMatchObject({ buyAs: 'own_policy' });
  });

  it('a single person with no dependents or loans needs no term cover', () => {
    const f = plan({ ...base, maritalStatus: 'Single', dependentDetails: [], homeLoan: 0 });
    expect(policy(f, 'you-term')).toBeUndefined();
    expect(f.members[0].notNeeded.map(n => n.type)).toContain('term_life');
  });

  it('totals add up, and premiums already in the strategy match its estimate exactly', () => {
    for (const p of [base, { ...base, spouseIncome: 900000, dependentDetails: [...base.dependentDetails, { relation: 'parent' as const, age: 68 }] }]) {
      const s = ActuarialService.buildStrategy(p);
      const f = planFamily(p, s);
      const buy = f.policies.filter(x => x.status === 'buy');
      expect(f.totalAnnualPremium).toBe(buy.reduce((sum, x) => sum + x.annualPremium, 0));
      expect(f.totalAnnualPremium - f.additionalAnnualPremium).toBe(s.affordability.estimatedAnnualPremium);
      for (const x of f.policies) if (x.status === 'covered') expect(x.annualPremium).toBe(0);
    }
  });
});
