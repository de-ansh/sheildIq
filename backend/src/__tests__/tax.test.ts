import { describe, it, expect } from 'vitest';
import { oldRegimeMarginalRate, premiumTax } from '../services/tax.js';

describe('tax relief on premiums (old regime)', () => {
  it('marginal rates follow the old slabs with cess, surcharge, and the ₹5L rebate', () => {
    expect(oldRegimeMarginalRate(450000)).toBe(0); // inside the rebate
    expect(oldRegimeMarginalRate(800000)).toBeCloseTo(0.208);
    expect(oldRegimeMarginalRate(2000000)).toBeCloseTo(0.312);
    expect(oldRegimeMarginalRate(6000000)).toBeCloseTo(0.3432); // 30% + 10% surcharge + 4% cess
  });

  it('caps health relief per group, with higher limits for seniors', () => {
    const t = premiumTax({ income: 2400000, age: 34, termPremium: 30000, healthPremium: 40000, parentsPremium: 60000, eldestParentAge: 66 });
    expect(t.healthDeduction).toBe(25000 + 50000);
    expect(t.healthAboveLimit).toBe(15000 + 10000);
    expect(t.healthSaving).toBe(Math.round(75000 * 0.312));
    expect(t.lifeDeduction).toBe(30000);
    expect(t.lifeSavingUpTo).toBe(Math.round(30000 * 0.312));
    // Parents under 60 and a 60+ policyholder.
    expect(premiumTax({ income: 2400000, age: 61, termPremium: 0, healthPremium: 60000, parentsPremium: 60000, eldestParentAge: 58 }).healthDeduction).toBe(50000 + 25000);
  });

  it('no relief inside the rebate; no parents limit without parents', () => {
    const t = premiumTax({ income: 600000, age: 30, termPremium: 12000, healthPremium: 15000, parentsPremium: 0, eldestParentAge: null });
    expect(t.marginalRatePct).toBe(0);
    expect(t.healthSaving + t.lifeSavingUpTo).toBe(0);
  });
});
