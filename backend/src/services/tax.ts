/**
 * Tax relief on protection premiums, Income-tax Act 2025 (in force from tax year 2026-27; Budget 2026 left rates
 * unchanged). Deductions exist only under the old regime: s.123 (formerly 80C) for life premiums, capped at ₹1.5L
 * together with EPF, PPF, ELSS and home-loan principal; s.126 (formerly 80D) for health premiums. The new regime,
 * the default, allows neither. Review each Budget.
 */
export const TAX_RULES = {
  year: '2026-27',
  lifeCap: 150000,
  healthSelf: 25000,
  healthSelfSenior: 50000,
  healthParents: 25000,
  healthParentsSenior: 50000,
  oldStandardDeduction: 50000,
  oldRebateLimit: 500000, // taxable income up to this pays no tax (rebate)
  cess: 0.04,
};

// Old regime: [from, rate].
const OLD_SLABS: [number, number][] = [[0, 0], [250000, 0.05], [500000, 0.2], [1000000, 0.3]];
// Surcharge on income tax by total income (old regime).
const SURCHARGE: [number, number][] = [[0, 0], [5000000, 0.1], [10000000, 0.15], [20000000, 0.25], [50000000, 0.37]];

const bracket = (table: [number, number][], income: number) => table.filter(([from]) => income > from).at(-1)![1];

/** Tax on the next rupee of income under the old regime, cess and surcharge included; 0 inside the rebate. */
export function oldRegimeMarginalRate(taxableIncome: number): number {
  if (taxableIncome <= TAX_RULES.oldRebateLimit) return 0;
  return bracket(OLD_SLABS, taxableIncome) * (1 + bracket(SURCHARGE, taxableIncome)) * (1 + TAX_RULES.cess);
}

export interface PremiumTax {
  year: string;
  /** Old regime only; the new regime gives no deduction. */
  marginalRatePct: number;
  healthDeduction: number;
  healthSaving: number;
  /** "Up to": only if the ₹1.5L life/investment cap isn't already used by EPF, PPF or home-loan principal. */
  lifeDeduction: number;
  lifeSavingUpTo: number;
  /** Health premium beyond the deduction limits earns no relief. */
  healthAboveLimit: number;
}

/** What the recommended premiums save in tax under the old regime. */
export function premiumTax(input: { income: number; age: number; termPremium: number; healthPremium: number; parentsPremium: number; eldestParentAge: number | null }): PremiumTax {
  const selfLimit = input.age >= 60 ? TAX_RULES.healthSelfSenior : TAX_RULES.healthSelf;
  const parentLimit = input.eldestParentAge === null ? 0 : input.eldestParentAge >= 60 ? TAX_RULES.healthParentsSenior : TAX_RULES.healthParents;
  const healthDeduction = Math.min(input.healthPremium, selfLimit) + Math.min(input.parentsPremium, parentLimit);
  const lifeDeduction = Math.min(input.termPremium, TAX_RULES.lifeCap);
  // Rate at the income these deductions come off: after the standard deduction and a full ₹1.5L cap, which most
  // salaried earners reach through EPF alone. shortcut: ignores other deductions (HRA, home-loan interest).
  const taxable = Math.max(0, input.income - TAX_RULES.oldStandardDeduction - TAX_RULES.lifeCap - healthDeduction);
  const rate = oldRegimeMarginalRate(taxable);
  return {
    year: TAX_RULES.year,
    marginalRatePct: Math.round(rate * 1000) / 10,
    healthDeduction,
    healthSaving: Math.round(healthDeduction * rate),
    lifeDeduction,
    lifeSavingUpTo: Math.round(lifeDeduction * rate),
    healthAboveLimit: input.healthPremium + input.parentsPremium - healthDeduction,
  };
}
