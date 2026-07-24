export interface PolicyDetail {
  id: string;
  title: string;
  provider: string;
  category: 'Life' | 'Health' | 'Property' | 'Critical Illness';
  coverageAmount: number;
  monthlyPremium: number;
  claimRatio: number;
  status: 'Active' | 'Under Review' | 'Recommended';
  features: string[];
  exclusions: string[];
  clarityScore: number;
}

const mockPolicies: PolicyDetail[] = [
  {
    id: 'POL-8821',
    title: 'OmniShield Term Life Max',
    provider: 'Prudential Global',
    category: 'Life',
    coverageAmount: 1500000,
    monthlyPremium: 145,
    claimRatio: 99.2,
    status: 'Active',
    features: ['Terminal Illness Payout', 'Accidental Death Benefit 2x', 'Waiver of Premium'],
    exclusions: ['Self-inflicted injuries within 12 months', 'Hazardous sports without rider'],
    clarityScore: 94,
  },
  {
    id: 'POL-4410',
    title: 'Executive Health Safeguard Pro',
    provider: 'Bupa International',
    category: 'Health',
    coverageAmount: 500000,
    monthlyPremium: 210,
    claimRatio: 97.8,
    status: 'Active',
    features: ['Zero Room Rent Capping', 'Global Emergency Care', '100% Restore Benefit'],
    exclusions: ['Cosmetic surgeries', 'Pre-existing conditions waiting window (24 months)'],
    clarityScore: 88,
  },
  {
    id: 'POL-9012',
    title: 'Disability Income Continuity Shield',
    provider: 'MetLife Actuarial',
    category: 'Critical Illness',
    coverageAmount: 750000,
    monthlyPremium: 95,
    claimRatio: 98.4,
    status: 'Recommended',
    features: ['Monthly Income Replacement', 'Inflation Adjustment Indexing', 'Partial Disability Coverage'],
    exclusions: ['Pre-existing mental health exclusions', 'Undeclared dangerous hobbies'],
    clarityScore: 91,
  },
];

export class PolicyService {
  static getAllPolicies(): PolicyDetail[] {
    return mockPolicies;
  }

  static getPolicyById(id: string): PolicyDetail | undefined {
    return mockPolicies.find(p => p.id.toLowerCase() === id.toLowerCase());
  }

  static comparePolicies(policyIds: string[]) {
    const selected = mockPolicies.filter(p =>
      policyIds.some(id => id.toLowerCase() === p.id.toLowerCase())
    );

    const items = selected.length > 0 ? selected : mockPolicies;

    return {
      comparedCount: items.length,
      policies: items,
      recommendation:
        items.length > 1
          ? `${items[0].title} offers superior claim settlement ratio (${items[0].claimRatio}%).`
          : 'Select multiple policies for detailed clause comparison.',
    };
  }
}
