const API_BASE_URL = 'http://localhost:5001/api/v1';

export interface HLVApiInput {
  income: number;
  years: number;
  inflation: number;
  existingCover?: number;
}

export interface HLVResult {
  recommendedCover: number;
  coverageGap: number;
  capitalRequirement?: number;
  incomeReplacementWindow?: number;
  inflationAdjustedTarget?: number;
  gapPercentage?: number;
  totalFutureIncome?: number;
  inflationAdjustedAnnualRequirement?: number;
  ruleOfThumbCover?: number;
}

export interface RiskSimApiInput {
  scenario: 'death' | 'illness' | 'disability';
  cost: number;
  years: number;
  inflation: number;
  existingCover?: number;
}

export interface RiskSimResult {
  depletionAge?: number;
  shortfallAmount?: number;
  treatmentCostTotal?: number;
  earningCapacityLoss?: number;
  riskSeverity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendation?: string;
  scenario?: string;
  totalFinancialImpact?: number;
  netShortfall?: number;
  fundingGapFormatted?: string;
  survivalProbabilityIndex?: number;
  recommendedEmergencyCorpus?: number;
  stressLevel?: 'LOW' | 'MEDIUM' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

export interface CoverageAnalysisApiInput {
  income: number;
  existingLifeCover: number;
  existingHealthCover: number;
}

export const ShieldIQApi = {
  async getHealth() {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      return await res.json();
    } catch {
      return { status: 'OFFLINE' };
    }
  },

  async login(email: string, name?: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      return await res.json();
    } catch {
      return null;
    }
  },

  async submitOnboarding(data: Record<string, unknown>) {
    try {
      const res = await fetch(`${API_BASE_URL}/user/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch {
      return null;
    }
  },

  async calculateHLV(input: HLVApiInput): Promise<{ success: boolean; data: HLVResult } | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/actuarial/hlv-calculator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      return await res.json();
    } catch {
      return null;
    }
  },

  async simulateRiskScenario(input: RiskSimApiInput): Promise<{ success: boolean; data: RiskSimResult } | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/actuarial/risk-simulator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      return await res.json();
    } catch {
      return null;
    }
  },

  async getCoverageAnalysis(input: CoverageAnalysisApiInput) {
    try {
      const res = await fetch(`${API_BASE_URL}/actuarial/coverage-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      return await res.json();
    } catch {
      return null;
    }
  },

  async getPolicies() {
    try {
      const res = await fetch(`${API_BASE_URL}/policies`);
      return await res.json();
    } catch {
      return null;
    }
  },

  async getPolicyById(id: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/policies/${id}`);
      return await res.json();
    } catch {
      return null;
    }
  },

  async comparePolicies(policyIds: string[]) {
    try {
      const res = await fetch(`${API_BASE_URL}/policies/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyIds }),
      });
      return await res.json();
    } catch {
      return null;
    }
  },

  async getUserProfile() {
    try {
      const res = await fetch(`${API_BASE_URL}/user/profile`);
      return await res.json();
    } catch {
      return null;
    }
  },
};
