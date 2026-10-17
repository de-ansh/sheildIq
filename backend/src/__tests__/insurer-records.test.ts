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
