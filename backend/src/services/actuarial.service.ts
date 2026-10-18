import { premiumTax, type PremiumTax } from './tax.js';
// All amounts are INR. Assumptions are deliberately simple, documented, and returned to the client.

export const ASSUMPTIONS = {
  retirementAge: 60,
  salaryGrowth: 6, // % a year
  discountRate: 8, // % a year, nominal return on the insurance payout
  incomeContributionShare: 0.7, // share of income that supports the family (rest is personal spend)
  educationCorpusPerChild: 2500000,
  medicalInflationPremium: 3, // medical inflation runs ~3 points above CPI in India
  premiumBudgetShare: 0.1, // protection premiums should stay under ~10% of gross income
  emergencyFundMonths: 6,
  maxEmiShare: 0.4, // Indian lenders' usual cap on EMIs as a share of gross income (FOIR)
  criticalIllnessIncomeMultiple: 3, // lump sum ≈ 3 years of income to cover treatment + recovery time off work
  personalAccidentIncomeMultiple: 5, // accidental death/disability cover ≈ 5 years of income
};

export const CITY_TIERS = ['Tier 1 (Metro)', 'Tier 2 (Emerging Metro)', 'Tier 3 (Urban Center)'] as const;

export const DEPENDENT_RELATIONS = ['child', 'parent', 'sibling'] as const;
export type DependentRelation = (typeof DEPENDENT_RELATIONS)[number];
export interface Dependent {
  relation: DependentRelation;
  age: number;
}
/** Education funding stops once a dependent is past college age. */
export const EDUCATION_AGE_LIMIT = 22;
export type CityTier = (typeof CITY_TIERS)[number];

export interface HLVInput {
  income: number;
  years: number;
  inflation: number;
  existingCover?: number;
  /** Yearly amount to replace; defaults to the earner's contribution (70% of income). */
  annualContribution?: number;
}

/**
 * Yearly amount the family would lose if the earner died: their contribution, less a working partner's take-home.
 * Single-income households are unaffected; household expenses above the earner's contribution set the bar instead.
 */
export function incomeToReplace(income: number, spouseIncome: number, annualExpenses: number): number {
  const share = ASSUMPTIONS.incomeContributionShare;
  const earnerContribution = income * share;
  if (spouseIncome <= 0) return earnerContribution;
  const householdNeed = Math.max(annualExpenses, earnerContribution);
  return Math.min(earnerContribution, Math.max(0, householdNeed - spouseIncome * share));
}

export interface HLVResult {
  recommendedCover: number;
  capitalRequirement: number;
  coverageGap: number;
  incomeReplacementWindow: number;
  inflationAdjustedTarget: number;
}

export interface RiskSimulationInput {
  scenario: 'death' | 'illness' | 'disability';
  cost: number;
  years: number;
  inflation: number;
  existingCover?: number;
  age?: number;
  income?: number;
  monthlyExpenses?: number;
}

export interface RiskSimulationResult {
  depletionAge: number;
  yearsFunded: number;
  shortfallAmount: number;
  treatmentCostTotal: number;
  earningCapacityLoss: number;
  totalFinancialImpact: number;
  adequacyIndex: number;
  riskSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendation: string;
}

export interface PortfolioHealthResult {
  score: number;
  rating: 'Optimal' | 'Adequate' | 'Vulnerable' | 'High Risk';
  lifeCoverGap: number;
  healthCoverGap: number;
  redFlags: string[];
  recommendations: string[];
}

export interface SupplementaryCover {
  recommended: number;
  existing: number;
  gap: number;
}

export interface HealthPlanInput {
  adults: number;
  children: number;
  cityTier: CityTier;
  employerCover: number;
  existingCover: number;
  risks: string[];
}

export interface HealthPlanResult {
  recommendedCover: number;
  basePolicy: number;
  superTopUp: number;
  personalCoverNeeded: number;
  estimatedAnnualPremium: number;
  employerDependencyShare: number;
  adequacyScore: number;
  notes: string[];
}

export interface StrategyProfile {
  age: number;
  income: number;
  dependents: number;
  maritalStatus: 'Single' | 'Married';
  occupation: string;
  cityTier: CityTier;
  homeLoan: number;
  otherLoans: number;
  monthlyExpenses: number;
  existingLifeCover: number;
  existingHealthCover: number;
  /** Savings and investments the family could draw on (FDs, mutual funds, stocks; not the home or retirement-locked funds). */
  liquidSavings: number;
  /** Partner's annual gross income; 0 for single-income households. */
  spouseIncome: number;
  /** Partner's age; 0 when not given. */
  spouseAge: number;
  /** People who rely on the earner besides a non-earning spouse. Empty on profiles saved before this existed. */
  dependentDetails: Dependent[];
  /** Health cover the user's dependent parents already hold. */
  parentsHealthCover: number;
  /** Total monthly loan repayments (all loans). */
  loanEmi: number;
  /** Personal critical-illness lump-sum cover (standalone or rider), excluding employer cover. */
  existingCiCover: number;
  /** Personal accident / disability cover, excluding employer cover. */
  existingPaCover: number;
  /** Years left on the home loan; 0 when unknown or there is no home loan. */
  homeLoanYearsLeft: number;
  employerBenefits: string[];
  lifestyleRisks: string[];
  /** The user's own diagnosed conditions; empty when none or not answered. */
  healthConditions: HealthCondition[];
  /** 0 when not given. */
  heightCm: number;
  weightKg: number;
}

export interface Insight {
  severity: 'critical' | 'warning' | 'info';
  /** Stable id of the finding, so the app can show it in the user's language. */
  code: string;
  /** Values for the localized text, already formatted (₹ amounts, percentages). */
  params?: Record<string, string | number>;
  title: string;
  detail: string;
}

export type TermPlanId = 'TL-BASIC' | 'TL-RIDERS';
export type HealthPlanId = 'HL-FLOATER' | 'HL-BASE-TOPUP' | 'HL-COMPREHENSIVE' | 'HL-TOPUP-ONLY';

/** The recommended way to close each gap, priced exactly as the plan catalog prices it. */
export interface PlanPicks {
  termId: TermPlanId | null;
  termCover: number;
  termPremium: number;
  healthId: HealthPlanId | null;
  healthCover: number;
  healthPremium: number;
}

export interface StrategyResult {
  life: {
    humanLifeValue: number;
    /** Yearly income the family would need replaced (after any partner's take-home). */
    annualIncomeReplaced: number;
    liabilities: number;
    educationCorpus: number;
    /** Liquid savings deducted from the need (never more than the need). */
    savings: number;
    totalNeed: number;
    existing: number;
    gap: number;
    estimatedAnnualPremiumForGap: number;
  };
  health: HealthPlanResult & { existing: number; gap: number };
  /** Lump-sum covers sized from income: they pay when illness or an accident stops you earning. */
  criticalIllness: SupplementaryCover;
  personalAccident: SupplementaryCover;
  /** Separate senior cover for dependent parents; null when no parents depend on the user. */
  parentsHealth: { count: number; eldestAge: number; recommendedCover: number; existing: number; gap: number; estimatedAnnualPremium: number } | null;
  household: { children: number; parents: number; siblings: number; spouseDependent: boolean; dependents: number };
  affordability: {
    annualIncome: number;
    annualExpenses: number;
    expenseRatio: number;
    liabilityToIncome: number;
    annualEmi: number;
    /** Monthly EMIs as a share of monthly gross income, in %. Lenders typically cap this near 40%. */
    emiToIncomeRatio: number;
    /** Income left after expenses, EMIs and the recommended premiums; negative means it doesn't add up. */
    annualSurplus: number;
    premiumBudget: number;
    estimatedAnnualPremium: number;
    premiumToIncomeRatio: number;
    emergencyFundTarget: number;
    /** Old-regime tax relief on the recommended premiums (none under the default new regime). */
    tax: PremiumTax;
  };
  score: number;
  rating: PortfolioHealthResult['rating'];
  insights: Insight[];
  picks: PlanPicks;
  assumptions: typeof ASSUMPTIONS;
}

const round = (n: number, step = 1) => Math.round(n / step) * step;
export const roundUpTo = (n: number, step: number) => Math.ceil(n / step) * step;

/** Price multipliers of plan structures; plans.service's catalog uses these same values. */
export const STRUCTURE = { termRiders: 1.15, healthComprehensive: 1.3, superTopUpShare: 0.25 };

/**
 * Picks and prices the term plan and health structure that close the gaps. Used by the strategy's
 * affordability figures and by Plan Options' recommendations, so both always show the same price.
 */
export interface Household {
  /** Children's ages; null when the profile predates the dependents list. */
  children: (number | null)[];
  parents: number[];
  siblings: number[];
  spouseDependent: boolean;
  /** Everyone who relies on the earner's income. */
  count: number;
}

/** Who relies on the earner. Profiles saved before the dependents list keep the old guess (spouse + children). */
export function householdOf(p: Pick<StrategyProfile, 'maritalStatus' | 'spouseIncome' | 'dependents' | 'dependentDetails'>): Household {
  const married = p.maritalStatus === 'Married';
  if (p.dependentDetails.length === 0) {
    const children = married ? Math.max(0, p.dependents - 1) : p.dependents;
    return { children: Array(children).fill(null), parents: [], siblings: [], spouseDependent: married && p.dependents > 0, count: p.dependents };
  }
  const ages = (relation: DependentRelation) => p.dependentDetails.filter(d => d.relation === relation).map(d => d.age);
  const spouseDependent = married && p.spouseIncome === 0;
  return {
    children: ages('child'),
    parents: ages('parent'),
    siblings: ages('sibling'),
    spouseDependent,
    count: p.dependentDetails.length + (spouseDependent ? 1 : 0),
  };
}

export function pickPlans(
  p: StrategyProfile,
  lifeGap: number,
  health: HealthPlanResult,
  premiumBudget: number,
  otherPremiums = 0
): PlanPicks {
  // Health first: the term choice depends on what is left of the budget.
  const healthRate = healthRatePerLakh(p.age, p.cityTier);
  const healthGap = health.personalCoverNeeded;
  let healthId: HealthPlanId | null = null;
  let healthCover = 0;
  let healthPremium = 0;
  if (healthGap > 0) {
    if (p.existingHealthCover >= 300000) {
      healthId = 'HL-TOPUP-ONLY';
      healthCover = Math.max(500000, roundUpTo(healthGap, 500000));
      healthPremium = (healthCover / 100000) * healthRate * STRUCTURE.superTopUpShare;
    } else if (health.recommendedCover > health.basePolicy) {
      healthId = 'HL-BASE-TOPUP';
      healthCover = health.recommendedCover;
      healthPremium = (health.basePolicy / 100000) * healthRate + (health.superTopUp / 100000) * healthRate * STRUCTURE.superTopUpShare;
    } else {
      const metro = p.cityTier === 'Tier 1 (Metro)';
      healthId = metro ? 'HL-COMPREHENSIVE' : 'HL-FLOATER';
      healthCover = health.recommendedCover;
      healthPremium = (healthCover / 100000) * healthRate * (metro ? STRUCTURE.healthComprehensive : 1);
    }
  }
  healthPremium = round(healthPremium, 100);

  let termId: TermPlanId | null = null;
  let termCover = 0;
  let termPremium = 0;
  if (lifeGap > 0) {
    termCover = roundUpTo(lifeGap, 500000);
    const basic = (termCover / 100000) * termRatePerLakh(p.age, isTobacco(p.lifestyleRisks)) * medicalLoading(p);
    // Riders protect dependents if illness stops premium payments; worth it only within budget.
    const ridersFit = householdOf(p).count > 0 && basic * STRUCTURE.termRiders + healthPremium + otherPremiums <= premiumBudget;
    termId = ridersFit ? 'TL-RIDERS' : 'TL-BASIC';
    termPremium = round(ridersFit ? basic * STRUCTURE.termRiders : basic, 100);
  }
  return { termId, termCover, termPremium, healthId, healthCover, healthPremium };
}

/** ₹ in Lakh/Crore, matching the frontend's formatINR, e.g. ₹2.68 Cr, ₹45.0L, ₹42,800. */
export function formatINR(value: number): string {
  const n = Math.abs(value);
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function rate(score: number): PortfolioHealthResult['rating'] {
  if (score >= 85) return 'Optimal';
  if (score >= 65) return 'Adequate';
  if (score >= 40) return 'Vulnerable';
  return 'High Risk';
}

export const isTobacco = (risks: string[]) => risks.some(r => /tobacco|smok/i.test(r));

export const HEALTH_CONDITIONS = ['diabetes', 'hypertension', 'heart', 'thyroid', 'asthma', 'cancer'] as const;
export type HealthCondition = (typeof HEALTH_CONDITIONS)[number];
export const CONDITION_LABELS: Record<HealthCondition, string> = {
  diabetes: 'diabetes', hypertension: 'high blood pressure', heart: 'heart disease', thyroid: 'thyroid disorder', asthma: 'asthma', cancer: 'cancer history',
};
// Indicative underwriting loadings on term and critical-illness rates for a controlled condition; insurers vary,
// and may ask for medical tests first. Heart disease and cancer history are often postponed or declined.
const CONDITION_LOADING: Record<HealthCondition, number> = { diabetes: 1.5, hypertension: 1.25, heart: 2, thyroid: 1, asthma: 1.1, cancer: 2 };
export const SEVERE_CONDITIONS: readonly HealthCondition[] = ['heart', 'cancer'];
// Beyond about 3x the standard rate insurers decline rather than load further.
const MAX_MEDICAL_LOADING = 3;

/** Body-mass index, or null when height or weight wasn't given. */
export function bmiOf(p: Pick<StrategyProfile, 'heightCm' | 'weightKg'>): number | null {
  return p.heightCm > 0 && p.weightKg > 0 ? Math.round((p.weightKg / (p.heightCm / 100) ** 2) * 10) / 10 : null;
}

/** Multiplier on standard term and critical-illness rates for the user's conditions and BMI (1 = standard). */
export function medicalLoading(p: Pick<StrategyProfile, 'healthConditions' | 'heightCm' | 'weightKg'>): number {
  const bmi = bmiOf(p);
  const bmiLoad = bmi === null ? 1 : bmi >= 35 ? 1.5 : bmi >= 30 ? 1.25 : bmi < 18.5 ? 1.1 : 1;
  return Math.min(MAX_MEDICAL_LOADING, p.healthConditions.reduce((m, c) => m * CONDITION_LOADING[c], bmiLoad));
}

/** Indicative annual term premium per ₹1L of cover (Indian market, non-smoker), by entry age. */
export function termRatePerLakh(age: number, tobacco: boolean): number {
  const base = age < 30 ? 110 : age < 40 ? 160 : age < 50 ? 330 : 700;
  return tobacco ? base * 1.8 : base;
}

/** Indicative annual family floater premium per ₹1L of cover, by eldest member age and city tier. */
export function healthRatePerLakh(age: number, tier: CityTier): number {
  const base = age < 35 ? 1100 : age < 45 ? 1500 : age < 55 ? 2300 : age < 65 ? 3500 : 5000;
  return base * (tier === 'Tier 1 (Metro)' ? 1.15 : tier === 'Tier 2 (Emerging Metro)' ? 1.0 : 0.9);
}

/** Indicative annual standalone critical-illness premium per ₹1L of cover, by entry age. */
export function criticalIllnessRatePerLakh(age: number, tobacco: boolean): number {
  const base = age < 30 ? 300 : age < 40 ? 500 : age < 50 ? 1100 : 2500;
  return tobacco ? base * 1.5 : base;
}

/** Indicative annual personal-accident premium per ₹1L; driven by occupation risk rather than age. */
export function personalAccidentRatePerLakh(highRiskOccupation: boolean): number {
  return highRiskOccupation ? 110 : 60;
}

/** Lump-sum sizing for covers the strategy doesn't gap-analyse, rounded to ₹5L and kept within market norms. */
export function suggestedCover(type: 'critical_illness' | 'personal_accident', income: number): number {
  const multiple = type === 'critical_illness' ? ASSUMPTIONS.criticalIllnessIncomeMultiple : ASSUMPTIONS.personalAccidentIncomeMultiple;
  // CI plans in India rarely exceed ₹50L; accident cover commonly runs to ₹2 Cr.
  const [min, max] = type === 'critical_illness' ? [1000000, 5000000] : [2500000, 20000000];
  return Math.min(max, Math.max(min, Math.round((income * multiple) / 500000) * 500000));
}

export class ActuarialService {
  /**
   * Human Life Value: present value of the income share the family would lose,
   * growing with salary inflation and discounted at a nominal rate of return.
   */
  static calculateHLV(input: HLVInput): HLVResult {
    const { income, years, inflation, existingCover = 0, annualContribution: contribution } = input;
    const growth = inflation / 100;
    const discount = ASSUMPTIONS.discountRate / 100;

    let totalPV = 0;
    let annualContribution = contribution ?? income * ASSUMPTIONS.incomeContributionShare;
    for (let t = 1; t <= years; t++) {
      annualContribution *= 1 + growth;
      totalPV += annualContribution / Math.pow(1 + discount, t);
    }

    const capitalRequirement = Math.round(totalPV);
    const recommendedCover = Math.max(100000, capitalRequirement);
    return {
      recommendedCover,
      capitalRequirement,
      coverageGap: Math.max(0, recommendedCover - existingCover),
      incomeReplacementWindow: years,
      inflationAdjustedTarget: Math.round(income * Math.pow(1 + growth, years)),
    };
  }

  /**
   * Stress test: total financial impact of an event, how much of it existing cover absorbs,
   * and for how many years the payout can fund the household's expenses afterwards.
   */
  static simulateRiskScenario(input: RiskSimulationInput): RiskSimulationResult {
    const { scenario, cost, years, inflation, existingCover = 0, age = 35, income = 0, monthlyExpenses = 0 } = input;

    const medicalInflation = (inflation + ASSUMPTIONS.medicalInflationPremium) / 100;
    // Treatment cost is incurred over the recovery window and inflates year on year.
    let treatmentCostTotal = 0;
    if (scenario !== 'death') {
      for (let t = 0; t < years; t++) treatmentCostTotal += (cost / years) * Math.pow(1 + medicalInflation, t);
    } else {
      treatmentCostTotal = cost; // immediate final expenses
    }
    treatmentCostTotal = Math.round(treatmentCostTotal);

    // Income lost: full for death/disability over the remaining working life, partial during illness recovery.
    const workingYearsLeft = Math.max(0, ASSUMPTIONS.retirementAge - age);
    const lostYears = scenario === 'illness' ? Math.min(years, workingYearsLeft) : workingYearsLeft;
    const lostShare = scenario === 'illness' ? 0.5 : scenario === 'disability' ? 1 : ASSUMPTIONS.incomeContributionShare;
    const earningCapacityLoss = Math.round(
      income > 0 ? ActuarialService.calculateHLV({ income, annualContribution: income * lostShare, years: Math.max(1, lostYears), inflation }).capitalRequirement : 0
    );

    const totalFinancialImpact = treatmentCostTotal + earningCapacityLoss;
    const shortfallAmount = Math.max(0, totalFinancialImpact - existingCover);
    const adequacyIndex = totalFinancialImpact > 0 ? Math.round(Math.min(1, existingCover / totalFinancialImpact) * 100) : 100;

    // Years a lump-sum payout (after treatment) keeps the household running at current expenses.
    // Health insurance only reimburses hospital bills, so in an illness nothing is left over for living costs.
    const annualExpenses = monthlyExpenses * 12;
    const leftover = scenario === 'illness' ? 0 : Math.max(0, existingCover - treatmentCostTotal);
    const yearsFunded = annualExpenses > 0 ? Math.round((leftover / annualExpenses) * 10) / 10 : 0;
    const depletionAge = Math.round(age + yearsFunded);

    const riskSeverity: RiskSimulationResult['riskSeverity'] =
      adequacyIndex >= 90 ? 'LOW' : adequacyIndex >= 60 ? 'MEDIUM' : adequacyIndex >= 30 ? 'HIGH' : 'CRITICAL';

    const recommendation =
      shortfallAmount === 0
        ? 'Existing cover absorbs this scenario. Review annually and after major life events.'
        : scenario === 'illness'
          ? `Add critical illness cover of about ${formatINR(shortfallAmount)} or a super top-up health policy to close the treatment and income gap.`
          : scenario === 'disability'
            ? `Add a permanent disability rider or income-protection cover of about ${formatINR(shortfallAmount)}.`
            : `Increase pure term life cover by about ${formatINR(shortfallAmount)}.`;

    return {
      depletionAge,
      yearsFunded,
      shortfallAmount,
      treatmentCostTotal,
      earningCapacityLoss,
      totalFinancialImpact,
      adequacyIndex,
      riskSeverity,
      recommendation,
    };
  }

  /** Family health cover need by city tier, family size and risk factors, split into base + super top-up. */
  static planHealthCover(input: HealthPlanInput, eldestAge = 35): HealthPlanResult {
    const { adults, children, cityTier, employerCover, existingCover, risks } = input;
    const perTier = { 'Tier 1 (Metro)': 1000000, 'Tier 2 (Emerging Metro)': 750000, 'Tier 3 (Urban Center)': 500000 };
    const members = Math.max(1, adults + children);
    let need = perTier[cityTier] * (1 + 0.25 * (members - 1));
    const chronic = risks.some(r => /chronic/i.test(r));
    const maternity = risks.some(r => /maternity/i.test(r));
    if (isTobacco(risks)) need *= 1.2;
    if (chronic) need *= 1.25;
    if (eldestAge >= 45) need *= 1.25;
    const recommendedCover = round(need, 500000);

    // A modest base policy plus a cheap super top-up is the standard cost-efficient structure.
    const basePolicy = Math.min(recommendedCover, perTier[cityTier]);
    const superTopUp = recommendedCover - basePolicy;
    // Employer cover ends with the job, so it only offsets the base layer, never the whole need.
    const personalCoverNeeded = Math.max(0, recommendedCover - existingCover);
    const estimatedAnnualPremium = round(
      (basePolicy / 100000) * healthRatePerLakh(eldestAge, cityTier) +
        (superTopUp / 100000) * healthRatePerLakh(eldestAge, cityTier) * 0.25,
      100
    );
    const totalCover = existingCover + employerCover;
    const employerDependencyShare = totalCover > 0 ? Math.round((employerCover / totalCover) * 100) : 0;
    const adequacyScore = Math.round(Math.min(1, existingCover / recommendedCover) * 100);

    const notes: string[] = [];
    if (employerDependencyShare >= 50) notes.push('Over half your health cover comes from your employer and ends if you change jobs.');
    if (isTobacco(risks)) notes.push('Tobacco use raises both the cover needed and premiums; declare it to avoid claim rejection.');
    if (chronic) notes.push('Pre-existing conditions usually carry a 2–4 year waiting period; look for plans with a shorter PED wait or a day-one rider.');
    if (maternity) notes.push('Maternity benefits typically have a 2–4 year waiting period, so buy well before planning a pregnancy.');
    if (superTopUp > 0) notes.push(`A super top-up with a ${formatINR(basePolicy)} deductible is the cheapest way to add the remaining cover.`);

    return { recommendedCover, basePolicy, superTopUp, personalCoverNeeded, estimatedAnnualPremium, employerDependencyShare, adequacyScore, notes };
  }

  /** Full protection strategy from the user's profile. Single source of truth for every screen. */
  static buildStrategy(p: StrategyProfile): StrategyResult {
    const tobacco = isTobacco(p.lifestyleRisks);
    const workingYears = Math.max(1, ASSUMPTIONS.retirementAge - p.age);
    const household = householdOf(p);
    // Children and siblings under college age (or of unknown age) still need education funded.
    const inEducation = [...household.children, ...household.siblings].filter(age => age === null || age < EDUCATION_AGE_LIMIT).length;
    // Family floater covers the user, spouse and children up to 25; parents need their own senior policy.
    const floaterChildren = household.children.filter(age => age === null || age < 25).length;

    // Life
    const annualIncomeReplaced = incomeToReplace(p.income, p.spouseIncome, p.monthlyExpenses * 12);
    const humanLifeValue = (household.count > 0 || p.homeLoan + p.otherLoans > 0) && annualIncomeReplaced > 0
      ? ActuarialService.calculateHLV({ income: p.income, annualContribution: annualIncomeReplaced, years: workingYears, inflation: ASSUMPTIONS.salaryGrowth }).recommendedCover
      : 0; // nobody depends on this income (or a partner's income covers it) and there are no debts to clear
    const liabilities = p.homeLoan + p.otherLoans;
    const educationCorpus = inEducation * ASSUMPTIONS.educationCorpusPerChild;
    // Money the family can already draw on reduces what insurance must provide.
    const grossNeed = humanLifeValue + liabilities + educationCorpus;
    const savingsApplied = Math.min(p.liquidSavings, grossNeed);
    const lifeNeed = grossNeed - savingsApplied;
    const lifeGap = Math.max(0, lifeNeed - p.existingLifeCover);

    // Health
    const adults = p.maritalStatus === 'Married' ? 2 : 1;
    // Onboarding records employer benefit types but not amounts, so no employer health cover is assumed.
    const health = ActuarialService.planHealthCover(
      // The user's own conditions count as a chronic condition on the family policy (more cover, pre-existing waiting period).
      { adults, children: floaterChildren, cityTier: p.cityTier, employerCover: 0, existingCover: p.existingHealthCover, risks: p.healthConditions.length > 0 ? [...p.lifestyleRisks, 'Chronic Condition'] : p.lifestyleRisks },
      p.age
    );
    const healthGap = health.personalCoverNeeded;

    // Dependent parents: priced as a standalone senior policy at the eldest parent's age.
    let parentsHealth: StrategyResult['parentsHealth'] = null;
    if (household.parents.length > 0) {
      const eldestAge = Math.max(...household.parents);
      const plan = ActuarialService.planHealthCover(
        { adults: household.parents.length, children: 0, cityTier: p.cityTier, employerCover: 0, existingCover: p.parentsHealthCover, risks: [] },
        eldestAge
      );
      const gap = plan.personalCoverNeeded;
      parentsHealth = {
        count: household.parents.length,
        eldestAge,
        recommendedCover: plan.recommendedCover,
        existing: p.parentsHealthCover,
        gap,
        estimatedAnnualPremium: round((gap / 100000) * healthRatePerLakh(eldestAge, p.cityTier), 100),
      };
    }
    const parentsPremium = parentsHealth?.estimatedAnnualPremium ?? 0;

    // Affordability, priced from the same recommended plans Plan Options shows
    const annualExpenses = p.monthlyExpenses * 12;
    const premiumBudget = round(p.income * ASSUMPTIONS.premiumBudgetShare, 100);
    const picks = pickPlans(p, lifeGap, health, premiumBudget, parentsPremium);
    const lifePremiumForGap = picks.termPremium;
    const estimatedAnnualPremium = picks.termPremium + picks.healthPremium + parentsPremium;
    const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
    const annualEmi = p.loanEmi * 12;
    const annualSurplus = p.income - annualExpenses - annualEmi - estimatedAnnualPremium;

    const supplementary = (type: 'critical_illness' | 'personal_accident', existing: number): SupplementaryCover => {
      const recommended = suggestedCover(type, p.income);
      return { recommended, existing, gap: Math.max(0, recommended - existing) };
    };
    const criticalIllness = supplementary('critical_illness', p.existingCiCover);
    const personalAccident = supplementary('personal_accident', p.existingPaCover);
    const ratio = (c: SupplementaryCover) => (c.recommended > 0 ? Math.min(1, c.existing / c.recommended) : 1);

    // Score: 55% life, 35% health, 5% each critical illness and accident/disability
    const lifeRatio = lifeNeed > 0 ? Math.min(1, p.existingLifeCover / lifeNeed) : 1;
    // Health adequacy spans the family floater and, where relevant, the parents' policy.
    const healthRatio = Math.min(
      1,
      (p.existingHealthCover + (parentsHealth?.existing ?? 0)) / (health.recommendedCover + (parentsHealth?.recommendedCover ?? 0))
    );
    const score = Math.round((lifeRatio * 0.55 + healthRatio * 0.35 + ratio(criticalIllness) * 0.05 + ratio(personalAccident) * 0.05) * 100);

    const insights: Insight[] = [];
    if (lifeGap > 0) {
      insights.push({
        severity: lifeRatio < 0.5 ? 'critical' : 'warning',
        code: 'life_gap',
        params: {
          gap: formatINR(lifeGap), need: formatINR(lifeNeed), incomeReplacement: formatINR(humanLifeValue), partner: p.spouseIncome > 0 ? 1 : 0,
          loans: formatINR(liabilities), education: formatINR(educationCorpus), savings: savingsApplied > 0 ? formatINR(savingsApplied) : '',
          held: formatINR(p.existingLifeCover), premium: formatINR(lifePremiumForGap),
        },
        title: `Life cover gap of ${formatINR(lifeGap)}`,
        detail: `Your family would need about ${formatINR(lifeNeed)} (income replacement ${formatINR(humanLifeValue)}${p.spouseIncome > 0 ? ' after your partner\'s income' : ''}, loans ${formatINR(liabilities)}, education ${formatINR(educationCorpus)}${savingsApplied > 0 ? `, less ${formatINR(savingsApplied)} of savings` : ''}) but you hold ${formatINR(p.existingLifeCover)}. The recommended term plan for the gap costs about ${formatINR(lifePremiumForGap)} a year.`,
      });
    }
    if (healthGap > 0) {
      insights.push({
        severity: p.existingHealthCover / health.recommendedCover < 0.5 ? 'critical' : 'warning',
        code: 'health_gap',
        params: { gap: formatINR(healthGap), members: adults + floaterChildren, cityTier: p.cityTier, recommended: formatINR(health.recommendedCover), held: formatINR(p.existingHealthCover) },
        title: `Health cover gap of ${formatINR(healthGap)}`,
        detail: `A ${adults + floaterChildren}-member family in ${p.cityTier} needs about ${formatINR(health.recommendedCover)} of personal health cover; you hold ${formatINR(p.existingHealthCover)}.`,
      });
    }
    if (p.employerBenefits.includes('Group Term Life')) {
      insights.push({ severity: 'info', code: 'employer_life', title: 'Employer life cover is not portable', detail: 'Group term life ends when you leave the job, so it is not counted towards your life cover.' });
    }
    if (p.employerBenefits.includes('Group Health')) {
      insights.push({ severity: 'info', code: 'employer_health', title: 'Employer health cover is not portable', detail: 'Group health insurance ends with the job and is not counted towards your own health cover. Keep a personal policy so you stay covered between jobs and after retirement.' });
    }
    if (tobacco) {
      insights.push({ severity: 'warning', code: 'tobacco', title: 'Tobacco use increases premiums', detail: 'Term premiums are roughly 80% higher for tobacco users. Quitting for 12+ months can qualify you for non-smoker rates.' });
    }
    const loading = medicalLoading(p);
    const bmi = bmiOf(p);
    if (p.healthConditions.length > 0 || loading > 1) {
      const names = p.healthConditions.map(c => CONDITION_LABELS[c]);
      const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];
      const severe = p.healthConditions.some(c => SEVERE_CONDITIONS.includes(c));
      const loadingPct = Math.round((loading - 1) * 100);
      const weight = bmi !== null && (bmi >= 30 || bmi < 18.5) ? `a BMI of ${bmi}` : '';
      const declare = [list, weight].filter(Boolean).join(' and ');
      insights.push({
        severity: 'warning',
        code: 'medical',
        params: { conditions: p.healthConditions.join(','), bmi: weight ? bmi! : '', loadingPct, severe: severe ? 1 : 0, ped: p.healthConditions.length > 0 ? 1 : 0 },
        title: 'Declare your health conditions',
        detail:
          `Tell insurers about your ${declare}: non-disclosure is a leading reason claims are rejected, even years later. ` +
          `Expect medical tests${loadingPct > 0 ? ` and term and critical-illness premiums about ${loadingPct}% above standard rates (included in these estimates)` : ''}.` +
          (p.healthConditions.length > 0 ? ' A new health policy covers these conditions only after a waiting period of up to 3 years; some plans shorten it for an extra premium.' : '') +
          (severe ? ' Heart disease or cancer history can lead insurers to postpone or decline cover: apply to more than one, and keep any employer group cover.' : ''),
      });
    }
    if (p.lifestyleRisks.some(r => /hobb/i.test(r))) {
      insights.push({ severity: 'info', code: 'hobbies', title: 'Declare high-risk hobbies', detail: 'Undeclared hazardous activities are a common reason for claim rejection; check exclusions before buying.' });
    }
    const emergencyTarget = p.monthlyExpenses * ASSUMPTIONS.emergencyFundMonths;
    if (emergencyTarget > 0 && p.liquidSavings < emergencyTarget) {
      insights.push({
        severity: 'warning',
        code: 'emergency_fund',
        params: { savings: formatINR(p.liquidSavings), months: (p.liquidSavings / p.monthlyExpenses).toFixed(1), target: formatINR(emergencyTarget) },
        title: 'Emergency fund below 6 months',
        detail: `Savings of ${formatINR(p.liquidSavings)} cover ${(p.liquidSavings / p.monthlyExpenses).toFixed(1)} months of expenses. Aim for ${formatINR(emergencyTarget)} before long-term investing; it pays for waiting periods and deductibles insurance won't.`,
      });
    }
    if (pct(annualExpenses, p.income) > 60) {
      insights.push({ severity: 'warning', code: 'expense_ratio', params: { pct: pct(annualExpenses, p.income) }, title: 'High expense ratio', detail: `Living expenses take ${pct(annualExpenses, p.income)}% of gross income, leaving little room for premiums and savings.` });
    }
    if (liabilities > p.income * 3) {
      insights.push({ severity: 'warning', code: 'debt_load', params: { multiple: (liabilities / Math.max(1, p.income)).toFixed(1) }, title: 'High debt load', detail: `Outstanding loans are ${(liabilities / Math.max(1, p.income)).toFixed(1)}x annual income. Make sure life cover clears them in full.` });
    }
    const missing = [
      criticalIllness.gap > 0 && `critical illness cover (${formatINR(criticalIllness.gap)} short)`,
      personalAccident.gap > 0 && `accident & disability cover (${formatINR(personalAccident.gap)} short)`,
    ].filter(Boolean);
    if (missing.length > 0 && p.income > 0) {
      insights.push({
        severity: 'info',
        code: 'income_protection',
        params: { ciGap: criticalIllness.gap > 0 ? formatINR(criticalIllness.gap) : '', paGap: personalAccident.gap > 0 ? formatINR(personalAccident.gap) : '' },
        title: 'Income protection beyond death',
        detail: `Term life pays only on death and health insurance only covers bills. Consider ${missing.join(' and ')}: lump sums that replace income if illness or an accident stops you working.`,
      });
    }
    if (pct(annualEmi, p.income) > ASSUMPTIONS.maxEmiShare * 100) {
      insights.push({
        severity: 'warning',
        code: 'emi_share',
        params: { pct: pct(annualEmi, p.income), emi: formatINR(p.loanEmi), maxPct: ASSUMPTIONS.maxEmiShare * 100, loans: formatINR(liabilities) },
        title: `Loan repayments take ${pct(annualEmi, p.income)}% of income`,
        detail: `EMIs of ${formatINR(p.loanEmi)} a month are above the ${ASSUMPTIONS.maxEmiShare * 100}% most lenders allow. Avoid new loans, and keep term cover at least equal to the outstanding ${formatINR(liabilities)}.`,
      });
    }
    if (annualSurplus < 0 && p.income > 0) {
      insights.push({
        severity: 'critical',
        code: 'over_income',
        params: { expenses: formatINR(annualExpenses), emis: formatINR(annualEmi), premiums: formatINR(estimatedAnnualPremium), short: formatINR(-annualSurplus) },
        title: 'Expenses, EMIs and premiums exceed income',
        detail: `After ${formatINR(annualExpenses)} of expenses and ${formatINR(annualEmi)} of EMIs a year, the recommended ${formatINR(estimatedAnnualPremium)} of premiums leaves you ${formatINR(-annualSurplus)} short. Cover term life first and review expenses before adding more.`,
      });
    }
    if (estimatedAnnualPremium > premiumBudget && premiumBudget > 0) {
      insights.push({ severity: 'warning', code: 'over_budget', params: { premiums: formatINR(estimatedAnnualPremium), budget: formatINR(premiumBudget) }, title: 'Closing every gap exceeds a 10% premium budget', detail: `Estimated ${formatINR(estimatedAnnualPremium)} a year versus a ${formatINR(premiumBudget)} budget. Prioritise term life first, then health.` });
    }
    if (parentsHealth && parentsHealth.gap > 0) {
      insights.push({
        severity: parentsHealth.existing === 0 ? 'critical' : 'warning',
        code: 'parents_gap',
        params: {
          gap: formatINR(parentsHealth.gap), count: parentsHealth.count, eldest: parentsHealth.eldestAge, recommended: formatINR(parentsHealth.recommendedCover),
          held: formatINR(parentsHealth.existing), premium: formatINR(parentsHealth.estimatedAnnualPremium),
        },
        title: `Parents need ${formatINR(parentsHealth.gap)} more health cover`,
        detail: `${parentsHealth.count === 1 ? `Your parent (age ${parentsHealth.eldestAge})` : `Your ${parentsHealth.count} parents (eldest ${parentsHealth.eldestAge})`} should have their own senior health policy of about ${formatINR(parentsHealth.recommendedCover)}; they hold ${formatINR(parentsHealth.existing)}. Expect about ${formatINR(parentsHealth.estimatedAnnualPremium)} a year, and check pre-existing disease waiting periods carefully.`,
      });
    }
    if (household.count > 0 && p.maritalStatus === 'Single') {
      insights.push({ severity: 'info', code: 'sole_provider', title: 'Sole provider for dependents', detail: 'With no partner income, nominate a guardian and consider a monthly-income payout option on the term plan.' });
    }
    if (insights.every(i => i.severity === 'info')) {
      insights.unshift({ severity: 'info', code: 'on_track', title: 'Protection is on track', detail: 'Your cover meets the estimated need. Review it yearly and after major life events.' });
    }
    // Most important first, so short lists (the dashboard shows three) never hide a critical finding.
    const rank = { critical: 0, warning: 1, info: 2 } as const;
    insights.sort((a, b) => rank[a.severity] - rank[b.severity]);

    return {
      life: {
        humanLifeValue,
        annualIncomeReplaced: Math.round(annualIncomeReplaced),
        liabilities,
        educationCorpus,
        savings: savingsApplied,
        totalNeed: lifeNeed,
        existing: p.existingLifeCover,
        gap: lifeGap,
        estimatedAnnualPremiumForGap: lifePremiumForGap,
      },
      health: { ...health, existing: p.existingHealthCover, gap: healthGap },
      criticalIllness,
      personalAccident,
      parentsHealth,
      household: {
        children: household.children.length,
        parents: household.parents.length,
        siblings: household.siblings.length,
        spouseDependent: household.spouseDependent,
        dependents: household.count,
      },
      affordability: {
        annualIncome: p.income,
        annualExpenses,
        expenseRatio: pct(annualExpenses, p.income),
        liabilityToIncome: p.income > 0 ? Math.round((liabilities / p.income) * 10) / 10 : 0,
        annualEmi,
        emiToIncomeRatio: pct(annualEmi, p.income),
        annualSurplus,
        premiumBudget,
        estimatedAnnualPremium,
        premiumToIncomeRatio: pct(estimatedAnnualPremium, p.income),
        emergencyFundTarget: p.monthlyExpenses * ASSUMPTIONS.emergencyFundMonths,
        tax: premiumTax({
          income: p.income, age: p.age, termPremium: picks.termPremium, healthPremium: picks.healthPremium,
          parentsPremium, eldestParentAge: parentsHealth?.eldestAge ?? null,
        }),
      },
      score,
      rating: rate(score),
      insights,
      picks,
      assumptions: ASSUMPTIONS,
    };
  }

  /** Quick gap check from income and current cover only (used before onboarding is complete). */
  static analyzePortfolio(income: number, existingLifeCover: number, existingHealthCover: number): PortfolioHealthResult {
    const targetLifeCover = income * 12;
    const targetHealthCover = Math.max(500000, income * 0.5);
    const lifeGap = Math.max(0, targetLifeCover - existingLifeCover);
    const healthGap = Math.max(0, targetHealthCover - existingHealthCover);
    const score = Math.round(
      (Math.min(1, existingLifeCover / targetLifeCover) * 0.6 + Math.min(1, existingHealthCover / targetHealthCover) * 0.4) * 100
    );

    const redFlags: string[] = [];
    const recommendations: string[] = [];
    if (lifeGap > 500000) {
      redFlags.push('Significant term life protection gap detected');
      recommendations.push(`Add ${formatINR(lifeGap)} of pure term insurance cover.`);
    }
    if (healthGap > 200000) {
      redFlags.push('Health cover below recommended level');
      recommendations.push(`Increase family health cover by ${formatINR(healthGap)} with a super top-up.`);
    }
    if (redFlags.length === 0) recommendations.push('Portfolio is optimal. Re-evaluate annually or upon major life events.');

    return { score, rating: rate(score), lifeCoverGap: lifeGap, healthCoverGap: healthGap, redFlags, recommendations };
  }
}
