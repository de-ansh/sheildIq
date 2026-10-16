import {
  ASSUMPTIONS,
  criticalIllnessRatePerLakh,
  formatINR,
  healthRatePerLakh,
  isTobacco,
  personalAccidentRatePerLakh,
  suggestedCover,
  termRatePerLakh,
  type StrategyProfile,
  type StrategyResult,
} from './actuarial.service.js';

export type InsuranceType = 'term_life' | 'health' | 'critical_illness' | 'personal_accident';

/** How an option is priced against the household's need. */
type Pricing = 'full' | 'base_topup' | 'topup_only';

export interface PlanProduct {
  id: string;
  type: InsuranceType;
  name: string;
  insurer: string;
  structure: string;
  /** Premium relative to the plain version of this cover type. */
  multiplier: number;
  pricing: Pricing;
  features: string[];
  tradeOffs: string[];
  exclusions: string[];
  waitingPeriod: string;
  claimSettlementRatio: number;
  clarityScore: number;
  bestFor: string;
}

// Sample catalog. Insurer names are fictional and figures illustrative, so no real company is attributed numbers it didn't publish.
export const PLAN_PRODUCTS: PlanProduct[] = [
  // ---- Term life
  {
    id: 'TL-BASIC', type: 'term_life', name: 'Pure Level Term', insurer: 'Aarambh Life (sample)', structure: 'Level cover until age 60', multiplier: 1, pricing: 'full',
    features: ['Fixed sum assured until 60', 'Lowest premium per ₹1L of cover', 'Lump-sum payout to nominee'],
    tradeOffs: ['No payout if you outlive the term', 'Cover does not grow with inflation'],
    exclusions: ['Suicide within 12 months', 'Undisclosed medical history or tobacco use'],
    waitingPeriod: 'None (accidental and natural death covered from day one)', claimSettlementRatio: 99.1, clarityScore: 95,
    bestFor: 'Most families: maximum cover for the lowest cost',
  },
  {
    id: 'TL-RIDERS', type: 'term_life', name: 'Term + Accident & Waiver Riders', insurer: 'Suraksha Life (sample)', structure: 'Level term with accidental death and waiver of premium riders', multiplier: 1.15, pricing: 'full',
    features: ['Extra payout on accidental death', 'Future premiums waived on critical illness or disability', 'Level cover until 60'],
    tradeOffs: ['About 15% costlier than plain term', 'Rider benefits capped at the base sum assured'],
    exclusions: ['Suicide within 12 months', 'Hazardous activities without declaration', 'Injury under influence of alcohol or drugs'],
    waitingPeriod: 'None; waiver rider has a 90-day illness waiting period', claimSettlementRatio: 98.7, clarityScore: 90,
    bestFor: 'Sole earners who want protection if they cannot keep paying premiums',
  },
  {
    id: 'TL-INCREASING', type: 'term_life', name: 'Increasing Cover Term', insurer: 'NovaShield Life (sample)', structure: 'Cover rises 5% a year, up to 2x', multiplier: 1.35, pricing: 'full',
    features: ['Sum assured grows 5% each year', 'Keeps pace with rising income and inflation', 'Level premium'],
    tradeOffs: ['About 35% costlier than plain term', 'Buying extra level cover later can be cheaper while young'],
    exclusions: ['Suicide within 12 months', 'Undisclosed medical history'],
    waitingPeriod: 'None', claimSettlementRatio: 98.2, clarityScore: 88,
    bestFor: 'Young earners whose family needs will grow',
  },
  {
    id: 'TL-ROP', type: 'term_life', name: 'Term with Return of Premium', insurer: 'Kavach Life (sample)', structure: 'Premiums refunded if you survive the term', multiplier: 2.6, pricing: 'full',
    features: ['All premiums returned at maturity', 'Same death cover as level term'],
    tradeOffs: ['Roughly 2.5–3x the premium of plain term', 'Refund is not inflation-adjusted; investing the difference usually returns more'],
    exclusions: ['Suicide within 12 months', 'Surrender in early years forfeits most premiums'],
    waitingPeriod: 'None', claimSettlementRatio: 97.9, clarityScore: 82,
    bestFor: 'People who will only buy insurance if they get money back',
  },
  // ---- Health
  {
    id: 'HL-FLOATER', type: 'health', name: 'Family Floater', insurer: 'Sehat General (sample)', structure: 'One policy for the full recommended cover', multiplier: 1, pricing: 'full',
    features: ['Single sum insured shared by the family', 'Cashless network hospitals', 'Pre and post hospitalisation 60/90 days'],
    tradeOffs: ['Room rent capped at 1% of sum insured', 'Costlier than a base + top-up for large covers'],
    exclusions: ['Cosmetic treatment', 'Maternity', 'Self-inflicted injury'],
    waitingPeriod: '30 days initial; 3 years for pre-existing diseases', claimSettlementRatio: 96.4, clarityScore: 86,
    bestFor: 'Families wanting one simple policy',
  },
  {
    id: 'HL-BASE-TOPUP', type: 'health', name: 'Base Policy + Super Top-Up', insurer: 'Arogya Shield (sample)', structure: 'Modest base policy plus a super top-up above it', multiplier: 1, pricing: 'base_topup',
    features: ['Large total cover at a much lower premium', 'Top-up pays once yearly bills cross the base amount', 'Two policies can be renewed independently'],
    tradeOffs: ['Two policies to manage and claim on', 'Top-up waiting periods restart if bought separately'],
    exclusions: ['Cosmetic treatment', 'Maternity in the top-up', 'Claims below the deductible (paid by the base policy)'],
    waitingPeriod: '30 days initial; 3 years for pre-existing diseases on each policy', claimSettlementRatio: 95.8, clarityScore: 84,
    bestFor: 'Anyone needing cover above ₹10L at the lowest cost',
  },
  {
    id: 'HL-COMPREHENSIVE', type: 'health', name: 'Comprehensive Floater', insurer: 'Prana Health (sample)', structure: 'No room-rent cap, 100% restore, OPD cover', multiplier: 1.3, pricing: 'full',
    features: ['No room-rent or disease sub-limits', '100% sum insured restored after a claim', 'OPD and annual health check-up'],
    tradeOffs: ['About 30% costlier than a basic floater', 'OPD benefit is capped and often under-used'],
    exclusions: ['Cosmetic treatment', 'Experimental treatment'],
    waitingPeriod: '30 days initial; 2 years for pre-existing diseases', claimSettlementRatio: 97.2, clarityScore: 91,
    bestFor: 'Metro families who want the fewest claim surprises',
  },
  {
    id: 'HL-TOPUP-ONLY', type: 'health', name: 'Super Top-Up on Existing Cover', insurer: 'Arogya Shield (sample)', structure: 'Top-up with deductible equal to your current cover', multiplier: 1, pricing: 'topup_only',
    features: ['Closes the gap without replacing your current policy', 'Cheapest way to add large cover', 'Deductible applies per year, not per claim'],
    tradeOffs: ['Only useful if you keep your existing base policy', 'Deductible must be met before it pays'],
    exclusions: ['Claims within the deductible', 'Maternity'],
    waitingPeriod: '30 days initial; 3 years for pre-existing diseases', claimSettlementRatio: 95.8, clarityScore: 85,
    bestFor: 'People who already hold a personal health policy',
  },
  // ---- Critical illness
  {
    id: 'CI-LUMPSUM', type: 'critical_illness', name: 'Lump-Sum CI (35+ illnesses)', insurer: 'Raksha Health (sample)', structure: 'One-time payout on diagnosis', multiplier: 1, pricing: 'full',
    features: ['Pays the full sum on diagnosis, regardless of bills', 'Covers cancer, heart attack, stroke, kidney failure and more', 'Money can replace lost income'],
    tradeOffs: ['Pays once, then the policy ends', 'Survival period of 30 days after diagnosis'],
    exclusions: ['Illnesses diagnosed in the first 90 days', 'Pre-existing conditions'],
    waitingPeriod: '90 days; 30-day survival period', claimSettlementRatio: 95.1, clarityScore: 87,
    bestFor: 'Earners whose family would struggle without their income during treatment',
  },
  {
    id: 'CI-COMPREHENSIVE', type: 'critical_illness', name: 'Multi-Claim CI (60+ illnesses)', insurer: 'Sanjeevani General (sample)', structure: 'Covers early and severe stages, multiple claims', multiplier: 1.4, pricing: 'full',
    features: ['Pays on early-stage diagnosis too', 'Several claims across illness groups', 'Premium waived after the first claim'],
    tradeOffs: ['About 40% costlier than basic lump-sum CI', 'Early-stage payouts are a fraction of the sum assured'],
    exclusions: ['Illnesses diagnosed in the first 90 days', 'Pre-existing conditions'],
    waitingPeriod: '90 days; 15-day survival period', claimSettlementRatio: 94.6, clarityScore: 83,
    bestFor: 'People with a family history of serious illness',
  },
  {
    id: 'CI-RIDER', type: 'critical_illness', name: 'CI Rider on Term Plan', insurer: 'Suraksha Life (sample)', structure: 'Add-on to a term life policy', multiplier: 0.7, pricing: 'full',
    features: ['About 30% cheaper than standalone CI', 'Single policy to manage with your term plan'],
    tradeOffs: ['Ends when the term plan ends or lapses', 'Cover usually capped at the base term sum assured', 'Fewer illnesses than standalone plans'],
    exclusions: ['Illnesses diagnosed in the first 90 days', 'Pre-existing conditions'],
    waitingPeriod: '90 days; 30-day survival period', claimSettlementRatio: 98.7, clarityScore: 86,
    bestFor: 'Tight budgets that are already buying term life',
  },
  {
    id: 'CI-CANCER-HEART', type: 'critical_illness', name: 'Cancer & Heart Cover', insurer: 'Hriday Life (sample)', structure: 'Targets the two most common critical illnesses', multiplier: 0.55, pricing: 'full',
    features: ['Stage-based payouts for cancer and heart conditions', 'Lowest-cost illness cover'],
    tradeOffs: ['Does not cover stroke, kidney failure or other major illnesses', 'Narrow definitions; check carefully'],
    exclusions: ['Conditions diagnosed in the first 180 days', 'Pre-existing cancer or heart disease'],
    waitingPeriod: '180 days', claimSettlementRatio: 96.0, clarityScore: 80,
    bestFor: 'Supplementing other cover when budgets are very tight',
  },
  // ---- Personal accident
  {
    id: 'PA-BASIC', type: 'personal_accident', name: 'Accidental Death & Disability', insurer: 'Kshetra General (sample)', structure: 'Lump sum on accidental death or permanent disability', multiplier: 1, pricing: 'full',
    features: ['100% payout on accidental death or total permanent disability', 'Partial payout for partial disability', 'Premium does not rise with age'],
    tradeOffs: ['No income during temporary disability', 'Accidents only, not illness'],
    exclusions: ['Self-inflicted injury', 'Injury under influence of alcohol or drugs', 'Hazardous sports unless declared'],
    waitingPeriod: 'None', claimSettlementRatio: 97.5, clarityScore: 90,
    bestFor: 'Everyone; it is cheap and fills a gap term life does not',
  },
  {
    id: 'PA-INCOME', type: 'personal_accident', name: 'PA + Weekly Disability Income', insurer: 'Kshetra General (sample)', structure: 'Adds weekly income while temporarily disabled', multiplier: 1.35, pricing: 'full',
    features: ['Weekly benefit (about 1% of cover) for up to 100 weeks', 'Accidental death and permanent disability cover', 'Loan EMI protection add-on'],
    tradeOffs: ['About 35% costlier than basic PA', 'Weekly benefit is capped by your declared income'],
    exclusions: ['Self-inflicted injury', 'Injury under influence of alcohol or drugs'],
    waitingPeriod: 'None', claimSettlementRatio: 97.5, clarityScore: 87,
    bestFor: 'Field jobs, frequent travel or risky hobbies',
  },
  {
    id: 'PA-RIDER', type: 'personal_accident', name: 'Accidental Disability Rider', insurer: 'Suraksha Life (sample)', structure: 'Add-on to a term life policy', multiplier: 0.8, pricing: 'full',
    features: ['Cheapest way to add accident cover', 'Managed with your term plan'],
    tradeOffs: ['Ends with the term plan', 'Usually capped at the base sum assured', 'No temporary disability income'],
    exclusions: ['Self-inflicted injury', 'Hazardous activities without declaration'],
    waitingPeriod: 'None', claimSettlementRatio: 98.7, clarityScore: 85,
    bestFor: 'People already buying a term plan',
  },
  {
    id: 'PA-COMPREHENSIVE', type: 'personal_accident', name: 'Comprehensive Accident Cover', insurer: 'Yatra General (sample)', structure: 'Adds hospitalisation, children’s education and repatriation', multiplier: 1.6, pricing: 'full',
    features: ['Accident hospitalisation costs', 'Children’s education benefit on death or disability', 'Worldwide cover'],
    tradeOffs: ['About 60% costlier than basic PA', 'Hospitalisation overlaps with your health policy'],
    exclusions: ['Self-inflicted injury', 'War and nuclear risks'],
    waitingPeriod: 'None', claimSettlementRatio: 96.8, clarityScore: 84,
    bestFor: 'Frequent international travellers with young children',
  },
];

export const TYPE_LABELS: Record<InsuranceType, string> = {
  term_life: 'Term Life',
  health: 'Health',
  critical_illness: 'Critical Illness',
  personal_accident: 'Personal Accident',
};

export interface PlanOption extends Omit<PlanProduct, 'multiplier' | 'pricing'> {
  cover: number;
  annualPremium: number;
  monthlyPremium: number;
  note: string | null;
  recommended: boolean;
}

export interface PlanTypeOptions {
  type: InsuranceType;
  label: string;
  cover: number;
  coverRationale: string;
  options: PlanOption[];
  recommendedId: string | null;
  recommendationReason: string;
}

const HIGH_RISK_JOB = /driver|construction|field|police|army|defen[cs]e|pilot|factory|delivery|mining|electrician|rider/i;
const round100 = (n: number) => Math.round(n / 100) * 100;
const roundUpTo = (n: number, step: number) => Math.ceil(n / step) * step;

export class PlansService {
  /** All four cover types, each with four options quoted for this household and one rule-based recommendation. */
  static optionsFor(p: StrategyProfile, s: StrategyResult): PlanTypeOptions[] {
    const tobacco = isTobacco(p.lifestyleRisks);
    const highRisk = HIGH_RISK_JOB.test(p.occupation) || p.lifestyleRisks.some(r => /hobb|travel/i.test(r));
    const budget = s.affordability.premiumBudget;

    const quote = (product: PlanProduct, cover: number, annualPremium: number, note: string | null = null): PlanOption => {
      const { multiplier, pricing, ...rest } = product; // pricing internals are not exposed to clients
      const annual = round100(annualPremium);
      return { ...rest, cover, annualPremium: annual, monthlyPremium: Math.round(annual / 12), note, recommended: false };
    };
    const products = (type: InsuranceType) => PLAN_PRODUCTS.filter(x => x.type === type);
    const pick = (options: PlanOption[], id: string | null) => options.forEach(o => (o.recommended = o.id === id));

    // ---- Term life: sized to the gap (a ₹25L minimum shows a meaningful quote when there is no gap)
    const termCover = s.life.gap > 0 ? roundUpTo(s.life.gap, 500000) : 2500000;
    const termRate = termRatePerLakh(p.age, tobacco);
    const term = products('term_life').map(x => quote(x, termCover, (termCover / 100000) * termRate * x.multiplier));
    const ridersAffordable = s.affordability.estimatedAnnualPremium * 1.15 <= budget;
    const termPick = ridersAffordable && p.dependents > 0 ? 'TL-RIDERS' : 'TL-BASIC';
    pick(term, s.life.gap > 0 ? termPick : null);

    // ---- Health: each structure closes the same recommended cover in a different way
    const healthRate = healthRatePerLakh(p.age, p.cityTier);
    const target = s.health.recommendedCover;
    const base = s.health.basePolicy;
    const existing = p.existingHealthCover;
    const healthGapCover = Math.max(500000, roundUpTo(s.health.gap, 500000));
    const health = products('health').map(x => {
      if (x.pricing === 'base_topup') {
        const topUp = Math.max(0, target - base);
        return quote(x, target, (base / 100000) * healthRate + (topUp / 100000) * healthRate * 0.25,
          topUp > 0 ? `${formatINR(base)} base + ${formatINR(topUp)} super top-up` : 'Your recommended cover fits in the base policy alone');
      }
      if (x.pricing === 'topup_only') {
        return quote(x, healthGapCover, (healthGapCover / 100000) * healthRate * 0.25,
          existing >= 300000
            ? `Deductible ${formatINR(existing)} (your current cover)`
            : 'Needs a personal base policy of at least ₹3L first');
      }
      return quote(x, target, (target / 100000) * healthRate * x.multiplier);
    });
    let healthPick: string | null;
    let healthReason: string;
    if (s.health.gap === 0) {
      healthPick = null;
      healthReason = 'Your current health cover meets the recommended amount. These are upgrade options.';
    } else if (existing >= 300000) {
      healthPick = 'HL-TOPUP-ONLY';
      healthReason = `You already hold ${formatINR(existing)}. A super top-up above it closes the ${formatINR(s.health.gap)} gap for the lowest premium.`;
    } else if (target > base) {
      healthPick = 'HL-BASE-TOPUP';
      healthReason = `A ${formatINR(base)} base policy plus a super top-up reaches ${formatINR(target)} far more cheaply than one large policy.`;
    } else {
      healthPick = p.cityTier === 'Tier 1 (Metro)' ? 'HL-COMPREHENSIVE' : 'HL-FLOATER';
      healthReason = p.cityTier === 'Tier 1 (Metro)'
        ? 'Metro hospital room rents often exceed 1% caps; a no-cap policy avoids proportionate deductions.'
        : 'A single floater covers your family simply at this cover level.';
    }
    pick(health, healthPick);

    // ---- Critical illness
    const ciCover = suggestedCover('critical_illness', p.income);
    const ciRate = criticalIllnessRatePerLakh(p.age, tobacco);
    const ci = products('critical_illness').map(x => quote(x, ciCover, (ciCover / 100000) * ciRate * x.multiplier));
    const ciStandalone = ci.find(o => o.id === 'CI-LUMPSUM')!;
    const ciAffordable = ciStandalone.annualPremium <= p.income * 0.03;
    const ciPick = ciAffordable ? 'CI-LUMPSUM' : 'CI-RIDER';
    pick(ci, ciPick);

    // ---- Personal accident
    const paCover = suggestedCover('personal_accident', p.income);
    const paRate = personalAccidentRatePerLakh(highRisk);
    const pa = products('personal_accident').map(x => quote(x, paCover, (paCover / 100000) * paRate * x.multiplier));
    const paPick = highRisk ? 'PA-INCOME' : 'PA-BASIC';
    pick(pa, paPick);

    const employerCi = p.employerBenefits.includes('Critical Illness');
    const employerPa = p.employerBenefits.includes('Accident Cover');

    return [
      {
        type: 'term_life', label: TYPE_LABELS.term_life, cover: termCover,
        coverRationale: s.life.gap > 0 ? `Sized to your ${formatINR(s.life.gap)} life cover gap.` : 'You have no life cover gap; quotes shown for an optional ₹25L buffer.',
        options: term, recommendedId: s.life.gap > 0 ? termPick : null,
        recommendationReason: s.life.gap === 0
          ? 'Your existing life cover meets your need.'
          : termPick === 'TL-RIDERS'
            ? 'Accident and waiver-of-premium riders cost about 15% more and keep your family covered if illness stops you paying premiums. Your budget allows it.'
            : 'Plain level term gives the most cover per rupee and keeps you within your premium budget.',
      },
      { type: 'health', label: TYPE_LABELS.health, cover: target, coverRationale: `Recommended family cover for ${p.cityTier}.`, options: health, recommendedId: healthPick, recommendationReason: healthReason },
      {
        type: 'critical_illness', label: TYPE_LABELS.critical_illness, cover: ciCover,
        coverRationale: `About ${ASSUMPTIONS.criticalIllnessIncomeMultiple} years of income, to cover treatment and time off work${employerCi ? '. Employer CI ends with your job, so it is not counted' : ''}.`,
        options: ci, recommendedId: ciPick,
        recommendationReason: ciPick === 'CI-LUMPSUM'
          ? 'A standalone lump-sum plan covers the widest range of illnesses and stays with you regardless of your term plan, at under 3% of your income.'
          : 'Standalone CI would cost over 3% of your income, so a rider on your term plan gives core protection for less.',
      },
      {
        type: 'personal_accident', label: TYPE_LABELS.personal_accident, cover: paCover,
        coverRationale: `About ${ASSUMPTIONS.personalAccidentIncomeMultiple} years of income${employerPa ? '. Employer accident cover ends with your job, so it is not counted' : ''}.`,
        options: pa, recommendedId: paPick,
        recommendationReason: paPick === 'PA-INCOME'
          ? 'Your occupation or lifestyle carries higher accident risk, so weekly income during temporary disability is worth the extra cost.'
          : 'Basic accident cover is inexpensive and pays out where term life does not: permanent disability.',
      },
    ];
  }
}
