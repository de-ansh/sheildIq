import { describe, it, expect } from 'vitest';
import { HEALTH_INSURER_RECORDS, LIFE_INSURER_RECORDS } from '../services/insurer-records.js';

// Guards against typos when the table is refreshed from the next IRDAI handbook.
describe('IRDAI insurer records', () => {
  it('life records are valid percentages, ranked by claims paid, with unique insurers', () => {
    for (const r of LIFE_INSURER_RECORDS) {
      expect(r.paidByNumberPct).toBeGreaterThan(50);
      expect(r.paidByNumberPct).toBeLessThanOrEqual(100);
      expect(r.paidByAmountPct).toBeLessThanOrEqual(100);
      expect(r.claimsHandled).toBeGreaterThanOrEqual(1000);
      expect(r.settledWithin30DaysPct).toBeGreaterThan(50);
      expect(r.settledWithin30DaysPct).toBeLessThanOrEqual(100);
    }
    const pcts = LIFE_INSURER_RECORDS.map(r => r.paidByNumberPct);
    expect(pcts).toEqual([...pcts].sort((a, b) => b - a));
    expect(new Set(LIFE_INSURER_RECORDS.map(r => r.insurer)).size).toBe(LIFE_INSURER_RECORDS.length);
  });

  it('service figures are within plausible ranges for every insurer', () => {
    for (const r of [...LIFE_INSURER_RECORDS, ...HEALTH_INSURER_RECORDS]) {
      expect(r.solvencyRatio, r.insurer).toBeGreaterThanOrEqual(1.5); // IRDAI's minimum; below it an insurer is in breach
      expect(r.solvencyRatio, r.insurer).toBeLessThan(10);
      expect(r.complaintsPer10kPolicies, r.insurer).toBeGreaterThan(0);
      expect(r.complaintsPer10kPolicies, r.insurer).toBeLessThan(200);
      expect(Number.isInteger(r.offices) && r.offices > 0, r.insurer).toBe(true);
    }
  });

  it('three-year figures are plausible and close to the latest year', () => {
    for (const r of LIFE_INSURER_RECORDS) {
      const t = r.threeYear;
      for (const v of [t.paidByNumberPct, t.paidByAmountPct, t.settledWithin30DaysPct]) expect(v, r.insurer).toBeGreaterThan(50), expect(v, r.insurer).toBeLessThanOrEqual(100);
      expect(Math.abs(t.paidByAmountPct - r.paidByAmountPct), r.insurer).toBeLessThan(10); // a typo would show as a jump
      expect(t.complaintsPer10kPolicies, r.insurer).toBeGreaterThan(0);
    }
    for (const r of HEALTH_INSURER_RECORDS) {
      const t = r.threeYear;
      expect(t.paidPct + t.repudiatedPct, r.insurer).toBeLessThanOrEqual(100);
      expect(Math.abs(t.paidPct - r.paidPct), r.insurer).toBeLessThan(10);
      expect(t.complaintsPer10kPolicies, r.insurer).toBeGreaterThan(0);
    }
  });

  it('health records add up and are ranked by claims paid', () => {
    for (const r of HEALTH_INSURER_RECORDS) {
      expect(r.paidPct + r.repudiatedPct).toBeLessThanOrEqual(100);
      expect(r.incurredClaimsRatioPct).toBeGreaterThan(0);
      expect(r.claimsHandled).toBeGreaterThanOrEqual(10000);
    }
    const pcts = HEALTH_INSURER_RECORDS.map(r => r.paidPct);
    expect(pcts).toEqual([...pcts].sort((a, b) => b - a));
  });
});

describe('general insurers\' retail health records', () => {
  it('are plausible, unique and largest first', async () => {
    const { GENERAL_HEALTH_INSURER_RECORDS: g } = await import('../services/insurer-records.js');
    expect(g.length).toBeGreaterThanOrEqual(10);
    expect(new Set(g.map(r => r.insurer)).size).toBe(g.length);
    const sizes = g.map(r => r.retailHealthPremiumCr);
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
    for (const r of g) {
      expect(r.retailHealthPremiumCr, r.insurer).toBeGreaterThanOrEqual(100);
      for (const v of [r.retailClaimsRatioPct, r.retailClaimsRatioPct3y]) expect(v, r.insurer).toBeGreaterThan(30), expect(v, r.insurer).toBeLessThan(200);
      // Only government-owned insurers operate below the 1.5 minimum (under regulatory forbearance).
      if (!r.governmentOwned) expect(r.solvencyRatio, r.insurer).toBeGreaterThanOrEqual(1.5);
      expect(r.offices, r.insurer).toBeGreaterThan(0);
    }
  });
});
