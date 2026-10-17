import { describe, it, expect } from 'vitest';
import { ActuarialService, CITY_TIERS, type StrategyProfile } from '../services/actuarial.service.js';

// A deterministic grid of realistic and edge-case households.
const AGES = [18, 25, 34, 45, 55, 60, 70];
const INCOMES = [0, 300000, 1200000, 2400000, 10000000, 50000000];
const FAMILIES: Pick<StrategyProfile, 'maritalStatus' | 'dependents'>[] = [
  { maritalStatus: 'Single', dependents: 0 },
  { maritalStatus: 'Single', dependents: 2 },
  { maritalStatus: 'Married', dependents: 1 },
  { maritalStatus: 'Married', dependents: 4 },
];
const DEBTS = [
  { homeLoan: 0, otherLoans: 0 },
  { homeLoan: 8000000, otherLoans: 1500000 },
];
const RISKS = [[], ['Tobacco/Smoking']];
const SAVINGS = [0, 500000, 50000000];
const SPOUSE = [0, 1200000];

function* profiles(): Generator<StrategyProfile> {
  for (const age of AGES)
    for (const income of INCOMES)
      for (const family of FAMILIES)
        for (const debt of DEBTS)
          for (const cityTier of CITY_TIERS)
            for (const lifestyleRisks of RISKS)
              for (const liquidSavings of SAVINGS)
              for (const spouseIncome of SPOUSE)
              yield {
                age, income, ...family, ...debt, cityTier, lifestyleRisks, liquidSavings, spouseIncome, dependentDetails: [], parentsHealthCover: 0, loanEmi: debt.homeLoan > 0 ? 75000 : 0, homeLoanYearsLeft: debt.homeLoan > 0 ? 15 : 0, existingCiCover: 0, existingPaCover: 0,
                occupation: 'x', monthlyExpenses: Math.round(income / 24), existingLifeCover: 5000000, existingHealthCover: 500000,
                employerBenefits: [],
              };
}

const finiteNonNegative = (label: string, value: number) => {
  expect(Number.isFinite(value), `${label} is finite`).toBe(true);
  expect(value, `${label} >= 0`).toBeGreaterThanOrEqual(0);
};

describe('Strategy invariants across ' + [...profiles()].length + ' households', () => {
  it('produces finite, non-negative, internally consistent numbers', () => {
    for (const p of profiles()) {
      const s = ActuarialService.buildStrategy(p);
      const ctx = JSON.stringify({ age: p.age, income: p.income, dep: p.dependents, ms: p.maritalStatus, tier: p.cityTier });

      for (const [k, v] of Object.entries(s.life)) finiteNonNegative(`life.${k} ${ctx}`, v);
      for (const k of ['recommendedCover', 'basePolicy', 'superTopUp', 'estimatedAnnualPremium', 'gap'] as const) finiteNonNegative(`health.${k}`, s.health[k]);
      for (const [k, v] of Object.entries(s.affordability)) if (k !== 'annualSurplus') finiteNonNegative(`affordability.${k}`, v);
      // The surplus may be negative (that is what it reports), but it must add up exactly.
      expect(s.affordability.annualSurplus).toBe(p.income - p.monthlyExpenses * 12 - p.loanEmi * 12 - s.affordability.estimatedAnnualPremium);

      const gross = s.life.humanLifeValue + s.life.liabilities + s.life.educationCorpus;
      expect(s.life.savings).toBe(Math.min(p.liquidSavings, gross));
      expect(s.life.totalNeed).toBe(gross - s.life.savings);
      expect(s.life.gap).toBe(Math.max(0, s.life.totalNeed - p.existingLifeCover));
      expect(s.health.gap).toBe(Math.max(0, s.health.recommendedCover - p.existingHealthCover));
      expect(s.health.basePolicy + s.health.superTopUp).toBe(s.health.recommendedCover);
      for (const c of [s.criticalIllness, s.personalAccident]) expect(c.gap).toBe(Math.max(0, c.recommended - c.existing));
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(100);
      expect(s.insights.length).toBeGreaterThan(0);
      // Every finding has a stable code, so the app can show it in the user's language.
      for (const i of s.insights) expect(i.code).toMatch(/^[a-z_]+$/);
      if (s.life.gap === 0) expect(s.life.estimatedAnnualPremiumForGap).toBe(0);
      // Nobody relying on the income and no debts means no income-replacement need.
      if (p.dependents === 0 && p.homeLoan + p.otherLoans === 0) expect(s.life.humanLifeValue).toBe(0);
      if (p.liquidSavings >= gross) expect(s.life.totalNeed).toBe(0);
    }
  });

  it('never raises the need when a partner earns more, and is unchanged for single-income households', () => {
    for (const p of profiles()) {
      const solo = ActuarialService.buildStrategy({ ...p, spouseIncome: 0 });
      const dual = ActuarialService.buildStrategy({ ...p, spouseIncome: 1500000 });
      expect(dual.life.totalNeed).toBeLessThanOrEqual(solo.life.totalNeed);
      expect(dual.life.annualIncomeReplaced).toBeLessThanOrEqual(solo.life.annualIncomeReplaced);
      expect(solo.life.annualIncomeReplaced).toBeCloseTo(p.income * 0.7, 0);
    }
  });

  it('adding a dependent parent adds a dependent and never lowers cost, except by dropping riders that no longer fit the budget', () => {
    for (const p of profiles()) {
      const listed: StrategyProfile = { ...p, dependentDetails: [{ relation: 'child', age: 5 }] };
      const withParent: StrategyProfile = { ...listed, dependentDetails: [...listed.dependentDetails, { relation: 'parent', age: 70 }] };
      const a = ActuarialService.buildStrategy(listed);
      const b = ActuarialService.buildStrategy(withParent);
      expect(b.household.dependents).toBe(a.household.dependents + 1);
      if (a.picks.termId === 'TL-RIDERS' && b.picks.termId === 'TL-BASIC') {
        // Parents' cover took priority over optional riders: allowed only when riders no longer fit the budget.
        const ridersPremium = a.picks.termPremium;
        expect(ridersPremium + b.picks.healthPremium + b.parentsHealth!.estimatedAnnualPremium).toBeGreaterThan(b.affordability.premiumBudget);
      } else {
        expect(b.affordability.estimatedAnnualPremium).toBeGreaterThanOrEqual(a.affordability.estimatedAnnualPremium);
      }
      expect(b.score).toBeGreaterThanOrEqual(0);
      expect(b.score).toBeLessThanOrEqual(100);
    }
  });

  it('never lowers the need when income rises, and never raises the gap when cover rises', () => {
    for (const p of profiles()) {
      if (p.dependents === 0 && p.homeLoan === 0) continue;
      const base = ActuarialService.buildStrategy(p);
      const richer = ActuarialService.buildStrategy({ ...p, income: p.income + 500000 });
      const covered = ActuarialService.buildStrategy({ ...p, existingLifeCover: p.existingLifeCover + 10000000, existingHealthCover: p.existingHealthCover + 1000000, existingCiCover: 1500000, existingPaCover: 5000000 });
      expect(richer.life.totalNeed).toBeGreaterThanOrEqual(base.life.totalNeed);
      expect(covered.life.gap).toBeLessThanOrEqual(base.life.gap);
      expect(covered.health.gap).toBeLessThanOrEqual(base.health.gap);
      expect(covered.criticalIllness.gap).toBeLessThanOrEqual(base.criticalIllness.gap);
      expect(covered.personalAccident.gap).toBeLessThanOrEqual(base.personalAccident.gap);
      expect(covered.score).toBeGreaterThanOrEqual(base.score);
    }
  });

  it('prices older and tobacco-using applicants at least as high', () => {
    const p: StrategyProfile = {
      age: 25, income: 2000000, maritalStatus: 'Married', dependents: 2, cityTier: 'Tier 1 (Metro)', homeLoan: 0, otherLoans: 0,
      occupation: 'x', monthlyExpenses: 50000, existingLifeCover: 0, existingHealthCover: 0, liquidSavings: 0, spouseIncome: 0, dependentDetails: [], parentsHealthCover: 0, loanEmi: 0, homeLoanYearsLeft: 0, existingCiCover: 0, existingPaCover: 0, employerBenefits: [], lifestyleRisks: [],
    };
    // Same gap at each age so only the rate changes.
    const ratePerGap = (age: number, risks: string[] = []) => {
      const s = ActuarialService.buildStrategy({ ...p, age, lifestyleRisks: risks });
      return s.life.estimatedAnnualPremiumForGap / s.life.gap;
    };
    for (const [a, b] of [[25, 35], [35, 45], [45, 55]]) expect(ratePerGap(b)).toBeGreaterThanOrEqual(ratePerGap(a));
    expect(ratePerGap(35, ['Tobacco/Smoking'])).toBeGreaterThan(ratePerGap(35));
  });

  it('sizes health cover by city tier and family size monotonically', () => {
    const plan = (tier: (typeof CITY_TIERS)[number], adults: number, children: number) =>
      ActuarialService.planHealthCover({ adults, children, cityTier: tier, employerCover: 0, existingCover: 0, risks: [] }).recommendedCover;
    expect(plan('Tier 1 (Metro)', 2, 2)).toBeGreaterThanOrEqual(plan('Tier 2 (Emerging Metro)', 2, 2));
    expect(plan('Tier 2 (Emerging Metro)', 2, 2)).toBeGreaterThanOrEqual(plan('Tier 3 (Urban Center)', 2, 2));
    for (const tier of CITY_TIERS) expect(plan(tier, 2, 3)).toBeGreaterThanOrEqual(plan(tier, 1, 0));
  });
});

describe('Risk simulator invariants', () => {
  const scenarios = ['death', 'illness', 'disability'] as const;

  it('stays finite and consistent for every scenario and input', () => {
    for (const scenario of scenarios)
      for (const age of [20, 40, 59, 65])
        for (const cover of [0, 500000, 20000000])
          for (const years of [1, 5, 10]) {
            const r = ActuarialService.simulateRiskScenario({ scenario, cost: 1500000, years, inflation: 6, existingCover: cover, age, income: 1800000, monthlyExpenses: 60000 });
            for (const k of ['treatmentCostTotal', 'earningCapacityLoss', 'totalFinancialImpact', 'shortfallAmount', 'yearsFunded'] as const) finiteNonNegative(`${scenario}.${k}`, r[k]);
            expect(r.totalFinancialImpact).toBe(r.treatmentCostTotal + r.earningCapacityLoss);
            expect(r.shortfallAmount).toBe(Math.max(0, r.totalFinancialImpact - cover));
            expect(r.adequacyIndex).toBeGreaterThanOrEqual(0);
            expect(r.adequacyIndex).toBeLessThanOrEqual(100);
            expect(r.depletionAge).toBeGreaterThanOrEqual(age);
          }
  });

  it('never treats health cover as cash for living costs during an illness', () => {
    const r = ActuarialService.simulateRiskScenario({ scenario: 'illness', cost: 500000, years: 2, inflation: 5, existingCover: 5000000, age: 40, income: 2000000, monthlyExpenses: 80000 });
    expect(r.yearsFunded).toBe(0);
    expect(r.depletionAge).toBe(40);
  });

  it('more cover never increases the shortfall', () => {
    for (const scenario of scenarios) {
      const low = ActuarialService.simulateRiskScenario({ scenario, cost: 1000000, years: 3, inflation: 5, existingCover: 1000000, age: 35, income: 1500000, monthlyExpenses: 50000 });
      const high = ActuarialService.simulateRiskScenario({ scenario, cost: 1000000, years: 3, inflation: 5, existingCover: 30000000, age: 35, income: 1500000, monthlyExpenses: 50000 });
      expect(high.shortfallAmount).toBeLessThanOrEqual(low.shortfallAmount);
      expect(high.adequacyIndex).toBeGreaterThanOrEqual(low.adequacyIndex);
    }
  });
});
