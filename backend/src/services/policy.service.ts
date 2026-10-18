import { ActuarialService, type StrategyProfile } from './actuarial.service.js';
import { PlansService, PLAN_PRODUCTS, type InsuranceType } from './plans.service.js';

export interface PolicyDetail {
  id: string;
  title: string;
  provider: string;
  category: 'Life' | 'Health' | 'Critical Illness' | 'Personal Accident';
  coverageAmount: number;
  monthlyPremium: number;
  status: 'Available';
  features: string[];
  exclusions: string[];
  clarityScore: number;
  structure: string;
  waitingPeriod: string;
  bestFor: string;
}

const CATEGORY: Record<InsuranceType, PolicyDetail['category']> = {
  term_life: 'Life',
  health: 'Health',
  critical_illness: 'Critical Illness',
  personal_accident: 'Personal Accident',
};

// Catalog prices are quoted for a reference household; signed-in users get personal quotes from /plan-options.
const REFERENCE_PROFILE: StrategyProfile = {
  age: 35, income: 2000000, dependents: 2, maritalStatus: 'Married', occupation: 'Salaried professional', cityTier: 'Tier 1 (Metro)',
  homeLoan: 3000000, otherLoans: 0, monthlyExpenses: 70000, existingLifeCover: 0, existingHealthCover: 0, liquidSavings: 0, spouseIncome: 0, dependentDetails: [], parentsHealthCover: 0, loanEmi: 0, homeLoanYearsLeft: 0, existingCiCover: 0, existingPaCover: 0, employerBenefits: [], lifestyleRisks: [], spouseAge: 0, healthConditions: [], heightCm: 0, weightKg: 0,
};

const quotedByProductId = new Map(
  PlansService.optionsFor(REFERENCE_PROFILE, ActuarialService.buildStrategy(REFERENCE_PROFILE))
    .flatMap(t => t.options)
    .map(o => [o.id, o])
);

const catalog: PolicyDetail[] = PLAN_PRODUCTS.map(product => {
  const quote = quotedByProductId.get(product.id)!;
  return {
    id: product.id,
    title: product.name,
    provider: product.insurer,
    category: CATEGORY[product.type],
    coverageAmount: quote.cover,
    monthlyPremium: quote.monthlyPremium,
    status: 'Available',
    features: product.features,
    exclusions: product.exclusions,
    clarityScore: product.clarityScore,
    structure: product.structure,
    waitingPeriod: product.waitingPeriod,
    bestFor: product.bestFor,
  };
});

export class PolicyService {
  static getAllPolicies(): PolicyDetail[] {
    return catalog;
  }

  static getPolicyById(id: string): PolicyDetail | undefined {
    return catalog.find(p => p.id.toLowerCase() === id.toLowerCase());
  }

  static comparePolicies(policyIds: string[]) {
    const selected = catalog.filter(p =>
      policyIds.some(id => id.toLowerCase() === p.id.toLowerCase())
    );

    const items = selected.length > 0 ? selected : catalog;

    const best = items.reduce((top, p) => (p.clarityScore > top.clarityScore ? p : top), items[0]);
    return {
      comparedCount: items.length,
      policies: items,
      recommendation:
        items.length > 1
          ? `${best.title} states its benefits and exclusions most plainly (clarity ${best.clarityScore}/100) of the policies compared.`
          : 'Select multiple policies for detailed clause comparison.',
    };
  }
}
