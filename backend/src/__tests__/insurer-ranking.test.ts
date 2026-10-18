import { describe, it, expect } from 'vitest';
import { rankInsurers } from '../services/insurer-ranking.js';

const metro = { cityTier: 'Tier 1 (Metro)' as const, healthConditions: [] };
const base = { life: { totalNeed: 50_00_000 }, parentsHealth: null } as Parameters<typeof rankInsurers>[1];

describe('insurer ranking', () => {
  it('ranks every insurer once, best score first, with ranks 1..n', () => {
    const r = rankInsurers(metro, base);
    for (const list of [r.life, r.health]) {
      expect(list.map(x => x.rank)).toEqual(list.map((_, i) => i + 1));
      expect(list.map(x => x.score)).toEqual([...list.map(x => x.score)].sort((a, b) => b - a));
      for (const x of list) expect(x.score).toBeGreaterThanOrEqual(0), expect(x.score).toBeLessThanOrEqual(100);
    }
    expect(r.life).toHaveLength(17);
    expect(r.health).toHaveLength(5);
    expect(r.adjustments).toEqual([]);
  });

  it('weighs claim value, not just claim count: a low payer by value ranks near the bottom with a watch-out', () => {
    const life = rankInsurers(metro, base).life;
    const shriram = life.find(x => x.insurer === 'Shriram Life')!;
    expect(shriram.rank).toBeGreaterThan(14); // was mid-table when sorted by claims paid by number
    expect(shriram.watchOut).toMatchObject({ id: 'claimValuePaid' });
    expect(life[0]).toMatchObject({ insurer: 'HDFC Life' });
    expect(life[0].strengths.length).toBeGreaterThan(0);
  });

  it('does not reward solvency beyond a safe margin', () => {
    const life = rankInsurers(metro, base).life;
    const bajaj = life.find(x => x.insurer === 'Bajaj Allianz Life')!; // solvency 3.59, weaker claims
    const hdfc = life.find(x => x.insurer === 'HDFC Life')!; // solvency 1.94, strong claims
    expect(hdfc.rank).toBeLessThan(bajaj.rank);
  });

  it('adapts weights to the household', () => {
    const plain = rankInsurers(metro, base);
    const withParents = rankInsurers(metro, { ...base, parentsHealth: {} as never });
    expect(withParents.adjustments).toEqual(['parents']);
    expect(rankInsurers({ ...metro, healthConditions: ['asthma'] }, base).adjustments).toEqual(['conditions']);
    // Rejections weigh more with senior members: the lowest-rejection insurer gains on the rest.
    const gain = (r: typeof plain, name: string) => r.health.find(x => x.insurer === name)!.score;
    expect(gain(withParents, 'Care Health') - gain(plain, 'Care Health')).toBeGreaterThan(gain(withParents, 'Star Health') - gain(plain, 'Star Health'));

    const big = rankInsurers({ cityTier: 'Tier 3 (Urban Center)', healthConditions: [] }, { ...base, life: { totalNeed: 2_00_00_000 } as never });
    expect(big.adjustments).toEqual(['largeCover', 'smallerCity']);
    const smallCity = rankInsurers({ cityTier: 'Tier 3 (Urban Center)', healthConditions: [] }, base);
    // LIC has by far the most branches, so branch reach lifts it outside metros.
    expect(smallCity.life.find(x => x.insurer === 'LIC')!.score).toBeGreaterThan(plain.life.find(x => x.insurer === 'LIC')!.score);
    expect(plain.life.flatMap(x => [...x.strengths, x.watchOut]).some(s => s?.id === 'offices')).toBe(false);
  });
});
