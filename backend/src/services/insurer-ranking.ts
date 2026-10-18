import type { StrategyProfile, StrategyResult } from './actuarial.service.js';
import { HEALTH_INSURER_RECORDS, LIFE_INSURER_RECORDS, type HealthInsurerRecord, type LifeInsurerRecord } from './insurer-records.js';

/** What a ranking weighs. Stable ids, so the app can label them in any language. */
export type MeasureId = 'claimValuePaid' | 'claimsPaid' | 'paidWithin30Days' | 'claimsRejected' | 'complaints' | 'solvency' | 'offices';
/** Why this household's weights differ from the defaults. */
export type RankingAdjustment = 'largeCover' | 'parents' | 'conditions' | 'smallerCity';

export interface MeasureValue {
  id: MeasureId;
  value: number;
}

export interface Ranked {
  /** 0-100 on fixed scales (see the measure lists below); not a probability. */
  score: number;
  rank: number;
  /** Up to two measures where the insurer is strong (scale score 80+), most weighty first. */
  strengths: MeasureValue[];
  /** The weakest measure, when it is in the bottom half of its scale. */
  watchOut: MeasureValue | null;
}

export interface InsurerRanking {
  life: (LifeInsurerRecord & Ranked)[];
  health: (HealthInsurerRecord & Ranked)[];
  adjustments: RankingAdjustment[];
}

interface Measure<R> {
  id: MeasureId;
  weight: number;
  value: (r: R) => number;
  /** Scale: 0 at `worst`, 100 at `best` (either direction), clamped. Fixed, so a 0.2-point gap between two strong
   *  insurers stays small instead of being stretched to "best vs worst" as a min-max scale would. */
  worst: number;
  best: number;
}

const scale = <R>(m: Measure<R>, r: R) => Math.min(1, Math.max(0, (m.value(r) - m.worst) / (m.best - m.worst)));

// Solvency earns nothing past 2.0: beyond a safe margin, spare capital doesn't make claims more likely to be paid.
const SOLVENCY_FLOOR = 1.5; // IRDAI minimum
const SOLVENCY_SAFE = 2.0;
const LARGE_COVER = 1_00_00_000; // ₹1 Cr: big claims are the ones most often investigated and refused

function lifeMeasures(adj: RankingAdjustment[]): Measure<LifeInsurerRecord>[] {
  return [
    { id: 'claimValuePaid', weight: adj.includes('largeCover') ? 40 : 30, value: r => r.threeYear.paidByAmountPct, worst: 90, best: 99 },
    { id: 'claimsPaid', weight: 10, value: r => r.threeYear.paidByNumberPct, worst: 97, best: 99.5 },
    { id: 'paidWithin30Days', weight: 20, value: r => r.threeYear.settledWithin30DaysPct, worst: 85, best: 100 },
    { id: 'complaints', weight: 20, value: r => r.threeYear.complaintsPer10kPolicies, worst: 20, best: 3 },
    { id: 'solvency', weight: 15, value: r => r.solvencyRatio, worst: SOLVENCY_FLOOR, best: SOLVENCY_SAFE },
    ...officesMeasure<LifeInsurerRecord>(adj),
  ];
}

function healthMeasures(adj: RankingAdjustment[]): Measure<HealthInsurerRecord>[] {
  return [
    { id: 'claimsPaid', weight: 30, value: r => r.threeYear.paidPct, worst: 75, best: 95 },
    // Senior members and people with pre-existing conditions face more rejections.
    { id: 'claimsRejected', weight: adj.includes('parents') || adj.includes('conditions') ? 35 : 25, value: r => r.threeYear.repudiatedPct, worst: 15, best: 3 },
    { id: 'complaints', weight: 20, value: r => r.threeYear.complaintsPer10kPolicies, worst: 60, best: 15 },
    { id: 'solvency', weight: 15, value: r => r.solvencyRatio, worst: SOLVENCY_FLOOR, best: SOLVENCY_SAFE },
    ...officesMeasure<HealthInsurerRecord>(adj),
  ];
}

// Outside metros a nearby branch helps with paperwork and claims; in metros every insurer is reachable.
const officesMeasure = <R extends { offices: number }>(adj: RankingAdjustment[]): Measure<R>[] =>
  adj.includes('smallerCity') ? [{ id: 'offices', weight: 10, value: r => r.offices, worst: 50, best: 500 }] : [];

function rank<R extends { insurer: string }>(records: R[], measures: Measure<R>[]): (R & Ranked)[] {
  const total = measures.reduce((s, m) => s + m.weight, 0);
  return records
    .map(r => {
      const parts = measures.map(m => ({ id: m.id, value: m.value(r), s: scale(m, r), weight: m.weight }));
      const strengths = parts
        .filter(p => p.s >= 0.8)
        .sort((a, b) => b.weight * b.s - a.weight * a.s)
        .slice(0, 2)
        .map(({ id, value }) => ({ id, value }));
      const weakest = parts.reduce((a, b) => (b.s < a.s ? b : a));
      return {
        ...r,
        score: Math.round((parts.reduce((s, p) => s + p.weight * p.s, 0) / total) * 100),
        strengths,
        watchOut: weakest.s < 0.5 ? { id: weakest.id, value: weakest.value } : null,
      };
    })
    .sort((a, b) => b.score - a.score || a.insurer.localeCompare(b.insurer))
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

/** Insurers ranked on IRDAI claim and service records, weighted for this household. Same input, same order. */
export function rankInsurers(profile: Pick<StrategyProfile, 'cityTier' | 'healthConditions'>, strategy: Pick<StrategyResult, 'life' | 'parentsHealth'>): InsurerRanking {
  const adjustments: RankingAdjustment[] = [];
  if (strategy.life.totalNeed >= LARGE_COVER) adjustments.push('largeCover');
  if (strategy.parentsHealth) adjustments.push('parents');
  if (profile.healthConditions.length > 0) adjustments.push('conditions');
  if (profile.cityTier !== 'Tier 1 (Metro)') adjustments.push('smallerCity');
  return {
    life: rank(LIFE_INSURER_RECORDS, lifeMeasures(adjustments)),
    health: rank(HEALTH_INSURER_RECORDS, healthMeasures(adjustments)),
    adjustments,
  };
}
