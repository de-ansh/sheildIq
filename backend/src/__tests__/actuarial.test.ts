import { describe, it, expect } from 'vitest';
import { ActuarialService, incomeToReplace, medicalLoading, bmiOf, type StrategyProfile } from '../services/actuarial.service.js';

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
  liquidSavings: 0,
  spouseIncome: 0,
  dependentDetails: [],
  parentsHealthCover: 0,
  loanEmi: 0,
  homeLoanYearsLeft: 0,
  existingCiCover: 0,
  existingPaCover: 0,
  employerBenefits: ['Group Term Life'],
  lifestyleRisks: [],
  spouseAge: 0, healthConditions: [],
  heightCm: 0,
  weightKg: 0,
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
    const funded = { ...family, liquidSavings: family.monthlyExpenses * 6 }; // emergency fund in place too
    const base = ActuarialService.buildStrategy(funded);
    const s = ActuarialService.buildStrategy({ ...funded, existingLifeCover: base.life.totalNeed, existingHealthCover: base.health.recommendedCover,
      existingCiCover: base.criticalIllness.recommended, existingPaCover: base.personalAccident.recommended });
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

describe('Savings reduce the life need', () => {
  it('subtracts liquid savings from the need and shows the deduction', () => {
    const without = ActuarialService.buildStrategy(family);
    const withSavings = ActuarialService.buildStrategy({ ...family, liquidSavings: 8000000 });
    expect(withSavings.life.savings).toBe(8000000);
    expect(withSavings.life.totalNeed).toBe(without.life.totalNeed - 8000000);
    expect(withSavings.life.gap).toBe(Math.max(0, without.life.gap - 8000000));
    expect(withSavings.insights.find(i => /Life cover gap/.test(i.title))?.detail).toMatch(/less ₹80.0L of savings/);
  });

  it('never lets savings push the need below zero', () => {
    const rich = ActuarialService.buildStrategy({ ...family, liquidSavings: 1e10 });
    expect(rich.life.totalNeed).toBe(0);
    expect(rich.life.savings).toBe(rich.life.humanLifeValue + rich.life.liabilities + rich.life.educationCorpus);
  });

  it('warns when savings are below a 6-month emergency fund', () => {
    const low = ActuarialService.buildStrategy({ ...family, liquidSavings: 100000 });
    expect(low.insights.map(i => i.title)).toContain('Emergency fund below 6 months');
    const ok = ActuarialService.buildStrategy({ ...family, liquidSavings: family.monthlyExpenses * 6 });
    expect(ok.insights.map(i => i.title)).not.toContain('Emergency fund below 6 months');
  });
});

describe('Partner income', () => {
  it('reduces the income to replace by the partner\'s take-home, within sensible bounds', () => {
    expect(incomeToReplace(2000000, 0, 600000)).toBe(1400000); // single income: unchanged 70%
    expect(incomeToReplace(2000000, 1000000, 600000)).toBe(700000); // 14L contribution - 7L partner take-home
    expect(incomeToReplace(2000000, 4000000, 600000)).toBe(0); // partner covers the household alone
    // Expenses above the earner's contribution set the bar, still capped at that contribution.
    expect(incomeToReplace(2000000, 1000000, 2400000)).toBe(1400000);
  });

  it('lowers the life need for a two-income family and says why', () => {
    const solo = ActuarialService.buildStrategy(family);
    const dual = ActuarialService.buildStrategy({ ...family, spouseIncome: 1200000 });
    expect(dual.life.humanLifeValue).toBeLessThan(solo.life.humanLifeValue);
    expect(dual.life.annualIncomeReplaced).toBe(1680000 - 840000);
    expect(dual.insights.find(i => /Life cover gap/.test(i.title))?.detail).toMatch(/after your partner's income/);
  });
});

describe('Dependents list: children, parents and siblings', () => {
  const withDeps = (dependentDetails: StrategyProfile['dependentDetails'], extra: Partial<StrategyProfile> = {}) =>
    ActuarialService.buildStrategy({ ...family, dependentDetails, ...extra });

  it('keeps the old spouse + children guess for profiles without a list', () => {
    const s = ActuarialService.buildStrategy(family); // married, dependents: 2, no list
    expect(s.household).toMatchObject({ children: 1, parents: 0, siblings: 0, spouseDependent: true, dependents: 2 });
    expect(s.life.educationCorpus).toBe(2500000);
  });

  it('funds education only for children and siblings under 22', () => {
    const s = withDeps([{ relation: 'child', age: 4 }, { relation: 'child', age: 24 }, { relation: 'sibling', age: 17 }, { relation: 'sibling', age: 30 }]);
    expect(s.household).toMatchObject({ children: 2, siblings: 2, dependents: 5 }); // + non-earning spouse
    expect(s.life.educationCorpus).toBe(2 * 2500000);
  });

  it('a working spouse is not counted as a dependent', () => {
    const s = withDeps([{ relation: 'child', age: 3 }], { spouseIncome: 1200000 });
    expect(s.household).toMatchObject({ spouseDependent: false, dependents: 1 });
  });

  it('recommends a separate senior health policy for dependent parents', () => {
    const none = withDeps([{ relation: 'child', age: 3 }]);
    const s = withDeps([{ relation: 'child', age: 3 }, { relation: 'parent', age: 68 }, { relation: 'parent', age: 63 }]);
    expect(none.parentsHealth).toBeNull();
    expect(s.parentsHealth).toMatchObject({ count: 2, eldestAge: 68, existing: 0 });
    expect(s.parentsHealth!.recommendedCover).toBeGreaterThan(0);
    expect(s.parentsHealth!.gap).toBe(s.parentsHealth!.recommendedCover);
    // Parents are not added to the family floater
    expect(s.health.recommendedCover).toBe(none.health.recommendedCover);
    // Their premium is part of the cost to close gaps, and an insight explains it
    expect(s.affordability.estimatedAnnualPremium).toBe(none.affordability.estimatedAnnualPremium + s.parentsHealth!.estimatedAnnualPremium);
    expect(s.insights.map(i => i.title).join(' ')).toMatch(/Parents need/);
    // Older parents cost more per rupee of cover
    const younger = withDeps([{ relation: 'parent', age: 58 }]);
    const older = withDeps([{ relation: 'parent', age: 72 }]);
    expect(older.parentsHealth!.estimatedAnnualPremium / older.parentsHealth!.gap).toBeGreaterThan(younger.parentsHealth!.estimatedAnnualPremium / younger.parentsHealth!.gap);
  });

  it('parents with enough cover produce no gap or warning', () => {
    const s = withDeps([{ relation: 'parent', age: 65 }], { parentsHealthCover: 5e7 });
    expect(s.parentsHealth!.gap).toBe(0);
    expect(s.parentsHealth!.estimatedAnnualPremium).toBe(0);
    expect(s.insights.map(i => i.title).join(' ')).not.toMatch(/Parents need/);
  });

  it('a single person supporting parents still gets income replacement', () => {
    const s = withDeps([{ relation: 'parent', age: 66 }], { maritalStatus: 'Single', homeLoan: 0, otherLoans: 0 });
    expect(s.household.dependents).toBe(1);
    expect(s.life.humanLifeValue).toBeGreaterThan(0);
    expect(s.insights.map(i => i.title)).toContain('Sole provider for dependents');
  });
});

describe('Insight ordering', () => {
  it('lists critical findings first, then warnings, then notes', () => {
    const s = ActuarialService.buildStrategy({
      ...family, lifestyleRisks: ['Tobacco/Smoking'], employerBenefits: ['Group Term Life'],
      dependentDetails: [{ relation: 'parent', age: 70 }], existingLifeCover: 0,
    });
    const ranks = s.insights.map(i => ({ critical: 0, warning: 1, info: 2 })[i.severity]);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(s.insights[0].severity).toBe('critical');
    expect(s.insights.map(i => i.title).join(' ')).toMatch(/Parents need/);
  });
});

describe('Loan EMIs in affordability', () => {
  it('reports EMIs, their share of income, and the surplus after everything', () => {
    const s = ActuarialService.buildStrategy({ ...family, loanEmi: 50000 });
    expect(s.affordability.annualEmi).toBe(600000);
    expect(s.affordability.emiToIncomeRatio).toBe(25); // 6L of 24L
    expect(s.affordability.annualSurplus).toBe(2400000 - 85000 * 12 - 600000 - s.affordability.estimatedAnnualPremium);
    expect(s.insights.map(i => i.title).join(' ')).not.toMatch(/Loan repayments take/);
  });

  it('warns when EMIs exceed the 40% lenders allow', () => {
    const s = ActuarialService.buildStrategy({ ...family, loanEmi: 90000 }); // 10.8L of 24L = 45%
    expect(s.insights.map(i => i.title)).toContain('Loan repayments take 45% of income');
  });

  it('flags a plan that does not add up as critical', () => {
    const s = ActuarialService.buildStrategy({ ...family, loanEmi: 120000 }); // 24L - 10.2L expenses - 14.4L EMIs < 0
    expect(s.affordability.annualSurplus).toBeLessThan(0);
    expect(s.insights[0]).toMatchObject({ severity: 'critical' });
    expect(s.insights.map(i => i.title)).toContain('Expenses, EMIs and premiums exceed income');
  });
});

describe('Critical illness and accident cover', () => {
  it('sizes both from income, nets off cover held, and counts them in the score', () => {
    const none = ActuarialService.buildStrategy(family);
    expect(none.criticalIllness).toEqual({ recommended: 5000000, existing: 0, gap: 5000000 }); // 3x 24L, capped at 50L
    expect(none.personalAccident.recommended).toBe(12000000); // 5x income
    expect(none.insights.map(i => i.title)).toContain('Income protection beyond death');

    const held = ActuarialService.buildStrategy({ ...family, existingCiCover: 2000000, existingPaCover: 12000000 });
    expect(held.criticalIllness.gap).toBe(3000000);
    expect(held.personalAccident.gap).toBe(0);
    // 40% of the CI weight and all of the PA weight: 0.4*5 + 5 = 7 points
    expect(held.score - none.score).toBe(7);
  });

  it('quotes CI and PA plans for the gap only', async () => {
    const { PlansService } = await import('../services/plans.service.js');
    const p = { ...family, existingCiCover: 2000000 };
    const groups = PlansService.optionsFor(p, ActuarialService.buildStrategy(p));
    expect(groups.find(g => g.type === 'critical_illness')!.cover).toBe(3000000);
    expect(groups.find(g => g.type === 'critical_illness')!.coverRationale).toMatch(/you hold ₹20\.0L/);
  });
});

describe('health conditions and BMI', () => {
  const none = { spouseAge: 0, healthConditions: [], heightCm: 0, weightKg: 0 };
  it('loads term rates by condition and BMI, capped where insurers would decline instead', () => {
    expect(medicalLoading(none)).toBe(1);
    expect(bmiOf({ heightCm: 170, weightKg: 90 })).toBe(31.1);
    expect(medicalLoading({ healthConditions: ['diabetes'], heightCm: 170, weightKg: 90 })).toBeCloseTo(1.875); // 1.5 x 1.25
    expect(medicalLoading({ healthConditions: ['thyroid'], heightCm: 0, weightKg: 0 })).toBe(1);
    expect(medicalLoading({ healthConditions: ['heart', 'cancer', 'diabetes'], heightCm: 0, weightKg: 0 })).toBe(3);
  });

  it('raises the term premium, the health cover need, and adds a disclosure finding', () => {
    const healthy = ActuarialService.buildStrategy(family);
    const diabetic = ActuarialService.buildStrategy({ ...family, healthConditions: ['diabetes'] });
    expect(diabetic.life.estimatedAnnualPremiumForGap / healthy.life.estimatedAnnualPremiumForGap).toBeGreaterThan(1.3);
    expect(diabetic.health.recommendedCover).toBeGreaterThan(healthy.health.recommendedCover);
    expect(diabetic.health.notes.join(' ')).toMatch(/waiting period/);
    expect(healthy.insights.some(i => i.code === 'medical')).toBe(false);
    const finding = diabetic.insights.find(i => i.code === 'medical')!;
    expect(finding.detail).toMatch(/diabetes/);
    expect(finding.detail).toMatch(/50% above standard/);

    const severe = ActuarialService.buildStrategy({ ...family, healthConditions: ['heart'] }).insights.find(i => i.code === 'medical')!;
    expect(severe.detail).toMatch(/postpone or decline/);
    // BMI alone: no waiting-period line, but the loading is explained.
    const heavy = ActuarialService.buildStrategy({ ...family, heightCm: 165, weightKg: 100 }).insights.find(i => i.code === 'medical')!;
    expect(heavy.detail).toMatch(/BMI of 36\.7/);
    expect(heavy.detail).not.toMatch(/waiting period/);
  });
});
