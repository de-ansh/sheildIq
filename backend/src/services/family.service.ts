import {
  ActuarialService,
  ASSUMPTIONS,
  criticalIllnessRatePerLakh,
  formatINR,
  healthRatePerLakh,
  householdOf,
  isTobacco,
  medicalLoading,
  personalAccidentRatePerLakh,
  roundUpTo,
  suggestedCover,
  termRatePerLakh,
  type StrategyProfile,
  type StrategyResult,
} from './actuarial.service.js';
import { HIGH_RISK_JOB } from './plans.service.js';

export type MemberRole = 'you' | 'spouse' | 'child' | 'parent' | 'sibling';
export type CoverType = 'term_life' | 'health' | 'critical_illness' | 'personal_accident';
export type BuyAs = 'own_policy' | 'family_floater' | 'senior_policy';

/** A feature to check in a health policy's wording, and why it matters for this family. */
export interface LookFor {
  feature: string;
  why: string;
}

export interface FamilyPolicy {
  id: string;
  type: CoverType;
  buyAs: BuyAs;
  /** Member ids this policy covers. */
  covers: string[];
  cover: number;
  existing: number;
  /** Estimated yearly premium to close the gap; 0 when existing cover already meets it. */
  annualPremium: number;
  status: 'buy' | 'covered';
  priority: 'essential' | 'recommended' | 'optional';
  /** True when the premium is already counted in the household strategy (Dashboard, Affordability). */
  inStrategy: boolean;
  reason: string;
  lookFor: LookFor[];
}

export interface FamilyMember {
  id: string;
  role: MemberRole;
  age: number | null;
  /** True when the age is a stand-in (e.g. spouse age not given). */
  ageAssumed: boolean;
  earning: boolean;
  /** Covers this person doesn't need, with why. */
  notNeeded: { type: CoverType; reason: string }[];
  notes: string[];
}

export interface FamilyPlan {
  members: FamilyMember[];
  policies: FamilyPolicy[];
  /** Premiums to buy everything marked 'buy'. */
  totalAnnualPremium: number;
  /** Part of the total not already in the household strategy's premium estimate. */
  additionalAnnualPremium: number;
  /** Total as % of the household's gross income. */
  shareOfHouseholdIncome: number;
}

const round100 = (n: number) => Math.round(n / 100) * 100;
const premium = (cover: number, ratePerLakh: number) => round100((cover / 100000) * ratePerLakh);
// Homemaker term cover: insurers commonly allow ₹25-50L, often capped at half the earning partner's cover.
const HOMEMAKER_COVER = { youngChildren: 5000000, otherwise: 2500000 };
const MIN_TERM = 2500000;

/** Health-policy features to look for, from who the policy covers (folds in tracker #38). */
function floaterLookFor(p: StrategyProfile, youngestChild: number | null, spouseAge: number): LookFor[] {
  const list: LookFor[] = [];
  if (p.cityTier === 'Tier 1 (Metro)') {
    list.push({ feature: 'No room-rent cap (or "single private room")', why: 'Metro room rents often exceed a 1%-of-cover cap, and a capped room cuts the whole bill proportionately.' });
  }
  if (p.healthConditions.length > 0) {
    list.push({ feature: 'Pre-existing disease wait of 1-2 years, or a wait-reduction add-on', why: 'Your conditions are only covered after this wait; the standard is up to 3 years.' });
  }
  if (p.maritalStatus === 'Married' && Math.min(p.age, spouseAge) < 35) {
    list.push({ feature: 'Maternity and newborn cover, if you plan a child', why: 'Maternity has a 2-4 year wait, so it must be bought well before a pregnancy.' });
  }
  if (youngestChild !== null && youngestChild < 5) {
    list.push({ feature: 'Newborn and vaccination cover', why: 'Young children claim most often for routine care and infections.' });
  }
  list.push({ feature: 'Restoration (sum insured refilled after a claim)', why: 'One large claim shouldn\'t leave the rest of the family uncovered for the year.' });
  list.push({ feature: 'No co-pay', why: 'A co-pay makes you pay a share of every claim; it is avoidable below 60.' });
  return list;
}

const SENIOR_LOOK_FOR: LookFor[] = [
  { feature: 'Co-pay of 20% or less', why: 'Most senior plans have a co-pay; above 20% the family pays too much of each bill.' },
  { feature: 'Pre-existing disease wait of 1-2 years', why: 'Parents usually have conditions like BP or diabetes; a 3-year wait leaves them uncovered for those.' },
  { feature: 'No disease-wise sub-limits (cataract, knee replacement)', why: 'These are the most common senior surgeries and are often capped far below cost.' },
  { feature: 'Room rent: single private room', why: 'Senior hospital stays are longer, so room caps cost more.' },
];

const INDIVIDUAL_LOOK_FOR = (metro: boolean): LookFor[] => [
  ...(metro ? [{ feature: 'No room-rent cap', why: 'Metro room rents often exceed capped amounts.' }] : []),
  { feature: 'No co-pay', why: 'Avoidable for younger members.' },
];

/** What each person in the household should hold, how to buy it, and what it costs. */
export function planFamily(p: StrategyProfile, s: StrategyResult): FamilyPlan {
  const household = householdOf(p);
  const married = p.maritalStatus === 'Married';
  const spouseAge = p.spouseAge || p.age;
  const loading = medicalLoading(p);
  const tobacco = isTobacco(p.lifestyleRisks);
  const highRisk = HIGH_RISK_JOB.test(p.occupation) || p.lifestyleRisks.some(r => /hobb|travel/i.test(r));
  const floaterChildren = household.children.filter(a => a === null || a < 25).length;

  const members: FamilyMember[] = [{ id: 'you', role: 'you', age: p.age, ageAssumed: false, earning: p.income > 0, notNeeded: [], notes: [] }];
  const policies: FamilyPolicy[] = [];
  const add = (x: Omit<FamilyPolicy, 'status' | 'annualPremium'> & { annualPremium: number }) =>
    policies.push({ ...x, status: x.cover > x.existing ? 'buy' : 'covered', annualPremium: x.cover > x.existing ? x.annualPremium : 0 });

  // ---- You: the household strategy already sizes these.
  if (s.life.totalNeed === 0) {
    members[0].notNeeded.push({ type: 'term_life', reason: 'Nobody depends on your income and you have no loans, so there is nothing for term cover to replace yet.' });
  } else add({
    id: 'you-term', type: 'term_life', buyAs: 'own_policy', covers: ['you'], cover: Math.max(s.life.totalNeed, p.existingLifeCover), existing: p.existingLifeCover,
    annualPremium: s.picks.termPremium, priority: 'essential', inStrategy: true, lookFor: [],
    reason: `Replaces your income, clears ${formatINR(s.life.liabilities)} of loans and funds education if you die.`,
  });
  add({
    id: 'you-ci', type: 'critical_illness', buyAs: 'own_policy', covers: ['you'], cover: s.criticalIllness.recommended, existing: s.criticalIllness.existing,
    annualPremium: premium(s.criticalIllness.gap, criticalIllnessRatePerLakh(p.age, tobacco) * loading), priority: 'recommended', inStrategy: false, lookFor: [],
    reason: 'A lump sum if a serious illness stops you working; health insurance only pays the hospital.',
  });
  add({
    id: 'you-pa', type: 'personal_accident', buyAs: 'own_policy', covers: ['you'], cover: s.personalAccident.recommended, existing: s.personalAccident.existing,
    annualPremium: premium(s.personalAccident.gap, personalAccidentRatePerLakh(highRisk)), priority: highRisk ? 'essential' : 'recommended', inStrategy: false, lookFor: [],
    reason: 'Pays if an accident disables you, which term insurance does not.',
  });

  // ---- Spouse
  if (married) {
    const earning = p.spouseIncome > 0;
    members.push({
      id: 'spouse', role: 'spouse', age: spouseAge, ageAssumed: !p.spouseAge, earning,
      notNeeded: earning ? [] : [
        { type: 'critical_illness', reason: 'No income to replace; the family health policy pays their treatment.' },
        { type: 'personal_accident', reason: 'No income to replace. Optional if you want a payout for disability costs.' },
      ],
      notes: p.spouseAge ? [] : ['Age not given, so your age is used. Add it in your profile for accurate premiums.'],
    });
    const youngChildren = household.children.some(a => a === null || a < 18);
    if (earning) {
      const hlv = ActuarialService.calculateHLV({
        income: p.spouseIncome, annualContribution: p.spouseIncome * ASSUMPTIONS.incomeContributionShare,
        years: Math.max(1, ASSUMPTIONS.retirementAge - spouseAge), inflation: ASSUMPTIONS.salaryGrowth,
      }).recommendedCover;
      const cover = Math.max(MIN_TERM, roundUpTo(hlv, 500000));
      add({
        id: 'spouse-term', type: 'term_life', buyAs: 'own_policy', covers: ['spouse'], cover, existing: 0,
        annualPremium: premium(cover, termRatePerLakh(spouseAge, false)), priority: household.count > 0 || p.homeLoan > 0 ? 'essential' : 'recommended', inStrategy: false, lookFor: [],
        reason: `Your partner's ${formatINR(p.spouseIncome)} a year supports the household; this replaces it until 60. Their income is not counted in your own cover.`,
      });
      const ci = suggestedCover('critical_illness', p.spouseIncome);
      add({
        id: 'spouse-ci', type: 'critical_illness', buyAs: 'own_policy', covers: ['spouse'], cover: ci, existing: 0,
        annualPremium: premium(ci, criticalIllnessRatePerLakh(spouseAge, false)), priority: 'recommended', inStrategy: false, lookFor: [],
        reason: 'Replaces their income if a serious illness stops them working.',
      });
      const pa = suggestedCover('personal_accident', p.spouseIncome);
      add({
        id: 'spouse-pa', type: 'personal_accident', buyAs: 'own_policy', covers: ['spouse'], cover: pa, existing: 0,
        annualPremium: premium(pa, personalAccidentRatePerLakh(false)), priority: 'optional', inStrategy: false, lookFor: [],
        reason: 'Pays if an accident disables them.',
      });
    } else {
      const cover = Math.min(youngChildren ? HOMEMAKER_COVER.youngChildren : HOMEMAKER_COVER.otherwise, Math.max(MIN_TERM, roundUpTo(s.life.totalNeed / 2, 500000)));
      add({
        id: 'spouse-term', type: 'term_life', buyAs: 'own_policy', covers: ['spouse'], cover, existing: 0,
        annualPremium: premium(cover, termRatePerLakh(spouseAge, false)), priority: youngChildren ? 'recommended' : 'optional', inStrategy: false, lookFor: [],
        reason: youngChildren
          ? 'Childcare and running the home would cost money to replace if your partner died. Insurers offer homemaker cover, often up to half your own cover.'
          : 'Optional: without young children, a homemaker\'s cover mainly pays final costs and gives you time to adjust.',
      });
    }
  }

  // ---- Children and siblings
  household.children.forEach((age, i) => {
    const notes: string[] = [];
    if (age !== null && age < 1) notes.push('Add them to the family policy within the window your plan allows (day 1 with newborn cover, otherwise from 91 days).');
    if (age !== null && age >= 18 && age < 25) notes.push('Most family policies cover children only until 25; plan their own policy before then.');
    members.push({
      id: `child-${i + 1}`, role: 'child', age, ageAssumed: false, earning: false, notes,
      notNeeded: [{ type: 'term_life', reason: 'Children have no income to replace; their education is funded inside your own term cover.' }],
    });
  });
  household.siblings.forEach((age, i) => {
    members.push({
      id: `sibling-${i + 1}`, role: 'sibling', age, ageAssumed: false, earning: false,
      notNeeded: [{ type: 'term_life', reason: 'No income to replace; their education is funded inside your own term cover.' }],
      notes: ['Most family floaters don\'t accept siblings, so they need their own policy.'],
    });
  });

  // Health: one floater for you, your spouse and children under 25 (the strategy's own figures).
  const floaterIds = ['you', ...(married ? ['spouse'] : []), ...members.filter(m => m.role === 'child' && (m.age === null || m.age < 25)).map(m => m.id)];
  const youngest = household.children.filter((a): a is number => a !== null).sort((a, b) => a - b)[0] ?? null;
  add({
    id: 'family-health', type: 'health', buyAs: floaterIds.length > 1 ? 'family_floater' : 'own_policy', covers: floaterIds,
    cover: Math.max(s.health.recommendedCover, p.existingHealthCover), existing: p.existingHealthCover, annualPremium: s.picks.healthPremium,
    priority: 'essential', inStrategy: true, lookFor: floaterLookFor(p, youngest, spouseAge),
    reason: (floaterIds.length > 1
      ? `One shared policy for ${floaterIds.length} people is cheaper than separate ones; sized for a ${floaterIds.length}-member family in your city.`
      : 'Hospital bills in your city, sized for one person.') +
      // Name the structure the premium assumes, so a low figure isn't mistaken for a full new policy.
      (s.picks.healthId === 'HL-TOPUP-ONLY'
        ? ` The premium is for the cheapest route: a ${formatINR(s.health.gap)} super top-up above the ${formatINR(p.existingHealthCover)} you already hold.`
        : s.picks.healthId === 'HL-BASE-TOPUP'
          ? ` The premium assumes a ${formatINR(s.health.basePolicy)} base policy plus a super top-up, cheaper than one large policy.`
          : ''),
  });

  // Children over 25 and siblings: individual health policies, priced at their own age.
  for (const m of members.filter(x => (x.role === 'child' && x.age !== null && x.age >= 25) || x.role === 'sibling')) {
    const age = m.age ?? 25;
    const cover = ActuarialService.planHealthCover({ adults: 1, children: 0, cityTier: p.cityTier, employerCover: 0, existingCover: 0, risks: [] }, age).recommendedCover;
    add({
      id: `${m.id}-health`, type: 'health', buyAs: 'own_policy', covers: [m.id], cover, existing: 0,
      annualPremium: premium(cover, healthRatePerLakh(age, p.cityTier)), priority: 'essential', inStrategy: false,
      lookFor: INDIVIDUAL_LOOK_FOR(p.cityTier === 'Tier 1 (Metro)'),
      reason: m.role === 'child' ? 'Over 25, so no longer on the family policy.' : 'Not eligible for your family policy with most insurers.',
    });
  }

  // ---- Parents: the strategy's senior policy, with the shared-vs-separate trade-off spelled out.
  household.parents.forEach((age, i) => {
    members.push({
      id: `parent-${i + 1}`, role: 'parent', age, ageAssumed: false, earning: false,
      notNeeded: [{ type: 'term_life', reason: 'Term cover is for replacing an earner\'s income; at their age it is also very costly.' }],
      notes: [],
    });
  });
  if (s.parentsHealth) {
    const ph = s.parentsHealth;
    const parentIds = members.filter(m => m.role === 'parent').map(m => m.id);
    const lookFor = [...SENIOR_LOOK_FOR];
    if (parentIds.length > 1) {
      const each = ActuarialService.planHealthCover({ adults: 1, children: 0, cityTier: p.cityTier, employerCover: 0, existingCover: 0, risks: [] }, ph.eldestAge).recommendedCover;
      lookFor.unshift({
        feature: ph.eldestAge >= 70 ? `Two individual policies of about ${formatINR(each)} each` : 'One senior floater for both, or individual policies',
        why: ph.eldestAge >= 70
          ? 'Over 70, one parent\'s large claim can use up a shared policy and leave the other uncovered.'
          : `A shared policy is cheaper; individual ones (about ${formatINR(each)} each) stop one parent's claim using up the other's cover.`,
      });
    }
    add({
      id: 'parents-health', type: 'health', buyAs: 'senior_policy', covers: parentIds, cover: Math.max(ph.recommendedCover, ph.existing), existing: ph.existing,
      annualPremium: ph.estimatedAnnualPremium, priority: 'essential', inStrategy: true, lookFor,
      reason: `A separate senior policy, sized for ${parentIds.length === 1 ? 'a parent' : `${parentIds.length} parents`} up to age ${ph.eldestAge}; parents can't stay on most family policies and their claims would use up yours. Premiums for parents qualify for a higher tax deduction (Section 80D).`,
    });
  }

  const toBuy = policies.filter(x => x.status === 'buy');
  const total = toBuy.reduce((sum, x) => sum + x.annualPremium, 0);
  const householdIncome = p.income + p.spouseIncome;
  return {
    members,
    policies,
    totalAnnualPremium: total,
    additionalAnnualPremium: toBuy.filter(x => !x.inStrategy).reduce((sum, x) => sum + x.annualPremium, 0),
    shareOfHouseholdIncome: householdIncome > 0 ? Math.round((total / householdIncome) * 1000) / 10 : 0,
  };
}
