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
  criticalIllnessIncomeMultiple: 3, // lump sum ≈ 3 years of income to cover treatment + recovery time off work
  personalAccidentIncomeMultiple: 5, // accidental death/disability cover ≈ 5 years of income
};

export const CITY_TIERS = ['Tier 1 (Metro)', 'Tier 2 (Emerging Metro)', 'Tier 3 (Urban Center)'] as const;
export type CityTier = (typeof CITY_TIERS)[number];

export interface HLVInput {
  income: number;
  years: number;
  inflation: number;
  existingCover?: number;
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
  employerBenefits: string[];
  lifestyleRisks: string[];
}

export interface Insight {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
}

export interface StrategyResult {
  life: {
    humanLifeValue: number;
    liabilities: number;
    educationCorpus: number;
    totalNeed: number;
    existing: number;
    gap: number;
    estimatedAnnualPremiumForGap: number;
  };
  health: HealthPlanResult & { existing: number; gap: number };
  affordability: {
    annualIncome: number;
    annualExpenses: number;
    expenseRatio: number;
    liabilityToIncome: number;
    premiumBudget: number;
    estimatedAnnualPremium: number;
    premiumToIncomeRatio: number;
    emergencyFundTarget: number;
  };
  score: number;
  rating: PortfolioHealthResult['rating'];
  insights: Insight[];
  assumptions: typeof ASSUMPTIONS;
}

const round = (n: number, step = 1) => Math.round(n / step) * step;

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

/** Indicative annual term premium per ₹1L of cover (Indian market, non-smoker), by entry age. */
export function termRatePerLakh(age: number, tobacco: boolean): number {
  const base = age < 30 ? 110 : age < 40 ? 160 : age < 50 ? 330 : 700;
  return tobacco ? base * 1.8 : base;
}

/** Indicative annual family floater premium per ₹1L of cover, by eldest member age and city tier. */
export function healthRatePerLakh(age: number, tier: CityTier): number {
  const base = age < 35 ? 1100 : age < 45 ? 1500 : age < 55 ? 2300 : 3500;
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
    const { income, years, inflation, existingCover = 0 } = input;
    const growth = inflation / 100;
    const discount = ASSUMPTIONS.discountRate / 100;

    let totalPV = 0;
    let annualContribution = income * ASSUMPTIONS.incomeContributionShare;
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
      income > 0 ? ActuarialService.calculateHLV({ income: income * lostShare / ASSUMPTIONS.incomeContributionShare, years: Math.max(1, lostYears), inflation }).capitalRequirement : 0
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
    const children = p.maritalStatus === 'Married' ? Math.max(0, p.dependents - 1) : p.dependents;

    // Life
    const humanLifeValue = p.dependents > 0 || p.homeLoan + p.otherLoans > 0
      ? ActuarialService.calculateHLV({ income: p.income, years: workingYears, inflation: ASSUMPTIONS.salaryGrowth }).recommendedCover
      : 0; // nobody depends on this income and there are no debts to clear
    const liabilities = p.homeLoan + p.otherLoans;
    const educationCorpus = children * ASSUMPTIONS.educationCorpusPerChild;
    const lifeNeed = humanLifeValue + liabilities + educationCorpus;
    const lifeGap = Math.max(0, lifeNeed - p.existingLifeCover);
    const lifePremiumForGap = round((lifeGap / 100000) * termRatePerLakh(p.age, tobacco), 100);

    // Health
    const adults = p.maritalStatus === 'Married' ? 2 : 1;
    // Onboarding records employer benefit types but not amounts, so no employer health cover is assumed.
    const health = ActuarialService.planHealthCover(
      { adults, children, cityTier: p.cityTier, employerCover: 0, existingCover: p.existingHealthCover, risks: p.lifestyleRisks },
      p.age
    );
    const healthGap = health.personalCoverNeeded;
    const healthPremiumForGap = healthGap > 0 ? health.estimatedAnnualPremium * (healthGap / health.recommendedCover) : 0;

    // Affordability
    const annualExpenses = p.monthlyExpenses * 12;
    const estimatedAnnualPremium = round(lifePremiumForGap + healthPremiumForGap, 100);
    const premiumBudget = round(p.income * ASSUMPTIONS.premiumBudgetShare, 100);
    const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

    // Score: 60% life adequacy, 40% health adequacy
    const lifeRatio = lifeNeed > 0 ? Math.min(1, p.existingLifeCover / lifeNeed) : 1;
    const healthRatio = Math.min(1, p.existingHealthCover / health.recommendedCover);
    const score = Math.round((lifeRatio * 0.6 + healthRatio * 0.4) * 100);

    const insights: Insight[] = [];
    if (lifeGap > 0) {
      insights.push({
        severity: lifeRatio < 0.5 ? 'critical' : 'warning',
        title: `Life cover gap of ${formatINR(lifeGap)}`,
        detail: `Your family would need about ${formatINR(lifeNeed)} (income replacement ${formatINR(humanLifeValue)}, loans ${formatINR(liabilities)}, education ${formatINR(educationCorpus)}) but you hold ${formatINR(p.existingLifeCover)}. A term plan for the gap costs roughly ${formatINR(lifePremiumForGap)} a year.`,
      });
    }
    if (healthGap > 0) {
      insights.push({
        severity: healthRatio < 0.5 ? 'critical' : 'warning',
        title: `Health cover gap of ${formatINR(healthGap)}`,
        detail: `A ${adults + children}-member family in ${p.cityTier} needs about ${formatINR(health.recommendedCover)} of personal health cover; you hold ${formatINR(p.existingHealthCover)}.`,
      });
    }
    if (p.employerBenefits.includes('Group Term Life')) {
      insights.push({ severity: 'info', title: 'Employer life cover is not portable', detail: 'Group term life ends when you leave the job, so it is not counted towards your life cover.' });
    }
    if (p.employerBenefits.includes('Group Health')) {
      insights.push({ severity: 'info', title: 'Employer health cover is not portable', detail: 'Group health insurance ends with the job and is not counted towards your own health cover. Keep a personal policy so you stay covered between jobs and after retirement.' });
    }
    if (tobacco) {
      insights.push({ severity: 'warning', title: 'Tobacco use increases premiums', detail: 'Term premiums are roughly 80% higher for tobacco users. Quitting for 12+ months can qualify you for non-smoker rates.' });
    }
    if (p.lifestyleRisks.some(r => /hobb/i.test(r))) {
      insights.push({ severity: 'info', title: 'Declare high-risk hobbies', detail: 'Undeclared hazardous activities are a common reason for claim rejection; check exclusions before buying.' });
    }
    if (pct(annualExpenses, p.income) > 60) {
      insights.push({ severity: 'warning', title: 'High expense ratio', detail: `Living expenses take ${pct(annualExpenses, p.income)}% of gross income, leaving little room for premiums and savings.` });
    }
    if (liabilities > p.income * 3) {
      insights.push({ severity: 'warning', title: 'High debt load', detail: `Outstanding loans are ${(liabilities / Math.max(1, p.income)).toFixed(1)}x annual income. Make sure life cover clears them in full.` });
    }
    if (estimatedAnnualPremium > premiumBudget && premiumBudget > 0) {
      insights.push({ severity: 'warning', title: 'Closing every gap exceeds a 10% premium budget', detail: `Estimated ${formatINR(estimatedAnnualPremium)} a year versus a ${formatINR(premiumBudget)} budget. Prioritise term life first, then health.` });
    }
    if (p.dependents > 0 && p.maritalStatus === 'Single') {
      insights.push({ severity: 'info', title: 'Sole provider for dependents', detail: 'With no partner income, nominate a guardian and consider a monthly-income payout option on the term plan.' });
    }
    if (insights.every(i => i.severity === 'info')) {
      insights.unshift({ severity: 'info', title: 'Protection is on track', detail: 'Your cover meets the estimated need. Review it yearly and after major life events.' });
    }

    return {
      life: {
        humanLifeValue,
        liabilities,
        educationCorpus,
        totalNeed: lifeNeed,
        existing: p.existingLifeCover,
        gap: lifeGap,
        estimatedAnnualPremiumForGap: lifePremiumForGap,
      },
      health: { ...health, existing: p.existingHealthCover, gap: healthGap },
      affordability: {
        annualIncome: p.income,
        annualExpenses,
        expenseRatio: pct(annualExpenses, p.income),
        liabilityToIncome: p.income > 0 ? Math.round((liabilities / p.income) * 10) / 10 : 0,
        premiumBudget,
        estimatedAnnualPremium,
        premiumToIncomeRatio: pct(estimatedAnnualPremium, p.income),
        emergencyFundTarget: p.monthlyExpenses * ASSUMPTIONS.emergencyFundMonths,
      },
      score,
      rating: rate(score),
      insights,
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
